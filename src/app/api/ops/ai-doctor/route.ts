import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { isValidAccessCode } from "@/lib/seha/ops";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Built-in fallback generator — guarantees the button NEVER fails.
// The z-ai LLM is used when its credentials exist (dev sandbox); on hosting
// environments without them (Netlify) this local generator takes over and
// produces equally realistic Saudi doctor names + real KSA hospitals.
// ─────────────────────────────────────────────────────────────────────────────

const KSA_HOSPITALS: Array<{ ar: string; en: string }> = [
  { ar: "مستشفى الملك فيصل التخصصي", en: "King Faisal Specialist Hospital" },
  { ar: "مستشفى الملك عبدالعزيز", en: "King Abdulaziz Hospital" },
  { ar: "مستشفى الملك فهد", en: "King Fahad Hospital" },
  { ar: "مستشفى الملك خالد", en: "King Khalid Hospital" },
  { ar: "مستشفى الملك سعود", en: "King Saud Hospital" },
  { ar: "مستشفى الأمير سلطان", en: "Prince Sultan Hospital" },
  { ar: "مستشفى الأمير فهد بن سلطان", en: "Prince Fahad bin Sultan Hospital" },
  { ar: "مستشفى الأمير محمد بن عبدالعزيز", en: "Prince Mohammed bin Abdulaziz Hospital" },
  { ar: "المستشفى السعودي الألماني", en: "Saudi German Hospital" },
  { ar: "مستشفى الحرس الوطني", en: "National Guard Hospital" },
  { ar: "مدينة الملك عبدالله الطبية", en: "King Abdullah Medical City" },
  { ar: "مدينة الأمير سلطان الطبية", en: "Prince Sultan Medical City" },
  { ar: "مستشفى المدينة العامة", en: "Al-Madinah General Hospital" },
  { ar: "مستشفى قوى الأمن", en: "Security Forces Hospital" },
  { ar: "مستشفى الرسول الأعظم", en: "Al-Rasoul Al-Aazam Hospital" },
  { ar: "مستشفى الفيصلية", en: "Al-Faisaliah Hospital" },
  { ar: "مستشفى المواساة", en: "Al-Mowassah Hospital" },
  { ar: "مستشفى سامعا العام", en: "Sabya General Hospital" },
  { ar: "مستشفى جازان العام", en: "Jazan General Hospital" },
  { ar: "مستشفى تبوك العام", en: "Tabuk General Hospital" },
  { ar: "مستشفى أبها العام", en: "Abha General Hospital" },
  { ar: "مستشفى بريدة العام", en: "Buraidah General Hospital" },
];

const MALE_NAMES = ["خالد", "عبدالله", "محمد", "سعد", "فهد", "ناصر", "سلطان", "منصور", "ماجد", "تركي", "بندر", "عبدالعزيز", "أحمد", "يوسف", "عمر"];
const FEMALE_NAMES = ["فاطمة", "سارة", "نورة", "أمل", "ريم", "هند", "لطيفة", "منى", "العنود", "جواهر"];
const FATHERS = ["بن سعد", "بن عبدالله", "بن محمد", "بن ناصر", "بن سلطان", "بن عبدالعزيز", "بن خالد", "بن فهد", "بن سليمان", "بنت عبدالله", "بنت محمد", "بنت سعد"];
const FAMILIES = ["الحربي", "القحطاني", "العتيبي", "الشمري", "الدوسري", "الغامدي", "الزهراني", "المطيري", "السبيعي", "البقمي", "الرشيدي", "الشهري", "الفيفي", "الهاجري"];
const TITLES: Array<{ ar: string; en: string }> = [
  { ar: "طبيب عام", en: "General Practitioner" },
  { ar: "استشاري طب أسرة", en: "Family Medicine Consultant" },
  { ar: "استشاري طب باطني", en: "Internal Medicine Consultant" },
  { ar: "استشاري طوارئ", en: "Emergency Medicine Consultant" },
  { ar: "استشاري أطفال", en: "Pediatrics Consultant" },
  { ar: "أخصائي طب عام", en: "General Medicine Specialist" },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const enName = (first: string) => first.toUpperCase();

function generateLocally(hospital: string): { hospital: { ar: string; en: string }; doctors: AiDoctor[] } {
  const matched = hospital
    ? KSA_HOSPITALS.find((h) => h.ar.includes(hospital) || hospital.includes(h.ar.replace("مستشفى ", "")))
    : undefined;
  const chosen = matched ?? (hospital ? { ar: hospital, en: "" } : pick(KSA_HOSPITALS));

  const used = new Set<string>();
  const doctors: AiDoctor[] = [];
  while (doctors.length < 5) {
    const female = Math.random() < 0.35;
    const first = female ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
    const father = female ? "بنت " + pick(["عبدالله", "محمد", "سعد", "خالد"]) : pick(FATHERS);
    const family = pick(FAMILIES);
    const nameAr = `د. ${first} ${father} ${family}`;
    if (used.has(nameAr)) continue;
    used.add(nameAr);
    const title = pick(TITLES);
    doctors.push({
      nameAr,
      nameEn: `DR. ${enName(first)} ${father.startsWith("بن") ? "BIN" : "BINT"} ${family.toUpperCase()}`,
      titleAr: title.ar,
      titleEn: title.en.toUpperCase(),
    });
  }
  return { hospital: chosen, doctors };
}

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

    let generated: { hospital: { ar: string; en: string }; doctors: AiDoctor[] } | null = null;

    // 1) Real LLM when credentials are available (dev sandbox)…
    try {
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
      // Bad LLM JSON — fall through to the local generator instead of failing.
      parsed = {} as never;
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

      if (doctors.length) {
        generated = {
          hospital: {
            ar: (parsed.hospital?.ar ?? hospital).trim() || hospital,
            en: (parsed.hospital?.en ?? "").trim(),
          },
          doctors,
        };
      }
    } catch {
      /* LLM unavailable (e.g. no z-ai credentials on this host) — fall through */
    }

    // 2) …built-in realistic generator otherwise — the button never fails.
    if (!generated) {
      generated = generateLocally(hospital);
    }

    return NextResponse.json({ ok: true, data: generated });
  } catch (error) {
    console.error("ops/ai-doctor error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "تعذّر توليد الأسماء، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
