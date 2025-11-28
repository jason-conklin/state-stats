import { runMedianHouseholdIncomeIngestion } from "./ingestion/ingestMedianHouseholdIncome";
import { runPopulationTotalIngestion } from "./ingestion/ingestPopulationTotal";
import { runUnemploymentRateIngestion } from "./ingestion/ingestUnemploymentRate";
import { runMedianHomeValueIngestion } from "./ingestion/ingestMedianHomeValue";
import { runMedianAgeIngestion } from "./ingestion/ingestMedianAge";

async function main() {
  console.log("[ingestAllMetrics] Starting all ingestions...");

  console.log("[ingestAllMetrics] Running median_household_income...");
  await runMedianHouseholdIncomeIngestion();

  console.log("[ingestAllMetrics] Running population_total...");
  await runPopulationTotalIngestion();

  console.log("[ingestAllMetrics] Running unemployment_rate...");
  await runUnemploymentRateIngestion();

  console.log("[ingestAllMetrics] Running median_home_value...");
  await runMedianHomeValueIngestion();

  console.log("[ingestAllMetrics] Running median_age...");
  await runMedianAgeIngestion();

  console.log("[ingestAllMetrics] Completed all ingestions.");
}

main().catch((err) => {
  console.error("[ingestAllMetrics] Failed:", err);
  process.exitCode = 1;
});
