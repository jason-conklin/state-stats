import { IngestionStatus, PrismaClient } from "@prisma/client";
import type { IngestionSummary } from "../../lib/types";
import { DEFAULT_YEAR_RANGE, INGEST_LOOKBACK_YEARS } from "./config";
import {
  fetchBlsLausAnnualUnemployment,
  isBlsSyntheticFallbackError,
} from "./providers/blsLaus";
import { noiseFromSeed, stateBaseFactor } from "./syntheticUtils";
import {
  buildCoverageWarnings,
  completeIngestionRun,
  DATA_SOURCE_CONFIGS,
  ensureDataSource,
  ensureMetric,
  ensureStates,
  getMetricYearBounds,
  loadIngestionEnv,
  normalizeLegacyDataSources,
  startIngestionRun,
  upsertObservationsWithCounts,
} from "./utils";
import { pathToFileURL } from "node:url";

const METRIC_ID = "unemployment_rate";
const LOG_PREFIX = "[ingestUnemploymentRate]";

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

function getYearBounds(rows: Array<{ year: number }>) {
  if (!rows.length) return { minYear: null as number | null, maxYear: null as number | null };
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    minYear = Math.min(minYear, row.year);
    maxYear = Math.max(maxYear, row.year);
  }
  return { minYear, maxYear };
}

function uniqueSortedYears(rows: Array<{ year: number }>) {
  return Array.from(new Set(rows.map((row) => row.year))).sort((a, b) => a - b);
}

