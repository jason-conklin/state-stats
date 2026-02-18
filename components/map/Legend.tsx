'use client';

import { QuantizeBucket } from "@/lib/mapScales";
import { formatMetricValue } from "@/lib/format";

type LegendProps =
  | {
      scaleType: "quantize";
      unitLabel?: string | null;
      buckets: QuantizeBucket[];
      domain: [number, number] | null;
    }
  | {
      scaleType: "continuous";
      unitLabel?: string | null;
      domain: [number, number] | null;
      gradient: string;
    };

export function Legend(props: LegendProps) {
  const domainMin = props.domain?.[0] ?? null;
  const domainMax = props.domain?.[1] ?? null;
  return (
    <div className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_8px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm sm:max-w-full">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[color:var(--ss-green-dark)]">Legend</p>
        {props.unitLabel ? <span className="text-xs text-slate-500">{props.unitLabel}</span> : null}
      </div>
      {props.scaleType === "quantize" ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-col gap-1 text-xs text-slate-700">
            {props.buckets.map((bucket, index) => (
              <div key={`${bucket.color}-${index}`} className="flex items-center gap-2">
                <span
                  className="h-2 w-3 rounded-sm border border-[color:var(--ss-green-mid)]/50"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className={`truncate ${index === props.buckets.length - 1 ? "font-semibold" : ""}`}>{bucket.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{domainMin !== null ? formatMetricValue(domainMin, props.unitLabel ?? undefined) : "–"}</span>
            <span>{domainMax !== null ? formatMetricValue(domainMax, props.unitLabel ?? undefined) : "–"}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div
            className="h-2 rounded-md border border-[color:var(--ss-green-mid)]/50 shadow-inner"
            style={{ backgroundImage: props.gradient }}
          />
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{domainMin !== null ? formatMetricValue(domainMin, props.unitLabel ?? undefined) : "–"}</span>
            <span>{domainMax !== null ? formatMetricValue(domainMax, props.unitLabel ?? undefined) : "–"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
