"use client";

export const ROUTE_TRANSITION_START_EVENT = "statestats:route-transition-start";

export function startRouteTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ROUTE_TRANSITION_START_EVENT));
}
