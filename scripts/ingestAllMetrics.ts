import type { IngestionSummary } from "../lib/types";
import { runMedianAgeIngestion } from "./ingestion/ingestMedianAge";
import { runMedianHomeValueIngestion } from "./ingestion/ingestMedianHomeValue";
import { runMedianHouseholdIncomeIngestion } from "./ingestion/ingestMedianHouseholdIncome";
import { runPopulationTotalIngestion } from "./ingestion/ingestPopulationTotal";
import { runUnemploymentRateIngestion } from "./ingestion/ingestUnemploymentRate";
import { loadIngestionEnv } from "./ingestion/utils";

export async function runAllMetricIngestions(): Promise<IngestionSummary[]> {
  loadIngestionEnv();
  console.log("[ingestAllMetrics] Starting all ingestions...");

  const summaries: IngestionSummary[] = [];

  console.log("[ingestAllMetrics] Running median_household_income...");
  summaries.push(await runMedianHouseholdIncomeIngestion());

  console.log("[ingestAllMetrics] Running population_total...");
  summaries.push(await runPopulationTotalIngestion());

  console.log("[ingestAllMetrics] Running unemployment_rate...");
  summaries.push(await runUnemploymentRateIngestion());

  console.log("[ingestAllMetrics] Running median_home_value...");
  summaries.push(await runMedianHomeValueIngestion());

  console.log("[ingestAllMetrics] Running median_age...");
  summaries.push(await runMedianAgeIngestion());

  console.log("[ingestAllMetrics] Completed all ingestions.");
  return summaries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllMetricIngestions().catch((err) => {
    console.error("[ingestAllMetrics] Failed:", err);
    process.exitCode = 1;
  });
}