export async function runUnemploymentRateIngestion(): Promise<IngestionSummary> {
  loadIngestionEnv();

  const client = new PrismaClient();
  const warnings: string[] = [];
  const notices: string[] = [];
  let runId: string | null = null;
  let runStartedAtIso = new Date().toISOString();
  let isSyntheticMode = false;
  let fallbackReason: string | null = null;
  let activeSourceId: string = DATA_SOURCE_CONFIGS.blsLausReal.id;

  try {
    console.log(`${LOG_PREFIX} Starting ingestion...`);
    console.log(`${LOG_PREFIX} metricId=${METRIC_ID}`);

    await ensureStates(client);
    await normalizeLegacyDataSources(client);
    await ensureDataSource(client, DATA_SOURCE_CONFIGS.blsLausReal);

    const dbStates = await client.state.findMany({ select: { id: true } });
    const stateIds = dbStates.map((state) => state.id);
    const stateIdSet = new Set(stateIds);

    const apiKey = process.env.BLS_API_KEY?.trim();
    const providerRows: Array<{ stateCode: string; year: number; value: number }> = [];
    let providerCoverage: Record<number, number> = {};
    let hadProviderPartialFailures = false;
    let failedYears: number[] = [];
    let skippedYears: number[] = [];
    let plannedYearStart = DEFAULT_YEAR_RANGE.start;
    let plannedYearEnd = DEFAULT_YEAR_RANGE.end;

    if (!apiKey) {
      isSyntheticMode = true;
      fallbackReason = "Missing BLS_API_KEY";
    } else {
      try {
        const providerResult = await fetchBlsLausAnnualUnemployment({
          apiKey,
          startYear: DEFAULT_YEAR_RANGE.start,
          endYear: DEFAULT_YEAR_RANGE.end,
          lookbackYears: INGEST_LOOKBACK_YEARS,
          logPrefix: LOG_PREFIX,
          logPerYear: true,
        });

        providerRows.push(...providerResult.observations);
        providerCoverage = providerResult.coverageByYear;
        warnings.push(...providerResult.warnings);
        hadProviderPartialFailures = providerResult.hadPartialFailures;
        failedYears = providerResult.failedYears;
        skippedYears = providerResult.skippedYears;

        if (providerResult.years.length > 0) {
          plannedYearStart = providerResult.years[0]!;
          plannedYearEnd = providerResult.years[providerResult.years.length - 1]!;
        }
      } catch (error) {
        if (isBlsSyntheticFallbackError(error)) {
          isSyntheticMode = true;
          fallbackReason = error.message;
          console.error(`${LOG_PREFIX} ${fallbackReason}`);
          notices.push(`${LOG_PREFIX} Falling back to synthetic data: ${fallbackReason}`);
        } else {
          throw error;
        }
      }
    }

    if (isSyntheticMode) {
      await ensureDataSource(client, DATA_SOURCE_CONFIGS.blsLausSynthetic);
      activeSourceId = DATA_SOURCE_CONFIGS.blsLausSynthetic.id;

      if (!fallbackReason) {
        fallbackReason = "Missing BLS_API_KEY";
      }
      notices.push(`${LOG_PREFIX} Synthetic fallback: ${fallbackReason}`);
      console.warn(`${LOG_PREFIX} Synthetic fallback enabled: ${fallbackReason}`);

      plannedYearStart = DEFAULT_YEAR_RANGE.start;
      plannedYearEnd = DEFAULT_YEAR_RANGE.end;
      for (const stateId of stateIds) {
        for (let year = plannedYearStart; year <= plannedYearEnd; year += 1) {
          providerRows.push({
            stateCode: stateId,
            year,
            value: syntheticUnemploymentValue(stateId, year, plannedYearStart),
          });
        }
      }
    }

    await ensureMetric(client, METRIC_ID, { sourceId: activeSourceId, isDefault: false });
    console.log(
      `${LOG_PREFIX} sourceId=${activeSourceId} mode=${isSyntheticMode ? "synthetic_fallback" : "real_api"} years=${plannedYearStart}-${plannedYearEnd}`,
    );

    const filteredRows = providerRows.filter((row) => stateIdSet.has(row.stateCode));
    if (!filteredRows.length) {
      throw new Error(`${LOG_PREFIX} No rows available to write after filtering.`);
    }

    const run = await startIngestionRun(client, activeSourceId, {
      isSynthetic: isSyntheticMode,
      note: fallbackReason,
    });
    runId = run.id;
    runStartedAtIso = run.startedAt.toISOString();

    const upsertSummary = await upsertObservationsWithCounts(
      client,
      filteredRows.map((row) => ({
        metricId: METRIC_ID,
        stateId: row.stateCode,
        year: row.year,
        value: row.value,
      })),
    );

    let cleanupDeletedCount = 0;
    let remainingCount = upsertSummary.total;
    if (!isSyntheticMode) {
      const allowedYears = uniqueSortedYears(filteredRows);
      if (!allowedYears.length) {
        throw new Error(`${LOG_PREFIX} Real ingestion cleanup could not determine allowed years.`);
      }

      const cleanupResult = await client.observation.deleteMany({
        where: {
          metricId: METRIC_ID,
          year: { notIn: allowedYears },
        },
      });
      cleanupDeletedCount = cleanupResult.count;
      remainingCount = await client.observation.count({
        where: { metricId: METRIC_ID },
      });
      console.log(
        `${LOG_PREFIX} cleanup mode=real_api deleted=${cleanupDeletedCount} remaining=${remainingCount} allowedYears=${allowedYears[0]}-${allowedYears[allowedYears.length - 1]}`,
      );
    }

    warnings.push(...buildCoverageWarnings(providerCoverage, LOG_PREFIX, stateIds.length));
    warnings.push(...buildCoverageWarnings(upsertSummary.coverageByYear, LOG_PREFIX, stateIds.length));
    for (const warning of warnings) {
      console.warn(warning);
    }

    const uniqueStateCount = new Set(filteredRows.map((row) => row.stateCode)).size;
    const writtenBounds = getYearBounds(filteredRows);
    const metricBounds = await getMetricYearBounds(client, METRIC_ID);
    const status =
      hadProviderPartialFailures || warnings.length > 0
        ? IngestionStatus.partial
        : IngestionStatus.success;

    await completeIngestionRun(client, run.id, status, {
      isSynthetic: isSyntheticMode,
      note: fallbackReason,
      details: {
        metricId: METRIC_ID,
        sourceId: activeSourceId,
        mode: isSyntheticMode ? "synthetic_fallback" : "real_api",
        lookbackYears: INGEST_LOOKBACK_YEARS,
        counts: {
          expectedStates: stateIds.length,
          uniqueStatesWritten: uniqueStateCount,
          observationsTotal: upsertSummary.total,
          observationsInserted: upsertSummary.inserted,
          observationsUpdated: upsertSummary.updated,
          cleanupDeleted: cleanupDeletedCount,
          observationsRemaining: remainingCount,
        },
        years: {
          plannedStartYear: plannedYearStart,
          plannedEndYear: plannedYearEnd,
          minYear: metricBounds.minYear,
          maxYear: metricBounds.maxYear,
        },
        failedYears,
        skippedYears,
        fallbackReason,
        warnings,
        notices,
      },
    });

    console.log(
      `${LOG_PREFIX} summary sourceId=${activeSourceId} mode=${isSyntheticMode ? "synthetic_fallback" : "real_api"} years=${writtenBounds.minYear ?? "—"}-${writtenBounds.maxYear ?? "—"} failedYears=${failedYears.length ? failedYears.join(",") : "none"} observations=${upsertSummary.total} inserted=${upsertSummary.inserted} updated=${upsertSummary.updated} states=${uniqueStateCount}/${stateIds.length}`,
    );
    console.log(`${LOG_PREFIX} Completed with status=${status}.`);

    return {
      runId: run.id,
      status,
      startedAt: runStartedAtIso,
      completedAt: new Date().toISOString(),
      counts: {
        states: stateIds.length,
        observationsInserted: upsertSummary.inserted,
        observationsUpdated: upsertSummary.updated,
        years: {
          start: metricBounds.minYear ?? DEFAULT_YEAR_RANGE.start,
          end: metricBounds.maxYear ?? DEFAULT_YEAR_RANGE.end,
        },
      },
      errors: warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} Failed:`, error);

    if (runId) {
      await completeIngestionRun(client, runId, IngestionStatus.failed, {
        isSynthetic: isSyntheticMode,
        note: fallbackReason ?? errorMessage,
        details: {
          metricId: METRIC_ID,
          fallbackReason,
          error: errorMessage,
          warnings,
          notices,
        },
      });
    }

    throw error;
  } finally {
    await client.$disconnect();
  }
}

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectRun) {
  runUnemploymentRateIngestion().catch((err) => {
    console.error(`${LOG_PREFIX} Unhandled error:`, err);
    process.exitCode = 1;
  });
}
