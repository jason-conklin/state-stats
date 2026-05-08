"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import { RotateCcw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StateInfo } from "@/lib/types";
import { formatMetricValue } from "@/lib/format";
import { TooltipContent } from "./TooltipContent";
import type { ChartDataRow } from "./GraphExplorer";
import { getStateSeriesStyle } from "./seriesStyle";

type Props = {
  chartData: ChartDataRow[];
  selectedStateIds: string[];
  states: StateInfo[];
  metricUnit?: string | null;
  normalization: "raw" | "indexed";
};

type ZoomWindow = {
  startIndex: number;
  endIndex: number;
};

type ChartMousePayloadEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | null;
};

type ChartMouseState = {
  activeCoordinate?: { x?: number; y?: number };
  activeLabel?: number | string;
  activePayload?: ChartMousePayloadEntry[];
  chartX?: number;
  chartY?: number;
  yAxisMap?: Record<string, { scale?: unknown }>;
};

type HoverTooltipState = {
  chartX: number;
  chartY: number;
  color: string;
  stateId: string;
  stateName: string;
  value: number;
  year: number;
};

const MIN_VISIBLE_POINTS = 3;
const TOOLTIP_PROXIMITY_THRESHOLD = 14;
const TOOLTIP_HORIZONTAL_OFFSET = 16;
const TOOLTIP_WIDTH_MOBILE = 224;
const TOOLTIP_WIDTH_DESKTOP = 240;
const TOOLTIP_ESTIMATED_HEIGHT = 100;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getVisibleYDomain(
  visibleData: ChartDataRow[],
  selectedStateIds: string[],
) {
  const values = visibleData.flatMap((row) =>
    selectedStateIds
      .map((stateId) => row[stateId])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );

  if (values.length === 0) return [0, 1] as const;

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue;
  const padding = span === 0 ? Math.max(1, Math.abs(maxValue) * 0.08) : span * 0.08;

  return [minValue - padding, maxValue + padding] as const;
}

function getYAxisWidth(
  yDomain: readonly [number, number],
  metricUnit: string | null | undefined,
  normalization: "raw" | "indexed",
) {
  const [domainMin, domainMax] = yDomain;
  const candidates = [domainMin, (domainMin + domainMax) / 2, domainMax];
  const longestLabelLength = Math.max(
    ...candidates.map((value) =>
      formatMetricValue(value, metricUnit ?? undefined, {
        compact: true,
        mode: normalization,
      }).length,
    ),
  );

  return Math.min(118, Math.max(58, longestLabelLength * 8 + 16));
}

