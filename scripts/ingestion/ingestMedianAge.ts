import { runAcsMetricIngestion } from "./runAcsMetricIngestion";
import { noiseFromSeed, stateBaseFactor } from "./syntheticUtils";

const METRIC_ID = "median_age";
const LOG_PREFIX = "[ingestMedianAge]";

function syntheticMedianAge(stateId: string, year: number, startYear: number) {
  const base = stateBaseFactor(METRIC_ID, stateId, 30, 42);
  const driftPerYear = stateBaseFactor(`${METRIC_ID}:drift`, stateId, 0.02, 0.08);
  const yearsSince = year - startYear;
  const noise = noiseFromSeed(`${METRIC_ID}:${stateId}:${year}`, 0.2);
  const value = base + driftPerYear * yearsSince + noise;
  return Number(value.toFixed(2));
}

export async function runMedianAgeIngestion() {
  return runAcsMetricIngestion({
    metricId: METRIC_ID,
    logPrefix: LOG_PREFIX,
    variableCode: "B01002_001E",
    expectedLabelIncludes: ["Median age"],
    expectedConceptIncludes: ["Median age by sex"],
    syntheticGenerator: syntheticMedianAge,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMedianAgeIngestion().catch((err) => {
    console.error(`${LOG_PREFIX} Unhandled error:`, err);
    process.exitCode = 1;
  });
}
