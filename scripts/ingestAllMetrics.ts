import { runAllMetricIngestions } from "./ingestion/runAllMetrics";
import { loadIngestionEnv } from "./ingestion/utils";

function describeSecret(secret: string | undefined) {
  const trimmed = secret?.trim();
  if (!trimmed) return "missing";
  return `present (${trimmed.slice(0, 4)}...)`;
}

function describeDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl?.trim()) {
    return "missing";
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname || "unknown-host";
    const port = parsed.port || "5432";
    return `${host}:${port}`;
  } catch {
    return "invalid";
  }
}

function logPreflight() {
  const censusKey = process.env.CENSUS_API_KEY;
  const blsKey = process.env.BLS_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  console.log("🔎 [ingestAllMetrics] Preflight");
  console.log(`  Node: ${process.version}`);
  console.log(`  DATABASE_URL: ${describeDatabaseUrl(databaseUrl)}`);
  console.log(`  CENSUS_API_KEY: ${describeSecret(censusKey)}`);
  console.log(`  BLS_API_KEY: ${describeSecret(blsKey)}`);

  if (!censusKey?.trim() && !blsKey?.trim()) {
    console.warn(
      "⚠️ [ingestAllMetrics] Neither CENSUS_API_KEY nor BLS_API_KEY is set. Ingestion will use synthetic fallback data.",
    );
  }
}

function installGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason) => {
    console.error("❌ [ingestAllMetrics] Unhandled rejection:", reason);
    process.exitCode = 1;
  });

  process.on("uncaughtException", (error) => {
    console.error("❌ [ingestAllMetrics] Uncaught exception:", error);
    process.exitCode = 1;
  });
}

async function main() {
  loadIngestionEnv();
  installGlobalErrorHandlers();

  const startedAt = Date.now();
  console.log("🚀 [ingestAllMetrics] Starting...");
  logPreflight();

  const summaries = await runAllMetricIngestions();
  const failed = summaries.filter((summary) => summary.status === "failed");
  if (failed.length > 0) {
    throw new Error(
      `One or more metric ingestions failed: ${failed.map((summary) => summary.runId).join(", ")}`,
    );
  }

  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`✅ [ingestAllMetrics] Finished in ${durationSeconds}s.`);
}

main().catch((error) => {
  console.error("❌ [ingestAllMetrics] Failed:", error);
  process.exitCode = 1;
});
