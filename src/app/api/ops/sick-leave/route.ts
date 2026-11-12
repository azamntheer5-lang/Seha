import { NextRequest, NextResponse } from "next/server";
import type { SickLeave } from "@prisma/client";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
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
  getMirroredSickLeave,
  mirrorSickLeave,
  fromMirror,
} from "@/lib/seha/blob-store";

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
 *   - On serverless (Netlify) the record is mirrored to Netlify Blobs so it
 *     survives instance recycling and is verifiable from any instance.
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

    // ---- Find an existing record for this exact pair ---------------------
    // 1) Local store first (covers re-issues on the same instance).
    let existing = await db.sickLeave.findUnique({
      where: { serviceCode_patientId: { serviceCode, patientId } },
    });

    // 2) A freshly generated code can never collide, but an operator-typed
    //    code may exist only on ANOTHER serverless instance — check the
    //    durable mirror and hydrate it locally so the re-issue updates it.
    if (!existing && !generated) {
      const mirrored = await getMirroredSickLeave(serviceCode);
      if (mirrored && mirrored.patientId === patientId) {
        try {
          existing = await db.sickLeave.create({ data: hydrateCreate(mirrored) });
        } catch {
          /* hydrated concurrently by a parallel request — refetch */
          existing = await db.sickLeave.findUnique({
            where: { serviceCode_patientId: { serviceCode, patientId } },
          });
        }
      }
    }

    // ---- Persist (create, or update-in-place for a re-issue) -------------
    const sharedData = {
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
      source: "portal" as const,
    };

    const record = existing
      ? await db.sickLeave.update({ where: { id: existing.id }, data: sharedData })
      : await db.sickLeave.create({
          data: {
            serviceCode,
            patientId,
            ...sharedData,
            status: "ACTIVE",
            verificationCode: makeVerificationCode(),
          },
        });

    // ---- Durable mirror (Netlify Blobs) — best effort --------------------
    await mirrorSickLeave(record);

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
 * inclusive duration, and mirrors the change to the durable store — so the
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
    const patientId = str(body.patientId).replace(/\D/g, "");
    const serviceCode = str(body.serviceCode).toUpperCase().replace(/\s+/g, "");

    let existing = str(body.id)
      ? await db.sickLeave.findUnique({ where: { id: str(body.id) } })
      : null;

    if (!existing && serviceCode && /^\d{10}$/.test(patientId)) {
      existing = await db.sickLeave.findUnique({
        where: { serviceCode_patientId: { serviceCode, patientId } },
      });
    }

    if (!existing && serviceCode) {
      const mirrored = await getMirroredSickLeave(serviceCode);
      if (mirrored && mirrored.patientId === patientId) {
        try {
          existing = await db.sickLeave.create({ data: hydrateCreate(mirrored) });
        } catch {
          existing = await db.sickLeave.findUnique({
            where: { serviceCode_patientId: { serviceCode, patientId } },
          });
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
      const clash = await db.sickLeave.findUnique({
        where: { serviceCode_patientId: { serviceCode: nextCode, patientId } },
      });
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
    const record = await db.sickLeave.update({
      where: { id: existing.id },
      data: {
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
      },
    });

    // ---- Durable mirror (Netlify Blobs) — best effort --------------------
    await mirrorSickLeave(record);

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

/** Build a Prisma create payload from a mirrored (Blobs) record. */
function hydrateCreate(mirrored: ReturnType<typeof fromMirror>): PrismaSickLeaveCreateInput {
  return {
    id: mirrored.id,
    serviceCode: mirrored.serviceCode,
    patientId: mirrored.patientId,
    patientName: mirrored.patientName,
    patientNameEn: mirrored.patientNameEn,
    patientPhone: mirrored.patientPhone,
    companionName: mirrored.companionName,
    relationship: mirrored.relationship,
    sickLeaveDate: mirrored.sickLeaveDate,
    dateFrom: mirrored.dateFrom,
    dateTo: mirrored.dateTo,
    dateFromHijri: mirrored.dateFromHijri,
    dateToHijri: mirrored.dateToHijri,
    durationDays: mirrored.durationDays,
    doctorName: mirrored.doctorName,
    doctorNameEn: mirrored.doctorNameEn,
    doctorJobTitle: mirrored.doctorJobTitle,
    doctorJobTitleEn: mirrored.doctorJobTitleEn,
    hospital: mirrored.hospital,
    hospitalEn: mirrored.hospitalEn,
    licenseNumber: mirrored.licenseNumber,
    employerAr: mirrored.employerAr,
    nationalityAr: mirrored.nationalityAr,
    nationalityEn: mirrored.nationalityEn,
    status: mirrored.status,
    verificationCode: mirrored.verificationCode,
    addQr: mirrored.addQr,
    showLicense: mirrored.showLicense,
    reportTime: mirrored.reportTime,
    reportDate: mirrored.reportDate,
    source: mirrored.source,
    createdAt: mirrored.createdAt,
    updatedAt: mirrored.updatedAt,
  };
}

type PrismaSickLeaveCreateInput = {
  id: string;
  serviceCode: string;
  patientId: string;
  patientName: string;
  patientNameEn: string | null;
  patientPhone: string | null;
  companionName: string | null;
  relationship: number | null;
  sickLeaveDate: Date;
  dateFrom: Date;
  dateTo: Date;
  dateFromHijri: string | null;
  dateToHijri: string | null;
  durationDays: number;
  doctorName: string;
  doctorNameEn: string | null;
  doctorJobTitle: string;
  doctorJobTitleEn: string | null;
  hospital: string;
  hospitalEn: string | null;
  licenseNumber: string | null;
  employerAr: string | null;
  nationalityAr: string | null;
  nationalityEn: string | null;
  status: string;
  verificationCode: string;
  addQr: boolean;
  showLicense: boolean;
  reportTime: string | null;
  reportDate: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Map a live Prisma row to the portal payload contract. */
function toPayload(record: SickLeave): PortalSickLeaveRecord {
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
