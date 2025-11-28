import { PrismaClient } from "@prisma/client";
import { DataSourceInfo, MetricDefinition } from "./types";

export const dataSources: DataSourceInfo[] = [
  {
    id: "census_acs",
    name: "U.S. Census American Community Survey",
    description: "Annual estimates on income, demographics, housing, and more.",
    homepageUrl: "https://www.census.gov/programs-surveys/acs",
    apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
  },
  {
    id: "bls_laus",
    name: "BLS Local Area Unemployment Statistics",
    description: "Unemployment rates and labor market estimates from BLS LAUS.",
    homepageUrl: "https://www.bls.gov/lau/",
    apiDocsUrl: "https://download.bls.gov/pub/time.series/la/",
  },
];

export const metrics: MetricDefinition[] = [
  {
    id: "median_household_income",
    name: "Median Household Income",
    description: "Median household income (ACS 1-year estimates, inflation adjusted).",
    unit: "USD",
    sourceId: "census_acs",
    category: "Income",
    isDefault: true,
    sourceHint: "Census ACS",
  },
  {
    id: "unemployment_rate",
    name: "Unemployment Rate",
    description: "Annual average unemployment rate for civilian labor force.",
    unit: "%",
    sourceId: "bls_laus",
    category: "Labor",
    sourceHint: "BLS LAUS",
  },
  {
    id: "population_total",
    name: "Total Population",
    description: "Total resident population.",
    unit: "people",
    sourceId: "census_acs",
    category: "Population",
    sourceHint: "Census ACS",
  },
  {
    id: "median_home_value",
    name: "Median Home Value",
    description: "Median value of owner-occupied housing units.",
    unit: "USD",
    sourceId: "census_acs",
    category: "Housing",
    sourceHint: "Census ACS",
  },
  {
    id: "median_age",
    name: "Median Age",
    description: "Median age of the population.",
    unit: "years",
    sourceId: "census_acs",
    category: "Age",
    sourceHint: "Census ACS",
  },
];

export const MEDIAN_HOUSEHOLD_INCOME_ID = "median_household_income";

export function getMetricConfigById(id: string | null | undefined) {
  return metrics.find((m) => m.id === id) ?? metrics.find((m) => m.isDefault) ?? metrics[0];
}

/**
 * Ensure cataloged data sources and metrics exist in the database.
 * Safe to call at startup on the server.
 */
export async function ensureCatalog(prisma: PrismaClient) {
  for (const source of dataSources) {
    await prisma.dataSource.upsert({
      where: { id: source.id },
      update: {
        name: source.name,
        description: source.description,
        homepageUrl: source.homepageUrl,
        apiDocsUrl: source.apiDocsUrl,
      },
      create: {
        id: source.id,
        name: source.name,
        description: source.description,
        homepageUrl: source.homepageUrl,
        apiDocsUrl: source.apiDocsUrl,
      },
    });
  }

  for (const metric of metrics) {
    await prisma.metric.upsert({
      where: { id: metric.id },
      update: {
        name: metric.name,
        description: metric.description,
        unit: metric.unit,
        category: metric.category,
        isDefault: Boolean(metric.isDefault),
        sourceId: metric.sourceId,
      },
      create: {
        id: metric.id,
        name: metric.name,
        description: metric.description,
        unit: metric.unit,
        category: metric.category,
        isDefault: Boolean(metric.isDefault),
        sourceId: metric.sourceId,
      },
    });
  }
}
