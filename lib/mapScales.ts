import { interpolateRgbBasis } from "d3-interpolate";
import { scaleQuantize, scaleSequential } from "d3-scale";

export type QuantizeBucket = {
  color: string;
  label: string;
};

// A richer sequential green palette from light mint to deep emerald.
export const GREEN_STEPS = ["#e8f6f0", "#c7ebd9", "#9fd9c0", "#73c1a0", "#47a37e", "#257a59", "#0b5440"];
export const NO_DATA_COLOR = "#e5e7eb";

export function createQuantizeColorScale(min: number | null, max: number | null) {
  if (min === null || max === null || Number.isNaN(min) || Number.isNaN(max) || min === max) {
    return {
      colorScale: () => NO_DATA_COLOR,
      buckets: [],
    };
  }

  const quantize = scaleQuantize<string>().domain([min, max]).range(GREEN_STEPS);

  const thresholds = quantize.thresholds();
  const buckets: QuantizeBucket[] = GREEN_STEPS.map((color, index) => {
    const start = index === 0 ? min : thresholds[index - 1];
    const end = thresholds[index] ?? max;
    const label = `${Math.round(start).toLocaleString()} – ${Math.round(end).toLocaleString()}`;
    return { color, label };
  });

  const colorScale = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return NO_DATA_COLOR;
    return quantize(value);
  };

  return { colorScale, buckets };
}

export function createContinuousColorScale(min: number | null, max: number | null) {
  if (min === null || max === null || Number.isNaN(min) || Number.isNaN(max) || min === max) {
    return {
      colorScale: () => NO_DATA_COLOR,
      gradient: `linear-gradient(to right, ${NO_DATA_COLOR}, ${NO_DATA_COLOR})`,
    };
  }

  const interpolator = interpolateRgbBasis(GREEN_STEPS);
  const scale = scaleSequential(interpolator).domain([min, max]);

  const colorScale = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return NO_DATA_COLOR;
    return scale(value);
  };

  const gradient = `linear-gradient(to right, ${GREEN_STEPS.join(", ")})`;

  return { colorScale, gradient };
}

export const NEUTRAL_COLOR = NO_DATA_COLOR;
