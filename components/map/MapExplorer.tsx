"use client";

import { Feature, Geometry } from "geojson";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Legend } from "./Legend";
import { USChoropleth } from "./USChoropleth";
import { createContinuousColorScale, createQuantizeColorScale } from "@/lib/mapScales";
import { formatMetricValue } from "@/lib/format";
import { StateInfo } from "@/lib/types";
import { DataTablePanel } from "./DataTablePanel";

type MetricData = {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  sourceName?: string | null;
  category?: string | null;
  isDefault?: boolean | null;
  years: number[];
  minYear: number | null;
  maxYear: number | null;
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

function getYearDomain(valuesForYear: Record<string, number | null> | undefined): [number, number] | null {
  if (!valuesForYear) return null;
  const vals = Object.values(valuesForYear).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!vals.length) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
  return [min, max];
}

export function MapExplorer({ metrics, defaultMetricId, defaultYear, states, features }: Props) {
  const metricMap = useMemo(() => {
    const map = new Map<string, MetricData>();
    metrics.forEach((metric) => map.set(metric.id, metric));
    return map;
  }, [metrics]);

  const [selectedMetricId, setSelectedMetricId] = useState<string>(defaultMetricId);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [hovered, setHovered] = useState<TooltipState | null>(null);
  const [pinnedStateId, setPinnedStateId] = useState<string | null>(null);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [legendPosition, setLegendPosition] = useState<{ x: number; y: number }>({ x: 16, y: 600 });
  const dragRef = useRef<{ isDragging: boolean; didDrag: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    didDrag: false,
    offsetX: 0,
    offsetY: 0,
  });

  const selectedMetric = metricMap.get(selectedMetricId) ?? metrics[0];
  const yearMin = selectedMetric?.minYear ?? selectedMetric?.years[0] ?? selectedYear ?? 0;
  const yearMax =
    selectedMetric?.maxYear ?? selectedMetric?.years[selectedMetric.years.length - 1] ?? selectedYear ?? 0;
  const sliderValue =
    selectedMetric && selectedMetric.years.length ? Math.min(Math.max(selectedYear, yearMin), yearMax) : yearMax;

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

  const globalMin = selectedMetric?.minValue ?? null;
  const globalMax = selectedMetric?.maxValue ?? null;
  const yearDomain = useMemo(() => getYearDomain(selectedMetric?.dataByYear[selectedYear]), [selectedMetric, selectedYear]);
  const colorDomain = useMemo(() => {
    if (yearDomain) return yearDomain;
    if (globalMin !== null && globalMax !== null && globalMin !== globalMax) return [globalMin, globalMax] as [number, number];
    return null;
  }, [yearDomain, globalMin, globalMax]);

  const { colorScale, gradient } = useMemo(() => {
    if (!colorDomain) {
      return { colorScale: null, gradient: "" };
    }
    const { colorScale } = createQuantizeColorScale(colorDomain[0], colorDomain[1]);
    const { gradient } = createContinuousColorScale(colorDomain[0], colorDomain[1]);
    return { colorScale, gradient };
  }, [colorDomain]);

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

  const handleStateClick = (stateId: string) => {
    setPinnedStateId(stateId);
    if (stateId) setIsTableOpen(true);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current.isDragging || !mapContainerRef.current) return;
      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left - dragRef.current.offsetX;
      const y = event.clientY - rect.top - dragRef.current.offsetY;
      const clampedX = Math.min(Math.max(0, x), rect.width - 180);
      const clampedY = Math.min(Math.max(0, y), rect.height - 100);
      dragRef.current.didDrag = true;
      setLegendPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startDrag = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    dragRef.current.isDragging = true;
    dragRef.current.didDrag = false;
    dragRef.current.offsetX = event.clientX - rect.left - legendPosition.x;
    dragRef.current.offsetY = event.clientY - rect.top - legendPosition.y;
  };

  const handleLegendToggle = () => {
    if (dragRef.current.isDragging || dragRef.current.didDrag) {
      // Prevent toggling when the user just dragged.
      dragRef.current.didDrag = false;
      return;
    }
    setIsLegendOpen((prev) => !prev);
  };

  return (
    <div className="relative h-full w-full bg-[#e3f2fd]" ref={mapContainerRef}>
      {/* Top-center control pill */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 px-4 w-full">
        <div className="pointer-events-auto mx-auto flex max-w-[min(90vw,1000px)] flex-wrap items-center justify-center gap-3 rounded-full bg-white px-4 py-2 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 min-w-[220px]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[color:var(--ss-green-dark)]" htmlFor="metric-select">
              Metric
            </label>
            <select
              id="metric-select"
              className="min-w-[180px] rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none cursor-pointer"
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
                  {metric.name} {metric.unit ? `(${metric.unit})` : ""} {metric.category ? `• ${metric.category}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex flex-1 min-w-[240px] items-center gap-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Year</p>
            <input
              type="range"
              min={yearMin}
              max={yearMax}
              value={sliderValue}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="flex-1 accent-[color:var(--ss-green)] cursor-pointer"
              step={1}
              aria-label="Select year"
              disabled={!selectedMetric?.years.length}
            />
            <span className="text-sm font-semibold text-slate-900">
              {selectedMetric?.years.length ? selectedYear : "—"}
            </span>
          </div>
        </div>
        <p className="pointer-events-none mx-auto mt-2 max-w-[min(90vw,1000px)] text-center text-xs text-slate-600">
          Data through {selectedMetric?.maxYear ?? "—"} for {selectedMetric?.name ?? "this metric"}
        </p>
      </div>

      <section className="relative h-full w-full bg-[#e3f2fd]">
        <div className="absolute inset-0 overflow-hidden bg-[#c6e6ffff] p-0">
          <div className="h-full w-full overflow-hidden bg-[#c6e6ffff]">
            {colorScale ? (
              <USChoropleth
                features={features}
                valuesByStateId={valuesByStateId}
                colorScale={colorScale}
                hoveredStateId={hovered?.stateId ?? null}
                pinnedStateId={pinnedStateId}
                onHover={(stateId, position) => {
                  if (!stateId || !position) {
                    setHovered(null);
                    return;
                  }
                  setHovered({ stateId, ...position });
                }}
                onClick={(stateId) => handleStateClick(stateId)}
                selectedYear={selectedYear}
              />
            ) : null}

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
            <div
              className="pointer-events-auto absolute z-10 max-w-full sm:w-60"
              style={{ left: legendPosition.x, top: legendPosition.y }}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={handleLegendToggle}
                  onMouseDown={startDrag}
                  aria-expanded={isLegendOpen}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 cursor-grab active:cursor-grabbing"
                >
                  <span className="h-2 w-2 rounded-full bg-[color:var(--ss-green-mid)]" aria-hidden />
                  Legend {isLegendOpen ? "▾" : "▸"}
                </button>
                {isLegendOpen ? (
                  <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-xl border border-[color:var(--ss-green-mid)]/40 bg-white p-3 shadow-sm">
                    <Legend
                      scaleType="continuous"
                      unitLabel={selectedMetric?.unit ?? undefined}
                      gradient={gradient}
                      domain={colorDomain}
                    />
                  </div>
                ) : null}
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

        <DataTablePanel
          year={selectedYear}
          rows={tableRows.map((row) => ({
            rank: row.rank ?? null,
            stateId: row.id,
            stateName: row.name,
            value: row.value,
            displayValue: formatMetricValue(row.value, selectedMetric?.unit ?? undefined),
          }))}
          selectedStateId={pinnedStateId}
          isOpen={isTableOpen}
          onToggle={() => setIsTableOpen((prev) => !prev)}
        />
      </section>
    </div>
  );
}
