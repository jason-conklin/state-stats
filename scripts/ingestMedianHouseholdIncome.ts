import "dotenv/config";
import { IngestionStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { states } from "../lib/states";
import { generateIncomeSamples, SAMPLE_YEARS } from "./data/median_household_income_sample";

const DATA_SOURCE_ID = "census_acs_median_household_income";
const METRIC_ID = "median_household_income";

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
  console.log(`[ingestMedianHouseholdIncome] Upserted ${states.length} states`);
}

async function upsertDataSource() {
  await prisma.dataSource.upsert({
    where: { id: DATA_SOURCE_ID },
    update: {
      name: "Census ACS – Median Household Income",
      description: "Synthetic sample of ACS median household income data.",
      homepageUrl: "https://www.census.gov/programs-surveys/acs",
      apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
    },
    create: {
      id: DATA_SOURCE_ID,
      name: "Census ACS – Median Household Income",
      description: "Synthetic sample of ACS median household income data.",
      homepageUrl: "https://www.census.gov/programs-surveys/acs",
      apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
    },
  });
  console.log("[ingestMedianHouseholdIncome] DataSource ensured");
}

async function upsertMetric() {
  await prisma.metric.upsert({
    where: { id: METRIC_ID },
    update: {
      name: "Median household income",
      description: "Median household income (USD, synthetic sample for development).",
      unit: "USD",
      category: "Income",
      isDefault: true,
      sourceId: DATA_SOURCE_ID,
    },
    create: {
      id: METRIC_ID,
      name: "Median household income",
      description: "Median household income (USD, synthetic sample for development).",
      unit: "USD",
      category: "Income",
      isDefault: true,
      sourceId: DATA_SOURCE_ID,
    },
  });
  console.log("[ingestMedianHouseholdIncome] Metric ensured");
}

async function upsertObservations() {
  const samples = generateIncomeSamples(states);
  let inserted = 0;
  let updated = 0;

  for (const sample of samples) {
    const existing = await prisma.observation.findUnique({
      where: {
        stateId_metricId_year: {
          stateId: sample.stateId,
          metricId: METRIC_ID,
          year: sample.year,
        },
      },
    });

    if (existing) {
      await prisma.observation.update({
        where: { id: existing.id },
        data: { value: sample.value },
      });
      updated += 1;
    } else {
      await prisma.observation.create({
        data: {
          stateId: sample.stateId,
          metricId: METRIC_ID,
          year: sample.year,
          value: sample.value,
        },
      });
      inserted += 1;
    }
  }

  console.log(
    `[ingestMedianHouseholdIncome] Observations upserted: inserted=${inserted}, updated=${updated}`,
  );
  return { inserted, updated, total: samples.length };
}

async function recordIngestion(
  status: IngestionStatus,
  runId: string,
  details: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | Prisma.NullTypes.DbNull | undefined,
) {
  await prisma.ingestionRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: new Date(),
      details,
    },
  });
}

export async function runMedianHouseholdIncomeIngestion() {
  await upsertDataSource();

  const run = await prisma.ingestionRun.create({
    data: {
      dataSourceId: DATA_SOURCE_ID,
      status: IngestionStatus.in_progress,
    },
  });

  console.log(`[ingestMedianHouseholdIncome] Ingestion run started: ${run.id}`);

  try {
    await upsertStates();
    await upsertMetric();
    const observations = await upsertObservations();

    const details = {
      statesUpserted: states.length,
      metricsUpserted: 1,
      observationsInserted: observations.inserted,
      observationsUpdated: observations.updated,
      years: { start: SAMPLE_YEARS[0], end: SAMPLE_YEARS[SAMPLE_YEARS.length - 1] },
    };

    await recordIngestion(IngestionStatus.success, run.id, details);
    console.log(
      `[ingestMedianHouseholdIncome] Ingestion complete: ${details.statesUpserted} states, ${details.metricsUpserted} metric, ${observations.total} observations (${details.years.start}–${details.years.end}).`,
    );
  } catch (error) {
    console.error("[ingestMedianHouseholdIncome] Ingestion failed:", error);
    await recordIngestion(IngestionStatus.failed, run.id, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

async function main() {
  console.log("[ingestMedianHouseholdIncome] Starting ingestion...");
  try {
    await runMedianHouseholdIncomeIngestion();
    console.log("[ingestMedianHouseholdIncome] Ingestion complete.");
  } catch (err) {
    console.error("[ingestMedianHouseholdIncome] Fatal error:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
