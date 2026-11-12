/**
 * Smart input parser (الادخال الذكي) — real-time, 100% client-side, zero network.
 *
 * The operator pastes or types the secretary's WhatsApp message (or any
 * "label: value" notes) into a plain text box. This parser runs on EVERY
 * keystroke and instantly fills every field it recognises — no AI call,
 * no loading, no failure. Whatever is recognised so far is what gets
 * filled; missing fields are simply left untouched.
 *
 * Supported input shapes:
 *   A. Secretary message (Arabic "label: value" lines, typos & spacing OK)
 *   B. Old sick-leave report text (English labels: Leave ID, Name, …)
 *
 * Data integrity rules (ported from the previous system):
 *   - Never invent dates: a bare day ("17") or year-less value ("2 Sep")
 *     is ignored, not completed.
 *   - Hijri-looking values (year < 1900) are ignored — the server
 *     recomputes Hijri from the Gregorian date anyway.
 *   - "تاريخ الاجازه" fills from AND to; an explicit المدة extends "to".
 */

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export type SmartParsedFields = {
  serviceCode: string;
  patientId: string;
  patientName: string;
  patientNameEn: string;
  patientPhone: string;
  dateFromIso: string;
  dateToIso: string;
  sickLeaveDateIso: string;
  doctorName: string;
  doctorNameEn: string;
  doctorJobTitle: string;
  doctorJobTitleEn: string;
  hospital: string;
  hospitalEn: string;
  licenseNumber: string;
  employerAr: string;
  nationalityAr: string;
};

export type SmartParseResult = {
  /** Every recognised, non-empty field value. */
  fields: Partial<SmartParsedFields>;
  /** How many fields were recognised. */
  filledCount: number;
  /** Human-readable list of the labels the parser understood. */
  recognizedLabels: string[];
  /** Required-field flags (same set the issuing form validates). */
  hasName: boolean;
  hasId: boolean;
  hasDoctor: boolean;
  hasFrom: boolean;
  hasTo: boolean;
  /** True when every field required to issue a leave is present. */
  isComplete: boolean;
};

// ───────────────────────────────────────────────────────────────────────────
// Arabic / digit normalisation
// ───────────────────────────────────────────────────────────────────────────

/** Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western digits. */
export function toWesternDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const code = d.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

