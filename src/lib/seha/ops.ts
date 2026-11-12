/**
 * Shared library for the sick-leave ISSUING portal (بوابة إصدار الإجازات).
 *
 * This portal is the private operator area, unlocked by clicking the site
 * logo and entering the secret access code. It ports the issuing workflow
 * of the previous generation system (service-number generation, Umm-al-Qura
 * Hijri conversion, report timestamps, and the payload contract between
 * the portal UI and the API). Field recognition from plain text lives in
 * smart-parse.ts — pure client-side, no AI call.
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
  templateId: string; // قالب التقرير (src/lib/seha/templates.ts)
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
  /** Client-only: certificate facility logo (custom upload or directory SVG). */
  logoUrl?: string;
};
