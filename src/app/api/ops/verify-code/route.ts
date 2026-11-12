import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidAccessCode } from "@/lib/seha/ops";

export const dynamic = "force-dynamic";

/**
 * POST /api/ops/verify-code
 *
 * Verifies the secret access code that unlocks the sick-leave issuing
 * portal. Brute-force resistant: 6 attempts / 5 minutes / IP.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`ops-code:${ip}`, 6, 5 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", message: `محاولات كثيرة، أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    let code: unknown = null;
    try {
      const body = await request.json();
      code = body?.code;
    } catch {
      code = null;
    }

    if (isValidAccessCode(code)) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "INVALID_CODE", message: "الرمز غير صحيح" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
