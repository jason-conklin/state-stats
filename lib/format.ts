export function formatMetricValue(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "No data";
  }

  if (unit && unit.toLowerCase() === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (unit === "%" || unit?.toLowerCase() === "percent") {
    return `${value.toFixed(1)}%`;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}${
    unit ? ` ${unit}` : ""
  }`;
}

export function formatLegendValue(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
