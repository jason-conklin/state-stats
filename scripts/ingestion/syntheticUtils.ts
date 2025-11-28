// Shared deterministic helpers for synthetic data generation.
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // 32-bit
  }
  return Math.abs(hash);
}

// Deterministic noise in range [-scale, +scale]
export function noiseFromSeed(seed: string, scale: number): number {
  const h = hashString(seed);
  const normalized = (h % 1000) / 1000; // 0..0.999
  return (normalized - 0.5) * 2 * scale;
}

// Base factor per state for a given metric in [min, max]
export function stateBaseFactor(metricId: string, stateId: string, min: number, max: number): number {
  const h = hashString(`${metricId}:${stateId}`);
  const normalized = (h % 1000) / 1000;
  return min + normalized * (max - min);
}

// Growth rate per state for a given metric in [min, max]
export function stateGrowthRate(metricId: string, stateId: string, min: number, max: number): number {
  return stateBaseFactor(`${metricId}:growth`, stateId, min, max);
}

// Year trend factor with optional volatility and macro sinusoid
export function yearTrendFactor(metricId: string, year: number, baseSlope: number, volatility: number): number {
  const linear = 1 + baseSlope * (year - year0(metricId));
  const wave = 1 + Math.sin((year % 10) * 0.6) * volatility;
  return linear * wave;
}

// Simple macro shock map; tweak per metric
export function macroShock(metricId: string, year: number, shocks: Record<number, number>): number {
  return shocks[year] ?? 0;
}

function year0(metricId: string) {
  // Different metrics could start at different baselines; default 2000.
  switch (metricId) {
    default:
      return 2000;
  }
}
