'use client';

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { StateInfo } from "@/lib/types";

type MetricOption = {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
};

type SeriesPoint = { year: number; value: number | null };
type Series = { stateId: string; stateName: string; points: SeriesPoint[] };

type Props = {
  metrics: MetricOption[];
  states: StateInfo[];
  initialMetricId: string;
  initialSelectedStates: string[];
  availableYears: number[];
  initialYearRange: { start: number; end: number };
  initialNormalization: "raw" | "indexed";
  initialSeries: Series[];
};

export type ChartDataRow = { year: number; [stateId: string]: number | null };

const COLOR_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#0ea5e9",
  "#f59e0b",
  "#db2777",
  "#10b981",
  "#64748b",
];

function getColorForState(stateId: string, selectedStateIds: string[]) {
  const index = selectedStateIds.indexOf(stateId);
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function normalizeSeries(
  series: Series[],
  selectedStateIds: string[],
  yearRange: { start: number; end: number },
  mode: "raw" | "indexed",
) {
  const yearsSet = new Set<number>();
  series.forEach((s) => s.points.forEach((p) => yearsSet.add(p.year)));
  const sortedYears = Array.from(yearsSet)
    .filter((year) => year >= yearRange.start && year <= yearRange.end)
    .sort((a, b) => a - b);

  const chartRows: ChartDataRow[] = sortedYears.map((year) => ({ year }));

  selectedStateIds.forEach((stateId) => {
    const seriesEntry = series.find((s) => s.stateId === stateId);
    if (!seriesEntry) return;

    const pointsByYear = new Map(seriesEntry.points.map((p) => [p.year, p.value]));
    let baseValue: number | null = null;
    if (mode === "indexed") {
      const startValue = pointsByYear.get(yearRange.start);
      if (startValue !== null && startValue !== undefined && !Number.isNaN(startValue)) {
        baseValue = startValue;
      } else {
        // fallback to first non-null in range
        for (const year of sortedYears) {
          const candidate = pointsByYear.get(year);
          if (candidate !== null && candidate !== undefined && !Number.isNaN(candidate)) {
            baseValue = candidate;
            break;
          }
        }
      }
    }

    chartRows.forEach((row) => {
      const value = pointsByYear.get(row.year) ?? null;
      if (mode === "raw") {
        row[stateId] = value;
      } else {
        if (value === null || baseValue === null || baseValue === 0) {
          row[stateId] = null;
        } else {
          row[stateId] = Number(((value / baseValue) * 100).toFixed(1));
        }
      }
    });
  });

  return chartRows;
}

type ChartContainerProps = {
  chartData: ChartDataRow[];
  selectedStateIds: string[];
  states: StateInfo[];
};

const ChartContainer = dynamic<ChartContainerProps>(
  () => import("./GraphInner").then((mod) => mod.default),
  { ssr: false },
);

export function GraphExplorer({
  metrics,
  states,
  initialMetricId,
  initialSelectedStates,
  availableYears: initialAvailableYears,
  initialYearRange,
  initialNormalization,
  initialSeries,
}: Props) {
  const [selectedMetricId, setSelectedMetricId] = useState(initialMetricId);
  const [selectedStateIds, setSelectedStateIds] = useState<string[]>(initialSelectedStates);
  const [searchTerm, setSearchTerm] = useState("");
  const [normalization, setNormalization] = useState<"raw" | "indexed">(initialNormalization);
  const [availableYears, setAvailableYears] = useState<number[]>(initialAvailableYears);
  const [yearRange, setYearRange] = useState<{ start: number; end: number }>(initialYearRange);
  const [series, setSeries] = useState<Series[]>(initialSeries);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // If metric changes, fetch fresh series data
    async function fetchMetricData(metricId: string) {
      setLoading(true);
      try {
        const res = await fetch(`/api/graph-data?metric=${encodeURIComponent(metricId)}`);
        if (!res.ok) throw new Error(`Failed to load metric data (${res.status})`);
        const json: { availableYears: number[]; series: Series[] } = await res.json();
        setAvailableYears(json.availableYears ?? []);
        setSeries(json.series ?? []);
        const years = json.availableYears ?? [];
        if (years.length > 0) {
          setYearRange({ start: years[0], end: years[years.length - 1] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (selectedMetricId && selectedMetricId !== initialMetricId) {
      fetchMetricData(selectedMetricId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetricId]);

  useEffect(() => {
    // Ensure year range stays within available years when data updates
    if (availableYears.length === 0) return;
    setYearRange((prev) => {
      const start = availableYears.includes(prev.start) ? prev.start : availableYears[0];
      const end = availableYears.includes(prev.end) ? prev.end : availableYears[availableYears.length - 1];
      return start <= end ? { start, end } : { start: availableYears[0], end: availableYears[availableYears.length - 1] };
    });
  }, [availableYears]);

  const filteredStates = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return states.filter(
      (state) =>
        state.name.toLowerCase().includes(term) ||
        state.abbreviation.toLowerCase().includes(term) ||
        state.id.includes(term),
    );
  }, [searchTerm, states]);

  useEffect(() => {
    if (!isUpdating) return;
    const timeout = setTimeout(() => setIsUpdating(false), 250);
    return () => clearTimeout(timeout);
  }, [isUpdating]);

  const chartData = useMemo(
    () => normalizeSeries(series, selectedStateIds, yearRange, normalization),
    [series, selectedStateIds, yearRange, normalization],
  );

  const legendItems = selectedStateIds
    .map((id) => {
      const state = states.find((s) => s.id === id);
      return { id, name: state?.name ?? id, color: getColorForState(id, selectedStateIds) };
    })
    .filter(Boolean);

  const selectedMetric = metrics.find((m) => m.id === selectedMetricId);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Controls</p>
          <h2 className="text-lg font-semibold text-slate-900">Metric & States</h2>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="metric-select">
            Metric
          </label>
          <select
            id="metric-select"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none"
            value={selectedMetricId}
            onChange={(e) => setSelectedMetricId(e.target.value)}
            aria-label="Select metric"
          >
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name} {metric.unit ? `(${metric.unit})` : ""}
              </option>
            ))}
          </select>
          {selectedMetric?.description ? (
            <p className="text-xs text-slate-500">{selectedMetric.description}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700" htmlFor="state-filter">
              States
            </label>
            <span className="text-xs text-slate-500">{selectedStateIds.length} selected</span>
          </div>
          <input
            id="state-filter"
            type="text"
            placeholder="Search states"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2" role="listbox" aria-label="Select states">
            {filteredStates.map((state) => {
              const checked = selectedStateIds.includes(state.id);
              return (
                <label key={state.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-white">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setIsUpdating(true);
                      if (e.target.checked) {
                        setSelectedStateIds((prev) => Array.from(new Set([...prev, state.id])));
                      } else {
                        setSelectedStateIds((prev) => prev.filter((id) => id !== state.id));
                      }
                    }}
                    className="accent-slate-700"
                  />
                  <span className="text-sm text-slate-800">
                    {state.name} ({state.abbreviation})
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Year range</p>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>{availableYears[0] ?? "–"}</span>
            <input
              type="range"
              min={availableYears[0] ?? 0}
              max={availableYears[availableYears.length - 1] ?? 0}
              value={yearRange.start}
              onChange={(e) => {
                setIsUpdating(true);
                const next = Number(e.target.value);
                setYearRange((prev) => ({
                  start: Math.min(next, prev.end),
                  end: prev.end,
                }));
              }}
              className="w-full accent-slate-700"
              step={1}
              aria-label="Start year"
              onMouseUp={() => setIsUpdating(true)}
              onTouchEnd={() => setIsUpdating(true)}
            />
            <input
              type="range"
              min={availableYears[0] ?? 0}
              max={availableYears[availableYears.length - 1] ?? 0}
              value={yearRange.end}
              onChange={(e) => {
                setIsUpdating(true);
                const next = Number(e.target.value);
                setYearRange((prev) => ({
                  start: prev.start,
                  end: Math.max(next, prev.start),
                }));
              }}
              className="w-full accent-slate-700"
              step={1}
              aria-label="End year"
              onMouseUp={() => setIsUpdating(true)}
              onTouchEnd={() => setIsUpdating(true)}
            />
            <span>{availableYears[availableYears.length - 1] ?? "–"}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Start: {yearRange.start}</span>
            <span>End: {yearRange.end}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Normalization</p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm">
            {(["raw", "indexed"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setNormalization(mode)}
                aria-pressed={normalization === mode}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  normalization === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {mode === "raw" ? "Raw values" : "Indexed (100 = start)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Chart</p>
            <h2 className="text-xl font-semibold text-slate-900">State comparison</h2>
            <p className="text-xs text-slate-500">
              {selectedMetric?.unit ? `Unit: ${selectedMetric.unit}` : "Unit: n/a"} ·{" "}
              {normalization === "raw" ? "Raw values" : "Indexed to start year"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500" aria-live="polite">
            {loading ? <span>Loading metric data…</span> : null}
            {isUpdating && !loading ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Updating…</span> : null}
          </div>
        </div>

        {selectedStateIds.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            Select at least one state to view the chart.
          </div>
        ) : chartData.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No data available for this metric.
          </div>
        ) : (
          <div className="mt-4 h-[420px] w-full overflow-x-auto">
            <ChartContainer chartData={chartData} selectedStateIds={selectedStateIds} states={states} />
          </div>
        )}

        {legendItems.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-700">
            {legendItems.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
                <span>{item.name}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
