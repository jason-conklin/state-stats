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
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Legend</p>
        {props.unit ? <span className="text-xs text-slate-500">{props.unit}</span> : null}
      </div>
      {props.mode === "quantize" ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-700 sm:grid-cols-3">
          {props.buckets.map((bucket, index) => (
            <div key={`${bucket.color}-${index}`} className="flex items-center gap-2">
              <span className="h-4 w-8 rounded-full border border-slate-200" style={{ backgroundColor: bucket.color }} />
              <span>{bucket.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="h-3 rounded-full border border-slate-200" style={{ backgroundImage: props.gradient }} />
          <div className="flex justify-between text-xs text-slate-600">
            <span>{props.minValue !== null ? props.minValue.toLocaleString() : "–"}</span>
            <span>{props.maxValue !== null ? props.maxValue.toLocaleString() : "–"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
