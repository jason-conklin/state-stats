import { NextResponse } from "next/server";
import { runMedianHouseholdIncomeIngestion } from "@/scripts/ingestion/ingestMedianHouseholdIncome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const summary = await runMedianHouseholdIncomeIngestion();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    console.error("Admin ingestion failed", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