/** Normalise Arabic for LABEL matching (values keep their original form). */
function normalizeLabel(text: string): string {
  return toWesternDigits(text)
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

// ───────────────────────────────────────────────────────────────────────────
// Nationality mapping (Arabic value → English for the bilingual report)
// ───────────────────────────────────────────────────────────────────────────

export const NATIONALITY_EN: Record<string, string> = {
  "السعودية": "Saudi Arabia",
  "سعودي": "Saudi Arabia",
  "سعوديه": "Saudi Arabia",
  "مصري": "Egypt",
  "يمني": "Yemen",
  "سوداني": "Sudan",
  "هندي": "India",
  "باكستاني": "Pakistan",
  "بنغلاديشي": "Bangladesh",
  "بنجلاديشي": "Bangladesh",
  "سوري": "Syria",
  "أردني": "Jordan",
  "اردني": "Jordan",
  "فلسطيني": "Palestine",
  "إثيوبي": "Ethiopia",
  "اثيوبي": "Ethiopia",
  "نيجيري": "Nigeria",
  "كيني": "Kenya",
  "أوغندي": "Uganda",
  "اوجندي": "Uganda",
  "سريلانكي": "Sri Lanka",
  "نيبالي": "Nepal",
  "فلبيني": "Philippines",
  "إندونيسي": "Indonesia",
  "اندونيسي": "Indonesia",
  "بورمي": "Myanmar",
  "صومالي": "Somalia",
  "تشادي": "Chad",
  "إريتري": "Eritrea",
  "اريتري": "Eritrea",
  "أفغاني": "Afghanistan",
  "افغاني": "Afghanistan",
  "لبناني": "Lebanon",
  "عماني": "Oman",
  "بحريني": "Bahrain",
  "كويتي": "Kuwait",
  "قطري": "Qatar",
  "إماراتي": "UAE",
  "اماراتي": "UAE",
  "تونسي": "Tunisia",
  "جزائري": "Algeria",
  "مغربي": "Morocco",
  "موريتاني": "Mauritania",
  "جيبوتي": "Djibouti",
  "تنزاني": "Tanzania",
  "غاني": "Ghana",
  "مالي": "Mali",
  "فيتنامي": "Vietnam",
  "تايلندي": "Thailand",
  "ماليزي": "Malaysia",
  "تركي": "Turkey",
  "أذربيجاني": "Azerbaijan",
  "أوزبكي": "Uzbekistan",
  "قيرغيزي": "Kyrgyzstan",
  "طاجيكي": "Tajikistan",
  "كازاخستاني": "Kazakhstan",
};

// ───────────────────────────────────────────────────────────────────────────
// Date parsing — strict, never invents missing parts
// ───────────────────────────────────────────────────────────────────────────

const validDate = (y: number, m: number, d: number): string | null => {
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/**
 * Parse a date value → "YYYY-MM-DD".
 * Accepts 2026-11-20 · 20-11-2026 · 20/11/2026 · 20.11.2026 · 2026/11/20.
 * Returns "" for bare days, year-less values, Hijri years (< 1900) or garbage.
 */
export function parseDateValue(raw: string): string {
  const v = toWesternDigits(raw).replace(/\s+/g, "").trim();
  if (!/^[\d\-/.]+$/.test(v)) return "";
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); // YYYY-MM-DD
  if (m) return validDate(+m[1], +m[2], +m[3]) ?? "";
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // DD-MM-YYYY
  if (m) return validDate(+m[3], +m[2], +m[1]) ?? "";
  return "";
}

const addDaysIso = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** "3 ايام" · "يومين" · "يوم" · "اسبوع" · "15" → day count (0 = unknown). */
export function parseDurationDays(raw: string): number {
  const v = normalizeLabel(raw);
  const num = v.match(/(\d+)/);
  if (num) {
    const n = parseInt(num[1], 10);
    if (n > 0 && n <= 365) return n;
  }
  if (v.includes("يومين")) return 2;
  if (v.includes("اسبوعين")) return 14;
  if (v.includes("يوم")) return 1;
  if (v.includes("اسبوع")) return 7;
  if (v.includes("شهرين")) return 60;
  if (v.includes("شهر")) return 30;
  return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// The parser
// ───────────────────────────────────────────────────────────────────────────

/** Split a text blob into candidate "label: value" chunks (lines first). */
function extractChunks(text: string): { label: string; value: string }[] {
  const chunks: { label: string; value: string }[] = [];
  const lines = text.split(/[\n\r]+/);
  for (const line of lines) {
    const cleaned = line.trim().replace(/^[•*\-–—]+\s*/, "");
    if (!cleaned) continue;
    // A line may hold several pairs separated by 2+ spaces or Arabic commas.
    const parts = cleaned.split(/\s{2,}|\s*،\s*|\s*,\s*/).filter(Boolean);
    for (const part of parts) {
      const idx = part.search(/[:：=]/);
      if (idx <= 0) {
        chunks.push({ label: "", value: part.trim() }); // bare value
        continue;
      }
      chunks.push({
        label: part.slice(0, idx).trim(),
        value: part.slice(idx + 1).trim(),
      });
    }
  }
  return chunks;
}

type Bucket = Partial<SmartParsedFields> & {
  _leaveDateIso: string;
  _durationDays: number;
};

/**
 * Parse the smart-input text. Runs synchronously — call on every keystroke.
 */
export function parseSmartInput(text: string): SmartParseResult {
  const bucket: Bucket = {
    _leaveDateIso: "",
    _durationDays: 0,
  };
  const recognized: string[] = [];

  const chunks = extractChunks(text);

  for (const { label, value } of chunks) {
    if (!value) continue;
    const L = normalizeLabel(label);

    // ── Bare values (no label) — light auto-detection ──
    if (!L) {
      const bare = toWesternDigits(value).trim();
      // 10-digit Saudi ID / Iqama (starts with 1 or 2)
      if (!bucket.patientId) {
        const id = bare.match(/\b[12]\d{9}\b/);
        if (id) {
          bucket.patientId = id[0];
          recognized.push("رقم الهوية");
          continue;
        }
      }
      // Service code like PSL26197640978
      if (!bucket.serviceCode) {
        const sc = value.match(/\b[A-Za-z]{2,4}\d{7,}\b/);
        if (sc) {
          bucket.serviceCode = sc[0].toUpperCase();
          recognized.push("رمز الخدمة");
          continue;
        }
      }
      continue;
    }

    // ── Ignore labels that have no field (previous system's rules) ──
    if (/(ميلاد|تاريخ الميلاد)/.test(L)) continue; // birth date
    if (/(منطقه|المدينه|حي)/.test(L) && !/عمل/.test(L)) continue; // region
    if (/مهنه|وظيفه الموظف/.test(L) && !/مسمي/.test(L)) continue; // patient occupation
    if (/تحقق/.test(L) && !/خدم/.test(L)) continue; // verification code

    // ── Patient ──
    if (/(طبيب|دكتور|ممرض|doctor|physician|practitioner)/.test(L)) {
      // Doctor name vs. doctor position
      if (/(مسمي|تخصص|اختصاص|position|specialty|title)/.test(L)) {
        if (ARABIC_RE.test(value)) bucket.doctorJobTitle = value;
        else if (LATIN_RE.test(value)) bucket.doctorJobTitleEn = value;
        recognized.push("المسمى الوظيفي");
        continue;
      }
      const clean = value.replace(/^(د\.?|دكتور|الدكتور|د-|dr\.?|prof\.?)\s*/i, "").trim();
      if (ARABIC_RE.test(clean)) bucket.doctorName = clean;
      else if (LATIN_RE.test(clean)) bucket.doctorNameEn = clean.toUpperCase();
      recognized.push("اسم الطبيب");
      continue;
    }
    if (/(ترخيص|license)/.test(L)) {
      const num = toWesternDigits(value).replace(/\D/g, "");
      if (num.length >= 6) bucket.licenseNumber = num;
      recognized.push("رقم الترخيص");
      continue;
    }
    if (/(جوال|هاتف|موبايل|تلفون|phone|mobile)/.test(L)) {
      const digits = toWesternDigits(value).replace(/[^\d+]/g, "");
      const m = digits.match(/(\+?966\d{9}|\+?9665\d{8}|0?5\d{8})/);
      if (m) bucket.patientPhone = m[1];
      recognized.push("رقم الجوال");
      continue;
    }
    if (/(هوي|اقام|national id|iqama|^id$|id number|id no)/.test(L)) {
      const id = toWesternDigits(value).replace(/\D/g, "");
      if (/^[12]\d{9}$/.test(id)) bucket.patientId = id;
      recognized.push("رقم الهوية");
      continue;
    }
    if (/(جنس|nationality)/.test(L)) {
      if (ARABIC_RE.test(value)) bucket.nationalityAr = value;
      else if (LATIN_RE.test(value)) {
        // English nationality — keep + try reverse map
        bucket.nationalityAr = bucket.nationalityAr ?? reverseNationality(value) ?? value;
      }
      recognized.push("الجنسية");
      continue;
    }
    if (/عمل|employer|work(?!ing)/.test(L)) {
      if (ARABIC_RE.test(value)) bucket.employerAr = value;
      recognized.push("جهة العمل");
      continue;
    }
    if (/(مستشفي|مستشفى|منشاه|منشأة|hospital|clinic|facility|مركز)/.test(L)) {
      if (ARABIC_RE.test(value)) bucket.hospital = value;
      else if (LATIN_RE.test(value)) bucket.hospitalEn = value;
      recognized.push("المنشأة الصحية");
      continue;
    }
    if (/(مسمي|تخصص|اختصاص|position|specialty)/.test(L)) {
      if (ARABIC_RE.test(value)) bucket.doctorJobTitle = value;
      else if (LATIN_RE.test(value)) bucket.doctorJobTitleEn = value;
      recognized.push("المسمى الوظيفي");
      continue;
    }
    if (/(رمز|كود).*(خدم)|خدمه|خدمة|leave id|service (code|num)/.test(L)) {
      const sc = value.match(/[A-Za-z]{2,4}\d{7,}/);
      if (sc) bucket.serviceCode = sc[0].toUpperCase();
      recognized.push("رمز الخدمة");
      continue;
    }

    // ── Dates ── (checked after specific labels so "تاريخ الاجازه" is not
    //    swallowed by a generic "تاريخ")
    if (/(مدة|مده|duration)/.test(L)) {
      bucket._durationDays = parseDurationDays(value);
      if (bucket._durationDays) recognized.push("المدة");
      continue;
    }
    if (/(من تاريخ|تبدا من|تبدأ من|من يوم|admission|from date|^from$)/.test(L)) {
      const iso = parseDateValue(value);
      if (iso) {
        bucket.dateFromIso = iso;
        recognized.push("تبدأ من");
      }
      continue;
    }
    if (/(الي تاريخ|إلى تاريخ|الي يوم|وحتي|وحتى|to date|discharge|^to$)/.test(L)) {
      const iso = parseDateValue(value);
      if (iso) {
        bucket.dateToIso = iso;
        recognized.push("وحتى");
      }
      continue;
    }
    if (/(اصدار|إصدار|تقرير|issue date|report date)/.test(L)) {
      const iso = parseDateValue(value);
      if (iso) {
        bucket.sickLeaveDateIso = iso;
        recognized.push("تاريخ إصدار التقرير");
      }
      continue;
    }
    if (/(اجاز|إجاز|اجازه|leave date|sick leave)/.test(L)) {
      const iso = parseDateValue(value);
      if (iso) {
        bucket._leaveDateIso = iso;
        recognized.push("تاريخ الاجازة");
      }
      continue;
    }

    // ── Name (last, so doctor-name lines above are not stolen) ──
    if (/(اسم|الاسم|name|^id name|patient)/.test(L)) {
      if (ARABIC_RE.test(value)) bucket.patientName = value;
      else if (LATIN_RE.test(value)) bucket.patientNameEn = value.toUpperCase();
      recognized.push("الاسم");
      continue;
    }
  }

  // ── Derive the leave window ──
  // "تاريخ الاجازه" alone → from = to = that date. An explicit المدة
  // extends "to". Explicit من/الى dates always win.
  if (bucket._leaveDateIso) {
    if (!bucket.dateFromIso) bucket.dateFromIso = bucket._leaveDateIso;
    if (!bucket.dateToIso) {
      bucket.dateToIso = bucket._durationDays > 1
        ? addDaysIso(bucket.dateFromIso, bucket._durationDays - 1)
        : bucket._leaveDateIso;
    }
  } else if (bucket._durationDays > 1 && bucket.dateFromIso && !bucket.dateToIso) {
    bucket.dateToIso = addDaysIso(bucket.dateFromIso, bucket._durationDays - 1);
  }
  if (bucket.dateFromIso && !bucket.dateToIso) bucket.dateToIso = bucket.dateFromIso;

  // ── Assemble the result ──
  const fields: Partial<SmartParsedFields> = {};
  let filledCount = 0;
  for (const [key, val] of Object.entries(bucket)) {
    if (key.startsWith("_")) continue;
    if (typeof val === "string" && val.trim()) {
      (fields as Record<string, string>)[key] = val.trim();
      filledCount++;
    }
  }

  const hasName = Boolean(fields.patientName || fields.patientNameEn);
  const hasId = Boolean(fields.patientId);
  const hasDoctor = Boolean(fields.doctorName || fields.doctorNameEn);
  const hasFrom = Boolean(fields.dateFromIso);
  const hasTo = Boolean(fields.dateToIso);

  return {
    fields,
    filledCount,
    recognizedLabels: Array.from(new Set(recognized)),
    hasName,
    hasId,
    hasDoctor,
    hasFrom,
    hasTo,
    isComplete: hasName && hasId && hasDoctor && hasFrom && hasTo,
  };
}

/** English nationality → Arabic (small reverse map of the common ones). */
function reverseNationality(en: string): string | null {
  const v = en.trim().toLowerCase();
  for (const [ar, eng] of Object.entries(NATIONALITY_EN)) {
    if (eng.toLowerCase() === v) return ar;
  }
  return null;
}
