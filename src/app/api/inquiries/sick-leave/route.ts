import { NextRequest, NextResponse } from "next/server";
import type { SickLeave } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeServiceCode, maskId } from "@/lib/saudi-id";
import {
  checkRateLimit,
  getClientIp,
  hashIp,
} from "@/lib/rate-limit";
import {
  formatDate,
  relationshipLabel,
  type InquiryResponse,
} from "@/lib/seha/domain";
import { getMirroredSickLeave, fromMirror } from "@/lib/seha/blob-store";

export const dynamic = "force-dynamic";

const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000; // per minute

/**
 * GET /api/inquiries/sick-leave?serviceCode=...&patientId=...
 *
 * Senior-grade inquiry endpoint:
 *  1. Sliding-window rate limiting per client IP.
 *  2. Server-side validation identical to the reference contract
 *     (service code non-empty; patient ID = exactly 10 numeric digits).
 *  3. Parameterized Prisma lookup (indexed on patientId + serviceCode).
 *  4. Privacy-preserving audit log (masked ID, hashed IP).
 *  5. Stable, typed JSON contract with Arabic error messages.
 */
export async function GET(request: NextRequest) {
  let serviceCodeRaw = "";
  let patientIdRaw = "";

  try {
    const { searchParams } = new URL(request.url);
    serviceCodeRaw = searchParams.get("serviceCode") ?? "";
    patientIdRaw = searchParams.get("patientId") ?? "";

    // ---- 1. Rate limit -------------------------------------------------
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`sl:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "RATE_LIMIT",
          message: `عدد كبير من محاولات الاستعلام، الرجاء المحاولة بعد ${rl.retryAfterSeconds} ثانية`,
        } satisfies InquiryResponse,
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rl.retryAfterSeconds),
          },
        }
      );
    }

    // ---- 2. Validation -------------------------------------------------
    const serviceCode = normalizeServiceCode(serviceCodeRaw);

    if (!serviceCode) {
      return fail(400, "VALIDATION_SERVICE_CODE", "فضلاً اكتب الرمز");
    }
    if (serviceCode.length > 20) {
      return fail(
        400,
        "VALIDATION_SERVICE_CODE",
        "رمز الخدمة غير صحيح، تأكد من الرمز وحاول مجدداً"
      );
    }

    // Reference contract: exactly 10 numeric digits (no checksum —
    // matching the original platform keeps behavior identical).
    const patientId = patientIdRaw.trim();
    if (!/^\d{10}$/.test(patientId)) {
      return fail(400, "VALIDATION_PATIENT_ID", "رقم الهوية خاطئ");
    }

    // ---- 3. Lookup ----------------------------------------------------
    // 3a. Local SQLite (bundled seeds + anything issued on this instance).
    let record = await db.sickLeave.findFirst({
      where: { serviceCode, patientId },
    });

    // 3b. Durable mirror (Netlify Blobs) — portal-issued records live there
    //     so they survive instance recycling. On a hit we also hydrate the
    //     local store so subsequent lookups (and operator edits) are served
    //     straight from SQLite.
    if (!record) {
      const mirrored = await getMirroredSickLeave(serviceCode);
      if (mirrored && mirrored.patientId === patientId) {
        record = fromMirror(mirrored);
        try {
          const row = fromMirror(mirrored);
          await db.sickLeave.upsert({
            where: { serviceCode_patientId: { serviceCode, patientId } },
            create: {
              id: row.id,
              serviceCode: row.serviceCode,
              patientId: row.patientId,
              patientName: row.patientName,
              patientNameEn: row.patientNameEn,
              patientPhone: row.patientPhone,
              companionName: row.companionName,
              relationship: row.relationship,
              sickLeaveDate: row.sickLeaveDate,
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              dateFromHijri: row.dateFromHijri,
              dateToHijri: row.dateToHijri,
              durationDays: row.durationDays,
              doctorName: row.doctorName,
              doctorNameEn: row.doctorNameEn,
              doctorJobTitle: row.doctorJobTitle,
              doctorJobTitleEn: row.doctorJobTitleEn,
              hospital: row.hospital,
              hospitalEn: row.hospitalEn,
              licenseNumber: row.licenseNumber,
              employerAr: row.employerAr,
              nationalityAr: row.nationalityAr,
              nationalityEn: row.nationalityEn,
              status: row.status,
              verificationCode: row.verificationCode,
              addQr: row.addQr,
              showLicense: row.showLicense,
              reportTime: row.reportTime,
              reportDate: row.reportDate,
              source: row.source,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            },
            update: {},
          });
        } catch {
          /* hydration is an optimization only — the mirror answer stands */
        }
      }
    }

    await logInquiry({
      serviceCode,
      patientId,
      ipHash: hashIp(ip),
      success: Boolean(record),
      resultCount: record ? 1 : 0,
      errorCode: record ? null : "NOT_FOUND",
    });

    if (!record) {
      return fail(404, "NOT_FOUND", "لا يوجد نتائج");
    }

    const data = {
      serviceCode: record.serviceCode,
      patientId: maskId(record.patientId),
      patientName: record.patientName,
      companionName: record.companionName ?? "",
      relationshipLabel: relationshipLabel(record.relationship),
      sickLeaveDate: formatDate(record.sickLeaveDate),
      dateFrom: formatDate(record.dateFrom),
      dateTo: formatDate(record.dateTo),
      durationDays: record.durationDays,
      doctorName: record.doctorName,
      doctorJobTitle: record.doctorJobTitle,
      status: record.status,
      verificationCode: record.verificationCode,
      issuedAt: record.createdAt.toISOString(),
    };

    const body: InquiryResponse = { ok: true, data };
    return NextResponse.json(body, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[sick-leave] inquiry failed:", error);
    // Best-effort logging; never let logging break the response.
    try {
      await logInquiry({
        serviceCode: normalizeServiceCode(serviceCodeRaw),
        patientId: patientIdRaw.trim(),
        ipHash: "n/a",
        success: false,
        resultCount: 0,
        errorCode: "SERVER",
      });
    } catch {
      /* noop */
    }
    return fail(
      500,
      "SERVER",
      "خطأ في الاستعلام، الرجاء المحاولة مرة أخرى بعد قليل"
    );
  }
}

function fail(
  status: number,
  error: "VALIDATION_SERVICE_CODE" | "VALIDATION_PATIENT_ID" | "NOT_FOUND" | "SERVER",
  message: string
) {
  const body: InquiryResponse = { ok: false, error, message };
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function logInquiry(entry: {
  serviceCode: string;
  patientId: string;
  ipHash: string;
  success: boolean;
  resultCount: number;
  errorCode: string | null;
}) {
  // Never log entries that failed before becoming real inquiries.
  if (!entry.serviceCode || !entry.patientId) return;
  await db.inquiryLog.create({
    data: {
      serviceCode: entry.serviceCode,
      patientId: maskId(entry.patientId),
      ipHash: entry.ipHash,
      success: entry.success,
      resultCount: entry.resultCount,
      errorCode: entry.errorCode,
    },
  });
}
