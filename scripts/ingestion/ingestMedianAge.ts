/**
 * Ingests median_age values (synthetic demo).
 * Year range: DEFAULT_YEAR_RANGE (shared across metrics).
 * Source: Synthetic ACS-like median age.
 *
 * Runs when executed directly via tsx/npm script, but does nothing on import.
 */
import { PrismaClient } from "@prisma/client";
import { ensureDataSource, ensureMetric, ensureStates } from "./utils";
import { DEFAULT_YEAR_RANGE } from "./config";

const METRIC_ID = "median_age";
const DATA_SOURCE_ID = "census_acs_median_age";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function syntheticMedianAge(stateId: string, year: number, startYear: number) {
  const base = 32;
  const stateEffect = (hashString(stateId) % 150) / 10; // up to +15
  const drift = (year - startYear) * 0.05;
  const noise = ((hashString(`${stateId}-${year}`) % 10) - 5) * 0.08;
  return Number((base + stateEffect + drift + noise).toFixed(2));
}

export async function runMedianAgeIngestion() {
  console.log("[ingestMedianAge] Starting ingestion...");
  const client = new PrismaClient();
  const { start, end } = DEFAULT_YEAR_RANGE;

  try {
    await ensureStates(client);
    await ensureDataSource(client, {
      id: DATA_SOURCE_ID,
      name: "Census ACS – Median Age (synthetic)",
      description: "Synthetic median age data for demo purposes.",
      homepageUrl: "https://www.census.gov/programs-surveys/acs",
      apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
    });
    const metric = await ensureMetric(client, METRIC_ID);

    const states = await client.state.findMany();
    console.log(`[ingestMedianAge] Found ${states.length} states in the database.`);

    let observationCount = 0;
    const uniqueStateIds = new Set<string>();

    for (const state of states) {
      for (let year = start; year <= end; year += 1) {
        const value = syntheticMedianAge(state.id, year, start);

        await client.observation.upsert({
          where: {
            stateId_metricId_year: {
              stateId: state.id,
              metricId: metric.id,
              year,
            },
          },
          create: {
            stateId: state.id,
            metricId: metric.id,
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
      `[ingestMedianAge] Ingestion complete: ${observationCount} observations across ${uniqueStateIds.size} states for years ${start}–${end}.`,
    );
    if (uniqueStateIds.size < 51) {
      console.warn(
        `[ingestMedianAge] WARNING: Only ${uniqueStateIds.size} states received data; expected 51. Check State rows.`,
      );
    }
  } catch (err) {
    console.error("[ingestMedianAge] Failed:", err);
    throw err;
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMedianAgeIngestion().catch((err) => {
    console.error("[ingestMedianAge] Unhandled error:", err);
    process.exitCode = 1;
  });
}
