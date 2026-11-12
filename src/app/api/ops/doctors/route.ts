import { NextRequest, NextResponse } from "next/server";
import { isValidAccessCode } from "@/lib/seha/ops";
import {
  allHospitals,
  doctorsForHospital,
  learnDoctor,
} from "@/lib/seha/doctor-directory";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/ops/doctors            → every remembered hospital (+ doctor counts)
 * GET /api/ops/doctors?hospital=X → doctors previously used at hospital X
 *
 * Gated by the issuing-portal access code (header `x-access-code` or ?code=).
 */
export async function GET(request: NextRequest) {
  try {
    const headerCode = request.headers.get("x-access-code");
    const params = new URL(request.url).searchParams;
    if (!isValidAccessCode(headerCode ?? params.get("code"))) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "رمز الدخول غير صالح" },
        { status: 403 }
      );
    }

    const hospital = (params.get("hospital") ?? "").trim();
    const data = hospital
      ? { doctors: await doctorsForHospital(hospital) }
      : { hospitals: await allHospitals() };

    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ops/doctors GET error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر تحميل سجل الأطباء" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ops/doctors — remember a (doctor, hospital) pair right now
 * (used when the operator taps a saved/AI suggestion so it sticks even
 * before a leave is issued with it).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`ops-doctors:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "RATE_LIMIT" }, { status: 429 });
    }

    const headerCode = request.headers.get("x-access-code");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isValidAccessCode(headerCode ?? (body.accessCode as string))) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "رمز الدخول غير صالح" },
        { status: 403 }
      );
    }

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const doctorName = str(body.doctorName);
    const hospital = str(body.hospital);
    if (!doctorName || !hospital) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", message: "اسم الطبيب والمستشفى مطلوبان" },
        { status: 400 }
      );
    }

    await learnDoctor({
      doctorName,
      doctorNameEn: str(body.doctorNameEn) || null,
      jobTitleAr: str(body.jobTitleAr) || null,
      jobTitleEn: str(body.jobTitleEn) || null,
      hospital,
      hospitalEn: str(body.hospitalEn) || null,
    });

    return NextResponse.json({ ok: true, data: { doctors: await doctorsForHospital(hospital) } });
  } catch (error) {
    console.error("ops/doctors POST error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر حفظ الطبيب" },
      { status: 500 }
    );
  }
}
