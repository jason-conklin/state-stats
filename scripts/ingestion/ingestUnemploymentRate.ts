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

const METRIC_ID = "unemployment_rate";
const DATA_SOURCE_ID = "bls_unemployment_rate";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function syntheticUnemploymentValue(stateId: string, year: number, startYear: number): number {
  const base = 3.5;
  const stateEffect = (hashString(stateId) % 300) / 100; // up to +3.0
  const yearTrend = (year - startYear) * 0.02;
  const cycle = Math.sin((year % 10) * 0.6) * 0.6;
  const recessionBump = year >= 2008 && year <= 2010 ? 2.0 : 0;
  const value = base + stateEffect + yearTrend + cycle + recessionBump;
  return Number(Math.max(2.5, Math.min(14, value)).toFixed(2));
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
