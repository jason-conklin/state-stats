import { runMedianHomeValueIngestion } from "../ingestion/ingestMedianHomeValue";

runMedianHomeValueIngestion().catch((error) => {
  console.error("[ingestMedianHomeValue CLI] Failed:", error);
  process.exitCode = 1;
});
