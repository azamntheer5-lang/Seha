/**
 * Shared library for the sick-leave ISSUING portal (بوابة إصدار الإجازات).
 *
 * This portal is the private operator area, unlocked by clicking the site
 * logo and entering the secret access code. It ports the issuing workflow
 * of the previous generation system (service-number generation, Umm-al-Qura
 * Hijri conversion, report timestamps, and the smart AI extraction prompt).
 */

import crypto from "crypto";

// ───────────────────────────────────────────────────────────────────────────
// Access control
// ───────────────────────────────────────────────────────────────────────────

/**
 * The secret code that unlocks the issuing portal. Override with the
 * OPS_ACCESS_CODE environment variable without touching the code.
 */
export const OPS_ACCESS_CODE = process.env.OPS_ACCESS_CODE ?? "08522580";

/** Constant-time comparison so the code can't be timed character-by-character. */
export function isValidAccessCode(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const a = Buffer.from(crypto.createHash("sha256").update(candidate).digest());
  const b = Buffer.from(crypto.createHash("sha256").update(OPS_ACCESS_CODE).digest());
  return crypto.timingSafeEqual(a, b);
}

// ───────────────────────────────────────────────────────────────────────────
// Service numbers — same formats as the reference issuing system
// ───────────────────────────────────────────────────────────────────────────

export type ServicePrefix = "PSL" | "GSL";

/** PSL + 261 + 8 random digits (e.g. PSL26197640978). */
export function generateServiceNumber(prefix: ServicePrefix = "PSL"): string {
  const digits = prefix === "PSL" ? 8 : 9;
  const min = 10 ** (digits - 1);
  const random = Math.floor(min + Math.random() * (9 * min));
  return `${prefix}261${random}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Dates — Umm-al-Qura Hijri conversion + duration + print timestamp
// ───────────────────────────────────────────────────────────────────────────

const hijriParts = () =>
  new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

const pad2 = (n: number | string) => String(n).padStart(2, "0");

/** Gregorian ISO date (YYYY-MM-DD) → Hijri (DD-MM-YYYY). "" when invalid. */
export function toHijri(gregorianIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gregorianIso ?? "")) return "";
  const d = new Date(`${gregorianIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const parts = hijriParts().formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = parseInt(get("day"), 10);
    const month = parseInt(get("month"), 10);
    const year = parseInt(get("year").replace(/\D/g, ""), 10);
    if (!day || !month || !year) return "";
    return `${pad2(day)}-${pad2(month)}-${year}`;
  } catch {
    return "";
  }
}

/** Inclusive day count between two ISO dates (from == to → 1 day). */
export function computeDurationDays(fromIso: string, toIso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso ?? "")) return 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toIso ?? "")) return 0;
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.round((to - from) / 86_400_000) + 1;
}

/** "05:22 PM" */
export function reportTimeString(d = new Date()): string {
  return d
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toUpperCase();
}

/** "Thursday, 29 October 2026" */
export function reportDateString(d = new Date()): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Portal payload contract
// ───────────────────────────────────────────────────────────────────────────

export type PortalSickLeaveInput = {
  serviceCode: string;
  patientId: string;
  patientName: string;
  patientNameEn: string;
  patientPhone: string;
  sickLeaveDateIso: string; // تاريخ إصدار التقرير
  dateFromIso: string; // تبدأ من
  dateToIso: string; // وحتى
  doctorName: string;
  doctorNameEn: string;
  doctorJobTitle: string;
  doctorJobTitleEn: string;
  hospital: string;
  hospitalEn: string;
  licenseNumber: string;
  employerAr: string;
  nationalityAr: string;
  nationalityEn: string;
  addQr: boolean;
  showLicense: boolean;
};

export type PortalSickLeaveRecord = PortalSickLeaveInput & {
  id: string;
  dateFromHijri: string;
  dateToHijri: string;
  durationDays: number;
  reportTime: string;
  reportDate: string;
  verificationCode: string;
  createdAt: string;
};

// ───────────────────────────────────────────────────────────────────────────
// Smart AI extraction — the prompt ported from the previous system
// ───────────────────────────────────────────────────────────────────────────

export const EXTRACTION_FIELDS = [
  "serviceNum",
  "nationalID",
  "phone",
  "leaveId",
  "admissionDate",
  "dischargeDate",
  "issueDate",
  "licenseNumber",
  "name",
  "nameArabic",
  "doctorName",
  "doctorNameArabic",
  "hospitalNameEnglish",
  "hospitalNameArabic",
  "physicianPosition",
  "physicianPositionArabic",
  "employer",
  "nationality",
] as const;

export type ExtractionResult = Record<(typeof EXTRACTION_FIELDS)[number], string>;

