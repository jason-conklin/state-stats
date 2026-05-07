"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StateInfo } from "@/lib/types";
import { formatMetricValue } from "@/lib/format";
import { TooltipContent } from "./TooltipContent";
import type { ChartDataRow } from "./GraphExplorer";

type Props = {
  chartData: ChartDataRow[];
  selectedStateIds: string[];
  states: StateInfo[];
  metricUnit?: string | null;
  normalization: "raw" | "indexed";
};

const COLOR_PALETTE = [
  "#166534",
  "#22a66f",
  "#0f766e",
  "#4ade80",
  "#065f46",
  "#22c55e",
  "#0ea5a7",
  "#84cc16",
  "#15803d",
];

function getColorForState(stateId: string, selectedStateIds: string[]) {
  const index = selectedStateIds.indexOf(stateId);
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function getYAxisWidth(
  chartData: ChartDataRow[],
  selectedStateIds: string[],
  metricUnit: string | null | undefined,
  normalization: "raw" | "indexed",
) {
  const values = chartData.flatMap((row) =>
    selectedStateIds
      .map((stateId) => row[stateId])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );

  const candidates = values.length > 0 ? [Math.min(...values), Math.max(...values), 0] : [0];
  const longestLabelLength = Math.max(
    ...candidates.map((value) =>
      formatMetricValue(value, metricUnit ?? undefined, {
        compact: true,
        mode: normalization,
      }).length,
    ),
  );

  return Math.min(92, Math.max(52, longestLabelLength * 8 + 14));
}

export default function GraphInner({
  chartData,
  selectedStateIds,
  states,
  metricUnit,
  normalization,
}: Props) {
  const yAxisWidth = useMemo(
    () => getYAxisWidth(chartData, selectedStateIds, metricUnit, normalization),
    [chartData, metricUnit, normalization, selectedStateIds],
  );
  const yAxisTickFormatter = useMemo(
    () => (value: number) =>
      formatMetricValue(value, metricUnit ?? undefined, {
        compact: true,
        mode: normalization,
      }),
    [metricUnit, normalization],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ left: 4, right: 12, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
        <XAxis
          dataKey="year"
          stroke="#475569"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12, fill: "#475569" }}
        />
        <YAxis
          stroke="#475569"
          width={yAxisWidth}
          tickFormatter={yAxisTickFormatter}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={{ fontSize: 12, fill: "#475569" }}
        />
        <Tooltip content={<TooltipContent metricUnit={metricUnit} normalization={normalization} />} />
        {selectedStateIds.map((stateId) => {
          const state = states.find((s) => s.id === stateId);
          const color = getColorForState(stateId, selectedStateIds);
          return (
            <Line
              key={stateId}
              type="monotone"
              dataKey={stateId}
              name={state?.name ?? stateId}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
