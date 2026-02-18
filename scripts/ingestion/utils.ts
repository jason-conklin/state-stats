import { config as loadDotEnvConfig } from "dotenv";
import { IngestionRun, IngestionStatus, Metric, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/db";
import { dataSources, metrics } from "../../lib/metrics";
import { states } from "../../lib/states";

type DataSourceConfig = {
  id: string;
  name: string;
  description?: string | null;
  homepageUrl?: string | null;
  apiDocsUrl?: string | null;
};

export const DATA_SOURCE_CONFIGS = {
  censusAcsReal: {
    id: "census_acs",
    name: "U.S. Census American Community Survey",
    description:
      "Annual state-level ACS 1-year estimates for demographics, income, housing, and population.",
    homepageUrl: "https://www.census.gov/programs-surveys/acs",
    apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
  },
  blsLausReal: {
    id: "bls_laus",
    name: "BLS Local Area Unemployment Statistics",
    description: "Annual average unemployment rates from BLS LAUS.",
    homepageUrl: "https://www.bls.gov/lau/",
    apiDocsUrl: "https://download.bls.gov/pub/time.series/la/",
  },
  censusAcsSynthetic: {
    id: "census_acs_synthetic",
    name: "U.S. Census ACS (synthetic fallback)",
    description: "Used only when CENSUS_API_KEY is missing.",
    homepageUrl: "https://www.census.gov/programs-surveys/acs",
    apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
  },
  blsLausSynthetic: {
    id: "bls_unemployment_rate_synthetic",
    name: "BLS LAUS (synthetic fallback)",
    description: "Used only when BLS_API_KEY is missing.",
    homepageUrl: "https://www.bls.gov/lau/",
    apiDocsUrl: "https://download.bls.gov/pub/time.series/la/",
  },
} as const satisfies Record<string, DataSourceConfig>;

const LEGACY_SOURCE_ID_MAP: Record<string, string> = {
  census_acs_median_household_income: DATA_SOURCE_CONFIGS.censusAcsSynthetic.id,
  census_acs_population_total: DATA_SOURCE_CONFIGS.censusAcsSynthetic.id,
  census_acs_home_value: DATA_SOURCE_CONFIGS.censusAcsSynthetic.id,
  census_acs_median_age: DATA_SOURCE_CONFIGS.censusAcsSynthetic.id,
  bls_unemployment_rate: DATA_SOURCE_CONFIGS.blsLausSynthetic.id,
};

let envLoaded = false;

export function loadIngestionEnv() {
  if (envLoaded) return;
  loadDotEnvConfig();
  envLoaded = true;
}

// Shared Prisma client for ingestion scripts.
export function getPrismaClient(): PrismaClient {
  return prisma;
}

export async function ensureStates(client: PrismaClient) {
  await client.$transaction(
    states.map((state) =>
      client.state.upsert({
        where: { id: state.id },
        update: { name: state.name, abbreviation: state.abbreviation },
        create: state,
      }),
    ),
  );
  return states.length;
}

export async function ensureDataSource(client: PrismaClient, config: DataSourceConfig) {
  await client.dataSource.upsert({
    where: { id: config.id },
    update: {
      name: config.name,
      description: config.description ?? null,
      homepageUrl: config.homepageUrl ?? null,
      apiDocsUrl: config.apiDocsUrl ?? null,
    },
    create: {
      id: config.id,
      name: config.name,
      description: config.description ?? null,
      homepageUrl: config.homepageUrl ?? null,
      apiDocsUrl: config.apiDocsUrl ?? null,
    },
  });
}

export async function ensureMetric(
  client: PrismaClient,
  metricId: string,
  overrides?: Partial<{ isDefault: boolean; sourceId: string }>,
): Promise<Metric> {
  const metricConfig = metrics.find((metric) => metric.id === metricId);
  if (!metricConfig) {
    throw new Error(`Unknown metric id: ${metricId}`);
  }

  const sourceId = overrides?.sourceId ?? metricConfig.sourceId;

  const sourceConfig =
    dataSources.find((source) => source.id === sourceId) ??
    Object.values(DATA_SOURCE_CONFIGS).find((source) => source.id === sourceId);
  if (sourceConfig) {
    await ensureDataSource(client, sourceConfig);
  }

  return client.metric.upsert({
    where: { id: metricConfig.id },
    update: {
      name: metricConfig.name,
      description: metricConfig.description,
      unit: metricConfig.unit,
      category: metricConfig.category,
      isDefault: overrides?.isDefault ?? Boolean(metricConfig.isDefault),
      sourceId,
    },
    create: {
      id: metricConfig.id,
      name: metricConfig.name,
      description: metricConfig.description,
      unit: metricConfig.unit,
      category: metricConfig.category,
      isDefault: overrides?.isDefault ?? Boolean(metricConfig.isDefault),
      sourceId,
    },
  });
}

export async function normalizeLegacyDataSources(client: PrismaClient) {
  const legacySourceIds = Object.keys(LEGACY_SOURCE_ID_MAP);
  const legacySources = await client.dataSource.findMany({
    where: { id: { in: legacySourceIds } },
    select: { id: true },
  });

  if (!legacySources.length) {
    return 0;
  }

  await ensureDataSource(client, DATA_SOURCE_CONFIGS.censusAcsSynthetic);
  await ensureDataSource(client, DATA_SOURCE_CONFIGS.blsLausSynthetic);

  let migratedSourceCount = 0;
  for (const source of legacySources) {
    const targetSourceId = LEGACY_SOURCE_ID_MAP[source.id];
    if (!targetSourceId) continue;

    await client.metric.updateMany({
      where: { sourceId: source.id },
      data: { sourceId: targetSourceId },
    });

    await client.ingestionRun.updateMany({
      where: { dataSourceId: source.id },
      data: { dataSourceId: targetSourceId },
    });

    await client.dataSource.delete({ where: { id: source.id } });
    migratedSourceCount += 1;
  }

  if (migratedSourceCount > 0) {
    console.log(`[ingestion] Normalized ${migratedSourceCount} legacy data source ID(s).`);
  }

  return migratedSourceCount;
}

export async function upsertObservation(
  client: PrismaClient,
  entry: { metricId: string; stateId: string; year: number; value: number },
) {
  await client.observation.upsert({
    where: {
      stateId_metricId_year: {
        stateId: entry.stateId,
        metricId: entry.metricId,
        year: entry.year,
      },
    },
    update: { value: entry.value },
    create: {
      metricId: entry.metricId,
      stateId: entry.stateId,
      year: entry.year,
      value: entry.value,
    },
  });
}

export type ObservationInput = {
  metricId: string;
  stateId: string;
  year: number;
  value: number;
};

export type ObservationUpsertSummary = {
  inserted: number;
  updated: number;
  total: number;
  years: number[];
  coverageByYear: Record<number, number>;
};

export async function upsertObservationsWithCounts(
  client: PrismaClient,
  observations: ObservationInput[],
): Promise<ObservationUpsertSummary> {
  if (!observations.length) {
    return { inserted: 0, updated: 0, total: 0, years: [], coverageByYear: {} };
  }

  const deduped = new Map<string, ObservationInput>();
  for (const observation of observations) {
    if (!Number.isFinite(observation.value)) continue;
    const key = `${observation.metricId}:${observation.stateId}:${observation.year}`;
    deduped.set(key, observation);
  }

  const entries = Array.from(deduped.values());
  const metricIds = Array.from(new Set(entries.map((entry) => entry.metricId)));
  const stateIds = Array.from(new Set(entries.map((entry) => entry.stateId)));
  const years = Array.from(new Set(entries.map((entry) => entry.year))).sort((a, b) => a - b);

  const where: Prisma.ObservationWhereInput = {
    stateId: { in: stateIds },
    year: { in: years },
    metricId: metricIds.length === 1 ? metricIds[0] : { in: metricIds },
  };

  const existing = await client.observation.findMany({
    where,
    select: { metricId: true, stateId: true, year: true },
  });

  const existingKeys = new Set(existing.map((item) => `${item.metricId}:${item.stateId}:${item.year}`));

  let inserted = 0;
  let updated = 0;
  const statesByYear = new Map<number, Set<string>>();

  for (const entry of entries) {
    await upsertObservation(client, entry);

    const entryKey = `${entry.metricId}:${entry.stateId}:${entry.year}`;
    if (existingKeys.has(entryKey)) {
      updated += 1;
    } else {
      inserted += 1;
      existingKeys.add(entryKey);
    }

    const stateBucket = statesByYear.get(entry.year) ?? new Set<string>();
    stateBucket.add(entry.stateId);
    statesByYear.set(entry.year, stateBucket);
  }

  const coverageByYear = Object.fromEntries(
    Array.from(statesByYear.entries()).map(([year, stateSet]) => [year, stateSet.size]),
  );

  return {
    inserted,
    updated,
    total: entries.length,
    years,
    coverageByYear,
  };
}

export function buildCoverageWarnings(
  coverageByYear: Record<number, number>,
  logPrefix: string,
  expectedStateCount = states.length,
) {
  const warnings: string[] = [];
  const years = Object.keys(coverageByYear)
    .map(Number)
    .sort((a, b) => a - b);

  for (const year of years) {
    const stateCount = coverageByYear[year] ?? 0;
    if (stateCount < expectedStateCount) {
      warnings.push(
        `${logPrefix} Year ${year}: wrote ${stateCount} state(s); expected ${expectedStateCount} (50 states + DC).`,
      );
    }
  }

  return warnings;
}

export async function getMetricYearBounds(client: PrismaClient, metricId: string) {
  const bounds = await client.observation.aggregate({
    where: { metricId },
    _min: { year: true },
    _max: { year: true },
  });

  return {
    minYear: bounds._min.year,
    maxYear: bounds._max.year,
  };
}

export async function startIngestionRun(client: PrismaClient, dataSourceId: string): Promise<IngestionRun> {
  const source = await client.dataSource.findUnique({ where: { id: dataSourceId } });
  if (!source) {
    throw new Error(
      `startIngestionRun: data source ${dataSourceId} does not exist. Call ensureDataSource before starting the run.`,
    );
  }
  return client.ingestionRun.create({
    data: {
      dataSourceId,
      status: IngestionStatus.in_progress,
      startedAt: new Date(),
    },
  });
}

export async function completeIngestionRun(
  client: PrismaClient,
  runId: string,
  status: IngestionStatus,
  details?: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | Prisma.NullTypes.DbNull,
) {
  await client.ingestionRun
    .update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        details,
      },
    })
    .catch((err) => {
      // Surface a clear error if the run was never created.
      console.error(`[completeIngestionRun] Failed to update run ${runId}:`, err);
      throw err;
    });
}
