import { BLS_MAX_YEARS_PER_REQUEST } from "../config";
import { states } from "../../../lib/states";

const BLS_TIMESERIES_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 500;
const MAX_SERIES_PER_REQUEST = 25;
const ANNUAL_AVERAGE_PERIOD = "M13";

type FetchRetryOptions = {
  logPrefix: string;
};

type BlsSeriesDatum = {
  year: string;
  period: string;
  value: string;
};

type BlsSeriesResult = {
  seriesID: string;
  data: BlsSeriesDatum[];
};

type BlsApiPayload = {
  status?: string;
  message?: unknown;
  Results?: {
    series?: unknown;
  };
};

export type BlsLausObservation = {
  stateCode: string;
  year: number;
  value: number;
};

export type FetchBlsLausSeriesOptions = {
  apiKey: string;
  startYear: number;
  endYear: number;
  lookbackYears?: number | null;
  logPrefix: string;
};

export type BlsLausSeriesResult = {
  observations: BlsLausObservation[];
  years: number[];
  latestAvailableYear: number;
  coverageByYear: Record<number, number>;
  warnings: string[];
  hadPartialFailures: boolean;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, options: FetchRetryOptions) {
  let backoffMs = INITIAL_BACKOFF_MS;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) {
        return response;
      }
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === MAX_RETRIES) {
        break;
      }
    }

    console.warn(`${options.logPrefix} Retry ${attempt}/${MAX_RETRIES} for ${url}`);
    await delay(backoffMs);
    backoffMs *= 2;
  }

  throw lastError ?? new Error(`${options.logPrefix} Request failed: ${url}`);
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function buildYearWindows(startYear: number, endYear: number, maxWindowSize: number) {
  const windows: Array<{ startYear: number; endYear: number }> = [];
  let cursor = startYear;

  while (cursor <= endYear) {
    const windowEnd = Math.min(endYear, cursor + maxWindowSize - 1);
    windows.push({ startYear: cursor, endYear: windowEnd });
    cursor = windowEnd + 1;
  }

  return windows;
}

function isBlsSeriesArray(value: unknown): value is BlsSeriesResult[] {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const seriesID = (entry as { seriesID?: unknown }).seriesID;
    const data = (entry as { data?: unknown }).data;
    return typeof seriesID === "string" && Array.isArray(data);
  });
}

function extractMessageStrings(message: unknown) {
  if (Array.isArray(message)) {
    return message.map((item) => String(item));
  }
  if (typeof message === "string") {
    return [message];
  }
  return [];
}

/**
 * LAUS series pattern from BLS LAUS docs (`la.txt`):
 * `series_id = LA + seasonal + area_code + measure_code`
 * state area_code format: `ST{STATE_FIPS}00000000000` (e.g., Alabama `ST0100000000000`)
 * unemployment rate measure code: `03`
 * final series example: `LAUST010000000000003`
 */
export function buildLausStateUnemploymentRateSeriesId(stateCode: string) {
  if (!/^\d{2}$/.test(stateCode)) {
    throw new Error(`Invalid state FIPS code for LAUS series: ${stateCode}`);
  }
  return `LAUST${stateCode}0000000000003`;
}

