'use client';

import { QuantizeBucket } from "@/lib/mapScales";

type LegendProps =
  | {
      mode: "quantize";
      unit?: string;
      buckets: QuantizeBucket[];
    }
  | {
      mode: "continuous";
      unit?: string;
      minValue: number | null;
      maxValue: number | null;
      gradient: string;
    };

export function Legend(props: LegendProps) {
  return (
    <div className="w-full rounded-xl border border-[color:var(--ss-green-mid)]/40 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[color:var(--ss-green-dark)]">Legend</p>
        {props.unit ? <span className="text-xs text-slate-500">{props.unit}</span> : null}
      </div>
      {props.mode === "quantize" ? (
        <div className="mt-3 flex flex-col gap-2 text-xs text-slate-700">
          {props.buckets.map((bucket, index) => (
            <div key={`${bucket.color}-${index}`} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full border border-[color:var(--ss-green-mid)]/50"
                style={{ backgroundColor: bucket.color }}
              />
              <span className="truncate">{bucket.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="h-3 rounded-full border border-[color:var(--ss-green-mid)]/50" style={{ backgroundImage: props.gradient }} />
          <div className="flex justify-between text-xs text-slate-600">
            <span>{props.minValue !== null ? props.minValue.toLocaleString() : "–"}</span>
            <span>{props.maxValue !== null ? props.maxValue.toLocaleString() : "–"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
