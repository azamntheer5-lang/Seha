import { NextRequest, NextResponse } from "next/server";
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
import { getStore, findForInquiry } from "@/lib/seha/store";

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
 *  3. Lookup through the active store (Supabase when configured, SQLite +
 *     Blobs mirror otherwise) with a resilient fallback so the customer flow
 *     never hard-fails — see src/lib/seha/store.ts.
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

    // ---- 3. Lookup (Supabase → SQLite → Blobs mirror, resilient) --------
    const record = await findForInquiry(serviceCode, patientId);

    // ---- 4. Audit log (best-effort, never blocks the answer) -------------
    const store = getStore();
    await store.logInquiry({
      serviceCode,
      patientId: maskId(patientId),
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
      const store = getStore();
      await store.logInquiry({
        serviceCode: normalizeServiceCode(serviceCodeRaw),
        patientId: maskId(patientIdRaw.trim()),
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
