import { runAcsMetricIngestion } from "./runAcsMetricIngestion";
import { noiseFromSeed, stateBaseFactor } from "./syntheticUtils";

const METRIC_ID = "median_home_value";
const LOG_PREFIX = "[ingestMedianHomeValue]";

function macroHomeFactor(year: number) {
  if (year >= 2005 && year <= 2007) return 1.08;
  if (year >= 2008 && year <= 2012) return 0.85;
  if (year >= 2013 && year <= 2016) return 1.06;
  if (year >= 2017) return 1.04;
  return 1;
}

function syntheticHomeValue(stateId: string, year: number, startYear: number) {
  const base = stateBaseFactor(METRIC_ID, stateId, 80_000, 500_000);
  const slope = stateBaseFactor(`${METRIC_ID}:slope`, stateId, 0.01, 0.05);
  const volatility = stateBaseFactor(`${METRIC_ID}:vol`, stateId, 0.9, 1.2);
  const yearsSince = year - startYear;
  const growth = Math.pow(1 + slope, yearsSince);
  const macro = macroHomeFactor(year);
  const noise = 1 + noiseFromSeed(`${METRIC_ID}:${stateId}:${year}`, 0.04);
  const value = base * growth * macro * volatility * noise;
  return Math.max(70_000, Math.round(value));
}

export async function runMedianHomeValueIngestion() {
  return runAcsMetricIngestion({
    metricId: METRIC_ID,
    logPrefix: LOG_PREFIX,
    variableCode: "B25077_001E",
    expectedLabelIncludes: ["Median value"],
    expectedConceptIncludes: ["Median value"],
    syntheticGenerator: syntheticHomeValue,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMedianHomeValueIngestion().catch((err) => {
    console.error(`${LOG_PREFIX} Unhandled error:`, err);
    process.exitCode = 1;
  });
}
