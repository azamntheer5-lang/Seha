/**
 * Curated Saudi hospital directory (دليل المستشفيات والشعارات والأطباء).
 *
 * Sources: the operator's own list (region → hospitals → doctors) plus the
 * major MOH / private / military facilities. Used for:
 *   - the portal's logo picker (زر تغيير الشعار) — every hospital has a
 *     generated wordmark SVG under /assets/logos/{slug}.svg,
 *   - the smart doctor directory's seed data (الأطباء يُزرعون تلقائيًا),
 *   - deriving a certificate's logo from the hospital name.
 */

export type HospitalType = "moh" | "private" | "military";

export type DirectoryDoctor = {
  nameAr: string;
  titleAr: string;
};

export type DirectoryHospital = {
  slug: string;
  nameAr: string;
  nameEn: string;
  region: string;
  type: HospitalType;
  doctors: DirectoryDoctor[];
};

export const HOSPITAL_DIRECTORY: DirectoryHospital[] = [
  // ── منطقة الرياض ──
  {
    slug: "ksmc", nameAr: "مدينة الملك سعود الطبية", nameEn: "King Saud Medical City", region: "الرياض", type: "moh",
    doctors: [
      { nameAr: "د. فهد بن عبدالله الخضيري", titleAr: "طبيب عام" },
      { nameAr: "د. محمد بن صالح الحربي", titleAr: "استشاري طب باطني" },
      { nameAr: "د. ناصر فهد جارالله", titleAr: "طبيب أسنان" },
    ],
  },
  {
    slug: "king-salman-riyadh", nameAr: "مستشفى الملك سلمان", nameEn: "King Salman Hospital", region: "الرياض", type: "moh",
    doctors: [
      { nameAr: "د. فهد بن عبدالله الخضيري", titleAr: "طبيب عام" },
      { nameAr: "د. محمد بن صالح الحربي", titleAr: "استشاري طب باطني" },
      { nameAr: "د. ناصر فهد جارالله", titleAr: "طبيب أسنان" },
    ],
  },
  // ── منطقة مكة المكرمة ──
  {
    slug: "king-abdulaziz-makkah", nameAr: "مستشفى الملك عبدالعزيز بمكة", nameEn: "King Abdulaziz Hospital - Makkah", region: "مكة المكرمة", type: "moh",
    doctors: [
      { nameAr: "د. فهد عبدالله الحجيلي", titleAr: "استشاري" },
      { nameAr: "د. حاتم احمد المكي", titleAr: "استشاري طب الأسرة" },
      { nameAr: "د. زهير محمد باحنشل", titleAr: "طبيب أسنان عام" },
    ],
  },
  {
    slug: "alnoor-specialist", nameAr: "مستشفى النور التخصصي", nameEn: "Al-Noor Specialist Hospital", region: "مكة المكرمة", type: "moh",
    doctors: [
      { nameAr: "د. فهد عبدالله الحجيلي", titleAr: "استشاري" },
      { nameAr: "د. حاتم احمد المكي", titleAr: "استشاري طب الأسرة" },
      { nameAr: "د. زهير محمد باحنشل", titleAr: "طبيب أسنان عام" },
    ],
  },
  // ── منطقة جدة ──
  {
    slug: "king-fahad-jeddah", nameAr: "مستشفى الملك فهد بجدة", nameEn: "King Fahad Hospital - Jeddah", region: "جدة", type: "moh",
    doctors: [
      { nameAr: "د. ريم بنت علي القرني", titleAr: "طبيب عام" },
      { nameAr: "د. فيصل عبدالله السيف", titleAr: "استشاري" },
      { nameAr: "د. اماني حسن القحطاني", titleAr: "طبيب عام" },
    ],
  },
  {
    slug: "king-abdullah-medical-complex", nameAr: "مجمع الملك عبدالله الطبي", nameEn: "King Abdullah Medical Complex", region: "جدة", type: "moh",
    doctors: [
      { nameAr: "د. ريم بنت علي القرني", titleAr: "طبيب عام" },
      { nameAr: "د. فيصل عبدالله السيف", titleAr: "استشاري" },
      { nameAr: "د. اماني حسن القحطاني", titleAr: "طبيب عام" },
    ],
  },
  // ── منطقة تبوك ──
  {
    slug: "king-khalid-tabuk", nameAr: "مستشفى الملك خالد بتبوك", nameEn: "King Khalid Hospital - Tabuk", region: "تبوك", type: "moh",
    doctors: [
      { nameAr: "د. محمد بن هليل العطوي", titleAr: "طبيب عام" },
      { nameAr: "د. أميرة احمد الشامان", titleAr: "طبيب عام" },
      { nameAr: "د. طارق بن خلف البلوي", titleAr: "استشاري" },
    ],
  },
  {
    slug: "king-fahad-specialist-tabuk", nameAr: "مستشفى الملك فهد التخصصي بتبوك", nameEn: "King Fahad Specialist Hospital - Tabuk", region: "تبوك", type: "moh",
    doctors: [
      { nameAr: "د. محمد بن هليل العطوي", titleAr: "طبيب عام" },
      { nameAr: "د. أميرة احمد الشامان", titleAr: "طبيب عام" },
      { nameAr: "د. طارق بن خلف البلوي", titleAr: "استشاري" },
    ],
  },
  // ── منطقة جازان ──
  {
    slug: "king-fahad-central-jazan", nameAr: "مستشفى الملك فهد المركزي بجازان", nameEn: "King Fahad Central Hospital - Jazan", region: "جازان", type: "moh",
    doctors: [
      { nameAr: "د. طاهر بن يحيى صميلي", titleAr: "استشاري" },
      { nameAr: "د. انور بن محمد مكين", titleAr: "طبيب عام" },
      { nameAr: "د. ابراهيم علي جبيلي", titleAr: "طبيب عام" },
    ],
  },
  {
    slug: "jazan-general", nameAr: "مستشفى جازان العام", nameEn: "Jazan General Hospital", region: "جازان", type: "moh",
    doctors: [
      { nameAr: "د. طاهر بن يحيى صميلي", titleAr: "استشاري" },
      { nameAr: "د. انور بن محمد مكين", titleAr: "طبيب عام" },
      { nameAr: "د. ابراهيم علي جبيلي", titleAr: "طبيب عام" },
    ],
  },
  // ── منطقة عسير / أبها ──
  {
    slug: "aser-central", nameAr: "مستشفى عسير المركزي", nameEn: "Asir Central Hospital", region: "أبها", type: "moh",
    doctors: [
      { nameAr: "د. عصام بن علي باتيس", titleAr: "استشاري" },
      { nameAr: "د. فواد محمد عباق", titleAr: "طبيب عام" },
      { nameAr: "د. محمد بن علي الزهيري", titleAr: "طبيب عام" },
    ],
  },
  {
    slug: "khamis-general", nameAr: "مستشفى الخميس العام", nameEn: "Khamis Mushait General Hospital", region: "أبها", type: "moh",
    doctors: [
      { nameAr: "د. عصام بن علي باتيس", titleAr: "استشاري" },
      { nameAr: "د. فواد محمد عباق", titleAr: "طبيب عام" },
      { nameAr: "د. محمد بن علي الزهيري", titleAr: "طبيب عام" },
    ],
  },
  // ── منطقة المدينة المنورة ──
  {
    slug: "saudi-german-madinah", nameAr: "المستشفى السعودي الألماني بالمدينة", nameEn: "Saudi German Hospital - Madinah", region: "المدينة المنورة", type: "private",
    doctors: [
      { nameAr: "د. اميرة محمد ابو العين", titleAr: "طبيب عام" },
      { nameAr: "د. محمد نشأت المرسي", titleAr: "طبيب عام" },
      { nameAr: "د. أمير ابراهيم البسيوني", titleAr: "استشاري" },
    ],
  },
  {
    slug: "madinah-general", nameAr: "مستشفى المدينة المنورة العام", nameEn: "Al-Madinah General Hospital", region: "المدينة المنورة", type: "moh",
    doctors: [
      { nameAr: "د. سامي بن مبروك الرحيلي", titleAr: "طبيب ممارس عام" },
      { nameAr: "د. صالح احمد حسن الغامدي", titleAr: "استشاري" },
    ],
  },
  // ── منطقة الظهران ──
  {
    slug: "kfmc-dhahran", nameAr: "مجمع الملك فهد الطبي العسكري بالظهران", nameEn: "King Fahad Armed Forces Hospital - Dhahran", region: "الظهران", type: "military",
    doctors: [
      { nameAr: "د. محسن صلاح عبدالعظيم محمود", titleAr: "أخصائي" },
      { nameAr: "د. عدنان محمود عبدالطيف الجويلا", titleAr: "استشاري" },
    ],
  },
  // ── منطقة الطائف ──
  {
    slug: "king-abdulaziz-specialist-taif", nameAr: "مستشفى الملك عبدالعزيز التخصصي بالطائف", nameEn: "King Abdulaziz Specialist Hospital - Taif", region: "الطائف", type: "moh",
    doctors: [
      { nameAr: "د. خالد عبدالرحيم", titleAr: "استشاري" },
      { nameAr: "د. معاوية اشافي", titleAr: "استشاري" },
    ],
  },
  {
    slug: "king-faisal-medical-complex-taif", nameAr: "مجمع الملك فيصل الطبي بالطائف", nameEn: "King Faisal Medical Complex - Taif", region: "الطائف", type: "moh",
    doctors: [
      { nameAr: "د. محمد شامي", titleAr: "استشاري" },
      { nameAr: "د. كاشف الياس", titleAr: "استشاري" },
    ],
  },
  // ── منطقة نجران ──
  { slug: "najran-general", nameAr: "مستشفى نجران العام", nameEn: "Najran General Hospital", region: "نجران", type: "moh", doctors: [] },
  // ── منطقة الباحة ──
  { slug: "king-fahad-bahah", nameAr: "مستشفى الملك فهد بالباحة", nameEn: "King Fahad Hospital - Al Bahah", region: "الباحة", type: "moh", doctors: [] },
  // ── إضافات عامة ──
  {
    slug: "saudi-german", nameAr: "المستشفى السعودي الألماني", nameEn: "Saudi German Hospital", region: "متعدد المناطق", type: "private",
    doctors: [
      { nameAr: "د. خالد بن سعد الحربي", titleAr: "طبيب عام" },
    ],
  },
  {
    slug: "king-faisal-specialist", nameAr: "مستشفى الملك فيصل التخصصي", nameEn: "King Faisal Specialist Hospital", region: "الرياض", type: "moh",
    doctors: [],
  },
  {
    slug: "king-abdullah-medical-city", nameAr: "مدينة الملك عبدالله الطبية", nameEn: "King Abdullah Medical City", region: "الرياض", type: "moh",
    doctors: [],
  },
  { slug: "security-forces", nameAr: "مستشفى قوى الأمن", nameEn: "Security Forces Hospital", region: "الرياض", type: "moh", doctors: [] },
  { slug: "national-guard", nameAr: "مستشفى الحرس الوطني", nameEn: "National Guard Hospital", region: "الرياض", type: "moh", doctors: [] },
  { slug: "al-mowassah", nameAr: "مستشفى المواساة", nameEn: "Al-Mowassah Hospital", region: "جدة", type: "private", doctors: [] },
  { slug: "alfaisaliah", nameAr: "مستشفى الفيصلية", nameEn: "Al-Faisaliah Hospital", region: "جدة", type: "private", doctors: [] },
];

/** Find a directory hospital by (fuzzy) Arabic name — containment match. */
export function findHospital(nameAr: string): DirectoryHospital | undefined {
  const n = (nameAr ?? "").trim();
  if (!n) return undefined;
  return (
    HOSPITAL_DIRECTORY.find((h) => h.nameAr === n) ??
    HOSPITAL_DIRECTORY.find((h) => h.nameAr.includes(n) || n.includes(h.nameAr)) ??
    HOSPITAL_DIRECTORY.find(
      (h) => n.includes(h.nameAr.replace("مستشفى ", "")) || h.nameAr.replace("مستشفى ", "").includes(n)
    )
  );
}

/** Logo URL for a hospital name (falls back to the MOH general logo). */
export function hospitalLogoUrl(nameAr: string): string {
  const h = findHospital(nameAr);
  return `/assets/logos/${h?.slug ?? "moh"}.svg`;
}
