import "dotenv/config";
import { IngestionStatus } from "@prisma/client";
import { prisma } from "../lib/db";
import { dataSources, MEDIAN_HOUSEHOLD_INCOME_ID, metrics } from "../lib/metrics";
import { states } from "../lib/states";
import { IngestionSummary } from "../lib/types";

const START_YEAR = 2004;
const END_YEAR = 2023;

type ObservationInput = {
  stateId: string;
  metricId: string;
  year: number;
  value: number;
};

const incomeMetric = metrics.find((metric) => metric.id === MEDIAN_HOUSEHOLD_INCOME_ID);
const censusSource = dataSources.find((source) => source.id === "census_acs");

async function upsertStates() {
  await prisma.$transaction(
    states.map((state) =>
      prisma.state.upsert({
        where: { id: state.id },
        update: { name: state.name, abbreviation: state.abbreviation },
        create: state,
      }),
    ),
  );
}

async function upsertDataSourceAndMetric() {
  if (!censusSource || !incomeMetric) {
    throw new Error("Metric or data source definitions are missing");
  }

  await prisma.dataSource.upsert({
    where: { id: censusSource.id },
    update: censusSource,
    create: censusSource,
  });

  await prisma.metric.upsert({
    where: { id: incomeMetric.id },
    update: {
      name: incomeMetric.name,
      description: incomeMetric.description,
      unit: incomeMetric.unit,
      category: incomeMetric.category,
      isDefault: incomeMetric.isDefault ?? false,
      sourceId: incomeMetric.sourceId,
    },
    create: {
      id: incomeMetric.id,
      name: incomeMetric.name,
      description: incomeMetric.description,
      unit: incomeMetric.unit,
      category: incomeMetric.category,
      isDefault: incomeMetric.isDefault ?? false,
      sourceId: incomeMetric.sourceId,
    },
  });
}

function mockFetchMedianIncome(stateId: string): ObservationInput[] {
  const stateIndex = states.findIndex((state) => state.id === stateId);
  const observations: ObservationInput[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const base = 40000 + (year - START_YEAR) * 1200;
    const variance = stateIndex * 150 + ((year + stateIndex) % 5) * 75;
    const value = base + variance;

    observations.push({
      stateId,
      metricId: MEDIAN_HOUSEHOLD_INCOME_ID,
      year,
      value,
    });
  }

  return observations;
}

async function ingestObservations(
  errors: string[],
): Promise<{
  inserted: number;
  updated: number;
}> {
  let inserted = 0;
  let updated = 0;

  for (const state of states) {
    const observations = mockFetchMedianIncome(state.id);

    for (const observation of observations) {
      try {
        const existing = await prisma.observation.findUnique({
          where: {
            stateId_metricId_year: {
              stateId: observation.stateId,
              metricId: observation.metricId,
              year: observation.year,
            },
          },
        });

        if (existing) {
          await prisma.observation.update({
            where: { id: existing.id },
            data: { value: observation.value },
          });
          updated += 1;
        } else {
          await prisma.observation.create({ data: observation });
          inserted += 1;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown observation upsert error";
        errors.push(
          `Failed to upsert observation for ${observation.stateId} (${observation.year}): ${message}`,
        );
      }
    }
  }

  return { inserted, updated };
}

export async function runMedianHouseholdIncomeIngestion(): Promise<IngestionSummary> {
  if (!incomeMetric || !censusSource) {
    throw new Error("Missing metric or data source definition for ingestion.");
  }

  const run = await prisma.ingestionRun.create({
    data: {
      dataSourceId: censusSource.id,
      status: IngestionStatus.in_progress,
    },
  });

  const errors: string[] = [];
  let fatalError: Error | null = null;
  const startedAt = run.startedAt;
  let status: IngestionStatus = IngestionStatus.success;
  let completedAt: Date | null = null;
  let counts = {
    states: states.length,
    observationsInserted: 0,
    observationsUpdated: 0,
    years: { start: START_YEAR, end: END_YEAR },
  };

  try {
    await upsertStates();
    await upsertDataSourceAndMetric();
    const observationCounts = await ingestObservations(errors);
    counts = {
      ...counts,
      observationsInserted: observationCounts.inserted,
      observationsUpdated: observationCounts.updated,
    };
  } catch (error) {
    fatalError = error instanceof Error ? error : new Error("Unknown ingestion error");
    errors.push(fatalError.message);
  } finally {
    completedAt = new Date();
    status = fatalError
      ? IngestionStatus.failed
      : errors.length > 0
        ? IngestionStatus.partial
        : IngestionStatus.success;

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt,
        details: {
          counts,
          errors,
        },
      },
    });
  }

  if (fatalError) {
    throw fatalError;
  }

  return {
    runId: run.id,
    status,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt?.toISOString() ?? null,
    counts,
    errors,
  };
}

async function main() {
  try {
    const summary = await runMedianHouseholdIncomeIngestion();
    console.log("Ingestion summary:", summary);
  } catch (error) {
    console.error("Median income ingestion failed", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
