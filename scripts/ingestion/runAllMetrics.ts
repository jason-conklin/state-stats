import type { IngestionSummary } from "../../lib/types";
import { runMedianAgeIngestion } from "./ingestMedianAge";
import { runMedianHomeValueIngestion } from "./ingestMedianHomeValue";
import { runMedianHouseholdIncomeIngestion } from "./ingestMedianHouseholdIncome";
import { runPopulationTotalIngestion } from "./ingestPopulationTotal";
import { runUnemploymentRateIngestion } from "./ingestUnemploymentRate";

type MetricRunner = () => Promise<IngestionSummary>;

const INGESTION_STEPS: Array<{ metricId: string; run: MetricRunner }> = [
  { metricId: "median_household_income", run: runMedianHouseholdIncomeIngestion },
  { metricId: "population_total", run: runPopulationTotalIngestion },
  { metricId: "unemployment_rate", run: runUnemploymentRateIngestion },
  { metricId: "median_home_value", run: runMedianHomeValueIngestion },
  { metricId: "median_age", run: runMedianAgeIngestion },
];

export async function runAllMetricIngestions(): Promise<IngestionSummary[]> {
  console.log("[ingestAllMetrics] Starting all ingestions...");
  const summaries: IngestionSummary[] = [];

  for (const step of INGESTION_STEPS) {
    console.log(`[ingestAllMetrics] ▶ Running ${step.metricId}...`);
    try {
      const summary = await step.run();
      if (summary.status === "failed") {
        throw new Error(`Metric ${step.metricId} returned failed status.`);
      }
      summaries.push(summary);
      console.log(`[ingestAllMetrics] ✅ ${step.metricId} done (status=${summary.status}).`);
    } catch (error) {
      console.error(`[ingestAllMetrics] ❌ ${step.metricId} failed.`, error);
      throw error;
    }
  }

  console.log("[ingestAllMetrics] Completed all ingestions.");
  return summaries;
}
