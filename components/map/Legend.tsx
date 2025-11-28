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
    <div className="w-full max-w-[480px] sm:max-w-full rounded-lg border border-[color:var(--ss-green-mid)]/40 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] sm:text-[12px] font-semibold text-[color:var(--ss-green-dark)]">Legend</p>
        {props.unitLabel ? <span className="text-[9px] sm:text-[10px] text-slate-500">{props.unitLabel}</span> : null}
      </div>
      {props.scaleType === "quantize" ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-col gap-1 text-[9px] sm:text-[10px] text-slate-700">
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
          <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-600">
            <span>{domainMin !== null ? formatMetricValue(domainMin, props.unitLabel ?? undefined) : "–"}</span>
            <span>{domainMax !== null ? formatMetricValue(domainMax, props.unitLabel ?? undefined) : "–"}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div
            className="h-2 sm:h-3 rounded-md border border-[color:var(--ss-green-mid)]/50"
            style={{ backgroundImage: props.gradient }}
          />
          <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-600">
            <span>{domainMin !== null ? formatMetricValue(domainMin, props.unitLabel ?? undefined) : "–"}</span>
            <span>{domainMax !== null ? formatMetricValue(domainMax, props.unitLabel ?? undefined) : "–"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
