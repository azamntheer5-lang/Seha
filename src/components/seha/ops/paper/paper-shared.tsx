"use client";

/**
 * Shared helpers for the paper-facility sick-leave templates (قوالب المستشفيات
 * الورقية) ported 1:1 from the reference archive's print modules:
 *   - same A4 sheet metrics (210mm × 297mm @ 96dpi = 794 × 1123 px)
 *   - same embedded Arabic fonts as the official template
 *   - checkbox glyphs (☑ / ☐) used by the recommendation sections
 *   - date formatting matching the record's Gregorian / Hijri storage
 */

import type { CSSProperties } from "react";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const pad2 = (n: string) => String(n).padStart(2, "0");

/** YYYY-MM-DD → DD-MM-YYYY. */
export function fmtGregorian(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")) return "";
  const [y, m, d] = iso.split("-");
  return `${pad2(d)}-${pad2(m)}-${y}`;
}

/** Keep the zero-padded shape of stored Hijri dates (DD-MM-YYYY). */
export function fmtHijri(hijri: string): string {
  if (!hijri) return "";
  const parts = hijri.split(/[-/]/);
  if (parts.length < 3) return hijri;
  return parts.map((p) => (isNaN(Number(p)) ? p : pad2(p))).join("-");
}

/** Checked / unchecked box glyphs used across the paper recommendation lists. */
export const box = (on: boolean) => (on ? "\u2611" : "\u2610");

/** The @font-face block + base sheet style shared by every paper template. */
export const PAPER_FONT_CSS = `
  @font-face { font-family: 'SLNotoSansArabic'; src: url('/assets/pdf/fonts/NotoSansArabic-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
  @font-face { font-family: 'SLNotoSansArabic'; src: url('/assets/pdf/fonts/NotoSansArabic-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
  @font-face { font-family: 'SLAmiri'; src: url('/assets/pdf/fonts/Amiri-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
  @font-face { font-family: 'SLAmiri'; src: url('/assets/pdf/fonts/Amiri-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
  .paper-sheet, .paper-sheet * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .paper-sheet { width: 794px; height: 1123px; background: #fff; overflow: hidden; box-sizing: border-box;
    font-family: 'SLNotoSansArabic', sans-serif; position: relative; }
  .paper-sheet .en { font-family: 'SLAmiri', serif; direction: ltr; }
  .paper-sheet .ar { direction: rtl; }
`;

/** Common props + derived values for every paper template. */
export function usePaperData(data: PortalSickLeaveRecord) {
  return {
    nameAr: data.patientName,
    nameEn: data.patientNameEn,
    nameEnUpper: (data.patientNameEn || "").toUpperCase(),
    nationalId: data.patientId,
    leaveDays: data.durationDays,
    leaveFromEn: fmtGregorian(data.dateFromIso),
    leaveToEn: fmtGregorian(data.dateToIso),
    leaveFromAr: fmtHijri(data.dateFromHijri),
    leaveToAr: fmtHijri(data.dateToHijri),
    issueEn: fmtGregorian(data.sickLeaveDateIso),
    physicianAr: data.doctorName,
    physicianEn: data.doctorNameEn,
    physicianEnUpper: (data.doctorNameEn || "").toUpperCase(),
    positionAr: data.doctorJobTitle,
    positionEn: data.doctorJobTitleEn,
    hospitalAr: data.hospital,
    hospitalEn: data.hospitalEn,
    employerAr: data.employerAr,
    nationalityAr: data.nationalityAr,
    nationalityEn: data.nationalityEn,
    serviceCode: data.serviceCode,
  };
}

/** Inline helper for a dashed blank line (التوقيع ……) used on the paper forms. */
export const dashStyle: CSSProperties = {
  display: "inline-block",
  minWidth: 120,
  borderBottom: "1.2px solid #000",
  height: 11,
};