export default function GraphInner({
  chartData,
  selectedStateIds,
  states,
  metricUnit,
  normalization,
}: Props) {
  const chartAreaRef = useRef<HTMLDivElement | null>(null);
  const [chartBounds, setChartBounds] = useState({ width: 0, height: 0 });
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState | null>(null);
  const [zoomWindow, setZoomWindow] = useState<ZoomWindow>({
    startIndex: 0,
    endIndex: Math.max(0, chartData.length - 1),
  });

  const maxIndex = Math.max(0, chartData.length - 1);
  const visibleStartIndex = clamp(zoomWindow.startIndex, 0, maxIndex);
  const visibleEndIndex = clamp(zoomWindow.endIndex, visibleStartIndex, maxIndex);
  const visibleData = useMemo(
    () => chartData.slice(visibleStartIndex, visibleEndIndex + 1),
    [chartData, visibleEndIndex, visibleStartIndex],
  );
  const setChartAreaNode = useCallback((node: HTMLDivElement | null) => {
    chartAreaRef.current = node;

    if (!node) return;

    setChartBounds((previous) => {
      const next = {
        width: node.clientWidth,
        height: node.clientHeight,
      };

      return previous.width === next.width && previous.height === next.height ? previous : next;
    });
  }, []);

  useEffect(() => {
    const node = chartAreaRef.current;
    if (!node) return;

    const observer = new ResizeObserver(() => {
      setChartBounds((previous) => {
        const next = {
          width: node.clientWidth,
          height: node.clientHeight,
        };

        return previous.width === next.width && previous.height === next.height ? previous : next;
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const isZoomed = visibleStartIndex !== 0 || visibleEndIndex !== maxIndex;
  const visibleRangeLabel =
    visibleData.length > 0 ? `${visibleData[0].year}\u2013${visibleData[visibleData.length - 1].year}` : null;
  const statesById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states]);
  const yDomain = useMemo(
    () => getVisibleYDomain(visibleData, selectedStateIds),
    [selectedStateIds, visibleData],
  );
  const yAxisWidth = useMemo(
    () => getYAxisWidth(yDomain, metricUnit, normalization),
    [metricUnit, normalization, yDomain],
  );
  const yAxisTickFormatter = useMemo(
    () => (value: number) =>
      formatMetricValue(value, metricUnit ?? undefined, {
        compact: true,
        mode: normalization,
      }),
    [metricUnit, normalization],
  );
  const baseStrokeWidth = selectedStateIds.length >= 24 ? 1.7 : 2;
  const visibleVerticalGridLines = visibleData.length <= 12;
  const tooltipWidth = chartBounds.width < 640 ? TOOLTIP_WIDTH_MOBILE : TOOLTIP_WIDTH_DESKTOP;
  const tooltipPosition = useMemo(() => {
    if (!hoverTooltip) return null;

    const width = chartBounds.width || tooltipWidth + 24;
    const height = chartBounds.height || TOOLTIP_ESTIMATED_HEIGHT + 24;
    let left = hoverTooltip.chartX + TOOLTIP_HORIZONTAL_OFFSET;

    if (left + tooltipWidth > width - 12) {
      left = hoverTooltip.chartX - tooltipWidth - TOOLTIP_HORIZONTAL_OFFSET;
    }

    left = clamp(left, 12, Math.max(12, width - tooltipWidth - 12));

    let top = hoverTooltip.chartY - TOOLTIP_ESTIMATED_HEIGHT / 2;
    top = clamp(top, 12, Math.max(12, height - TOOLTIP_ESTIMATED_HEIGHT - 12));

    return { left, top };
  }, [chartBounds.height, chartBounds.width, hoverTooltip, tooltipWidth]);

  const handleResetZoom = useCallback(() => {
    setZoomWindow({
      startIndex: 0,
      endIndex: Math.max(0, chartData.length - 1),
    });
  }, [chartData.length]);

  const handleWheelZoom = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!chartAreaRef.current || chartData.length <= MIN_VISIBLE_POINTS) return;

      event.preventDefault();

      const rect = chartAreaRef.current.getBoundingClientRect();
      const relativeX = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);

      setZoomWindow((previous) => {
        const currentStart = clamp(previous.startIndex, 0, maxIndex);
        const currentEnd = clamp(previous.endIndex, currentStart, maxIndex);
        const currentVisiblePoints = currentEnd - currentStart + 1;

        const zoomFactor = Math.exp(event.deltaY * 0.0015);
        let nextVisiblePoints = Math.round(currentVisiblePoints * zoomFactor);
        nextVisiblePoints = clamp(nextVisiblePoints, MIN_VISIBLE_POINTS, chartData.length);

        if (nextVisiblePoints === currentVisiblePoints) {
          return previous;
        }

        const anchorIndex = currentStart + relativeX * Math.max(currentVisiblePoints - 1, 1);
        let nextStart = Math.round(anchorIndex - relativeX * Math.max(nextVisiblePoints - 1, 1));
        nextStart = clamp(nextStart, 0, Math.max(0, chartData.length - nextVisiblePoints));
        const nextEnd = nextStart + nextVisiblePoints - 1;

        if (nextStart === currentStart && nextEnd === currentEnd) {
          return previous;
        }

        return { startIndex: nextStart, endIndex: nextEnd };
      });
    },
    [chartData.length, maxIndex],
  );

  const hideHoverTooltip = useCallback(() => {
    setHoveredStateId(null);
    setHoverTooltip(null);
  }, []);

  const handleChartMouseMove = useCallback(
    (nextState: ChartMouseState) => {
      const chartX = nextState.chartX;
      const chartY = nextState.chartY;
      const activePayload = nextState.activePayload ?? [];
      const yAxis = nextState.yAxisMap ? Object.values(nextState.yAxisMap)[0] : undefined;
      const scale = yAxis?.scale;

      if (
        typeof chartX !== "number" ||
        typeof chartY !== "number" ||
        !activePayload.length ||
        typeof scale !== "function"
      ) {
        hideHoverTooltip();
        return;
      }

      const nearestEntry = activePayload
        .map((entry) => {
          const stateId = entry.dataKey?.toString() ?? "";
          const value = typeof entry.value === "number" && Number.isFinite(entry.value) ? entry.value : null;
          if (!stateId || value === null) return null;

          const scaledY = scale(value);
          if (typeof scaledY !== "number" || !Number.isFinite(scaledY)) return null;

          return {
            color: entry.color ?? getStateSeriesStyle(stateId).color,
            distance: Math.abs(chartY - scaledY),
            stateId,
            stateName: entry.name?.toString() ?? statesById.get(stateId)?.name ?? stateId,
            value,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((left, right) => left.distance - right.distance)[0];

      const yearValue =
        typeof nextState.activeLabel === "number"
          ? nextState.activeLabel
          : Number(nextState.activeLabel);

      if (
        !nearestEntry ||
        nearestEntry.distance > TOOLTIP_PROXIMITY_THRESHOLD ||
        !Number.isFinite(yearValue)
      ) {
        hideHoverTooltip();
        return;
      }

      setHoveredStateId(nearestEntry.stateId);
      setHoverTooltip((previous) => {
        if (
          previous &&
          previous.chartX === chartX &&
          previous.chartY === chartY &&
          previous.color === nearestEntry.color &&
          previous.stateId === nearestEntry.stateId &&
          previous.stateName === nearestEntry.stateName &&
          previous.value === nearestEntry.value &&
          previous.year === yearValue
        ) {
          return previous;
        }

        return {
          chartX,
          chartY,
          color: nearestEntry.color,
          stateId: nearestEntry.stateId,
          stateName: nearestEntry.stateName,
          value: nearestEntry.value,
          year: yearValue,
        };
      });
    },
    [hideHoverTooltip, statesById],
  );

  return (
    <div ref={setChartAreaNode} className="relative h-full w-full" onWheel={handleWheelZoom}>
      {hoverTooltip && tooltipPosition ? (
        <div
          className="pointer-events-none absolute z-20"
          style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
        >
          <TooltipContent
            year={hoverTooltip.year}
            stateName={hoverTooltip.stateName}
            value={hoverTooltip.value}
            color={hoverTooltip.color}
            metricUnit={metricUnit}
            normalization={normalization}
          />
        </div>
      ) : null}

      {isZoomed ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2">
          {visibleRangeLabel ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-sm">
              Zoomed: {visibleRangeLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleResetZoom}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span>Reset zoom</span>
          </button>
        </div>
      ) : null}

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={visibleData}
          margin={{ left: 4, right: 14, top: 16, bottom: 8 }}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={hideHoverTooltip}
        >
          <CartesianGrid
            stroke="#e2e8f0"
            strokeDasharray="3 4"
            vertical={visibleVerticalGridLines}
          />
          <XAxis
            dataKey="year"
            stroke="#475569"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 12, fill: "#475569" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            stroke="#475569"
            width={yAxisWidth}
            domain={yDomain as [number, number]}
            tickFormatter={yAxisTickFormatter}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fontSize: 12, fill: "#475569" }}
          />
          <Tooltip
            content={() => null}
            cursor={false}
            isAnimationActive={false}
            wrapperStyle={{ display: "none" }}
          />
          {selectedStateIds.map((stateId) => {
            const state = statesById.get(stateId);
            const { color, dashArray } = getStateSeriesStyle(stateId);
            const isHovered = hoveredStateId === stateId;

            return (
              <Line
                key={stateId}
                type="monotone"
                dataKey={stateId}
                name={state?.name ?? stateId}
                stroke={color}
                strokeWidth={isHovered ? 3 : baseStrokeWidth}
                strokeDasharray={dashArray}
                strokeOpacity={hoveredStateId ? (isHovered ? 1 : 0.2) : 0.94}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
