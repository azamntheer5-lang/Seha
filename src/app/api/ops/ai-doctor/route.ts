import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { isValidAccessCode } from "@/lib/seha/ops";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type AiDoctor = {
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
};

/**
 * POST /api/ops/ai-doctor — الذكاء الاصطناعي يولّد أسماء أطباء سعودية واقعية.
 *
 * Body: { hospital?: string } — the (Arabic) hospital name typed in the form.
 *  - Hospital provided → doctor name suggestions for THAT hospital.
 *  - Hospital empty    → the AI first picks a well-known Saudi hospital,
 *                        then suggests doctors for it (hospital included in
 *                        the response so the form can be auto-filled).
 *
 * Response: { ok, data: { hospital: {ar,en}, doctors: AiDoctor[] } }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`ops-ai-doctor:${ip}`, 12, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", message: `طلبات كثيرة، أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const headerCode = request.headers.get("x-access-code");
    const body = (await request.json().catch(() => ({}))) as { accessCode?: string; hospital?: string };
    if (!isValidAccessCode(headerCode ?? body.accessCode)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "رمز الدخول غير صالح" },
        { status: 403 }
      );
    }

    const hospital = (body.hospital ?? "").trim();

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "أنت مساعد متخصص في أسماء الأطباء والمستشفيات في المملكة العربية السعودية. " +
            "أعد الإجابة بصيغة JSON فقط بدون أي نص إضافي، بالشكل التالي حرفيًا: " +
            '{"hospital":{"ar":"...","en":"..."},"doctors":[{"nameAr":"...","nameEn":"...","titleAr":"...","titleEn":"..."}]} ' +
            "حيث hospital هو مستشفى حقيقي معروف في المملكة (نفسه المعطى إن وُجد)، و doctors قائمة من 5 أطباء بأسماء عربية سعودية واقعية كاملة " +
            '(مثل "د. خالد بن سعد الحربي") مع مقابلها الإنجليزي بأحرف كبيرة، ومسمى وظيفي طبي مناسب (طبيب عام، استشاري طب أسرة...).',
        },
        {
          role: "user",
          content: hospital
            ? `اقترح 5 أسماء أطباء واقعيين يعملون في مستشفى "${hospital}" في السعودية.`
            : "اختر مستشفى معروفًا في السعودية واقترح 5 أسماء أطباء واقعيين يعملون فيه.",
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    // Tolerate markdown fences / prose around the JSON: take the outermost
    // {...} span (first "{" to the LAST "}") and parse that.
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    let parsed: {
      hospital?: { ar?: string; en?: string };
      doctors?: Array<{ nameAr?: string; nameEn?: string; titleAr?: string; titleEn?: string }>;
    };
    try {
      if (first === -1 || last <= first) throw new Error("no JSON object in response");
      parsed = JSON.parse(raw.slice(first, last + 1));
    } catch {
      return NextResponse.json(
        { ok: false, error: "AI_PARSE", message: "تعذّر فهم مخرجات الذكاء الاصطناعي، حاول مرة أخرى" },
        { status: 502 }
      );
    }

    const doctors = (parsed.doctors ?? [])
      .filter((d) => (d.nameAr ?? "").trim())
      .slice(0, 5)
      .map((d) => ({
        nameAr: (d.nameAr ?? "").trim(),
        nameEn: (d.nameEn ?? "").trim().toUpperCase(),
        titleAr: (d.titleAr ?? "طبيب عام").trim(),
        titleEn: (d.titleEn ?? "").trim(),
      }));

    if (!doctors.length) {
      return NextResponse.json(
        { ok: false, error: "AI_EMPTY", message: "لم يولّد الذكاء الاصطناعي أسماء، حاول مرة أخرى" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        hospital: {
          ar: (parsed.hospital?.ar ?? hospital).trim() || hospital,
          en: (parsed.hospital?.en ?? "").trim(),
        },
        doctors,
      },
    });
  } catch (error) {
    console.error("ops/ai-doctor error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر توليد الأسماء، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
