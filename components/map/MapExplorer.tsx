"use client";

import { Feature, Geometry } from "geojson";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Legend } from "./Legend";
import { USChoropleth } from "./USChoropleth";
import { createContinuousColorScale, createQuantizeColorScale, QuantizeBucket } from "@/lib/mapScales";
import { formatMetricValue } from "@/lib/format";
import { StateInfo } from "@/lib/types";

type MetricData = {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  sourceName?: string | null;
  category?: string | null;
  isDefault?: boolean | null;
  years: number[];
  dataByYear: Record<number, Record<string, number | null>>;
  minValue: number | null;
  maxValue: number | null;
};

type Props = {
  metrics: MetricData[];
  defaultMetricId: string;
  defaultYear: number;
  states: StateInfo[];
  features: Feature<Geometry, { stateId?: string; name?: string; abbreviation?: string }>[];
};

type TooltipState = {
  stateId: string;
  x: number;
  y: number;
};

type LegendState =
  | { mode: "quantize"; buckets: QuantizeBucket[] }
  | { mode: "continuous"; minValue: number | null; maxValue: number | null; gradient: string };

export function MapExplorer({ metrics, defaultMetricId, defaultYear, states, features }: Props) {
  const metricMap = useMemo(() => {
    const map = new Map<string, MetricData>();
    metrics.forEach((metric) => map.set(metric.id, metric));
    return map;
  }, [metrics]);

  const [selectedMetricId, setSelectedMetricId] = useState<string>(defaultMetricId);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [scaleMode, setScaleMode] = useState<"quantize" | "continuous">("quantize");
  const [hovered, setHovered] = useState<TooltipState | null>(null);
  const [pinnedStateId, setPinnedStateId] = useState<string | null>(null);

  const selectedMetric = metricMap.get(selectedMetricId) ?? metrics[0];

  const valuesByStateId = useMemo(() => selectedMetric?.dataByYear[selectedYear] ?? {}, [selectedMetric, selectedYear]);

  const rankByStateId = useMemo(() => {
    const entries = Object.entries(valuesByStateId).filter(
      ([, value]) => value !== null && value !== undefined && !Number.isNaN(value),
    ) as [string, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const ranks: Record<string, number> = {};
    sorted.forEach(([stateId], index) => {
      ranks[stateId] = index + 1;
    });
    return ranks;
  }, [valuesByStateId]);

  const minValue = selectedMetric?.minValue ?? null;
  const maxValue = selectedMetric?.maxValue ?? null;

  const { colorScale, legend } = useMemo<{
    colorScale: (value: number | null) => string;
    legend: LegendState;
  }>(() => {
    if (scaleMode === "quantize") {
      const { colorScale, buckets } = createQuantizeColorScale(minValue, maxValue);
      return { colorScale, legend: { mode: "quantize", buckets } };
    }
    const { colorScale, gradient } = createContinuousColorScale(minValue, maxValue);
    return { colorScale, legend: { mode: "continuous", minValue, maxValue, gradient } };
  }, [scaleMode, minValue, maxValue]);

  const tooltipContent = useMemo(() => {
    if (!hovered) return null;
    const state = states.find((s) => s.id === hovered.stateId);
    const value = valuesByStateId[hovered.stateId] ?? null;
    const rank = rankByStateId[hovered.stateId];
    return {
      stateName: state?.name ?? hovered.stateId,
      value,
      rank,
      position: { x: hovered.x, y: hovered.y },
    };
  }, [hovered, states, valuesByStateId, rankByStateId]);

  const pinnedCard = useMemo(() => {
    if (!pinnedStateId) return null;
    const state = states.find((s) => s.id === pinnedStateId);
    const value = valuesByStateId[pinnedStateId] ?? null;
    const rank = rankByStateId[pinnedStateId];
    return { state, value, rank };
  }, [pinnedStateId, states, valuesByStateId, rankByStateId]);

  const tableRows = useMemo(() => {
    return states
      .map((state) => ({
        ...state,
        value: valuesByStateId[state.id] ?? null,
        rank: rankByStateId[state.id] ?? null,
      }))
      .sort((a, b) => {
        if (a.value === null && b.value === null) return a.name.localeCompare(b.name);
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return b.value - a.value;
      });
  }, [states, valuesByStateId, rankByStateId]);

  const latestYear = selectedMetric?.years[selectedMetric.years.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold">Live data auto-ingestion: Active</span>
        </div>
        {latestYear ? (
          <p className="text-amber-800">
            Showing data through <span className="font-semibold">{latestYear}</span> for metric{" "}
            <span className="font-semibold">{selectedMetric?.name}</span>.
          </p>
        ) : null}
      </div>

      <div className="relative grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr_260px]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Metric & Scale</p>
                <h2 className="text-lg font-semibold text-slate-900">Explore metrics</h2>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="metric-select">
                Metric
              </label>
              <select
                id="metric-select"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none"
                value={selectedMetric?.id}
                onChange={(e) => {
                  const nextMetricId = e.target.value;
                  setSelectedMetricId(nextMetricId);
                  const nextMetric = metrics.find((m) => m.id === nextMetricId);
                  const latestYear = nextMetric?.years[nextMetric.years.length - 1];
                  if (latestYear) setSelectedYear(latestYear);
                }}
              >
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name} {metric.unit ? `(${metric.unit})` : ""}
                  </option>
                ))}
              </select>

              <div>
                <p className="text-sm font-medium text-slate-700">Scale</p>
                <div className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm" role="group" aria-label="Select scale mode">
                  {(["quantize", "continuous"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setScaleMode(mode)}
                      className={`rounded-md px-3 py-1 font-medium transition ${
                        scaleMode === mode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                      type="button"
                    >
                      {mode === "quantize" ? "Quantize" : "Continuous"}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMetric?.sourceName ? (
                <p className="text-xs text-slate-500">
                  Source: <span className="font-semibold text-slate-700">{selectedMetric.sourceName}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Map</p>
                <h1 className="text-xl font-semibold text-slate-900">
                  {selectedMetric?.name ?? "Metric"} ({selectedYear})
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-1">Hover to preview</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Click to pin</span>
              </div>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <USChoropleth
                features={features}
                valuesByStateId={valuesByStateId}
                colorScale={colorScale}
                onHover={(stateId, position) => {
                  if (!stateId || !position) {
                    setHovered(null);
                    return;
                  }
                  setHovered({ stateId, ...position });
                }}
                onClick={(stateId) => setPinnedStateId(stateId)}
                selectedYear={selectedYear}
              />

              {tooltipContent ? (
                <div
                  className="pointer-events-none absolute z-10 w-60 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-lg"
                  style={{
                    left: Math.min(Math.max(tooltipContent.position.x + 12, 0), 320),
                    top: tooltipContent.position.y + 12,
                  }}
                >
                  <p className="text-sm font-semibold text-slate-900">{tooltipContent.stateName}</p>
                  <p className="text-slate-700">
                    {formatMetricValue(tooltipContent.value, selectedMetric?.unit ?? undefined)}
                  </p>
                  {tooltipContent.rank ? (
                    <p className="text-xs text-slate-500">Rank {tooltipContent.rank} / {states.length}</p>
                  ) : (
                    <p className="text-xs text-slate-500">No data</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Year</p>
                <h2 className="text-xl font-semibold text-slate-900">{selectedYear}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{selectedMetric?.years[0] ?? "–"}</span>
              <input
                type="range"
                min={selectedMetric?.years[0] ?? 0}
                max={selectedMetric?.years[selectedMetric.years.length - 1] ?? 0}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full accent-slate-700"
                step={1}
                aria-label="Select year"
              />
              <span className="text-xs text-slate-500">{selectedMetric?.years[selectedMetric.years.length - 1] ?? "–"}</span>
            </div>
            <Legend
              {...(legend.mode === "quantize"
                ? { mode: "quantize" as const, buckets: legend.buckets, unit: selectedMetric?.unit ?? undefined }
                : {
                    mode: "continuous" as const,
                    minValue: legend.minValue,
                    maxValue: legend.maxValue,
                    gradient: legend.gradient,
                    unit: selectedMetric?.unit ?? undefined,
                  })}
            />
            {pinnedCard && pinnedCard.state ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pinned</p>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{pinnedCard.state.name}</p>
                    <p className="text-sm text-slate-700">
                      {formatMetricValue(pinnedCard.value, selectedMetric?.unit ?? undefined)}
                    </p>
                    {pinnedCard.rank ? (
                      <p className="text-xs text-slate-500">Rank {pinnedCard.rank} / {states.length}</p>
                    ) : (
                      <p className="text-xs text-slate-500">No data</p>
                    )}
                  </div>
                  <Link
                    href={`/graph?metric=${selectedMetric?.id ?? ""}&states=${pinnedCard.state.abbreviation ?? pinnedCard.state.id}&startYear=${selectedYear}&endYear=${selectedYear}`}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Add to compare
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Click a state on the map to pin it.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Data table</p>
            <h2 className="text-lg font-semibold text-slate-900">Values for {selectedYear}</h2>
          </div>
          <p className="text-xs text-slate-500">Accessible table of state values</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{row.rank ?? "–"}</td>
                  <td className="px-3 py-2 text-slate-900">{row.name}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatMetricValue(row.value, selectedMetric?.unit ?? undefined)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
