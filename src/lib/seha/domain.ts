/**
 * Shared domain types + Arabic label mappings (mirrors the reference platform).
 */

/** صلة القرابة — relationship codes exactly as the reference maps them. */
export const RELATIONSHIP_LABELS: Record<number, string> = {
  1: "أم",
  2: "أب",
  3: "أخ",
  4: "أخت",
  5: "ابن",
  6: "ابنة",
  7: "زوج",
  8: "زوجة",
  9: "جد",
  10: "جدة",
  11: "الخال",
  12: "العم",
  13: "الخالة",
  14: "العمة",
  15: "ابن الأخت",
  16: "ابن الأخ",
  17: "ابنة الأخت",
  18: "ابنة الأخ",
};

export function relationshipLabel(code: number | null | undefined): string {
  if (code == null) return "";
  return RELATIONSHIP_LABELS[code] ?? "";
}

/** Sick leave status labels. */
export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "سارية",
  EXPIRED: "منتهية",
  CANCELLED: "ملغاة",
};

/** API shape returned by /api/inquiries/sick-leave.
 *  Field set mirrors the reference result grid exactly:
 *  الاسم، اسم المرافق، صلة القرابة، تاريخ إصدار تقرير الإجازة،
 *  تبدأ من، وحتى، المدة بالأيام، اسم الطبيب، المسمى الوظيفي.
 */
export type SickLeaveResult = {
  serviceCode: string;
  patientId: string; // masked, e.g. 10******89
  patientName: string;
  companionName: string;
  relationshipLabel: string;
  sickLeaveDate: string; // YYYY-MM-DD
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  durationDays: number;
  doctorName: string;
  doctorJobTitle: string;
  status: string; // ACTIVE | EXPIRED | CANCELLED (kept for API completeness)
  verificationCode: string;
  issuedAt: string; // ISO timestamp of record creation
};

export type InquiryErrorCode =
  | "VALIDATION_SERVICE_CODE"
  | "VALIDATION_PATIENT_ID"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "SERVER";

export type InquiryResponse =
  | { ok: true; data: SickLeaveResult }
  | { ok: false; error: InquiryErrorCode; message: string };

/** Format a Date as YYYY-MM-DD (local, no timezone drift). */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inquiry services shown on the index view (exact copy of the reference grid). */
export type InquiryService = {
  id: number;
  name: string;
  nameEn: string;
  desc: string;
};

export const INQUIRY_SERVICES: InquiryService[] = [
  {
    id: 1,
    name: "الإجازات المرضية",
    nameEn: "slenquiry",
    desc: "خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة وتمكنك من تصدير وطباعة نسخة لها",
  },
  {
    id: 2,
    name: "خدمة الاستعلام عن فحص اللياقة للطلبة المستجدين",
    nameEn: "mlenquiry",
    desc: "خدمة الاستعلام عن التقارير الطبية تتيح لك الاستعلام عن حالة التقرير الطبي وتمكنك من تصدير وطباعة نسخة له",
  },
  {
    id: 3,
    name: "خدمة الاستعلام عن شهادات فحص الزواج",
    nameEn: "premarriage",
    desc: "خدمة الاستعلام عن نتيجة الفحص ماقبل الزواج تتيح لك الاستعلام عن حالة طلبك وتمكنك من تصدير وطباعة نسخة لها",
  },
  {
    id: 4,
    name: "الاستعلام عن المنشآت المقدمة للخدمات الصحية",
    nameEn: "organizations",
    desc: "يمكنك الاستعلام عن المنشآت المقدمة للخدمات الصحية.",
  },
  {
    id: 5,
    name: "التحقق من شهادة فحص فايروس كورونا المستجد (كوفيد-19)",
    nameEn: "covid19report",
    desc: "خدمة الاستعلام تتيح التحقق من صحة تقرير فحص فايروس كورونا المستجد (كوفيد-19) عن طريق تقنية PCR",
  },
  {
    id: 6,
    name: "عرض التقرير الطبي وشهادة التطعيم",
    nameEn: "vaccineCertificate",
    desc: "خدمة الاستعلام عن التقارير الطبية والشهادات الخاصة بالتطعيمات تتيح امكانية التحقق من صحة البيانات الواردة في التقرير الطبي و شهادة التطعيم",
  },
  {
    id: 7,
    name: "الشهادات الصحية",
    nameEn: "AmanatInquiry",
    desc: "خدمة الاستعلام للشهادات الصحية (أمانات) تتيح لك الاستعلام عن تقريرك الطبي وتمكنك من تصديره وطباعته",
  },
  {
    id: 8,
    name: "رخص القيادة",
    nameEn: "DrivingLicenseInquiry",
    desc: "خدمة الاستعلام للفحص الطبي لرخص القيادة تتيح لك الاستعلام عن تقريرك الطبي وتمكنك من تصديره وطباعته",
  },
];
