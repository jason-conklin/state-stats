import { runAcsMetricIngestion } from "./runAcsMetricIngestion";
import { ACS_ONE_YEAR_REAL_WINDOW_CONFIG } from "./acsWindow";
import { macroShock, noiseFromSeed, stateBaseFactor, stateGrowthRate } from "./syntheticUtils";
import { pathToFileURL } from "node:url";

const METRIC_ID = "median_household_income";
const LOG_PREFIX = "[ingestMedianHouseholdIncome]";

function syntheticIncome(stateId: string, year: number, startYear: number) {
  const base = stateBaseFactor(METRIC_ID, stateId, 30_000, 70_000);
  const growthRate = stateGrowthRate(METRIC_ID, stateId, 0.01, 0.03);
  const yearsSince = year - startYear;
  const growthFactor = Math.pow(1 + growthRate, yearsSince);
  const macro = 1 + macroShock(METRIC_ID, year, { 2008: -0.03, 2009: -0.05, 2010: -0.03, 2020: -0.02, 2021: -0.01 });
  const noise = 1 + noiseFromSeed(`${METRIC_ID}:${stateId}:${year}`, 0.02);
  const value = base * growthFactor * macro * noise;
  return Math.max(25_000, Math.round(value));
}

export async function runMedianHouseholdIncomeIngestion() {
  return runAcsMetricIngestion({
    metricId: METRIC_ID,
    logPrefix: LOG_PREFIX,
    variableCode: "B19013_001E",
    expectedLabelIncludes: ["Median household income"],
    expectedConceptIncludes: ["Household income in the past 12 months"],
    isDefault: true,
    expectedWindowConfig: ACS_ONE_YEAR_REAL_WINDOW_CONFIG,
    syntheticGenerator: syntheticIncome,
  });
}

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectRun) {
  runMedianHouseholdIncomeIngestion().catch((err) => {
    console.error(`${LOG_PREFIX} Unhandled error:`, err);
    process.exitCode = 1;
  });
}
