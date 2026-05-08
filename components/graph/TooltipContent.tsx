"use client";

import type { TooltipProps } from "recharts";
import { formatMetricValue } from "@/lib/format";

type TooltipPayloadEntry = NonNullable<TooltipProps<number, string>["payload"]>[number];

type Props = TooltipProps<number, string> & {
  metricUnit?: string | null;
  normalization: "raw" | "indexed";
};

export function TooltipContent({ active, payload, label, metricUnit, normalization }: Props) {
  const entry = (payload?.[0] ?? null) as TooltipPayloadEntry | null;

  if (!active || !entry || typeof entry.value !== "number" || !Number.isFinite(entry.value)) {
    return null;
  }

  const stateName = entry.name?.toString() ?? entry.dataKey?.toString() ?? "State";
  const color = (entry.color as string) ?? "#0f172a";

  return (
    <div className="w-56 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:w-60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Year {label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <p className="text-sm font-semibold text-slate-900">{stateName}</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-900">
        {formatMetricValue(entry.value, metricUnit ?? undefined, { mode: normalization })}
      </p>
    </div>
  );
}
