"use client";

import { formatMetricValue } from "@/lib/format";

type Props = {
  year: number;
  stateName: string;
  value: number;
  color: string;
  metricUnit?: string | null;
  normalization: "raw" | "indexed";
};

export function TooltipContent({ year, stateName, value, color, metricUnit, normalization }: Props) {
  return (
    <div className="w-56 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:w-60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Year {year}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <p className="text-sm font-semibold text-slate-900">{stateName}</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-900">
        {formatMetricValue(value, metricUnit ?? undefined, { mode: normalization })}
      </p>
    </div>
  );
}
