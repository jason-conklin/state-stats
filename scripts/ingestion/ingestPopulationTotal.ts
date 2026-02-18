import { runAcsMetricIngestion } from "./runAcsMetricIngestion";
import { hashString, stateBaseFactor } from "./syntheticUtils";

const METRIC_ID = "population_total";
const LOG_PREFIX = "[ingestPopulationTotal]";

function syntheticPopulation(stateId: string, year: number, startYear: number) {
  const base = stateBaseFactor(METRIC_ID, stateId, 500_000, 40_000_000);
  const fastGrowers = ["06", "12", "04", "48", "37"]; // CA, FL, AZ, TX, NC
  const slowGrowers = ["26", "38", "46", "31", "55", "27", "29", "39", "42"]; // sample rust-belt/flat
  let growthRate = 0.006;
  if (fastGrowers.includes(stateId)) growthRate = 0.015;
  if (slowGrowers.includes(stateId)) growthRate = 0.001;
  if (base < 1_000_000) growthRate += 0.003;

  const decadeBoost = year >= 2010 && year <= 2020 ? 1.05 : 1;
  const yearsSince = year - startYear;
  const value = base * Math.pow(1 + growthRate, yearsSince) * decadeBoost;
  const noise = 1 + (hashString(`${stateId}:${year}`) % 5000) / 500_000;
  return Math.max(80_000, Math.round(value * noise));
}

export async function runPopulationTotalIngestion() {
  return runAcsMetricIngestion({
    metricId: METRIC_ID,
    logPrefix: LOG_PREFIX,
    variableCode: "B01003_001E",
    expectedLabelIncludes: ["Total population"],
    expectedConceptIncludes: ["Sex by age"],
    syntheticGenerator: syntheticPopulation,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPopulationTotalIngestion().catch((err) => {
    console.error(`${LOG_PREFIX} Unhandled error:`, err);
    process.exitCode = 1;
  });
}
