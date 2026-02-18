import { ACS_MIN_YEAR } from "../config";
import { states } from "../../../lib/states";

const ACS_BASE_URL = "https://api.census.gov/data";
const ACS_DATASET = "acs/acs1";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 500;
const KNOWN_EXPECTED_GAP_YEARS = new Set([2020]);

type FetchRetryOptions = {
  logPrefix: string;
};

export type NormalizedProviderObservation = {
  stateCode: string;
  year: number;
  value: number;
};

export type FetchCensusAcsSeriesOptions = {
  apiKey: string;
  metricId: string;
  variableCode: string;
  expectedLabelIncludes?: string[];
  expectedConceptIncludes?: string[];
  startYear: number;
  endYear: number;
  lookbackYears?: number | null;
  skipMetadataValidation?: boolean;
  logPerYear?: boolean;
  logPrefix: string;
};

export type CensusAcsSeriesResult = {
  observations: NormalizedProviderObservation[];
  years: number[];
  latestAvailableYear: number;
  coverageByYear: Record<number, number>;
  warnings: string[];
  failedYears: number[];
  hadPartialFailures: boolean;
};

class AcsRequestError extends Error {
  year: number;
  status: number;

  constructor(message: string, year: number, status: number) {
    super(message);
    this.name = "AcsRequestError";
    this.year = year;
    this.status = status;
  }
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

function getKeyParam(apiKey: string) {
  return apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
}

async function discoverLatestAcsYear(
  apiKey: string,
  variableCode: string,
  startYear: number,
  endYear: number,
  logPrefix: string,
) {
  for (let year = endYear; year >= startYear; year -= 1) {
    const url = `${ACS_BASE_URL}/${year}/${ACS_DATASET}/variables/${variableCode}.json?${getKeyParam(apiKey).replace(/^&/, "")}`;
    const response = await fetchWithRetry(url, { method: "GET" }, { logPrefix });
    if (response.ok) {
      return year;
    }
    if (response.status === 404) {
      continue;
    }

    const body = await response.text().catch(() => "");
    throw new Error(
      `${logPrefix} Unable to discover ACS availability for year ${year} (${response.status}): ${body}`,
    );
  }

  throw new Error(
    `${logPrefix} Could not find an ACS ${ACS_DATASET} year between ${startYear} and ${endYear}.`,
  );
}

function assertMetadataHasExpectedFragments(
  metadata: Record<string, unknown>,
  expectedLabelIncludes: string[] | undefined,
  expectedConceptIncludes: string[] | undefined,
  variableCode: string,
  logPrefix: string,
) {
  const metadataName = typeof metadata.name === "string" ? metadata.name : "";
  const metadataLabel = typeof metadata.label === "string" ? metadata.label : "";
  const metadataConcept = typeof metadata.concept === "string" ? metadata.concept : "";

  if (metadataName !== variableCode) {
    throw new Error(
      `${logPrefix} ACS variable metadata mismatch. Expected ${variableCode}, got ${metadataName || "unknown"}.`,
    );
  }

  if (expectedLabelIncludes?.length) {
    const labelLower = metadataLabel.toLowerCase();
    for (const fragment of expectedLabelIncludes) {
      if (!labelLower.includes(fragment.toLowerCase())) {
        throw new Error(
          `${logPrefix} ACS variable ${variableCode} label did not include "${fragment}". Actual label: ${metadataLabel}`,
        );
      }
    }
  }

  if (expectedConceptIncludes?.length) {
    const conceptLower = metadataConcept.toLowerCase();
    for (const fragment of expectedConceptIncludes) {
      if (!conceptLower.includes(fragment.toLowerCase())) {
        throw new Error(
          `${logPrefix} ACS variable ${variableCode} concept did not include "${fragment}". Actual concept: ${metadataConcept}`,
        );
      }
    }
  }
}

async function validateVariableMetadata(
  apiKey: string,
  variableCode: string,
  year: number,
  expectedLabelIncludes: string[] | undefined,
  expectedConceptIncludes: string[] | undefined,
  logPrefix: string,
) {
  // Metadata endpoint used to verify variable mapping before ingesting values:
  // https://api.census.gov/data/{YEAR}/acs/acs1/variables/{VARIABLE}.json
  const url = `${ACS_BASE_URL}/${year}/${ACS_DATASET}/variables/${variableCode}.json?${getKeyParam(apiKey).replace(/^&/, "")}`;
  const response = await fetchWithRetry(url, { method: "GET" }, { logPrefix });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `${logPrefix} Failed to validate ACS variable ${variableCode} (${response.status}): ${text}`,
    );
  }

  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${logPrefix} Unexpected ACS variable metadata payload for ${variableCode}.`);
  }

  assertMetadataHasExpectedFragments(
    payload as Record<string, unknown>,
    expectedLabelIncludes,
    expectedConceptIncludes,
    variableCode,
    logPrefix,
  );
}

function normalizeYearBounds(startYear: number, endYear: number) {
  const minYear = Math.max(startYear, ACS_MIN_YEAR);
  const maxYear = Math.max(minYear, endYear);
  return { minYear, maxYear };
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

async function fetchAcsStateValuesForYear(
  apiKey: string,
  variableCode: string,
  year: number,
  logPrefix: string,
) {
  const expectedStates = new Set(states.map((state) => state.id));
  const url = `${ACS_BASE_URL}/${year}/${ACS_DATASET}?get=NAME,${variableCode}&for=state:*${getKeyParam(apiKey)}`;
  const response = await fetchWithRetry(url, { method: "GET" }, { logPrefix });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AcsRequestError(
      `${logPrefix} ACS request failed for ${year} (${response.status}): ${body}`,
      year,
      response.status,
    );
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload) || payload.length < 2) {
    throw new Error(`${logPrefix} ACS response shape invalid for ${year}.`);
  }

  const headerRow = payload[0];
  if (!Array.isArray(headerRow)) {
    throw new Error(`${logPrefix} ACS response header invalid for ${year}.`);
  }

  const stateIndex = headerRow.indexOf("state");
  const valueIndex = headerRow.indexOf(variableCode);
  if (stateIndex < 0 || valueIndex < 0) {
    throw new Error(
      `${logPrefix} ACS response missing required columns (state or ${variableCode}) for ${year}.`,
    );
  }

  const observations: NormalizedProviderObservation[] = [];
  let invalidValueCount = 0;
  let unknownStateCount = 0;

  for (const rawRow of payload.slice(1)) {
    if (!Array.isArray(rawRow)) continue;

    const stateCodeRaw = rawRow[stateIndex];
    const stateCode = String(stateCodeRaw ?? "").trim().padStart(2, "0");
    if (!expectedStates.has(stateCode)) {
      unknownStateCount += 1;
      continue;
    }

    const rawValue = String(rawRow[valueIndex] ?? "").trim();
    const parsedValue = Number(rawValue);
    const isSentinel = rawValue.startsWith("-") && Math.abs(parsedValue) >= 1_000_000;
    if (!Number.isFinite(parsedValue) || isSentinel) {
      invalidValueCount += 1;
      continue;
    }

    observations.push({
      stateCode,
      year,
      value: parsedValue,
    });
  }

  const warnings: string[] = [];
  if (invalidValueCount > 0) {
    warnings.push(
      `${logPrefix} Year ${year}: skipped ${invalidValueCount} row(s) with missing/non-numeric ACS values.`,
    );
  }
  if (unknownStateCount > 5) {
    warnings.push(`${logPrefix} Year ${year}: skipped ${unknownStateCount} row(s) for non-state geographies.`);
  }

  return { observations, warnings };
}

export async function fetchCensusAcsSeries(options: FetchCensusAcsSeriesOptions): Promise<CensusAcsSeriesResult> {
  const { minYear, maxYear } = normalizeYearBounds(options.startYear, options.endYear);
  const latestAvailableYear = await discoverLatestAcsYear(
    options.apiKey,
    options.variableCode,
    minYear,
    maxYear,
    options.logPrefix,
  );

  if (!options.skipMetadataValidation) {
    await validateVariableMetadata(
      options.apiKey,
      options.variableCode,
      latestAvailableYear,
      options.expectedLabelIncludes,
      options.expectedConceptIncludes,
      options.logPrefix,
    );
  }

  const targetYears = resolveYearsToIngest(latestAvailableYear, minYear, options.lookbackYears);
  const observations: NormalizedProviderObservation[] = [];
  const warnings: string[] = [];
  const coverageByYear: Record<number, number> = {};
  const failedYears = new Set<number>();

  for (const year of targetYears) {
    if (options.logPerYear) {
      console.log(`${options.logPrefix} Fetching year ${year}...`);
    }

    try {
      const yearResult = await fetchAcsStateValuesForYear(
        options.apiKey,
        options.variableCode,
        year,
        options.logPrefix,
      );
      observations.push(...yearResult.observations);
      coverageByYear[year] = yearResult.observations.length;
      warnings.push(...yearResult.warnings);
      if (options.logPerYear) {
        console.log(
          `${options.logPrefix} Year ${year} success: ${yearResult.observations.length} state values.`,
        );
      }
    } catch (error) {
      if (error instanceof AcsRequestError && error.status === 404 && KNOWN_EXPECTED_GAP_YEARS.has(year)) {
        failedYears.add(year);
        warnings.push(`${options.logPrefix} Year ${year}: expected ACS 1-year gap (404). Continuing.`);
        if (options.logPerYear) {
          console.warn(`${options.logPrefix} Year ${year} expected gap (404).`);
        }
        continue;
      }

      failedYears.add(year);
      warnings.push(
        `${options.logPrefix} Year ${year}: failed to fetch ACS data (${error instanceof Error ? error.message : String(error)}).`,
      );
      if (options.logPerYear) {
        console.warn(`${options.logPrefix} Year ${year} failed.`);
      }
    }
  }

  if (!observations.length) {
    throw new Error(`${options.logPrefix} ACS provider returned no observations for ${options.metricId}.`);
  }

  return {
    observations,
    years: targetYears,
    latestAvailableYear,
    coverageByYear,
    warnings,
    failedYears: Array.from(failedYears).sort((a, b) => a - b),
    hadPartialFailures: failedYears.size > 0,
  };
}