export function buildExtractionPrompt(source: string): string {
  return `You are an expert medical-data extractor for Saudi sick-leave workflows.
The input below is ONE of two common shapes; identify which, then extract.

── INPUT SHAPES ──

SHAPE A — SECRETARY MESSAGE (WhatsApp / plain notes)
Recognisable by short "label: value" lines in Arabic; no bilingual
headers, no Hijri dates, no "Leave ID". Common labels (may include
typos/extra spaces):
  الاسم | رقم الهوية | تاريخ الميلاد | رقم الجوال | جهة العمل |
  الجنسية | المنطقة | اسم المهنة | تاريخ الاجازه/الاجازة
Rules for shape A:
- "اسم المهنة" is the PATIENT's occupation (كاشير، موظف استقبال، طالب …).
  It is NEVER the doctor's specialty. DO NOT put it in
  physicianPosition / physicianPositionArabic. There is no output
  field for the patient's occupation — ignore it.
- "تاريخ الميلاد" and "المنطقة" have no output field either — ignore
  them, do not stuff them elsewhere.
- "تاريخ الاجازه" is the sick-leave date → admissionDate; also copy the
  same value to dischargeDate. If the value is a bare day ("17") or
  contains only a month name without a year ("2 Sep"), leave both dates
  empty ("") — never invent the missing parts.
- The doctor / hospital fields are usually absent in this shape; leave
  them "".

SHAPE B — SEHA / OFFICIAL SICK-LEAVE REPORT (PDF / screenshot text)
Recognisable by bilingual headers ("Sick Leave Report / تقرير إجازة
مرضية"), a "Leave ID" token, Hijri and Gregorian dates side-by-side,
and a hospital line usually near the BOTTOM in both Arabic and English.
Rules for shape B:
- serviceNum AND leaveId = the value on the "Leave ID" line (uppercase,
  no separators). Common prefixes: GSL, PSL, CSL.
- Hospital name is the facility line near the end (Arabic "مستشفى …" or
  English "… Hospital"). IGNORE these lines entirely — they are NOT
  the hospital: "وزارة الصحة", "Ministry of Health", "المركز الوطني
  للمعلومات الصحية", "National Health Information Center", any URL
  (www.seha.sa/…), "Seha", "صحة", any Hijri/Gregorian timestamp line.
- "Practitioner Name" and "Physician Name" both label the doctor —
  same field (doctorName / doctorNameArabic).
- "Position" / "المسمى الوظيفي" is the DOCTOR's specialty. Seha often
  prints it truncated as "General" — treat it as "General
  Practitioner" / "طبيب عام".
- Dates are DD-MM-YYYY in the Gregorian column. Take the GREGORIAN
  value and output as YYYY-MM-DD.
- License: numeric string after "رقم الترخيص" / "License".
- Employer: the Arabic line under "Employer / جهة العمل" — the
  organisation name only.
- OCR often REVERSES English names. When Arabic is present, treat
  it as the source of truth for word order and derive a natural
  English transliteration in the SAME order. Do NOT copy the
  reversed English verbatim.

── FIELDS TO EXTRACT ──
(use these exact keys; unknown fields → "")

Single-value fields (extract as-is, never translate):
- serviceNum: (Leave ID uppercase, e.g. GSL261..., PSL261...) or ""
- nationalID: (10-digit Saudi ID/Iqama, digits only) or ""
- phone: (phone number, Saudi mobiles usually start with 05...) or ""
- leaveId: (same value as serviceNum in shape B; else "")
- admissionDate: (YYYY-MM-DD) or ""
- dischargeDate: (YYYY-MM-DD) or ""
- issueDate: (YYYY-MM-DD) or ""
- licenseNumber: (medical license number) or ""

Bilingual fields — ALWAYS provide BOTH Arabic AND English:
- name: (Patient name in ENGLISH — patient only, no titles)
- nameArabic: (Patient name in ARABIC)
- doctorName: (Doctor name in ENGLISH — NAME ONLY; drop titles
  "د.", "الدكتور", "Dr.", "Prof."; never include specialty or license)
- doctorNameArabic: (Doctor name in ARABIC — same rule)
- hospitalNameEnglish: (Facility name ONLY, in ENGLISH — the official
  facility line and nothing else. NEVER include: department ("قسم",
  "Department"), reception, cashier, staff names, badge numbers,
  phone/fax, PO box, VAT, address lines, URLs, or timestamps.)
- hospitalNameArabic: (Same rule, in ARABIC — the facility name only)
- physicianPosition: (Doctor specialty in ENGLISH — SPECIALTY ONLY,
  e.g. "General Practitioner"; NOT the patient's occupation)
- physicianPositionArabic: (Doctor specialty in ARABIC — same rule)
- employer: (Employer / place of work — favour Arabic if present; the
  employer name only, not the address or phone)
- nationality: (Patient nationality in ARABIC — e.g. 'السعودية', 'مصري')

── BILINGUAL RULES ──
1. If ONLY Arabic is in the source: keep the Arabic value as-is and
   generate the English equivalent:
   • Personal names → natural transliteration (محمد تركي البلوي → Mohammed Turki Al-Balawi)
   • Titles/positions → standard English (طبيب عام → General Practitioner)
   • Hospital names → formal translation (مستشفى الملك فهد → King Fahad Hospital)
2. If ONLY English is in the source: keep the English and generate the Arabic.
3. If BOTH exist: preserve both exactly as written — EXCEPT name
   order fixes for reversed OCR (use the Arabic order).

── DATA INTEGRITY ──
- NEVER invent missing information
- NEVER fabricate ID numbers, phone numbers, or dates
- If a field is missing from the text, return ""
- Do NOT complete partial dates

Return ONLY the raw JSON object. No markdown, no code blocks, no explanation.

Input to process:
"""
${source}
"""`;
}

/** Robustly pull the JSON object out of an LLM answer. */
export function parseExtractionJson(raw: string): Partial<ExtractionResult> {
  if (!raw) return {};
  let text = raw.trim();
  // strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // slice to the outermost braces
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) text = text.slice(first, last + 1);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const out: Partial<ExtractionResult> = {};
      for (const key of EXTRACTION_FIELDS) {
        const v = (parsed as Record<string, unknown>)[key];
        if (typeof v === "string") out[key] = v.trim();
      }
      return out;
    }
  } catch {
    /* fall through */
  }
  return {};
}
