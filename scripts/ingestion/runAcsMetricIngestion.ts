import { IngestionStatus, PrismaClient } from "@prisma/client";
import type { IngestionSummary } from "../../lib/types";
import { DEFAULT_YEAR_RANGE, INGEST_LOOKBACK_YEARS } from "./config";
import {
  ACS_ONE_YEAR_REAL_WINDOW_CONFIG,
  type AcsExpectedWindowConfig,
  resolveAcsExpectedWindow,
} from "./acsWindow";
import { fetchCensusAcsSeries } from "./providers/censusAcs";
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

type SyntheticGenerator = (stateId: string, year: number, startYear: number) => number;

type RunAcsMetricIngestionOptions = {
  metricId: string;
  logPrefix: string;
  variableCode: string;
  expectedLabelIncludes?: string[];
  expectedConceptIncludes?: string[];
  skipMetadataValidation?: boolean;
  logPerYear?: boolean;
  isDefault?: boolean;
  expectedWindowConfig?: AcsExpectedWindowConfig;
  syntheticGenerator: SyntheticGenerator;
};

function getYearBounds(rows: Array<{ year: number }>) {
  if (!rows.length) {
    return { minYear: null as number | null, maxYear: null as number | null };
  }
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    minYear = Math.min(minYear, row.year);
    maxYear = Math.max(maxYear, row.year);
  }
  return { minYear, maxYear };
}

