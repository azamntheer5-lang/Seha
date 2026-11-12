/**
 * Hospital branding classifier (ترميز هوية المشفى في ترويسة التقرير).
 *
 * Rules agreed with the operator:
 *   1. Government (MOH) hospitals — ALL share the one unified Ministry of
 *      Health logo (palm + وزارة الصحة). No extra name under the logo: the
 *      emblem already carries the ministry identity.
 *   2. Saudi German Hospital — its own full lockup (logo + name + license
 *      number baked into the image).
 *   3. Other private hospitals — each has its own logo, and the hospital
 *      name is printed in Arabic AND English directly under the logo.
 *
 * Pure data + pure functions: safe on client and server.
 */

export type HospitalClass = "government" | "saudi_german" | "private";

/** Unified MOH emblem (وزارة الصحة) — every government hospital. */
export const MOH_LOGO_SRC = "/assets/paper/moh-logo.jpg";
/** Saudi German Hospital full lockup (logo + name + license no.). */
export const SAUDI_GERMAN_LOGO_SRC = "/assets/paper/saudi-german-full.jpg";
/** Generic facility mark for private hospitals we hold no artwork for. */
export const PRIVATE_FALLBACK_LOGO_SRC = "/assets/paper/facility-default.png";

/** Keywords that mark a hospital as a government (MOH / state) facility. */
const GOV_KEYWORDS: string[] = [
  "وزارة الصحة",
  "ministry of health",
  " moh",
  "مستشفى الملك ",
  "مستشفى الملك",
  "الملك فيصل التخصصي",
  "مدينة الملك سعود الطبية",
  "مدينة الملك عبدالله الطبية",
  "مدينة الملك عبدالعزيز الطبية",
  "مجمع الملك فهد الطبي",
  "مستشفى عام",
  "المستشفى العام",
  " مستشفى ",
  "القوات المسلحة",
  "الخدمات الطبية العسكرية",
  "الحرس الوطني",
  "الأمن العام",
  "قوى الأمن",
  "قوى الامن",
  "مستشفى المنطقة",
  "الصحة النفسية",
  "مستشفى التأهيل",
  "مركز صحي",
  "الرعاية الأولية",
];

/** Saudi German markers (spelling variants included). */
const SGH_KEYWORDS: string[] = [
  "السعودي الألماني",
  "السعودي الالماني",
  "السعودى الألمانى",
  "السعودي الالمانى",
  "سعودي ألماني",
  "سعودي الماني",
  "saudi german",
  "sgh ",
];

/**
 * Known private hospitals → canonical bilingual names. Anything private that
 * is not here still works: we print whatever names the record carries.
 */
const PRIVATE_HOSPITALS: { ar: string; en: string; keywords: string[] }[] = [
  { ar: "المستشفى السعودي الألماني", en: "Saudi German Hospital", keywords: SGH_KEYWORDS },
  { ar: "مستشفى المواساة", en: "Al Mowassah Hospital", keywords: ["المواساة", "mowassah", "mouwasat"] },
  { ar: "مجمعة د. سليمان فقيه الطبي", en: "Fakeeh Care Medical Group", keywords: ["فقيه", "fakeeh"] },
  { ar: "مستشفى الحمادي", en: "Al Hammadi Hospital", keywords: ["الحمادي", "hammadi"] },
  { ar: "مستشفى دله", en: "Dallah Hospital", keywords: ["دله", "دلة", "dallah"] },
  { ar: "مستشفى الجزيرة", en: "Al Jazeera Hospital", keywords: ["الجزيرة", "jazeera"] },
  { ar: "مستشفى رعاية الوطنية", en: "National Care Hospital", keywords: ["رعاية الوطنية", "national care"] },
  { ar: "مستشفى السعودي الفرنسي", en: "Saudi French Hospital", keywords: ["السعودي الفرنسي", "saudi french"] },
  { ar: "مستشفى الإسراء", en: "Al Israa Hospital", keywords: ["الاسرا", "الإسراء", "israa", "isra"] },
  { ar: "مستشفى الحبيب", en: "Al Habib Hospital", keywords: ["الحبيب", "habib"] },
  { ar: "مستشفى الأمل", en: "Al Amal Hospital", keywords: ["الأمل", "الامل", "amal"] },
];

export interface HospitalBrand {
  klass: HospitalClass;
  /** Logo image printed in the report header. */
  logoSrc: string;
  /** Print the hospital name (AR + EN) under the logo? Private-hospital rule. */
  showNameUnderLogo: boolean;
  /** Canonical Arabic name (falls back to the record's own value). */
  hospitalAr: string;
  /** Canonical English name (falls back to the record's own value). */
  hospitalEn: string;
}

const norm = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase();

function matches(haystack: string, keywords: string[]): boolean {
  const h = norm(haystack);
  return keywords.some((k) => h.includes(norm(k)));
}

/**
 * Classify a hospital from its (optional) Arabic / English names.
 * Unknown or empty input defaults to government — the safest default since
 * government hospitals are the majority and all share the MOH logo.
 */
export function classifyHospital(hospitalAr?: string, hospitalEn?: string): HospitalBrand {
  const ar = (hospitalAr ?? "").trim();
  const en = (hospitalEn ?? "").trim();
  const blob = `${ar} ${en}`;

  // Classify primarily on the ARABIC name (the operator's source of truth);
  // the English field is only a fallback — it may lag behind an edit.
  const primary = ar || en;

  if (primary && matches(primary, SGH_KEYWORDS)) {
    return {
      klass: "saudi_german",
      logoSrc: SAUDI_GERMAN_LOGO_SRC,
      showNameUnderLogo: false, // full lockup already carries the name + license
      hospitalAr: ar || "المستشفى السعودي الألماني",
      hospitalEn: en || "Saudi German Hospital",
    };
  }

  if (primary && matches(primary, GOV_KEYWORDS)) {
    return {
      klass: "government",
      logoSrc: MOH_LOGO_SRC,
      showNameUnderLogo: false, // MOH emblem already says وزارة الصحة
      hospitalAr: ar,
      hospitalEn: en || "Ministry of Health",
    };
  }

  // Private hospital (explicit, or non-government with a real name).
  // Match the Arabic name against the known list first so the bilingual
  // caption under the logo uses the canonical English name.
  const knownByAr = PRIVATE_HOSPITALS.find((p) => ar && matches(ar, p.keywords));
  const known = knownByAr ?? PRIVATE_HOSPITALS.find((p) => matches(blob, p.keywords));
  return {
    klass: "private",
    logoSrc: PRIVATE_FALLBACK_LOGO_SRC,
    showNameUnderLogo: true,
    hospitalAr: ar || known?.ar || "",
    hospitalEn: known?.en || en || "",
  };
}
