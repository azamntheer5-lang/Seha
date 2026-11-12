import { NextRequest, NextResponse } from "next/server";
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
 * Creates a sick leave from the issuing portal. The server auto-fills
 * everything computable so the operator only enters what a human must:
 *   - service number (when left empty)  → PSL261 + 8 random digits
 *   - Hijri dates                       → Umm-al-Qura conversion
 *   - duration                          → inclusive day count
 *   - report time / date                → print timestamp
 *   - verification code                 → random
 *
 * Requires the X-Access-Code header with the secret portal code.
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

    // ---- Auto-fill -----------------------------------------------------
    const issueIso = /^\d{4}-\d{2}-\d{2}$/.test(str(body.sickLeaveDateIso))
      ? str(body.sickLeaveDateIso)
      : new Date().toISOString().slice(0, 10);

    let serviceCode = str(body.serviceCode).toUpperCase().replace(/\s+/g, "");
    if (!serviceCode) serviceCode = generateServiceNumber("PSL");

    // Guarantee uniqueness of the service code (retry a few times).
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await db.sickLeave.findUnique({ where: { serviceCode } });
      if (!clash) break;
      serviceCode = generateServiceNumber("PSL");
    }

    const dateFromHijri = toHijri(dateFromIso);
    const dateToHijri = toHijri(dateToIso);
    const now = new Date();
    const reportTime = reportTimeString(now);
    const reportDate = reportDateString(now);

    // ---- Persist ---------------------------------------------------------
    const record = await db.sickLeave.create({
      data: {
        serviceCode,
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
        status: "ACTIVE",
        verificationCode: makeVerificationCode(),
        addQr: body.addQr === true,
        showLicense: body.showLicense !== false,
        reportTime,
        reportDate,
        source: "portal",
      },
    });

    // ---- Response (mirrors the print document fields) ---------------------
    const payload: PortalSickLeaveRecord = {
      id: record.id,
      serviceCode: record.serviceCode,
      patientId: record.patientId,
      patientName: record.patientName,
      patientNameEn: record.patientNameEn ?? "",
      patientPhone: record.patientPhone ?? "",
      sickLeaveDateIso: issueIso,
      dateFromIso,
      dateToIso,
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
      dateFromHijri,
      dateToHijri,
      durationDays,
      reportTime,
      reportDate,
      verificationCode: record.verificationCode,
      createdAt: record.createdAt.toISOString(),
    };

    return NextResponse.json({ ok: true, data: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ops/sick-leave error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر حفظ الإجازة، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
