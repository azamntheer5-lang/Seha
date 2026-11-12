"use client";

/**
 * TemplateDocument — the single RENDER DISPATCH point for sick-leave
 * templates (نقطة توجيه القوالب).
 *
 * Every place that renders a sick-leave document (the review-page preview,
 * the off-screen 1:1 PDF capture node, the template picker's miniatures)
 * goes through this component, so the chosen `templateId` always produces
 * the matching design everywhere — screen and PDF can never disagree.
 *
 * ADDING A TEMPLATE (3 steps, ~zero risk to existing flows):
 *   1. Create the A4 document component (copy sick-leave-document.tsx as a
 *      starting point) — same props: { data: PortalSickLeaveRecord }.
 *   2. Register it in src/lib/seha/templates.ts (id, name, description).
 *   3. Add one `case` below. The picker, the review page and the PDF
 *      automatically pick it up.
 *
 * Unknown ids (old records, hand-edited data) fall back to the default
 * template — rendering never fails.
 */

import { SickLeaveDocument } from "./sick-leave-document";
import { KhalidSickLeaveDocument } from "./paper/khalid-sick-leave";
import { MadinaSickLeaveDocument } from "./paper/madina-sick-leave";
import { HaqlSickLeaveDocument } from "./paper/haql-sick-leave";
import { KfghSickLeaveFormDocument } from "./paper/kfgh-sick-leave-form";
import { KsmcSickLeaveDocument } from "./paper/ksmc-sick-leave";
import { normalizeTemplateId } from "@/lib/seha/templates";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

export function TemplateDocument({
  templateId,
  data,
}: {
  templateId: string;
  data: PortalSickLeaveRecord;
}) {
  switch (normalizeTemplateId(templateId)) {
    // ── القالب الرسمي: تقرير إجازة مرضية ثنائي اللغة ──
    case "official":
    default:
      return <SickLeaveDocument data={data} />;

    // ── نماذج المستشفيات الورقية (منسوخة عن الحزمة المرجعية) ──
    case "khalid_sick_leave":
      return <KhalidSickLeaveDocument data={data} />;
    case "madina_sick_leave":
      return <MadinaSickLeaveDocument data={data} />;
    case "haql_sick_leave":
      return <HaqlSickLeaveDocument data={data} />;
    case "kfgh_sick_leave_form":
      return <KfghSickLeaveFormDocument data={data} />;
    case "ksmc_sick_leave":
      return <KsmcSickLeaveDocument data={data} />;
  }
}
