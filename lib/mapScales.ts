import { interpolateRgbBasis } from "d3-interpolate";
import { scaleQuantize, scaleSequential } from "d3-scale";

export type QuantizeBucket = {
  color: string;
  label: string;
};

// A higher-contrast sequential green palette (light → dark).
export const GREEN_STEPS = [
  "#f4fbf7",
  "#e0f5ea",
  "#c2ead7",
  "#9fdcc1",
  "#73c7a0",
  "#47aa7e",
  "#27825b",
  "#135640",
  "#032f22",
];
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
