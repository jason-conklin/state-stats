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

  return (
    <div className="relative h-full w-full">
      {/* Top-center control pill */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 px-4 w-full">
        <div className="pointer-events-auto mx-auto flex max-w-[min(90vw,1000px)] flex-wrap items-center justify-center gap-3 rounded-full bg-white px-4 py-2 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 min-w-[220px]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[color:var(--ss-green-dark)]" htmlFor="metric-select">
              Metric
            </label>
            <select
              id="metric-select"
              className="min-w-[180px] rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none"
              value={selectedMetric?.id}
              onChange={(e) => {
                const nextMetricId = e.target.value;
                setSelectedMetricId(nextMetricId);
                const nextMetric = metrics.find((m) => m.id === nextMetricId);
                const latestYearValue = nextMetric?.years[nextMetric.years.length - 1];
                if (latestYearValue) setSelectedYear(latestYearValue);
              }}
            >
              {metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name} {metric.unit ? `(${metric.unit})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">Scale</p>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs" role="group" aria-label="Select scale mode">
              {(["quantize", "continuous"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScaleMode(mode)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    scaleMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
                  type="button"
                >
                  {mode === "quantize" ? "Quantize" : "Continuous"}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex flex-1 min-w-[240px] items-center gap-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Year</p>
            <input
              type="range"
              min={selectedMetric?.years[0] ?? 0}
              max={selectedMetric?.years[selectedMetric.years.length - 1] ?? 0}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="flex-1 accent-[color:var(--ss-green)]"
              step={1}
              aria-label="Select year"
            />
            <span className="text-sm font-semibold text-slate-900">{selectedYear}</span>
          </div>
        </div>
      </div>

      <section className="relative h-full w-full">
        <div className="absolute inset-0 overflow-hidden bg-transparent">
          <div className="absolute inset-0 overflow-hidden rounded-none bg-white shadow-lg ring-1 ring-slate-100">
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
                className="pointer-events-none absolute z-20 w-60 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-lg"
                style={{
                  left: tooltipContent.position.x + 12,
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

            {/* Legend */}
            <div className="pointer-events-auto absolute bottom-4 left-4 z-10 w-52 max-w-full sm:w-60">
              <div className="rounded-xl border border-[color:var(--ss-green-mid)]/40 bg-white p-3 shadow-sm">
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
              </div>
            </div>

            {/* Pinned */}
            <div className="pointer-events-auto absolute bottom-4 right-4 z-10 max-w-full">
              {pinnedCard && pinnedCard.state ? (
                <div className="flex w-64 flex-col gap-2 rounded-lg border border-[color:var(--ss-green-mid)]/30 bg-white/95 p-3 shadow-md backdrop-blur">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pinned</p>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pinnedCard.state.name}</p>
                      <p className="text-sm text-slate-700">
                        {formatMetricValue(pinnedCard.value, selectedMetric?.unit ?? undefined)}
                      </p>
                      {pinnedCard.rank ? (
                        <p className="text-[11px] text-slate-500">Rank {pinnedCard.rank} / {states.length}</p>
                      ) : (
                        <p className="text-[11px] text-slate-500">No data</p>
                      )}
                    </div>
                    <Link
                      href={`/graph?metric=${selectedMetric?.id ?? ""}&states=${pinnedCard.state.abbreviation ?? pinnedCard.state.id}&startYear=${selectedYear}&endYear=${selectedYear}`}
                      className="rounded-md border border-[color:var(--ss-green)] px-3 py-1 text-[11px] font-medium text-[color:var(--ss-green)] hover:bg-[color:var(--ss-green-light)]"
                    >
                      Add to compare
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="w-64 rounded-lg border border-dashed border-[color:var(--ss-green-mid)]/50 bg-white/90 p-3 text-xs text-slate-600 shadow-sm backdrop-blur">
                  Click a state on the map to pin it.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="pointer-events-auto absolute bottom-2 left-1/2 z-20 w-full max-w-5xl -translate-x-1/2 px-4">
        <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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
    </div>
  );
}
