/**
 * Sick-leave REPORT TEMPLATE registry (سجل قوالب التقرير).
 *
 * The issuing portal starts every new leave with a template choice — the
 * operator picks the print design the PDF will use. This module is the
 * single source of truth for the AVAILABLE templates (pure data, safe on
 * the client and the server):
 *
 *   - `id`            persisted on every issued record (`template_id`) so a
 *                     re-issue or future re-print always renders the same
 *                     design the operator chose.
 *   - the UI renders a LIVE miniature of the real A4 document per template
 *     (see ops-portal.tsx), so what the operator sees in the picker is
 *     exactly what prints.
 *   - the renderer dispatch lives in
 *     src/components/seha/ops/template-document.tsx — adding a template is
 *     one component + one registry entry + one switch case.
 *
 * Unknown ids (old records, hand-edited DBs) always fall back to the
 * default template, so a PDF NEVER fails to render.
 */

export type SickLeaveTemplateId = "official";

export interface SickLeaveTemplateMeta {
  /** Persisted on the record (sick_leaves.template_id). */
  id: SickLeaveTemplateId | string;
  /** Arabic name shown in the picker. */
  nameAr: string;
  /** English name (secondary line). */
  nameEn: string;
  /** One-line Arabic description of the design. */
  descriptionAr: string;
  /** Short design tagline shown on the card. */
  taglineAr: string;
  /** True for the template pre-selected on a fresh leave. */
  isDefault?: boolean;
}

/** The template used when a record has no (or an unknown) template id. */
export const DEFAULT_TEMPLATE_ID: SickLeaveTemplateId = "official";

/** Every registered template, in picker order. */
export const SICK_LEAVE_TEMPLATES: SickLeaveTemplateMeta[] = [
  {
    id: "official",
    nameAr: "القالب الرسمي",
    nameEn: "Official Bilingual Report",
    descriptionAr:
      "تقرير إجازة مرضية ثنائي اللغة (عربي / إنجليزي) — الجدول الرسمي بشعار صحة والمملكة، صف المدة الداكن، وتذييل التحقق مع QR ورابط الاستعلام.",
    taglineAr: "تقرير إجازة مرضية — جدول ثنائي اللغة",
    isDefault: true,
  },
];

const BY_ID = new Map(SICK_LEAVE_TEMPLATES.map((t) => [t.id, t]));

/**
 * Validate an incoming template id (API body, DB row, URL param…).
 * Anything unknown — including empty — resolves to the default template,
 * so rendering and saving never fail because of a bad id.
 */
export function normalizeTemplateId(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return BY_ID.has(raw) ? raw : DEFAULT_TEMPLATE_ID;
}

/** Template metadata by id (always resolves — falls back to the default). */
export function getTemplateMeta(id: unknown): SickLeaveTemplateMeta {
  return BY_ID.get(normalizeTemplateId(id)) ?? SICK_LEAVE_TEMPLATES[0];
}

/** True when more than one design is registered (picker shows a choice). */
export const hasMultipleTemplates = (): boolean => SICK_LEAVE_TEMPLATES.length > 1;