export async function runAcsMetricIngestion(
  options: RunAcsMetricIngestionOptions,
): Promise<IngestionSummary> {
  loadIngestionEnv();

  const client = new PrismaClient();
  const warnings: string[] = [];
  const notices: string[] = [];
  let runId: string | null = null;
  let runStartedAtIso = new Date().toISOString();
  let isSyntheticMode = false;
  let fallbackReason: string | null = null;
  let activeSourceId: string = DATA_SOURCE_CONFIGS.censusAcsReal.id;

  try {
    console.log(`${options.logPrefix} Starting ingestion...`);
    console.log(`${options.logPrefix} metricId=${options.metricId}`);
    const expectedWindowConfig = options.expectedWindowConfig ?? ACS_ONE_YEAR_REAL_WINDOW_CONFIG;

    await ensureStates(client);
    await normalizeLegacyDataSources(client);
    await ensureDataSource(client, DATA_SOURCE_CONFIGS.censusAcsReal);

    const dbStates = await client.state.findMany({ select: { id: true } });
    const stateIds = dbStates.map((state) => state.id);
    const stateIdSet = new Set(stateIds);

    const apiKey = process.env.CENSUS_API_KEY?.trim();
    const providerRows: Array<{ stateCode: string; year: number; value: number }> = [];
    let providerCoverage: Record<number, number> = {};
    let hadProviderPartialFailures = false;
    let failedYears: number[] = [];
    let excludedYears: number[] = [];
    let plannedYearStart = DEFAULT_YEAR_RANGE.start;
    let plannedYearEnd = DEFAULT_YEAR_RANGE.end;
    let allowedYearsForCleanup: number[] = [];

    if (!apiKey) {
      isSyntheticMode = true;
      fallbackReason = "Missing CENSUS_API_KEY";
    } else {
      try {
        const providerResult = await fetchCensusAcsSeries({
          apiKey,
          metricId: options.metricId,
          variableCode: options.variableCode,
          expectedLabelIncludes: options.expectedLabelIncludes,
          expectedConceptIncludes: options.expectedConceptIncludes,
          skipMetadataValidation: options.skipMetadataValidation,
          logPerYear: options.logPerYear,
          startYear: expectedWindowConfig.startYear,
          endYear: DEFAULT_YEAR_RANGE.end,
          lookbackYears: null,
          logPrefix: options.logPrefix,
        });

        providerRows.push(...providerResult.observations);
        providerCoverage = providerResult.coverageByYear;
        warnings.push(...providerResult.warnings);
        hadProviderPartialFailures = providerResult.hadPartialFailures;
        failedYears = providerResult.failedYears;
        const resolvedWindow = resolveAcsExpectedWindow(
          providerResult.latestAvailableYear,
          expectedWindowConfig,
        );
        plannedYearStart = resolvedWindow.startYear;
        plannedYearEnd = resolvedWindow.endYear;
        excludedYears = resolvedWindow.excludedYears;
        allowedYearsForCleanup = resolvedWindow.allowedYears;
      } catch (error) {
        isSyntheticMode = true;
        fallbackReason = `Census ACS request failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`${options.logPrefix} ${fallbackReason}`);
        notices.push(`${options.logPrefix} Falling back to synthetic data after real API failure.`);
      }
    }

    if (isSyntheticMode) {
      await ensureDataSource(client, DATA_SOURCE_CONFIGS.censusAcsSynthetic);
      activeSourceId = DATA_SOURCE_CONFIGS.censusAcsSynthetic.id;

      if (!fallbackReason) {
        fallbackReason = "Missing CENSUS_API_KEY";
      }
      notices.push(`${options.logPrefix} Synthetic fallback: ${fallbackReason}`);
      console.warn(`${options.logPrefix} Synthetic fallback enabled: ${fallbackReason}`);

      plannedYearStart = DEFAULT_YEAR_RANGE.start;
      plannedYearEnd = DEFAULT_YEAR_RANGE.end;
      for (const stateId of stateIds) {
        for (let year = plannedYearStart; year <= plannedYearEnd; year += 1) {
          providerRows.push({
            stateCode: stateId,
            year,
            value: options.syntheticGenerator(stateId, year, plannedYearStart),
          });
        }
      }
    }

    const metricOverrides: Partial<{ isDefault: boolean; sourceId: string }> = {
      sourceId: activeSourceId,
    };
    if (typeof options.isDefault === "boolean") {
      metricOverrides.isDefault = options.isDefault;
    }
    await ensureMetric(client, options.metricId, metricOverrides);

    console.log(
      `${options.logPrefix} sourceId=${activeSourceId} mode=${isSyntheticMode ? "synthetic_fallback" : "real_api"} years=${plannedYearStart}-${plannedYearEnd}`,
    );

    const filteredRows = providerRows.filter((row) => stateIdSet.has(row.stateCode));
    if (!filteredRows.length) {
      throw new Error(`${options.logPrefix} No rows available to write after filtering.`);
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
        metricId: options.metricId,
        stateId: row.stateCode,
        year: row.year,
        value: row.value,
      })),
    );

    let cleanupDeletedCount = 0;
    let remainingCount = upsertSummary.total;
    if (!isSyntheticMode) {
      if (!allowedYearsForCleanup.length) {
        throw new Error(
          `${options.logPrefix} Real ingestion cleanup could not determine allowed years.`,
        );
      }

      const cleanupResult = await client.observation.deleteMany({
        where: {
          metricId: options.metricId,
          year: { notIn: allowedYearsForCleanup },
        },
      });
      cleanupDeletedCount = cleanupResult.count;
      remainingCount = await client.observation.count({
        where: { metricId: options.metricId },
      });
      console.log(
        `${options.logPrefix} cleanup mode=real_api deleted=${cleanupDeletedCount} remaining=${remainingCount} allowedYears=${allowedYearsForCleanup[0]}-${allowedYearsForCleanup[allowedYearsForCleanup.length - 1]} excludedYears=${excludedYears.length ? excludedYears.join(",") : "none"}`,
      );
    }

    warnings.push(...buildCoverageWarnings(providerCoverage, options.logPrefix, stateIds.length));
    warnings.push(...buildCoverageWarnings(upsertSummary.coverageByYear, options.logPrefix, stateIds.length));
    for (const warning of warnings) {
      console.warn(warning);
    }

    const uniqueStateCount = new Set(filteredRows.map((row) => row.stateCode)).size;
    const writtenBounds = getYearBounds(filteredRows);
    const metricBounds = await getMetricYearBounds(client, options.metricId);
    const status =
      hadProviderPartialFailures || warnings.length > 0
        ? IngestionStatus.partial
        : IngestionStatus.success;

    await completeIngestionRun(client, run.id, status, {
      isSynthetic: isSyntheticMode,
      note: fallbackReason,
      details: {
        metricId: options.metricId,
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
          excludedYears,
        },
        failedYears,
        fallbackReason,
        warnings,
        notices,
      },
    });

    console.log(
      `${options.logPrefix} summary sourceId=${activeSourceId} mode=${isSyntheticMode ? "synthetic_fallback" : "real_api"} years=${writtenBounds.minYear ?? "—"}-${writtenBounds.maxYear ?? "—"} failedYears=${failedYears.length ? failedYears.join(",") : "none"} observations=${upsertSummary.total} inserted=${upsertSummary.inserted} updated=${upsertSummary.updated} states=${uniqueStateCount}/${stateIds.length}`,
    );
    console.log(`${options.logPrefix} Completed with status=${status}.`);

    const summaryYears = {
      start: metricBounds.minYear ?? DEFAULT_YEAR_RANGE.start,
      end: metricBounds.maxYear ?? DEFAULT_YEAR_RANGE.end,
    };

    return {
      runId: run.id,
      status,
      startedAt: runStartedAtIso,
      completedAt: new Date().toISOString(),
      counts: {
        states: stateIds.length,
        observationsInserted: upsertSummary.inserted,
        observationsUpdated: upsertSummary.updated,
        years: summaryYears,
      },
      errors: warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${options.logPrefix} Failed:`, error);

    if (runId) {
      await completeIngestionRun(client, runId, IngestionStatus.failed, {
        isSynthetic: isSyntheticMode,
        note: fallbackReason ?? errorMessage,
        details: {
          metricId: options.metricId,
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
