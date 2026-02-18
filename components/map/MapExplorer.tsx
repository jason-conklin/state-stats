"use client";

import { Feature, Geometry } from "geojson";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Legend } from "./Legend";
import { USChoropleth } from "./USChoropleth";
import { createContinuousColorScale, createQuantizeColorScale } from "@/lib/mapScales";
import { formatMetricValue } from "@/lib/format";
import { StateInfo } from "@/lib/types";
import { DataTablePanel } from "./DataTablePanel";
import { MetricSelect } from "@/components/controls/MetricSelect";

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
  const [legendPosition, setLegendPosition] = useState<{ x: number; y: number }>({ x: 12, y: 240 });
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

  const setTableOpen = useCallback((next: boolean) => {
    setIsTableOpen(next);
    window.dispatchEvent(new CustomEvent("statestats:table-toggle", { detail: { open: next } }));
  }, []);

  const handleMetricSelect = useCallback(
    (nextMetricId: string) => {
      setSelectedMetricId(nextMetricId);
      const nextMetric = metrics.find((metric) => metric.id === nextMetricId);
      const latestYearValue = nextMetric?.years[nextMetric.years.length - 1];
      if (typeof latestYearValue === "number") {
        setSelectedYear(latestYearValue);
      }
    },
    [metrics],
  );

  const handleStateClick = (stateId: string) => {
    setPinnedStateId(stateId);
    if (stateId) setTableOpen(true);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current.isDragging || !mapContainerRef.current) return;
      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left - dragRef.current.offsetX;
      const y = event.clientY - rect.top - dragRef.current.offsetY;
      const clampedX = Math.min(Math.max(0, x), rect.width - 180);
      const clampedY = Math.min(Math.max(0, y), rect.height - 100);
      dragRef.current.didDrag = true;
      setLegendPosition({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    dragRef.current.isDragging = true;
    dragRef.current.didDrag = false;
    dragRef.current.offsetX = event.clientX - rect.left - legendPosition.x;
    dragRef.current.offsetY = event.clientY - rect.top - legendPosition.y;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handleLegendToggle = () => {
    if (dragRef.current.isDragging || dragRef.current.didDrag) {
      // Prevent toggling when the user just dragged.
      dragRef.current.didDrag = false;
      return;
    }
    setIsLegendOpen((prev) => !prev);
  };

  // Close the data table when the sidebar expands.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;
      if (detail && detail.collapsed === false) {
        setTableOpen(false);
      }
    };
    window.addEventListener("statestats:sidebar-toggle", handler as EventListener);
    return () => window.removeEventListener("statestats:sidebar-toggle", handler as EventListener);
  }, [setTableOpen]);

  return (
    <div
      className="relative w-full min-h-screen bg-gradient-to-b from-[#e6f1f8] to-[#d9eaf5] pb-24 md:h-full md:pb-0"
      ref={mapContainerRef}
    >
      <section className="relative w-full">
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(720px,92vw)] -translate-x-1/2">
          <div className="pointer-events-auto rounded-2xl border border-slate-200/90 bg-white/85 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.10)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <MetricSelect
                metrics={metrics}
                value={selectedMetric?.id ?? ""}
                onChange={handleMetricSelect}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => setTableOpen(!isTableOpen)}
                className="hidden md:inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {isTableOpen ? "Hide table" : "Data table"}
              </button>
            </div>
            <div className="mt-2 rounded-xl border border-slate-200/90 bg-white/70 px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Year</p>
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white">
                  {selectedMetric?.years.length ? selectedYear : "—"}
                </span>
              </div>
              <div className="mx-auto w-full max-w-[420px]">
                <input
                  type="range"
                  min={yearMin}
                  max={yearMax}
                  value={sliderValue}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="ss-year-slider w-full"
                  step={1}
                  aria-label="Select year"
                  disabled={!selectedMetric?.years.length}
                />
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="tabular-nums">{yearMin}</span>
                  <span className="tabular-nums">{yearMax}</span>
                </div>
              </div>
            </div>
            <p className="mt-1 text-center text-[11px] text-slate-600">
              Data through {selectedMetric?.maxYear ?? "—"} for {selectedMetric?.name ?? "this metric"}
            </p>
          </div>
        </div>

        <div className="relative h-[34vh] w-full bg-gradient-to-b from-[#e6f1f8] to-[#d9eaf5] sm:h-[62vh] md:h-[calc(100vh-2.5rem)]">
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
              className="pointer-events-none absolute z-20 w-44 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-150 ease-out sm:w-56"
              style={{
                left: tooltipContent.position.x + 8,
                top: tooltipContent.position.y + 8,
              }}
            >
              <p className="text-base font-semibold text-slate-900">{tooltipContent.stateName}</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">
                {formatMetricValue(tooltipContent.value, selectedMetric?.unit ?? undefined)}
              </p>
              <div className="my-2 h-px bg-slate-200" />
              {tooltipContent.rank ? (
                <p className="text-xs text-slate-500">Rank {tooltipContent.rank} / {states.length}</p>
              ) : (
                <p className="text-xs text-slate-500">No data</p>
              )}
            </div>
          ) : null}

          {/* Legend */}
          <div
            className="pointer-events-auto absolute z-10 max-w-[70%] sm:max-w-full sm:w-60"
            style={{ left: legendPosition.x, top: legendPosition.y }}
          >
            <div className="relative">
              <button
                type="button"
                onClick={handleLegendToggle}
                onPointerDown={startDrag}
                aria-expanded={isLegendOpen}
                className="inline-flex cursor-grab touch-none items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white active:cursor-grabbing"
              >
                <span className="h-2 w-2 rounded-full bg-[color:var(--ss-green-mid)]" aria-hidden />
                Legend {isLegendOpen ? "▾" : "▸"}
              </button>
              {isLegendOpen ? (
                <div className="absolute left-0 top-full z-10 mt-2 w-full">
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
            <div className="pointer-events-auto absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-10 max-w-full">
              {pinnedCard && pinnedCard.state ? (
                <div className="flex w-36 sm:w-64 flex-col gap-1 rounded-lg border border-[color:var(--ss-green-mid)]/30 bg-white/95 p-1.5 sm:p-3 shadow-md backdrop-blur text-[9px] sm:text-xs">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Pinned</p>
                    <button
                      type="button"
                      aria-label="Unpin state"
                      onClick={() => setPinnedStateId(null)}
                      className="text-slate-500 hover:text-slate-700 text-xs leading-none"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <p className="text-[11px] sm:text-sm font-semibold text-slate-900 truncate">{pinnedCard.state.name}</p>
                      <p className="text-[10px] text-slate-700">
                        {formatMetricValue(pinnedCard.value, selectedMetric?.unit ?? undefined)}
                      </p>
                      {pinnedCard.rank ? (
                        <p className="text-[9px] sm:text-[11px] text-slate-500">Rank {pinnedCard.rank} / {states.length}</p>
                      ) : (
                        <p className="text-[9px] sm:text-[11px] text-slate-500">No data</p>
                      )}
                    </div>
                    <Link
                      href={`/graph?metric=${selectedMetric?.id ?? ""}&states=${pinnedCard.state.abbreviation ?? pinnedCard.state.id}&startYear=${selectedYear}&endYear=${selectedYear}`}
                      className="rounded-md border border-[color:var(--ss-green)] px-2 py-0.5 text-[9px] font-medium text-[color:var(--ss-green)] hover:bg-[color:var(--ss-green-light)]"
                    >
                      Add to compare
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block w-64 rounded-lg border border-dashed border-[color:var(--ss-green-mid)]/50 bg-white/90 p-3 text-xs text-slate-600 shadow-sm backdrop-blur opacity-70">
                  Click a state on the map to pin it.
                </div>
              )}
            </div>
          </div>

        {/* Mobile inline data table */}
        <section className="sm:hidden mt-4 w-full px-3 pb-16">
          <div className="w-full rounded-t-3xl bg-white shadow-sm">
            <DataTablePanel
              year={selectedYear}
              metricName={selectedMetric?.name}
              rows={tableRows.map((row) => ({
                rank: row.rank ?? null,
                stateId: row.id,
                stateName: row.name,
                value: row.value,
                displayValue: formatMetricValue(row.value, selectedMetric?.unit ?? undefined),
              }))}
              selectedStateId={pinnedStateId}
              isOpen
              onToggle={() => {}}
            />
          </div>
        </section>

        {/* Desktop overlay table */}
        <div className="hidden sm:block">
          <DataTablePanel
            year={selectedYear}
            metricName={selectedMetric?.name}
            rows={tableRows.map((row) => ({
              rank: row.rank ?? null,
              stateId: row.id,
              stateName: row.name,
              value: row.value,
              displayValue: formatMetricValue(row.value, selectedMetric?.unit ?? undefined),
            }))}
            selectedStateId={pinnedStateId}
            isOpen={isTableOpen}
            onToggle={() => setTableOpen(!isTableOpen)}
            showLauncher={false}
          />
        </div>
      </section>
    </div>
  );
}
