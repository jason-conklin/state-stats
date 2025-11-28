/**
 * Ingests unemployment_rate values (synthetic demo).
 * Year range: DEFAULT_YEAR_RANGE (shared across metrics).
 * Source: Synthetic BLS-like unemployment data.
 *
 * Runs when executed directly via tsx/npm script, but does nothing on import.
 */
import { PrismaClient } from "@prisma/client";
import { ensureDataSource, ensureMetric, ensureStates } from "./utils";
import { DEFAULT_YEAR_RANGE } from "./config";
import { noiseFromSeed, stateBaseFactor } from "./syntheticUtils";

const METRIC_ID = "unemployment_rate";
const DATA_SOURCE_ID = "bls_unemployment_rate";

function macroCycle(year: number) {
  if (year >= 2001 && year <= 2003) return 1.25;
  if (year >= 2008 && year <= 2012) return 1.6;
  if (year >= 2020 && year <= 2021) return 1.8;
  if (year >= 2014 && year <= 2019) return 0.8;
  return 1;
}

function syntheticUnemploymentValue(stateId: string, year: number, startYear: number): number {
  const base = stateBaseFactor(METRIC_ID, stateId, 3, 8);
  const volMultiplier = stateBaseFactor(`${METRIC_ID}:vol`, stateId, 0.7, 1.6);
  const trend = 1 + (year - startYear) * noiseFromSeed(`${METRIC_ID}:trend:${stateId}`, 0.002);
  const cycle = macroCycle(year) * volMultiplier;
  const noise = 1 + noiseFromSeed(`${METRIC_ID}:${stateId}:${year}`, 0.05);
  const value = base * trend * cycle * noise;
  return Number(Math.max(1.5, Math.min(15, value)).toFixed(2));
}

export async function runUnemploymentRateIngestion() {
  console.log("[ingestUnemploymentRate] Starting ingestion...");
  const client = new PrismaClient();
  const { start, end } = DEFAULT_YEAR_RANGE;

  try {
    await ensureStates(client);
    await ensureDataSource(client, {
      id: DATA_SOURCE_ID,
      name: "BLS – Unemployment Rate (synthetic)",
      description: "Synthetic unemployment rates for demo purposes.",
      homepageUrl: "https://www.bls.gov/lau/",
      apiDocsUrl: "https://download.bls.gov/pub/time.series/la/",
    });
    await ensureMetric(client, METRIC_ID, { isDefault: false });

    const states = await client.state.findMany();
    console.log(`[ingestUnemploymentRate] Found ${states.length} states in the database.`);

    let observationCount = 0;
    const uniqueStateIds = new Set<string>();

    for (const state of states) {
      for (let year = start; year <= end; year += 1) {
        const value = syntheticUnemploymentValue(state.id, year, start);

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
      `[ingestUnemploymentRate] Ingestion complete: ${observationCount} observations across ${uniqueStateIds.size} states for years ${start}–${end}.`,
    );
    if (uniqueStateIds.size < 51) {
      console.warn(
        `[ingestUnemploymentRate] WARNING: Only ${uniqueStateIds.size} states received data; expected 51. Check State rows.`,
      );
    }
  } catch (err) {
    console.error("[ingestUnemploymentRate] Failed:", err);
    throw err;
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runUnemploymentRateIngestion().catch((err) => {
    console.error("[ingestUnemploymentRate] Unhandled error:", err);
    process.exitCode = 1;
  });
}
