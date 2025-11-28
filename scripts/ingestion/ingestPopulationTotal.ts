/**
 * Ingests population_total values (synthetic demo).
 * Year range: DEFAULT_YEAR_RANGE (shared across metrics).
 * Source: Synthetic Census-like population.
 *
 * Runs when executed directly via tsx/npm script, but does nothing on import.
 */
import { PrismaClient } from "@prisma/client";
import { ensureDataSource, ensureMetric, ensureStates } from "./utils";
import { DEFAULT_YEAR_RANGE } from "./config";

const METRIC_ID = "population_total";
const DATA_SOURCE_ID = "census_acs_population_total";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function syntheticPopulation(stateId: string, year: number, startYear: number) {
  const base = 500_000;
  const stateOffset = hashString(stateId) % 5_000_000;
  const yearOffset = (year - startYear) * 5_000;
  return Math.max(80_000, Math.round(base + stateOffset + yearOffset));
}

export async function runPopulationTotalIngestion() {
  console.log("[ingestPopulationTotal] Starting ingestion...");
  const client = new PrismaClient();
  const { start, end } = DEFAULT_YEAR_RANGE;

  try {
    await ensureStates(client);
    await ensureDataSource(client, {
      id: DATA_SOURCE_ID,
      name: "Census ACS (synthetic population)",
      description: "Synthetic total population data for demo purposes.",
      homepageUrl: "https://www.census.gov/",
      apiDocsUrl: "https://www.census.gov/data/developers.html",
    });
    await ensureMetric(client, METRIC_ID, { isDefault: false });

    const states = await client.state.findMany();
    console.log(`[ingestPopulationTotal] Found ${states.length} states in the database.`);

    let observationCount = 0;
    const uniqueStateIds = new Set<string>();

    for (const state of states) {
      for (let year = start; year <= end; year += 1) {
        const value = syntheticPopulation(state.id, year, start);

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
      `[ingestPopulationTotal] Ingestion complete: ${observationCount} observations across ${uniqueStateIds.size} states for years ${start}–${end}.`,
    );
    if (uniqueStateIds.size < 51) {
      console.warn(
        `[ingestPopulationTotal] WARNING: Only ${uniqueStateIds.size} states received data; expected 51. Check State rows.`,
      );
    }
  } catch (err) {
    console.error("[ingestPopulationTotal] Failed:", err);
    throw err;
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPopulationTotalIngestion().catch((err) => {
    console.error("[ingestPopulationTotal] Unhandled error:", err);
    process.exitCode = 1;
  });
}
