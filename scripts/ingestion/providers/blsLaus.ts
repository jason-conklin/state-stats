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
  logPerYear?: boolean;
};

export type BlsLausSeriesResult = {
  observations: BlsLausObservation[];
  years: number[];
  latestAvailableYear: number;
  coverageByYear: Record<number, number>;
  warnings: string[];
  failedYears: number[];
  skippedYears: number[];
  hadPartialFailures: boolean;
};

export class BlsSyntheticFallbackError extends Error {
  kind: "auth" | "all_years_failed";

  constructor(kind: "auth" | "all_years_failed", message: string) {
    super(message);
    this.name = "BlsSyntheticFallbackError";
    this.kind = kind;
  }
}

export function isBlsSyntheticFallbackError(error: unknown): error is BlsSyntheticFallbackError {
  return error instanceof BlsSyntheticFallbackError;
}

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

function looksLikeAuthFailure(messages: string[]) {
  const normalized = messages.join(" ").toLowerCase();
  return (
    normalized.includes("invalid registration key") ||
    normalized.includes("registration key") ||
    normalized.includes("not authorized") ||
    normalized.includes("unauthorized")
  );
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
  year: number,
  apiKey: string,
  logPrefix: string,
) {
  const payload = {
    seriesid: seriesIds,
    startyear: String(year),
    endyear: String(year),
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
    if (response.status === 401 || response.status === 403) {
      throw new BlsSyntheticFallbackError(
        "auth",
        `${logPrefix} BLS authentication failed (${response.status}).`,
      );
    }
    throw new Error(`${logPrefix} BLS API request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as BlsApiPayload;
  const messages = extractMessageStrings(json.message);

  if (json.status !== "REQUEST_SUCCEEDED") {
    if (looksLikeAuthFailure(messages)) {
      throw new BlsSyntheticFallbackError(
        "auth",
        `${logPrefix} BLS authentication error: ${messages.join(" | ")}`,
      );
    }
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

function parseAnnualAverageValue(series: BlsSeriesResult, year: number) {
  const rowsForYear = series.data.filter((row) => Number(row.year) === year);
  const annualRow = rowsForYear.find((row) => row.period === ANNUAL_AVERAGE_PERIOD);
  if (annualRow) {
    const annualValue = Number(annualRow.value);
    if (Number.isFinite(annualValue)) {
      return annualValue;
    }
  }

  // Some LAUS series return monthly points only; derive annual average from M01-M12.
  const monthlyValues = rowsForYear
    .filter((row) => /^M(0[1-9]|1[0-2])$/.test(row.period))
    .map((row) => Number(row.value))
    .filter((value) => Number.isFinite(value));

  if (!monthlyValues.length) {
    return null;
  }

  const total = monthlyValues.reduce((sum, value) => sum + value, 0);
  return Number((total / monthlyValues.length).toFixed(3));
}

function resolveYearsToAttempt(
  startYear: number,
  endYear: number,
  lookbackYears?: number | null,
) {
  const lower = Math.min(startYear, endYear);
  const upper = Math.max(startYear, endYear);
  const effectiveLower =
    lookbackYears && lookbackYears > 0
      ? Math.max(lower, upper - lookbackYears + 1)
      : lower;

  const years: number[] = [];
  for (let year = effectiveLower; year <= upper; year += 1) {
    years.push(year);
  }
  return years;
}

export async function fetchBlsLausAnnualUnemployment(
  options: FetchBlsLausSeriesOptions,
): Promise<BlsLausSeriesResult> {
  const yearsToAttempt = resolveYearsToAttempt(
    options.startYear,
    options.endYear,
    options.lookbackYears,
  );
  const stateCodes = states.map((state) => state.id);
  const seriesByState = new Map<string, string>();
  const stateBySeries = new Map<string, string>();
  for (const stateCode of stateCodes) {
    const seriesId = buildLausStateUnemploymentRateSeriesId(stateCode);
    seriesByState.set(stateCode, seriesId);
    stateBySeries.set(seriesId, stateCode);
  }

  const seriesIdBatches = chunk(Array.from(seriesByState.values()), MAX_SERIES_PER_REQUEST);
  const valueByStateYear = new Map<string, BlsLausObservation>();
  const coverageByYear: Record<number, number> = {};
  const warnings: string[] = [];
  const failedYears = new Set<number>();
  const skippedYears = new Set<number>();
  let allYearsHttpOrNetworkFailures = true;

  for (const year of yearsToAttempt) {
    if (options.logPerYear) {
      console.log(`${options.logPrefix} Fetching year ${year}...`);
    }

    const coverageSet = new Set<string>();
    let yearBatchFailures = 0;
    let yearAnyResponse = false;

    for (const batch of seriesIdBatches) {
      try {
        const batchResult = await requestBlsSeries(batch, year, options.apiKey, options.logPrefix);
        yearAnyResponse = true;

        if (batchResult.messages.length > 0) {
          warnings.push(
            `${options.logPrefix} BLS API messages for ${year}: ${batchResult.messages.join(" | ")}`,
          );
        }

        for (const series of batchResult.series) {
          const stateCode = stateBySeries.get(series.seriesID);
          if (!stateCode) continue;
          const annualValue = parseAnnualAverageValue(series, year);
          if (annualValue === null) continue;
          const key = `${stateCode}:${year}`;
          valueByStateYear.set(key, {
            stateCode,
            year,
            value: annualValue,
          });
          coverageSet.add(stateCode);
        }
      } catch (error) {
        if (isBlsSyntheticFallbackError(error)) {
          throw error;
        }
        yearBatchFailures += 1;
        warnings.push(
          `${options.logPrefix} Year ${year}: request failure (${error instanceof Error ? error.message : String(error)}).`,
        );
      }
    }

    if (coverageSet.size > 0) {
      coverageByYear[year] = coverageSet.size;
      allYearsHttpOrNetworkFailures = false;
      if (options.logPerYear) {
        console.log(
          `${options.logPrefix} Year ${year} success: ${coverageSet.size} state values.`,
        );
      }
      if (yearBatchFailures > 0) {
        failedYears.add(year);
      }
      continue;
    }

    if (yearBatchFailures === seriesIdBatches.length) {
      failedYears.add(year);
      if (options.logPerYear) {
        console.warn(`${options.logPrefix} Year ${year} failed: all requests failed.`);
      }
    } else {
      skippedYears.add(year);
      allYearsHttpOrNetworkFailures = false;
      if (options.logPerYear) {
        console.warn(`${options.logPrefix} Year ${year} has no annual-average LAUS data; skipping.`);
      }
    }

    if (yearAnyResponse) {
      allYearsHttpOrNetworkFailures = false;
    }
  }

  const observations = Array.from(valueByStateYear.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.stateCode.localeCompare(b.stateCode);
  });

  if (!observations.length) {
    if (allYearsHttpOrNetworkFailures) {
      throw new BlsSyntheticFallbackError(
        "all_years_failed",
        `${options.logPrefix} BLS requests failed for all attempted years.`,
      );
    }
    throw new Error(`${options.logPrefix} BLS provider returned no annual-average observations.`);
  }

  const yearsWithData = Object.keys(coverageByYear)
    .map(Number)
    .sort((a, b) => a - b);
  const latestAvailableYear = yearsWithData[yearsWithData.length - 1]!;

  return {
    observations,
    years: yearsWithData,
    latestAvailableYear,
    coverageByYear,
    warnings,
    failedYears: Array.from(failedYears).sort((a, b) => a - b),
    skippedYears: Array.from(skippedYears).sort((a, b) => a - b),
    hadPartialFailures: failedYears.size > 0 || skippedYears.size > 0,
  };
}
