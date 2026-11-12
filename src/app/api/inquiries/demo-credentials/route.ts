import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maskId } from "@/lib/saudi-id";

export const dynamic = "force-dynamic";

/**
 * GET /api/inquiries/demo-credentials
 *
 * Returns one seeded demo pair (masked ID is NOT enough — the user must be
 * able to actually submit the form, so the demo endpoint returns the full
 * demo ID for one record). This exists purely for the demo environment so
 * reviewers can exercise the full happy path (the reference site always
 * answers "لا يوجد نتائج" because it has no seeded data).
 */
export async function GET() {
  try {
    const record = await db.sickLeave.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { serviceCode: true, patientId: true },
    });

    if (!record) {
      return NextResponse.json(
        { ok: false, message: "لا توجد بيانات تجريبية" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        serviceCode: record.serviceCode,
        patientId: record.patientId,
        patientIdMasked: maskId(record.patientId),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[demo-credentials] failed:", error);
    return NextResponse.json(
      { ok: false, message: "تعذر تحميل البيانات التجريبية" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
