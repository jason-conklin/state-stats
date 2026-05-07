"use client";

import type { TooltipProps } from "recharts";
import { formatMetricValue } from "@/lib/format";

type NumericPayload = NonNullable<TooltipProps<number, string>["payload"]>[number];

type Props = TooltipProps<number, string> & {
  metricUnit?: string | null;
  normalization: "raw" | "indexed";
};

export function TooltipContent({ payload, label, metricUnit, normalization }: Props) {
  const safePayload = (payload ?? []) as NumericPayload[];
  if (!safePayload || safePayload.length === 0) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-slate-900">Year {label}</p>
      <ul className="mt-1 space-y-1 text-xs text-slate-700">
        {safePayload.map((entry) => (
          <li key={entry.dataKey?.toString()} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: (entry.color as string) ?? "#000" }}
              aria-hidden
            />
            <span className="font-medium">{entry.name}</span>
            <span className="text-slate-500">
              {entry.value === null || entry.value === undefined
                ? "–"
                : formatMetricValue(entry.value, metricUnit ?? undefined, { mode: normalization })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
