import { runUnemploymentRateIngestion } from "../ingestion/ingestUnemploymentRate";

runUnemploymentRateIngestion().catch((error) => {
  console.error("[ingestUnemploymentRate CLI] Failed:", error);
  process.exitCode = 1;
});
