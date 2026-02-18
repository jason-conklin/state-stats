export const DEFAULT_YEAR_RANGE = {
  start: 2000,
  end: new Date().getFullYear() - 1,
};

export const ACS_MIN_YEAR = 2005;
export const BLS_MAX_YEARS_PER_REQUEST = 20;

function parsePositiveInt(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export const INGEST_LOOKBACK_YEARS = parsePositiveInt(process.env.INGEST_LOOKBACK_YEARS);
