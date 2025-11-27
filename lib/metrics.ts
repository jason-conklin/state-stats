import { DataSourceInfo, MetricDefinition } from "./types";

export const dataSources: DataSourceInfo[] = [
  {
    id: "census_acs",
    name: "U.S. Census American Community Survey",
    description: "Annual estimates on income, demographics, housing, and more.",
    homepageUrl: "https://www.census.gov/programs-surveys/acs",
    apiDocsUrl: "https://www.census.gov/data/developers/data-sets/acs-1year.html",
  },
];

export const metrics: MetricDefinition[] = [
  {
    id: "median_household_income",
    name: "Median Household Income",
    description: "Median household income (ACS 1-year estimates, inflation adjusted).",
    unit: "USD",
    sourceId: "census_acs",
    category: "income",
    isDefault: true,
  },
];

export const MEDIAN_HOUSEHOLD_INCOME_ID = "median_household_income";
