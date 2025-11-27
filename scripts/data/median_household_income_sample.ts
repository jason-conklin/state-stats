import { StateInfo } from "../../lib/types";

export type IncomeSample = {
  stateId: string;
  year: number;
  value: number;
};

const YEARS = Array.from({ length: 13 }, (_, i) => 2010 + i); // 2010–2022

/**
 * Generates a deterministic, plausible income dataset for every state and year.
 * The values are synthetic but stable across runs, so re-ingestion is idempotent.
 */
export function generateIncomeSamples(states: StateInfo[]): IncomeSample[] {
  const samples: IncomeSample[] = [];

  states.forEach((state, index) => {
    YEARS.forEach((year) => {
      const base = 48000 + (year - 2010) * 900; // general national upward trend
      const regionalAdjustment = index * 90; // differentiate states a bit
      const cyclical = ((year + index) % 4) * 250; // mild variance
      const value = Math.round(base + regionalAdjustment + cyclical);

      samples.push({
        stateId: state.id,
        year,
        value,
      });
    });
  });

  return samples;
}

export const SAMPLE_YEARS = YEARS;
