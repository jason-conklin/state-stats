"use client";

import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  BarChart3,
  Briefcase,
  Check,
  ChevronDown,
  Home,
  UserRound,
  Users,
} from "lucide-react";

type MetricOption = {
  id: string;
  name: string;
  unit?: string | null;
  category?: string | null;
};

type Props = {
  metrics: MetricOption[];
  value: string;
  onChange: (metricId: string) => void;
  className?: string;
};

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
};

export function getMetricIcon(metricId: string, className = "h-4 w-4"): ReactNode {
  switch (metricId) {
    case "median_household_income":
      return <Banknote className={className} aria-hidden />;
    case "median_home_value":
      return <Home className={className} aria-hidden />;
    case "population_total":
      return <Users className={className} aria-hidden />;
    case "unemployment_rate":
      return <Briefcase className={className} aria-hidden />;
    case "median_age":
      return <UserRound className={className} aria-hidden />;
    default:
      return <BarChart3 className={className} aria-hidden />;
  }
}

function getMetricMeta(metric: MetricOption): string {
  const parts = [metric.category, metric.unit].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(" • ") : "State-level metric";
}

export function MetricSelect({ metrics, value, onChange, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const selectedIndex = useMemo(() => metrics.findIndex((metric) => metric.id === value), [metrics, value]);
  const selectedMetric = selectedIndex >= 0 ? metrics[selectedIndex] : metrics[0];

  const getDropdownPosition = (): DropdownPosition | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    };
  };

  const openMenu = (targetIndex: number) => {
    if (!metrics.length) return;
    const nextPosition = getDropdownPosition();
    if (!nextPosition) return;
    const bounded = Math.min(Math.max(targetIndex, 0), metrics.length - 1);
    setActiveIndex(bounded);
    setDropdownPosition(nextPosition);
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const selectByIndex = (index: number) => {
    const next = metrics[index];
    if (!next) return;
    onChange(next.id);
    setActiveIndex(index);
    closeMenu();
    triggerRef.current?.focus();
  };

  const moveActive = (delta: number) => {
    if (!metrics.length) return;
    setActiveIndex((prev) => {
      const current = prev >= 0 && prev < metrics.length ? prev : selectedIndex >= 0 ? selectedIndex : 0;
      return (current + delta + metrics.length) % metrics.length;
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const rootContains = rootRef.current?.contains(target);
      const portalContains = portalRef.current?.contains(target);
      if (!rootContains && !portalContains) {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const nextPosition = getDropdownPosition();
      if (!nextPosition) {
        closeMenu();
        return;
      }
      setDropdownPosition((previous) => {
        if (
          previous &&
          previous.left === nextPosition.left &&
          previous.top === nextPosition.top &&
          previous.width === nextPosition.width
        ) {
          return previous;
        }
        return nextPosition;
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      listboxRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const dropdown =
    isOpen && dropdownPosition && typeof window !== "undefined"
      ? createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              left: dropdownPosition.left,
              top: dropdownPosition.top,
              width: dropdownPosition.width,
              zIndex: 1000,
            }}
          >
            <div
              id={listboxId}
              role="listbox"
              aria-label="Select metric"
              aria-activedescendant={metrics[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
              tabIndex={-1}
              ref={listboxRef}
              onKeyDown={(event) => {
                if (!metrics.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveActive(1);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveActive(-1);
                  return;
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  setActiveIndex(0);
                  return;
                }
                if (event.key === "End") {
                  event.preventDefault();
                  setActiveIndex(metrics.length - 1);
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectByIndex(activeIndex);
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeMenu();
                  triggerRef.current?.focus();
                  return;
                }
                if (event.key === "Tab") {
                  closeMenu();
                }
              }}
              className="max-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm focus:outline-none"
            >
              {metrics.map((metric, index) => {
                const isSelected = metric.id === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={metric.id}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectByIndex(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-900"
                        : isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      {getMetricIcon(metric.id)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{metric.name}</span>
                      <span className="block truncate text-xs text-slate-500">{getMetricMeta(metric)}</span>
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden /> : null}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={className} ref={rootRef}>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          onClick={() => (isOpen ? closeMenu() : openMenu(selectedIndex >= 0 ? selectedIndex : 0))}
          onKeyDown={(event) => {
            if (!metrics.length) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) {
                openMenu(selectedIndex >= 0 ? selectedIndex : 0);
              } else {
                moveActive(event.key === "ArrowDown" ? 1 : -1);
              }
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!isOpen) {
                openMenu(selectedIndex >= 0 ? selectedIndex : 0);
              } else {
                selectByIndex(activeIndex);
              }
            }
            if (event.key === "Escape" && isOpen) {
              event.preventDefault();
              closeMenu();
            }
          }}
          className="group flex w-full items-center justify-between gap-3 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-left shadow-[0_6px_16px_rgba(0,0,0,0.07)] backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Metric</span>
            <span className="mt-0.5 flex min-w-0 items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                {getMetricIcon(selectedMetric?.id ?? "")}
              </span>
              <span className="truncate text-sm font-medium text-slate-900">{selectedMetric?.name ?? "Select metric"}</span>
              {selectedMetric?.category ? (
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
                  {selectedMetric.category}
                </span>
              ) : null}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {dropdown}
      </div>
    </div>
  );
}
