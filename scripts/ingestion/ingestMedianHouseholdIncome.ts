/**
 * Ingests median_household_income values (synthetic demo).
 * Year range: DEFAULT_YEAR_RANGE (shared across all metrics).
 * Source: Synthetic ACS-like income data.
 *
 * Runs when executed directly via tsx/npm script, but does nothing on import.
 */
import { PrismaClient } from "@prisma/client";
import { ensureDataSource, ensureMetric, ensureStates } from "./utils";
import { DEFAULT_YEAR_RANGE } from "./config";

const METRIC_ID = "median_household_income";
const DATA_SOURCE_ID = "census_acs_median_household_income";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function syntheticIncome(stateId: string, year: number, startYear: number) {
  const base = 45_000;
  const stateEffect = (hashString(stateId) % 40_000) + 5_000;
  const yearTrend = (year - startYear) * 900;
  const cycle = Math.sin((year % 6) * 0.6) * 1_200;
  const value = base + stateEffect + yearTrend + cycle;
  return Math.max(30_000, Math.round(value));
}

export async function runMedianHouseholdIncomeIngestion() {
  console.log("[ingestMedianHouseholdIncome] Starting ingestion...");
  const client = new PrismaClient();
  const { start, end } = DEFAULT_YEAR_RANGE;

  try {
    await ensureStates(client);
    await ensureDataSource(client, {
      id: DATA_SOURCE_ID,
      name: "Census ACS – Median Household Income (synthetic)",
      description: "Synthetic median household income data for demo purposes.",
      homepageUrl: "https://www.census.gov/programs-surveys/acs",
      apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
    });
    await ensureMetric(client, METRIC_ID, { isDefault: true });

    const states = await client.state.findMany();
    console.log(`[ingestMedianHouseholdIncome] Found ${states.length} states in the database.`);

    let observationCount = 0;
    const uniqueStateIds = new Set<string>();

    for (const state of states) {
      for (let year = start; year <= end; year += 1) {
        const value = syntheticIncome(state.id, year, start);

        await client.observation.upsert({
          where: {
            stateId_metricId_year: {
              stateId: state.id,
              metricId: METRIC_ID,
              year,
            },
          },
          create: {
            stateId: state.id,
            metricId: METRIC_ID,
            year,
            value,
          },
          update: { value },
        });

        observationCount += 1;
        uniqueStateIds.add(state.id);
      }
    }

    console.log(
      `[ingestMedianHouseholdIncome] Ingestion complete: ${observationCount} observations across ${uniqueStateIds.size} states for years ${start}–${end}.`,
    );
    if (uniqueStateIds.size < 51) {
      console.warn(
        `[ingestMedianHouseholdIncome] WARNING: Only ${uniqueStateIds.size} states received data; expected 51. Check State rows.`,
      );
    }
  } catch (err) {
    console.error("[ingestMedianHouseholdIncome] Failed:", err);
    throw err;
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMedianHouseholdIncomeIngestion().catch((err) => {
    console.error("[ingestMedianHouseholdIncome] Unhandled error:", err);
    process.exitCode = 1;
  });
}
