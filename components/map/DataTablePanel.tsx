"use client";

import { useEffect, useMemo, useRef } from "react";

type TableRow = {
  rank: number | null;
  stateId: string;
  stateName: string;
  value: number | null;
  displayValue: string;
};

type Props = {
  year: number;
  rows: TableRow[];
  selectedStateId?: string | null;
  isOpen: boolean;
  onToggle: () => void;
};

export function DataTablePanel({ year, rows, selectedStateId, isOpen, onToggle }: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const sortedRows = useMemo(() => rows, [rows]);

  useEffect(() => {
    if (isOpen && headingRef.current) {
      headingRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedStateId && rowRefs.current[selectedStateId]) {
      rowRefs.current[selectedStateId]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isOpen, selectedStateId]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center md:inset-y-4 md:right-4 md:left-auto md:items-end md:bottom-auto md:justify-start">
      {!isOpen ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="pointer-events-auto mb-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 md:mb-0"
        >
          Data table ▸
        </button>
      ) : null}

      {isOpen ? (
        <div className="pointer-events-auto w-full max-h-[70vh] rounded-t-2xl bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 md:w-[360px] md:max-h-[calc(100vh-4rem)] md:rounded-2xl md:shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data table</p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-lg font-semibold text-slate-900 focus:outline-none"
              >
                Values for {year}
              </h2>
              <p className="text-xs text-slate-500">Accessible table of state values</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Close data table"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>
          <div className="max-h-[calc(70vh-5rem)] overflow-y-auto md:max-h-[calc(100vh-8rem)]">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">State values for {year}</caption>
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((row) => {
                  const isSelected = row.stateId === selectedStateId;
                  return (
                    <tr
                      key={row.stateId}
                      ref={(el) => {
                        rowRefs.current[row.stateId] = el;
                      }}
                      className={`hover:bg-slate-50 ${isSelected ? "bg-[color:var(--ss-green-light)]" : ""}`}
                    >
                      <td className="px-3 py-2 text-slate-700">{row.rank ?? "–"}</td>
                      <td className="px-3 py-2 text-slate-900">{row.stateName}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.displayValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
