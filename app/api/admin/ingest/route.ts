import { NextResponse } from "next/server";
import { runAllMetricIngestions } from "@/scripts/ingestAllMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractProvidedSecret(request: Request) {
  const headerSecret = request.headers.get("x-admin-ingest-secret")?.trim();
  if (headerSecret) return headerSecret;

  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return null;

  const lower = authHeader.toLowerCase();
  if (!lower.startsWith("bearer ")) return null;

  return authHeader.slice(7).trim();
}

export async function POST(request: Request) {
  const configuredSecret = process.env.ADMIN_INGEST_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_INGEST_SECRET is not configured." },
      { status: 500 },
    );
  }

  const providedSecret = extractProvidedSecret(request);
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summaries = await runAllMetricIngestions();
    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    console.error("Admin ingestion failed", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
