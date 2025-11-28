import { IngestionRun, IngestionStatus, Prisma, PrismaClient, Metric } from "@prisma/client";
import { prisma } from "../../lib/db";
import { states } from "../../lib/states";
import { dataSources, getMetricConfigById } from "../../lib/metrics";

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

export async function ensureDataSource(
  client: PrismaClient,
  config: {
    id: string;
    name: string;
    description?: string | null;
    homepageUrl?: string | null;
    apiDocsUrl?: string | null;
  },
) {
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
  overrides?: Partial<{ isDefault: boolean }>,
): Promise<Metric> {
  const metricConfig = getMetricConfigById(metricId);
  if (!metricConfig) {
    throw new Error(`Unknown metric id: ${metricId}`);
  }

  const sourceConfig = dataSources.find((s) => s.id === metricConfig.sourceId);
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
      sourceId: metricConfig.sourceId,
    },
    create: {
      id: metricConfig.id,
      name: metricConfig.name,
      description: metricConfig.description,
      unit: metricConfig.unit,
      category: metricConfig.category,
      isDefault: overrides?.isDefault ?? Boolean(metricConfig.isDefault),
      sourceId: metricConfig.sourceId,
    },
  });
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
