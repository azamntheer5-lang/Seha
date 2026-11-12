/**
 * Saudi National ID / Iqama number utilities.
 *
 * The reference implementation only checks `length === 10 && !isNaN`.
 * A senior implementation validates the actual checksum used by the
 * Saudi civil registry (a Luhn-like scheme):
 *
 *  - Exactly 10 digits.
 *  - First digit must be 1 (citizen) or 2 (resident/Iqama).
 *  - Digits at odd 1-based positions (1,3,5,7,9) are doubled; values > 9 lose 9.
 *  - Digits at even positions (2,4,6,8) are added as-is.
 *  - Check digit (10th) must equal (10 - (sum % 10)) % 10.
 */

export type SaudiIdValidation =
  | { valid: true; kind: "citizen" | "resident" }
  | { valid: false; reason: "EMPTY" | "FORMAT" | "CHECKSUM" };

const SAUDI_ID_RE = /^[12]\d{9}$/;

/** Compute the Luhn-like check digit for a 9-digit Saudi ID base. */
export function computeCheckDigit(base9: string): number {
  const digits = base9.split("").map(Number);
  let sum = 0;
  // Odd 1-based positions => indices 0,2,4,6,8
  for (let i = 0; i < 9; i += 2) {
    let d = digits[i] * 2;
    if (d > 9) d -= 9;
    sum += d;
  }
  // Even 1-based positions => indices 1,3,5,7
  for (let i = 1; i < 8; i += 2) {
    sum += digits[i];
  }
  return (10 - (sum % 10)) % 10;
}

/** Full validation of a Saudi ID / Iqama number. */
export function validateSaudiId(raw: string): SaudiIdValidation {
  const value = (raw ?? "").trim();
  if (!value) return { valid: false, reason: "EMPTY" };
  if (!/^\d{10}$/.test(value)) return { valid: false, reason: "FORMAT" };
  if (!SAUDI_ID_RE.test(value)) return { valid: false, reason: "FORMAT" };

  const checkDigit = Number(value[9]);
  const computed = computeCheckDigit(value.slice(0, 9));
  if (computed !== checkDigit) return { valid: false, reason: "CHECKSUM" };

  return { valid: true, kind: value[0] === "1" ? "citizen" : "resident" };
}

/** Generate a checksum-valid Saudi ID (used by the seed script / demo data). */
export function generateSaudiId(startsWith: 1 | 2 = 1, base?: string): string {
  const b =
    base ??
    Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  const base9 = (startsWith.toString() + b.slice(1)).padEnd(9, "0").slice(0, 9);
  const check = computeCheckDigit(base9);
  return base9 + check.toString();
}

/** Mask an ID for audit logging, e.g. "1023456789" -> "10******89". */
export function maskId(id: string): string {
  if (!id || id.length < 4) return "****";
  return id.slice(0, 2) + "*".repeat(id.length - 4) + id.slice(-2);
}

/** Normalize a service code: trim, collapse inner whitespace, uppercase. */
export function normalizeServiceCode(raw: string): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}
