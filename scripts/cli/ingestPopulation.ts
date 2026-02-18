import { runPopulationTotalIngestion } from "../ingestion/ingestPopulationTotal";

runPopulationTotalIngestion().catch((error) => {
  console.error("[ingestPopulationTotal CLI] Failed:", error);
  process.exitCode = 1;
});
