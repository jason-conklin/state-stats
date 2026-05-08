"use client";

import { ArrowUpDown, Check, ChevronDown, Copy, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MetricSelect, type MetricOption } from "@/components/controls/MetricSelect";

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
  metrics: MetricOption[];
  selectedMetricId: string;
  onMetricChange: (metricId: string) => void;
  metricName?: string;
  metricUnit?: string | null;
  selectedStateId?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  showLauncher?: boolean;
};

type SortMode = "rank_asc" | "rank_desc";

const SORT_MODE_LABEL: Record<SortMode, string> = {
  rank_asc: "Rank ↑",
  rank_desc: "Rank ↓",
};

function nextSortMode(current: SortMode): SortMode {
  return current === "rank_asc" ? "rank_desc" : "rank_asc";
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function sanitizeTsvCell(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function slugifyMetricName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "metric";
}

export function DataTablePanel({
  year,
  rows,
  metrics,
  selectedMetricId,
  onMetricChange,
  metricName,
  metricUnit,
  selectedStateId,
  isOpen,
  onToggle,
  showLauncher = true,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const mobileExportRef = useRef<HTMLDivElement | null>(null);
  const desktopExportRef = useRef<HTMLDivElement | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rank_asc");
  const [activeExportMenu, setActiveExportMenu] = useState<"mobile" | "desktop" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const selectedMetric = useMemo(
    () => metrics.find((metric) => metric.id === selectedMetricId),
    [metrics, selectedMetricId],
  );
  const visibleRows = useMemo(() => {
    const filtered = normalizedQuery
      ? rows.filter((row) => row.stateName.toLowerCase().includes(normalizedQuery))
      : rows;

    return [...filtered].sort((a, b) => {
      const compareNullable = (left: number | null, right: number | null, direction: "asc" | "desc") => {
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
        return direction === "asc" ? left - right : right - left;
      };

      if (sortMode === "rank_asc") {
        return compareNullable(a.rank, b.rank, "asc") || a.stateName.localeCompare(b.stateName);
      }
      return compareNullable(a.rank, b.rank, "desc") || a.stateName.localeCompare(b.stateName);
    });
  }, [normalizedQuery, rows, sortMode]);

  useEffect(() => {
    if (isOpen && headingRef.current) {
      headingRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedStateId && rowRefs.current[selectedStateId]) {
      rowRefs.current[selectedStateId]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isOpen, selectedStateId, visibleRows]);

  useEffect(() => {
    if (!activeExportMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const withinMobile = mobileExportRef.current?.contains(target);
      const withinDesktop = desktopExportRef.current?.contains(target);
      if (!withinMobile && !withinDesktop) {
        setActiveExportMenu(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveExportMenu(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeExportMenu]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (rowCopyTimerRef.current) clearTimeout(rowCopyTimerRef.current);
    },
    [],
  );

  const handlePanelToggle = useCallback(() => {
    setActiveExportMenu(null);
    onToggle();
  }, [onToggle]);

  const secondaryUnit = selectedMetric?.unit ?? metricUnit;
  const secondaryLine = secondaryUnit ? `State values • ${secondaryUnit}` : "State values";
  const metricLabel = selectedMetric?.name ?? metricName ?? "State values";

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMessage(message);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMessage(null);
      feedbackTimerRef.current = null;
    }, 1200);
  }, []);

  const buildCsvContent = useCallback(() => {
    const header = ["rank", "state", "value_numeric", "value_display", "year", "metric"];
    const lines = visibleRows.map((row) =>
      [
        row.rank === null ? "" : String(row.rank),
        row.stateName,
        row.value === null ? "" : String(row.value),
        row.displayValue,
        String(year),
        metricLabel,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }, [metricLabel, visibleRows, year]);

  const buildTsvContent = useCallback(() => {
    const header = ["rank", "state", "value_display", "year", "metric"];
    const lines = visibleRows.map((row) =>
      [
        row.rank === null ? "" : String(row.rank),
        row.stateName,
        row.displayValue,
        String(year),
        metricLabel,
      ]
        .map(sanitizeTsvCell)
        .join("\t"),
    );
    return [header.join("\t"), ...lines].join("\n");
  }, [metricLabel, visibleRows, year]);

  const handleExportCsv = useCallback(() => {
    const csv = buildCsvContent();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `statestats_${slugifyMetricName(metricLabel)}_${year}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setActiveExportMenu(null);
  }, [buildCsvContent, metricLabel, year]);

  const handleCopyAllTsv = useCallback(async () => {
    const tsv = buildTsvContent();
    try {
      await navigator.clipboard.writeText(tsv);
      showFeedback("Copied TSV");
    } catch {
      showFeedback("Clipboard unavailable");
    }
    setActiveExportMenu(null);
  }, [buildTsvContent, showFeedback]);

  const handleCopyRow = useCallback(
    async (row: TableRow) => {
      const total = visibleRows.length;
      const rankLabel = row.rank === null ? "N/A" : String(row.rank);
      const rowText = `${row.stateName} — ${row.displayValue} (Rank ${rankLabel}/${total}) • ${metricLabel} • ${year}`;
      try {
        await navigator.clipboard.writeText(rowText);
        setCopiedRowId(row.stateId);
        if (rowCopyTimerRef.current) clearTimeout(rowCopyTimerRef.current);
        rowCopyTimerRef.current = setTimeout(() => {
          setCopiedRowId(null);
          rowCopyTimerRef.current = null;
        }, 1200);
      } catch {
        showFeedback(`Couldn't copy ${row.stateName}`);
      }
    },
    [metricLabel, showFeedback, visibleRows.length, year],
  );

  return (
    <>
      {/* Mobile: inline section below the map */}
      <div className="w-full px-4 pb-10 pt-2 md:hidden">
        <div className="w-full overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white/95 shadow-lg">
          <div className="border-b border-slate-200/80 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data table</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="min-w-0 flex-1 text-base font-semibold text-slate-900">
                  <MetricSelect
                    metrics={metrics}
                    value={selectedMetricId}
                    onChange={onMetricChange}
                    variant="stealthTitle"
                    portal
                    showLabel={false}
                    showCategoryChip={false}
                    className="w-full min-w-0"
                  />
                </h2>
                <span className="flex-none rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                  {year}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{secondaryLine}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200/80 px-4 py-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search states</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search state..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              />
            </label>
            <button
              type="button"
              onClick={() => setSortMode((current) => nextSortMode(current))}
              className="inline-flex cursor-pointer flex-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              aria-label={`Change sort order. Current sort is ${SORT_MODE_LABEL[sortMode]}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              <span className="tabular-nums">{SORT_MODE_LABEL[sortMode]}</span>
            </button>
            <div className="relative flex-none" ref={mobileExportRef}>
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="cursor-pointer px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveExportMenu((current) => (current === "mobile" ? null : "mobile"))
                  }
                  aria-label="Open export options"
                  aria-haspopup="menu"
                  aria-expanded={activeExportMenu === "mobile"}
                  className="cursor-pointer border-l border-slate-200 px-1.5 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {activeExportMenu === "mobile" ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                  onKeyDown={(event) => {
                    if (event.key === "Escape" || event.key === "Tab") {
                      setActiveExportMenu(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCsv}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopyAllTsv}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    Copy all as TSV
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">State values for {year}</caption>
              <thead className="sticky top-0 z-10 bg-white/90 text-slate-600 backdrop-blur-sm">
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  <th className="w-14 px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">State</th>
                  <th className="w-24 px-3 py-2 text-right">Value</th>
                  <th className="w-10 px-1 py-2 text-right">
                    <span className="sr-only">Copy row</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const isSelected = row.stateId === selectedStateId;
                  const rankBadgeTone =
                    row.rank === 1
                      ? "bg-emerald-100 text-emerald-700"
                      : row.rank === 2
                        ? "bg-slate-200 text-slate-700"
                        : row.rank === 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600";
                  const rowBaseBgColor = isSelected ? "#ecfdf5" : index % 2 === 0 ? "#ffffff" : "#e2e8f0";
                  const rowHoverBgClass = isSelected ? "group-hover:!bg-emerald-50" : "group-hover:!bg-slate-200";

                  return (
                    <tr
                      key={row.stateId}
                      className="group border-b border-slate-100 transition-colors duration-150"
                    >
                      <td
                        className={`${rowHoverBgClass} border-l-4 px-3 py-2 text-xs tabular-nums text-slate-500 transition-colors duration-150 ${
                          isSelected ? "border-emerald-500" : "border-transparent"
                        }`}
                        style={{ backgroundColor: rowBaseBgColor }}
                      >
                        {typeof row.rank === "number" ? (
                          <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 font-medium ${rankBadgeTone}`}>
                            {row.rank}
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className={`${rowHoverBgClass} px-3 py-2 transition-colors duration-150`} style={{ backgroundColor: rowBaseBgColor }}>
                        <span className="block truncate font-medium text-slate-900">{row.stateName}</span>
                      </td>
                      <td className={`${rowHoverBgClass} px-3 py-2 text-right font-semibold tabular-nums text-slate-800 transition-colors duration-150`} style={{ backgroundColor: rowBaseBgColor }}>{row.displayValue}</td>
                      <td className={`${rowHoverBgClass} px-1 py-2 text-right transition-colors duration-150`} style={{ backgroundColor: rowBaseBgColor }}>
                        <button
                          type="button"
                          aria-label={`Copy row for ${row.stateName}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleCopyRow(row);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-white/80 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                        >
                          {copiedRowId === row.stateId ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                      No states match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Desktop overlay behavior remains */}
      <div className="pointer-events-none hidden md:fixed md:inset-y-4 md:right-4 md:left-auto md:z-30 md:flex md:flex-col md:items-end md:justify-start">
        {!isOpen && showLauncher ? (
          <button
            type="button"
            onClick={handlePanelToggle}
            aria-expanded={isOpen}
            className="pointer-events-auto mb-2 rounded-full border border-slate-200/90 bg-white/85 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg backdrop-blur-sm ring-1 ring-slate-100 hover:bg-white cursor-pointer"
          >
            Data table ▸
          </button>
        ) : null}

        {isOpen ? (
          <div className="pointer-events-auto w-[360px] max-h-[calc(100vh-32px)]">
            <div className="flex h-full max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-3xl border border-white/45 bg-white/86 shadow-[0_18px_40px_rgba(15,23,42,0.22)] backdrop-blur-xl ring-1 ring-slate-200/70">
              <div className="border-b border-slate-200/75 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data table</p>
                    <div className="mt-1 flex items-center gap-2">
                      <h2
                        ref={headingRef}
                        tabIndex={-1}
                        className="min-w-0 flex-1 text-lg font-semibold text-slate-900 focus:outline-none"
                      >
                        <MetricSelect
                          metrics={metrics}
                          value={selectedMetricId}
                          onChange={onMetricChange}
                          variant="stealthTitle"
                          portal
                          showLabel={false}
                          showCategoryChip={false}
                          className="w-full min-w-0"
                        />
                      </h2>
                      <span className="flex-none rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                        {year}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{secondaryLine}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePanelToggle}
                    aria-label="Close data table"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-slate-200/75 px-4 py-2">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search states</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search state..."
                    className="w-full rounded-lg border border-slate-200 bg-white/90 pl-8 pr-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSortMode((current) => nextSortMode(current))}
                  className="inline-flex cursor-pointer flex-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  aria-label={`Change sort order. Current sort is ${SORT_MODE_LABEL[sortMode]}`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  <span className="tabular-nums">{SORT_MODE_LABEL[sortMode]}</span>
                </button>
                <div className="relative flex-none" ref={desktopExportRef}>
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white/90 shadow-sm">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="cursor-pointer px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveExportMenu((current) => (current === "desktop" ? null : "desktop"))
                      }
                      aria-label="Open export options"
                      aria-haspopup="menu"
                      aria-expanded={activeExportMenu === "desktop"}
                      className="cursor-pointer border-l border-slate-200 px-1.5 text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                    >
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  {activeExportMenu === "desktop" ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                      onKeyDown={(event) => {
                        if (event.key === "Escape" || event.key === "Tab") {
                          setActiveExportMenu(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleExportCsv}
                        className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleCopyAllTsv}
                        className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                      >
                        Copy all as TSV
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full table-fixed text-left text-sm">
                  <caption className="sr-only">State values for {year}</caption>
                  <thead className="sticky top-0 z-10 bg-white/90 text-slate-600 backdrop-blur-sm">
                    <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-[0.12em]">
                      <th className="w-14 px-3 py-2 text-left">Rank</th>
                      <th className="px-3 py-2 text-left">State</th>
                      <th className="w-24 px-3 py-2 text-right">Value</th>
                      <th className="w-10 px-1 py-2 text-right">
                        <span className="sr-only">Copy row</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, index) => {
                      const isSelected = row.stateId === selectedStateId;
                      const rankBadgeTone =
                        row.rank === 1
                          ? "bg-emerald-100 text-emerald-700"
                          : row.rank === 2
                            ? "bg-slate-200 text-slate-700"
                            : row.rank === 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600";
                      const rowBaseBgColor = isSelected ? "#ecfdf5" : index % 2 === 0 ? "#ffffff" : "#eeeeee";
                      const rowHoverBgClass = isSelected ? "group-hover:!bg-emerald-50" : "group-hover:!bg-slate-200";

                      return (
                        <tr
                          key={row.stateId}
                          ref={(el) => {
                            rowRefs.current[row.stateId] = el;
                          }}
                          className="group border-b border-slate-100 transition-colors duration-150"
                        >
                          <td
                            className={`${rowHoverBgClass} border-l-4 px-3 py-2 text-xs tabular-nums text-slate-500 transition-colors duration-150 ${
                              isSelected ? "border-emerald-500" : "border-transparent"
                            }`}
                            style={{ backgroundColor: rowBaseBgColor }}
                          >
                            {typeof row.rank === "number" ? (
                              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 font-medium ${rankBadgeTone}`}>
                                {row.rank}
                              </span>
                            ) : (
                              "–"
                            )}
                          </td>
                          <td className={`${rowHoverBgClass} px-3 py-2 transition-colors duration-150`} style={{ backgroundColor: rowBaseBgColor }}>
                            <span className="block truncate font-medium text-slate-900">{row.stateName}</span>
                          </td>
                          <td className={`${rowHoverBgClass} px-3 py-2 text-right font-semibold tabular-nums text-slate-800 transition-colors duration-150`} style={{ backgroundColor: rowBaseBgColor }}>{row.displayValue}</td>
                          <td className={`${rowHoverBgClass} px-1 py-2 text-right transition-colors duration-150`} style={{ backgroundColor: rowBaseBgColor }}>
                            <button
                              type="button"
                              aria-label={`Copy row for ${row.stateName}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCopyRow(row);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 opacity-100 transition hover:border-slate-200 hover:bg-white/80 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100"
                            >
                              {copiedRowId === row.stateId ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                              ) : (
                                <Copy className="h-3.5 w-3.5" aria-hidden />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                          No states match your search.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {feedbackMessage ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur-sm">
          {feedbackMessage}
        </div>
      ) : null}
    </>
  );
}
