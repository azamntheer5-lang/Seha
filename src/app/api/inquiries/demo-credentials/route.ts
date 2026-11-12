import { NextResponse } from "next/server";
import { maskId } from "@/lib/saudi-id";
import { getStore, sqliteStore } from "@/lib/seha/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/inquiries/demo-credentials
 *
 * Returns one seeded demo pair (masked ID is NOT enough — the user must be
 * able to actually submit the form, so the demo endpoint returns the full
 * demo ID for one record). This exists purely for the demo environment so
 * reviewers can exercise the full happy path (the reference site always
 * answers "لا يوجد نتائج" because it has no seeded data).
 *
 * Reads through the active store; if Supabase is configured but unreachable,
 * falls back to the bundled SQLite seeds.
 */
export async function GET() {
  let pair: { serviceCode: string; patientId: string } | null = null;

  try {
    pair = await getStore().firstActiveDemoPair();
  } catch (error) {
    console.error("[demo-credentials] primary store failed:", error);
    try {
      pair = await sqliteStore.firstActiveDemoPair();
    } catch {
      pair = null;
    }
  }

  if (!pair) {
    return NextResponse.json(
      { ok: false, message: "لا توجد بيانات تجريبية" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      serviceCode: pair.serviceCode,
      patientId: pair.patientId,
      patientIdMasked: maskId(pair.patientId),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
