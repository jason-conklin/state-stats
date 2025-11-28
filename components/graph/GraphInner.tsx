"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StateInfo } from "@/lib/types";
import { TooltipContent } from "./TooltipContent";
import type { ChartDataRow } from "./GraphExplorer";

type Props = {
  chartData: ChartDataRow[];
  selectedStateIds: string[];
  states: StateInfo[];
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

export default function GraphInner({ chartData, selectedStateIds, states }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ left: 12, right: 12, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
        <XAxis dataKey="year" stroke="#475569" />
        <YAxis stroke="#475569" />
        <Tooltip content={<TooltipContent />} />
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
