/**
 * Semantic name-aware wrapping — 1:1 port of the reference issuing system's
 * nameWrap.js, adapted to return React nodes instead of HTML strings.
 *
 * A name is split into unbreakable UNITS (connector words bind to what
 * follows: "AL BARAKATI", "بن عبد العزيز", "VAN DER BERG") and the CSS
 * layer (text-wrap: balance) distributes the units across lines evenly.
 */

const MAX_UNIT = 24;
const MAX_TOKEN = 28;
const MAX_SHORT = 2;

const CONNECTORS = new Set([
  // Latin transliterations of Arabic name parts
  "al", "el", "ad", "abu", "abo", "abou", "aboo", "aba", "abd", "abdul", "abdel",
  "abdol", "abdal", "bin", "ben", "bn", "ibn", "bint", "bnt", "um", "umm",
  "bani", "banu", "beni", "ould", "ait", "ul", "ud",
  // European compound surnames
  "van", "von", "der", "den", "de", "del", "della", "da", "das", "dos", "do",
  "di", "du", "la", "le", "ter", "ten", "af", "av", "zu", "san", "santa",
  // Arabic
  "ال", "بن", "ابن", "بنت", "عبد", "ابو", "ابا", "ام", "ذو", "ذي", "بني", "بنو",
]);

const normalizeToken = (word: string): string =>
  String(word)
    .toLowerCase()
    .replace(/[.,'’`\-_]/g, "")
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

const bindsForward = (word: string): boolean => {
  const normalized = normalizeToken(word);
  return normalized.length <= MAX_SHORT || CONNECTORS.has(normalized);
};

/** Split a name into unbreakable units (arrays of words). */
export function groupName(name: string): string[][] {
  const tokens = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];

  const units: string[][] = [];
  let i = 0;

  while (i < tokens.length) {
    const unit = [tokens[i]];
    let length = tokens[i].length;

    while (
      bindsForward(unit[unit.length - 1]) &&
      i + unit.length < tokens.length &&
      length + 1 + tokens[i + unit.length].length <= MAX_UNIT
    ) {
      const next = tokens[i + unit.length];
      unit.push(next);
      length += 1 + next.length;
    }

    units.push(unit);
    i += unit.length;
  }

  // Trailing connector with nothing to bind: merge into the previous unit.
  if (units.length > 1) {
    const last = units[units.length - 1];
    const previous = units[units.length - 2];
    const merged = [...previous, ...last].join(" ").length;
    if (merged <= MAX_UNIT) {
      units.splice(units.length - 2, 2, [...previous, ...last]);
    }
  }

  return units;
}

/** Render a name as unbreakable unit spans (class "nb" keeps each unit whole). */
export function NameSpan({ name }: { name: string }) {
  const units = groupName(name);
  if (units.length === 0) return null;
  return (
    <>
      {units.map((unit, idx) => (
        <span key={idx} className="nb">
          {unit.join(" ")}
          {idx < units.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