async function requestBlsSeries(
  seriesIds: string[],
  startYear: number,
  endYear: number,
  apiKey: string,
  logPrefix: string,
) {
  const payload = {
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(endYear),
    registrationkey: apiKey,
  };

  const response = await fetchWithRetry(
    BLS_TIMESERIES_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { logPrefix },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${logPrefix} BLS API request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as BlsApiPayload;
  const messages = extractMessageStrings(json.message);

  if (json.status !== "REQUEST_SUCCEEDED") {
    throw new Error(
      `${logPrefix} BLS API returned status=${json.status ?? "unknown"} ${messages.join(" | ")}`,
    );
  }

  const seriesRaw = json.Results?.series;
  if (!isBlsSeriesArray(seriesRaw)) {
    throw new Error(`${logPrefix} BLS response series payload invalid.`);
  }

  return { series: seriesRaw, messages };
}

function parseAnnualAverageRows(series: BlsSeriesResult, logPrefix: string) {
  const annualRows: Array<{ year: number; value: number }> = [];
  for (const row of series.data) {
    if (!row || typeof row !== "object") continue;

    if (row.period !== ANNUAL_AVERAGE_PERIOD) {
      continue;
    }

    const year = Number(row.year);
    const value = Number(row.value);
    if (!Number.isInteger(year) || !Number.isFinite(value)) {
      console.warn(`${logPrefix} Skipping malformed BLS annual row for ${series.seriesID}.`);
      continue;
    }

    annualRows.push({ year, value });
  }

  return annualRows;
}

async function discoverLatestAnnualYear(
  sampleSeriesId: string,
  apiKey: string,
  startYear: number,
  endYear: number,
  logPrefix: string,
) {
  const result = await requestBlsSeries([sampleSeriesId], startYear, endYear, apiKey, logPrefix);
  const firstSeries = result.series[0];
  if (!firstSeries) {
    throw new Error(`${logPrefix} BLS discovery request returned no series results.`);
  }
  const rows = parseAnnualAverageRows(firstSeries, logPrefix);
  const latestYear = rows.reduce((max, row) => Math.max(max, row.year), Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(latestYear)) {
    throw new Error(
      `${logPrefix} Could not discover latest annual-average LAUS year between ${startYear} and ${endYear}.`,
    );
  }

  return latestYear;
}

function resolveYearsToIngest(
  latestAvailableYear: number,
  startYear: number,
  lookbackYears?: number | null,
) {
  const lowerBound =
    lookbackYears && lookbackYears > 0
      ? Math.max(startYear, latestAvailableYear - lookbackYears + 1)
      : startYear;

  const years: number[] = [];
  for (let year = lowerBound; year <= latestAvailableYear; year += 1) {
    years.push(year);
  }
  return years;
}

export async function fetchBlsLausAnnualUnemployment(
  options: FetchBlsLausSeriesOptions,
): Promise<BlsLausSeriesResult> {
  const startYear = Math.min(options.startYear, options.endYear);
  const endYear = Math.max(options.startYear, options.endYear);
  const stateCodes = states.map((state) => state.id);

  const seriesByState = new Map<string, string>();
  const stateBySeries = new Map<string, string>();
  for (const stateCode of stateCodes) {
    const seriesId = buildLausStateUnemploymentRateSeriesId(stateCode);
    seriesByState.set(stateCode, seriesId);
    stateBySeries.set(seriesId, stateCode);
  }

  const sampleSeriesId = seriesByState.get("06") ?? seriesByState.get("01");
  if (!sampleSeriesId) {
    throw new Error(`${options.logPrefix} Unable to build sample LAUS series ID.`);
  }

  const latestAvailableYear = await discoverLatestAnnualYear(
    sampleSeriesId,
    options.apiKey,
    startYear,
    endYear,
    options.logPrefix,
  );

  const yearsToIngest = resolveYearsToIngest(
    latestAvailableYear,
    startYear,
    options.lookbackYears,
  );
  const effectiveStartYear = yearsToIngest[0];
  const effectiveEndYear = yearsToIngest[yearsToIngest.length - 1];
  const yearWindows = buildYearWindows(
    effectiveStartYear,
    effectiveEndYear,
    BLS_MAX_YEARS_PER_REQUEST,
  );
  const seriesIdBatches = chunk(Array.from(seriesByState.values()), MAX_SERIES_PER_REQUEST);

  const valueByStateYear = new Map<string, BlsLausObservation>();
  const coverageSetsByYear = new Map<number, Set<string>>();
  const warnings: string[] = [];
  let failedBatchCount = 0;

  for (const window of yearWindows) {
    for (const seriesBatch of seriesIdBatches) {
      try {
        const batchResult = await requestBlsSeries(
          seriesBatch,
          window.startYear,
          window.endYear,
          options.apiKey,
          options.logPrefix,
        );

        if (batchResult.messages.length > 0) {
          warnings.push(
            `${options.logPrefix} BLS API messages for ${window.startYear}-${window.endYear}: ${batchResult.messages.join(" | ")}`,
          );
        }

        for (const series of batchResult.series) {
          const stateCode = stateBySeries.get(series.seriesID);
          if (!stateCode) {
            warnings.push(
              `${options.logPrefix} Received unknown BLS series ID: ${series.seriesID}.`,
            );
            continue;
          }

          const annualRows = parseAnnualAverageRows(series, options.logPrefix);
          if (!annualRows.length) {
            warnings.push(
              `${options.logPrefix} No annual-average rows (M13) for series ${series.seriesID} in ${window.startYear}-${window.endYear}.`,
            );
            continue;
          }

          for (const row of annualRows) {
            if (row.year < effectiveStartYear || row.year > effectiveEndYear) continue;
            const key = `${stateCode}:${row.year}`;
            valueByStateYear.set(key, {
              stateCode,
              year: row.year,
              value: row.value,
            });

            const coverageSet = coverageSetsByYear.get(row.year) ?? new Set<string>();
            coverageSet.add(stateCode);
            coverageSetsByYear.set(row.year, coverageSet);
          }
        }
      } catch (error) {
        failedBatchCount += 1;
        warnings.push(
          `${options.logPrefix} Failed BLS request for ${window.startYear}-${window.endYear}: ${error instanceof Error ? error.message : String(error)}.`,
        );
      }
    }
  }

  const observations = Array.from(valueByStateYear.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.stateCode.localeCompare(b.stateCode);
  });

  if (!observations.length) {
    throw new Error(`${options.logPrefix} BLS provider returned no observations.`);
  }

  const coverageByYear: Record<number, number> = {};
  for (const year of yearsToIngest) {
    coverageByYear[year] = coverageSetsByYear.get(year)?.size ?? 0;
  }

  return {
    observations,
    years: yearsToIngest,
    latestAvailableYear,
    coverageByYear,
    warnings,
    hadPartialFailures: failedBatchCount > 0,
  };
}
