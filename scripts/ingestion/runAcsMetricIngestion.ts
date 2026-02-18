import { IngestionStatus, PrismaClient } from "@prisma/client";
import type { IngestionSummary } from "../../lib/types";
import { DEFAULT_YEAR_RANGE, INGEST_LOOKBACK_YEARS } from "./config";
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
  expectedLabelIncludes: string[];
  expectedConceptIncludes?: string[];
  isDefault?: boolean;
  syntheticGenerator: SyntheticGenerator;
};

export async function runAcsMetricIngestion(
  options: RunAcsMetricIngestionOptions,
): Promise<IngestionSummary> {
  loadIngestionEnv();

  const client = new PrismaClient();
  const warnings: string[] = [];
  const notices: string[] = [];
  let runId: string | null = null;
  let runStartedAtIso = new Date().toISOString();

  try {
    console.log(`${options.logPrefix} Starting ingestion...`);

    await ensureStates(client);
    await normalizeLegacyDataSources(client);
    await ensureDataSource(client, DATA_SOURCE_CONFIGS.censusAcsReal);

    const apiKey = process.env.CENSUS_API_KEY?.trim();
    const useRealApi = Boolean(apiKey);
    const activeSourceId = useRealApi
      ? DATA_SOURCE_CONFIGS.censusAcsReal.id
      : DATA_SOURCE_CONFIGS.censusAcsSynthetic.id;

    if (!useRealApi) {
      await ensureDataSource(client, DATA_SOURCE_CONFIGS.censusAcsSynthetic);
      notices.push(
        `${options.logPrefix} CENSUS_API_KEY missing; using synthetic fallback source ${DATA_SOURCE_CONFIGS.censusAcsSynthetic.id}.`,
      );
      console.warn(notices[notices.length - 1]);
    }

    const metricOverrides: Partial<{ isDefault: boolean; sourceId: string }> = {
      sourceId: activeSourceId,
    };
    if (typeof options.isDefault === "boolean") {
      metricOverrides.isDefault = options.isDefault;
    }
    await ensureMetric(client, options.metricId, metricOverrides);

    const run = await startIngestionRun(client, activeSourceId);
    runId = run.id;
    runStartedAtIso = run.startedAt.toISOString();

    const dbStates = await client.state.findMany({ select: { id: true } });
    const stateIds = dbStates.map((state) => state.id);
    const stateIdSet = new Set(stateIds);

    let providerCoverage: Record<number, number> = {};
    let hadProviderPartialFailures = false;
    const providerRows: Array<{ stateCode: string; year: number; value: number }> = [];

    if (useRealApi) {
      const providerResult = await fetchCensusAcsSeries({
        apiKey: apiKey!,
        metricId: options.metricId,
        variableCode: options.variableCode,
        expectedLabelIncludes: options.expectedLabelIncludes,
        expectedConceptIncludes: options.expectedConceptIncludes,
        startYear: DEFAULT_YEAR_RANGE.start,
        endYear: DEFAULT_YEAR_RANGE.end,
        lookbackYears: INGEST_LOOKBACK_YEARS,
        logPrefix: options.logPrefix,
      });

      providerRows.push(...providerResult.observations);
      providerCoverage = providerResult.coverageByYear;
      warnings.push(...providerResult.warnings);
      hadProviderPartialFailures = providerResult.hadPartialFailures;
    } else {
      for (const stateId of stateIds) {
        for (let year = DEFAULT_YEAR_RANGE.start; year <= DEFAULT_YEAR_RANGE.end; year += 1) {
          providerRows.push({
            stateCode: stateId,
            year,
            value: options.syntheticGenerator(stateId, year, DEFAULT_YEAR_RANGE.start),
          });
        }
      }
    }

    const filteredRows = providerRows.filter((row) => stateIdSet.has(row.stateCode));
    const upsertSummary = await upsertObservationsWithCounts(
      client,
      filteredRows.map((row) => ({
        metricId: options.metricId,
        stateId: row.stateCode,
        year: row.year,
        value: row.value,
      })),
    );

    warnings.push(...buildCoverageWarnings(providerCoverage, options.logPrefix, stateIds.length));
    warnings.push(
      ...buildCoverageWarnings(upsertSummary.coverageByYear, options.logPrefix, stateIds.length),
    );

    for (const warning of warnings) {
      console.warn(warning);
    }

    const metricBounds = await getMetricYearBounds(client, options.metricId);
    const status =
      hadProviderPartialFailures || warnings.length > 0
        ? IngestionStatus.partial
        : IngestionStatus.success;

    await completeIngestionRun(client, run.id, status, {
      metricId: options.metricId,
      sourceId: activeSourceId,
      mode: useRealApi ? "real_api" : "synthetic_fallback",
      lookbackYears: INGEST_LOOKBACK_YEARS,
      counts: {
        expectedStates: stateIds.length,
        observationsTotal: upsertSummary.total,
        observationsInserted: upsertSummary.inserted,
        observationsUpdated: upsertSummary.updated,
      },
      years: {
        minYear: metricBounds.minYear,
        maxYear: metricBounds.maxYear,
      },
      warnings,
      notices,
    });

    console.log(
      `${options.logPrefix} Completed with status=${status} inserted=${upsertSummary.inserted} updated=${upsertSummary.updated}.`,
    );

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
        metricId: options.metricId,
        error: errorMessage,
        warnings,
        notices,
      });
    }

    throw error;
  } finally {
    await client.$disconnect();
  }
}
