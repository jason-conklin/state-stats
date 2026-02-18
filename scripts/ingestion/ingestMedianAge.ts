import { runAcsMetricIngestion } from "./runAcsMetricIngestion";
import { ACS_ONE_YEAR_REAL_WINDOW_CONFIG } from "./acsWindow";
import { noiseFromSeed, stateBaseFactor } from "./syntheticUtils";
import { pathToFileURL } from "node:url";

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
    expectedWindowConfig: ACS_ONE_YEAR_REAL_WINDOW_CONFIG,
    syntheticGenerator: syntheticMedianAge,
  });
}

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectRun) {
  runMedianAgeIngestion().catch((err) => {
    console.error(`${LOG_PREFIX} Unhandled error:`, err);
    process.exitCode = 1;
  });
}
