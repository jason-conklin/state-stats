export type QuantizeBucket = {
  color: string;
  label: string;
};

const neutralColor = "#e5e7eb";
// Green sequential palette from light to dark.
const quantizePalette = ["#e7f5ec", "#c4e8d4", "#8cd0ad", "#4baa78", "#1b7f4a", "#0f3e28"];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateColor(start: string, end: string, t: number) {
  const s = start.startsWith("#") ? start.slice(1) : start;
  const e = end.startsWith("#") ? end.slice(1) : end;
  const sr = parseInt(s.substring(0, 2), 16);
  const sg = parseInt(s.substring(2, 4), 16);
  const sb = parseInt(s.substring(4, 6), 16);

  const er = parseInt(e.substring(0, 2), 16);
  const eg = parseInt(e.substring(2, 4), 16);
  const eb = parseInt(e.substring(4, 6), 16);

  const r = Math.round(sr + (er - sr) * t);
  const g = Math.round(sg + (eg - sg) * t);
  const b = Math.round(sb + (eb - sb) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export function createQuantizeColorScale(min: number | null, max: number | null) {
  if (min === null || max === null || Number.isNaN(min) || Number.isNaN(max) || min === max) {
    return {
      colorScale: () => neutralColor,
      buckets: [],
    };
  }

  const bucketCount = quantizePalette.length;
  const step = (max - min) / bucketCount;

  const buckets: QuantizeBucket[] = quantizePalette.map((color, index) => {
    const start = min + step * index;
    const end = index === bucketCount - 1 ? max : min + step * (index + 1);
    const label = `${Math.round(start).toLocaleString()} – ${Math.round(end).toLocaleString()}`;
    return { color, label };
  });

  const colorScale = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return neutralColor;
    const normalized = clamp01((value - min) / (max - min));
    const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(normalized * bucketCount)));
    return quantizePalette[bucketIndex];
  };

  return { colorScale, buckets };
}

export function createContinuousColorScale(min: number | null, max: number | null) {
  if (min === null || max === null || Number.isNaN(min) || Number.isNaN(max) || min === max) {
    return {
      colorScale: () => neutralColor,
      gradient: `linear-gradient(to right, ${neutralColor}, ${neutralColor})`,
    };
  }

  const startColor = "#e7f5ec";
  const endColor = "#1b7f4a";

  const colorScale = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return neutralColor;
    const t = clamp01((value - min) / (max - min));
    return interpolateColor(startColor, endColor, t);
  };

  const gradient = `linear-gradient(to right, ${startColor}, ${endColor})`;

  return { colorScale, gradient };
}

export const NEUTRAL_COLOR = neutralColor;
