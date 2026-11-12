import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  buildExtractionPrompt,
  isValidAccessCode,
  parseExtractionJson,
  type ExtractionResult,
} from "@/lib/seha/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RATE_LIMIT = 12; // extractions
const RATE_WINDOW_MS = 60_000; // per minute

const FULL_FIELD_LIST = [
  ["serviceNum", "رقز الخدمة"],
  ["leaveId", "رمز الإجازة"],
  ["nationalID", "رقم الهوية"],
  ["phone", "الجوال"],
  ["name", "الاسم (إنجليزي)"],
  ["nameArabic", "الاسم (عربي)"],
  ["nationality", "الجنسية"],
  ["employer", "جهة العمل"],
  ["admissionDate", "تبدأ من"],
  ["dischargeDate", "وحتى"],
  ["issueDate", "تاريخ الإصدار"],
  ["doctorName", "اسم الطبيب (إنجليزي)"],
  ["doctorNameArabic", "اسم الطبيب (عربي)"],
  ["physicianPosition", "المسمى الوظيفي (إنجليزي)"],
  ["physicianPositionArabic", "المسمى الوظيفي (عربي)"],
  ["hospitalNameEnglish", "المستشفى (إنجليزي)"],
  ["hospitalNameArabic", "المستشفى (عربي)"],
  ["licenseNumber", "رقم الترخيص"],
] as const;

/**
 * POST /api/ops/extract
 *
 * Smart extraction: turns a WhatsApp secretary message (shape A) or an
 * official sick-leave report text/screenshot (shape B) into structured
 * form fields, using the platform LLM (text) or the vision model (image).
 *
 * Body: { accessCode, text } OR { accessCode, imageBase64, imageMime }
 */
export async function POST(request: NextRequest) {
  try {
    // ---- Gate ----------------------------------------------------------
    const ip = getClientIp(request.headers);
    const rl = checkRateLimit(`ops-extract:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", message: `طلبات كثيرة، أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      accessCode?: string;
      text?: string;
      imageBase64?: string;
      imageMime?: string;
    };

    const code = request.headers.get("x-access-code") ?? body.accessCode;
    if (!isValidAccessCode(code)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: "رمز الدخول غير صالح" },
        { status: 403 }
      );
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const imageMime = typeof body.imageMime === "string" && body.imageMime.startsWith("image/")
      ? body.imageMime
      : "image/jpeg";

    if (!text && !imageBase64) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", message: "أدخل نصًا أو ارفع صورة للاستخراج" },
        { status: 400 }
      );
    }
    if (imageBase64 && imageBase64.length > 8_000_000) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", message: "حجم الصورة كبير جدًا (الحد 6 ميجابايت تقريبًا)" },
        { status: 413 }
      );
    }

    // ---- Run the model ----------------------------------------------------
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();

    const prompt = buildExtractionPrompt(
      imageBase64
        ? "The input is the attached IMAGE of a paper sick leave / report. Read it with OCR precision and extract the fields."
        : text
    );

    let raw = "";
    if (imageBase64) {
      const response = await zai.chat.completions.createVision({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
            ],
          },
        ],
        thinking: { type: "disabled" },
      });
      raw = response.choices[0]?.message?.content ?? "";
    } else {
      const response = await zai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        thinking: { type: "disabled" },
      });
      raw = response.choices[0]?.message?.content ?? "";
    }

    const fields: Partial<ExtractionResult> = parseExtractionJson(raw);
    const filled = Object.values(fields).filter((v) => v && v.length > 0).length;

    if (filled === 0) {
      return NextResponse.json(
        { ok: false, error: "EXTRACTION_EMPTY", message: "لم يتم التعرف على أي بيانات في المدخل" },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { ok: true, data: fields, filled },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ops/extract error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر الاستخراج الذكي، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
