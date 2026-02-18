import { runMedianAgeIngestion } from "../ingestion/ingestMedianAge";

runMedianAgeIngestion().catch((error) => {
  console.error("[ingestMedianAge CLI] Failed:", error);
  process.exitCode = 1;
});
