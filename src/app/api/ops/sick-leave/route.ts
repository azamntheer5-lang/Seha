import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  computeDurationDays,
  generateServiceNumber,
  isValidAccessCode,
  reportDateString,
  reportTimeString,
  toHijri,
  type PortalSickLeaveRecord,
} from "@/lib/seha/ops";
import {
  getStore,
  type SickLeaveRow,
  type SickLeaveUpdate,
} from "@/lib/seha/store";
import {
  getMirroredSickLeave,
  mirrorSickLeave,
  fromMirror,
} from "@/lib/seha/blob-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000; // per minute

type CreateBody = {
  accessCode?: string;
  serviceCode?: string;
  patientId?: string;
  patientName?: string;
  patientNameEn?: string;
  patientPhone?: string;
  sickLeaveDateIso?: string;
  dateFromIso?: string;
  dateToIso?: string;
  doctorName?: string;
  doctorNameEn?: string;
  doctorJobTitle?: string;
  doctorJobTitleEn?: string;
  hospital?: string;
  hospitalEn?: string;
  licenseNumber?: string;
  employerAr?: string;
  nationalityAr?: string;
  nationalityEn?: string;
  addQr?: boolean;
  showLicense?: boolean;
};

type UpdateBody = CreateBody & { id?: string };

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function makeVerificationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VRF-";
  for (let i = 0; i < 3; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  code += "-";
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

/** True when an error smells like a unique-constraint race on the pair. */
function isDuplicateRace(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("23505") || /duplicate|unique constraint/i.test(msg);
}

/**
 * POST /api/ops/sick-leave
 *
 * Creates (or RE-ISSUES) a sick leave from the issuing portal.
 *
 * Senior-grade guarantees:
 *   - The operator's service code is HONOURED EXACTLY as typed. It is never
 *     silently swapped for a random one. Only an empty field gets a generated
 *     PSL number.
 *   - Re-issuing the same (serviceCode + patientId) pair UPDATES the existing
 *     record in place (same id, same verification code — older PDFs keep
 *     verifying) instead of failing or duplicating.
 *   - Storage: Supabase (single durable source of truth) when configured via
 *     SUPABASE_URL + SUPABASE_SERVICE_KEY; otherwise SQLite, mirrored to
 *     Netlify Blobs for cross-instance durability.
 *
 * The server still auto-fills everything computable so the operator only
 * enters what a human must: Hijri dates (Umm-al-Qura), inclusive duration,
 * report timestamp and a verification code for new records.
 */
export async function POST(request: NextRequest) {
  try {
    // ---- Gate: access code + rate limit ------------------------------
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`ops-create:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", message: `طلبات كثيرة، أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const headerCode = request.headers.get("x-access-code");
    const body = (await request.json().catch(() => ({}))) as CreateBody;
    if (!isValidAccessCode(headerCode ?? body.accessCode)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "رمز الدخول غير صالح" },
        { status: 403 }
      );
    }

    // ---- Validation ---------------------------------------------------
    const patientName = str(body.patientName);
    const patientId = str(body.patientId).replace(/\D/g, "");
    const dateFromIso = str(body.dateFromIso);
    const dateToIso = str(body.dateToIso);
    const doctorName = str(body.doctorName);

    if (!patientName) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "اسم المريض مطلوب" }, { status: 400 });
    }
    if (!/^\d{10}$/.test(patientId)) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "رقم الهوية يجب أن يكون 10 أرقام" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(dateToIso)) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "تواريخ الإجازة غير صحيحة" }, { status: 400 });
    }
    const durationDays = computeDurationDays(dateFromIso, dateToIso);
    if (durationDays < 1) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" }, { status: 400 });
    }
    if (!doctorName) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "اسم الطبيب مطلوب" }, { status: 400 });
    }

    // ---- Service code: the operator's word is final ---------------------
    let serviceCode = str(body.serviceCode).toUpperCase().replace(/\s+/g, "");
    let generated = false;
    if (!serviceCode) {
      serviceCode = generateServiceNumber("PSL");
      generated = true;
    }

    const issueIso = /^\d{4}-\d{2}-\d{2}$/.test(str(body.sickLeaveDateIso))
      ? str(body.sickLeaveDateIso)
      : new Date().toISOString().slice(0, 10);

    const dateFromHijri = toHijri(dateFromIso);
    const dateToHijri = toHijri(dateToIso);
    const now = new Date();
    const reportTime = reportTimeString(now);
    const reportDate = reportDateString(now);

    const store = getStore();

    // ---- Find an existing record for this exact pair ---------------------
    let existing = await store.findByPair(serviceCode, patientId);

    // On the SQLite backend an operator-typed code may exist only on ANOTHER
    // serverless instance — check the durable Blobs mirror and hydrate it
    // locally so the re-issue updates it. (Supabase needs no mirror.)
    if (!existing && store.backend === "sqlite" && !generated) {
      const mirrored = await getMirroredSickLeave(serviceCode);
      if (mirrored && mirrored.patientId === patientId) {
        try {
          existing = await store.insert(fromMirror(mirrored) as unknown as SickLeaveRow);
        } catch {
          /* hydrated concurrently by a parallel request — refetch */
          existing = await store.findByPair(serviceCode, patientId);
        }
      }
    }

    // ---- Persist (create, or update-in-place for a re-issue) -------------
    const sharedData: SickLeaveUpdate = {
      patientName,
      patientNameEn: str(body.patientNameEn) || null,
      patientPhone: str(body.patientPhone) || null,
      sickLeaveDate: new Date(`${issueIso}T00:00:00.000Z`),
      dateFrom: new Date(`${dateFromIso}T00:00:00.000Z`),
      dateTo: new Date(`${dateToIso}T00:00:00.000Z`),
      dateFromHijri,
      dateToHijri,
      durationDays,
      doctorName,
      doctorNameEn: str(body.doctorNameEn) || null,
      doctorJobTitle: str(body.doctorJobTitle) || "طبيب عام",
      doctorJobTitleEn: str(body.doctorJobTitleEn) || null,
      hospital: str(body.hospital) || "المستشفى السعودي الألماني",
      hospitalEn: str(body.hospitalEn) || "Saudi German Hospital",
      licenseNumber: str(body.licenseNumber) || null,
      employerAr: str(body.employerAr) || null,
      nationalityAr: str(body.nationalityAr) || "السعودية",
      nationalityEn: str(body.nationalityEn) || "Saudi Arabia",
      addQr: body.addQr === true,
      showLicense: body.showLicense !== false,
      // A re-issue is a fresh print → refresh the printed timestamp.
      reportTime,
      reportDate,
      source: "portal",
    };

    let record: SickLeaveRow;
    if (existing) {
      record = await store.update(existing.id, sharedData);
    } else {
      try {
        record = await store.insert({
          id: crypto.randomUUID(),
          serviceCode,
          patientId,
          ...sharedData,
          status: "ACTIVE",
          verificationCode: makeVerificationCode(),
          createdAt: now,
          updatedAt: now,
        } as SickLeaveRow);
      } catch (error) {
        // Two operators saving the same pair at the same instant — the loser
        // turns its insert into an update-in-place so BOTH saves succeed.
        if (isDuplicateRace(error)) {
          const winner = await store.findByPair(serviceCode, patientId);
          if (winner) {
            record = await store.update(winner.id, sharedData);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // ---- Blobs mirror — only when the backend is not durable by itself ----
    if (!store.durable) {
      await mirrorSickLeave(record as never);
    }

    // ---- Response (mirrors the print document fields) ---------------------
    return NextResponse.json(
      { ok: true, data: toPayload(record) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ops/sick-leave error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر حفظ الإجازة، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ops/sick-leave
 *
 * Commits an edit made on the "صفحة المعاينة والتعديل" (preview & edit page).
 * The server re-validates the record, re-computes the Hijri dates and the
 * inclusive duration, and persists through the active store — so the
 * document the customer verifies against always matches the downloaded PDF,
 * on every serverless instance.
 *
 * The record is located by id, falling back to the (serviceCode + patientId)
 * pair and then to the durable mirror — so editing works even when the
 * request lands on a fresh instance that has not seen the record yet.
 */
export async function PATCH(request: NextRequest) {
  try {
    // ---- Gate: access code + rate limit ------------------------------
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`ops-update:${ip}`, RATE_LIMIT * 4, RATE_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", message: `طلبات كثيرة، أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const headerCode = request.headers.get("x-access-code");
    const body = (await request.json().catch(() => ({}))) as UpdateBody;
    if (!isValidAccessCode(headerCode ?? body.accessCode)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "رمز الدخول غير صالح" },
        { status: 403 }
      );
    }

    // ---- Locate the record: id → pair → durable mirror -----------------
    const store = getStore();
    const patientId = str(body.patientId).replace(/\D/g, "");
    const serviceCode = str(body.serviceCode).toUpperCase().replace(/\s+/g, "");

    let existing = str(body.id) ? await store.findById(str(body.id)) : null;

    if (!existing && serviceCode && /^\d{10}$/.test(patientId)) {
      existing = await store.findByPair(serviceCode, patientId);
    }

    if (!existing && serviceCode && store.backend === "sqlite") {
      const mirrored = await getMirroredSickLeave(serviceCode);
      if (mirrored && mirrored.patientId === patientId) {
        try {
          existing = await store.insert(fromMirror(mirrored) as unknown as SickLeaveRow);
        } catch {
          existing = await store.findByPair(serviceCode, patientId);
        }
      }
    }

    if (!existing) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "الإجازة غير موجودة" }, { status: 404 });
    }

    // ---- Validation (same rules as create) ------------------------------
    const patientName = str(body.patientName);
    const doctorName = str(body.doctorName);
    const dateFromIso = str(body.dateFromIso);
    const dateToIso = str(body.dateToIso);

    if (!patientName) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "اسم المريض مطلوب" }, { status: 400 });
    }
    if (!/^\d{10}$/.test(patientId)) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "رقم الهوية يجب أن يكون 10 أرقام" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(dateToIso)) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "تواريخ الإجازة غير صحيحة" }, { status: 400 });
    }
    const durationDays = computeDurationDays(dateFromIso, dateToIso);
    if (durationDays < 1) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" }, { status: 400 });
    }
    if (!doctorName) {
      return NextResponse.json({ ok: false, error: "VALIDATION", message: "اسم الطبيب مطلوب" }, { status: 400 });
    }

    // ---- Pair uniqueness against OTHER records ---------------------------
    // (serviceCode, patientId) is the public lookup pair — it may only be
    // claimed by one record. Re-using a code for a DIFFERENT patient is fine.
    const nextCode = serviceCode || existing.serviceCode;
    if (nextCode !== existing.serviceCode || patientId !== existing.patientId) {
      const clash = await store.findByPair(nextCode, patientId);
      if (clash && clash.id !== existing.id) {
        return NextResponse.json(
          { ok: false, error: "DUPLICATE", message: "هذا الرمز مستخدم مسبقًا لنفس رقم الهوية في إجازة أخرى" },
          { status: 409 }
        );
      }
    }

    const issueIso = /^\d{4}-\d{2}-\d{2}$/.test(str(body.sickLeaveDateIso))
      ? str(body.sickLeaveDateIso)
      : existing.sickLeaveDate.toISOString().slice(0, 10);

    const dateFromHijri = toHijri(dateFromIso);
    const dateToHijri = toHijri(dateToIso);

    // ---- Persist (report timestamp stays the ORIGINAL issuance stamp) ----
    const record = await store.update(existing.id, {
      serviceCode: nextCode,
      patientId,
      patientName,
      patientNameEn: str(body.patientNameEn) || null,
      patientPhone: str(body.patientPhone) || null,
      sickLeaveDate: new Date(`${issueIso}T00:00:00.000Z`),
      dateFrom: new Date(`${dateFromIso}T00:00:00.000Z`),
      dateTo: new Date(`${dateToIso}T00:00:00.000Z`),
      dateFromHijri,
      dateToHijri,
      durationDays,
      doctorName,
      doctorNameEn: str(body.doctorNameEn) || null,
      doctorJobTitle: str(body.doctorJobTitle) || "طبيب عام",
      doctorJobTitleEn: str(body.doctorJobTitleEn) || null,
      hospital: str(body.hospital) || "المستشفى السعودي الألماني",
      hospitalEn: str(body.hospitalEn) || "Saudi German Hospital",
      licenseNumber: str(body.licenseNumber) || null,
      employerAr: str(body.employerAr) || null,
      nationalityAr: str(body.nationalityAr) || "السعودية",
      nationalityEn: str(body.nationalityEn) || "Saudi Arabia",
      addQr: body.addQr === true,
      showLicense: body.showLicense !== false,
    });

    if (!store.durable) {
      await mirrorSickLeave(record as never);
    }

    return NextResponse.json(
      { ok: true, data: toPayload(record) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ops/sick-leave PATCH error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر حفظ التعديلات، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/** Map a live row to the portal payload contract. */
function toPayload(record: SickLeaveRow): PortalSickLeaveRecord {
  return {
    id: record.id,
    serviceCode: record.serviceCode,
    patientId: record.patientId,
    patientName: record.patientName,
    patientNameEn: record.patientNameEn ?? "",
    patientPhone: record.patientPhone ?? "",
    sickLeaveDateIso: record.sickLeaveDate.toISOString().slice(0, 10),
    dateFromIso: record.dateFrom.toISOString().slice(0, 10),
    dateToIso: record.dateTo.toISOString().slice(0, 10),
    doctorName: record.doctorName,
    doctorNameEn: record.doctorNameEn ?? "",
    doctorJobTitle: record.doctorJobTitle,
    doctorJobTitleEn: record.doctorJobTitleEn ?? "",
    hospital: record.hospital,
    hospitalEn: record.hospitalEn ?? "",
    licenseNumber: record.licenseNumber ?? "",
    employerAr: record.employerAr ?? "",
    nationalityAr: record.nationalityAr ?? "",
    nationalityEn: record.nationalityEn ?? "",
    addQr: record.addQr,
    showLicense: record.showLicense,
    dateFromHijri: record.dateFromHijri ?? "",
    dateToHijri: record.dateToHijri ?? "",
    durationDays: record.durationDays,
    reportTime: record.reportTime ?? "",
    reportDate: record.reportDate ?? "",
    verificationCode: record.verificationCode,
    createdAt: record.createdAt.toISOString(),
  };
}
