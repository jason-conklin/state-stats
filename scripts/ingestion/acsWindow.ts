import { ACS_MIN_YEAR, DEFAULT_YEAR_RANGE } from "./config";

export type AcsExpectedWindowConfig = {
  startYear: number;
  excludedYears: number[];
};

export type ResolvedAcsExpectedWindow = {
  startYear: number;
  endYear: number;
  excludedYears: number[];
  allowedYears: number[];
};

export const ACS_ONE_YEAR_REAL_WINDOW_CONFIG: AcsExpectedWindowConfig = {
  startYear: ACS_MIN_YEAR,
  excludedYears: [2020],
};

export function resolveAcsExpectedWindow(
  latestAvailableYear: number,
  config: AcsExpectedWindowConfig = ACS_ONE_YEAR_REAL_WINDOW_CONFIG,
): ResolvedAcsExpectedWindow {
  const startYear = Math.max(config.startYear, ACS_MIN_YEAR);
  const endYear = Math.max(startYear, Math.min(DEFAULT_YEAR_RANGE.end, latestAvailableYear));
  const excludedYears = Array.from(new Set(config.excludedYears)).filter(
    (year) => year >= startYear && year <= endYear,
  );
  const excludedSet = new Set(excludedYears);
  const allowedYears: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    if (!excludedSet.has(year)) {
      allowedYears.push(year);
    }
  }

  return {
    startYear,
    endYear,
    excludedYears,
    allowedYears,
  };
}
