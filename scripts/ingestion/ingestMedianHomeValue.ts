/**
 * Ingests median_home_value values (synthetic demo).
 * Year range: DEFAULT_YEAR_RANGE (shared across metrics).
 * Source: Synthetic ACS-like home values with bubble/crash/recovery.
 *
 * Runs when executed directly via tsx/npm script, but does nothing on import.
 */
import { PrismaClient } from "@prisma/client";
import { ensureDataSource, ensureMetric, ensureStates } from "./utils";
import { DEFAULT_YEAR_RANGE } from "./config";
import { noiseFromSeed, stateBaseFactor } from "./syntheticUtils";

const METRIC_ID = "median_home_value";
const DATA_SOURCE_ID = "census_acs_home_value";

function macroHomeFactor(year: number) {
  if (year >= 2005 && year <= 2007) return 1.08; // bubble
  if (year >= 2008 && year <= 2012) return 0.85; // crash
  if (year >= 2013 && year <= 2016) return 1.06; // recovery
  if (year >= 2017) return 1.04; // strong growth
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
  console.log("[ingestMedianHomeValue] Starting ingestion...");
  const client = new PrismaClient();
  const { start, end } = DEFAULT_YEAR_RANGE;

  try {
    await ensureStates(client);
    await ensureDataSource(client, {
      id: DATA_SOURCE_ID,
      name: "Census ACS – Median Home Value (synthetic)",
      description: "Synthetic median home values for demo purposes.",
      homepageUrl: "https://www.census.gov/programs-surveys/acs",
      apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
    });
    await ensureMetric(client, METRIC_ID);

    const states = await client.state.findMany();
    console.log(`[ingestMedianHomeValue] Found ${states.length} states in the database.`);

    let observationCount = 0;
    const uniqueStateIds = new Set<string>();

    for (const state of states) {
      for (let year = start; year <= end; year += 1) {
        const value = syntheticHomeValue(state.id, year, start);

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
      `[ingestMedianHomeValue] Ingestion complete: ${observationCount} observations across ${uniqueStateIds.size} states for years ${start}–${end}.`,
    );
    if (uniqueStateIds.size < 51) {
      console.warn(
        `[ingestMedianHomeValue] WARNING: Only ${uniqueStateIds.size} states received data; expected 51. Check State rows.`,
      );
    }
  } catch (err) {
    console.error("[ingestMedianHomeValue] Failed:", err);
    throw err;
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMedianHomeValueIngestion().catch((err) => {
    console.error("[ingestMedianHomeValue] Unhandled error:", err);
    process.exitCode = 1;
  });
}
