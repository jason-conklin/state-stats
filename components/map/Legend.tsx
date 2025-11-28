'use client';

import { QuantizeBucket } from "@/lib/mapScales";

type LegendProps =
  | {
      mode: "quantize";
      unit?: string;
      buckets: QuantizeBucket[];
      minValue: number | null;
      maxValue: number | null;
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
    <div className="w-full rounded-xl border border-[color:var(--ss-green-mid)]/40 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[color:var(--ss-green-dark)]">Legend</p>
        {props.unit ? <span className="text-[11px] text-slate-500">{props.unit}</span> : null}
      </div>
      {props.mode === "quantize" ? (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
            <span>Lower values</span>
            <span>Higher values</span>
          </div>
          <div className="flex flex-col gap-1.5 text-[11px] text-slate-700">
            {props.buckets.map((bucket, index) => (
              <div key={`${bucket.color}-${index}`} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-[color:var(--ss-green-mid)]/50"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className={`truncate ${index === props.buckets.length - 1 ? "font-semibold" : ""}`}>{bucket.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-slate-600">
            <span>{props.minValue !== null ? props.minValue.toLocaleString() : "–"}</span>
            <span>{props.maxValue !== null ? props.maxValue.toLocaleString() : "–"}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 space-y-2">
          <div
            className="h-2.5 rounded-full border border-[color:var(--ss-green-mid)]/50"
            style={{ backgroundImage: props.gradient }}
          />
          <div className="flex justify-between text-[11px] text-slate-600">
            <span>{props.minValue !== null ? props.minValue.toLocaleString() : "–"}</span>
            <span>{props.maxValue !== null ? props.maxValue.toLocaleString() : "–"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
