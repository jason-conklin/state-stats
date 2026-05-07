"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StateStatsLoader } from "./StateStatsLoader";
import { ROUTE_TRANSITION_START_EVENT } from "./routeTransition";

const MIN_DISPLAY_MS = 360;
const SAFETY_TIMEOUT_MS = 4000;

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const hasMountedRef = useRef(false);
  const isTransitionActiveRef = useRef(false);
  const startedAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.toString();
  const routeKey = search ? `${pathname}?${search}` : pathname;

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const hideLoader = () => {
      isTransitionActiveRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }

      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, remaining);
    };

    const showLoader = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

      startedAtRef.current = Date.now();
      isTransitionActiveRef.current = true;
      setAnimationKey((current) => current + 1);
      setVisible(true);

      safetyTimerRef.current = setTimeout(() => {
        isTransitionActiveRef.current = false;
        setVisible(false);
        safetyTimerRef.current = null;
      }, SAFETY_TIMEOUT_MS);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const nextKey = `${nextUrl.pathname}${nextUrl.search}`;
      const currentKey = `${currentUrl.pathname}${currentUrl.search}`;

      if (nextUrl.origin !== currentUrl.origin || nextKey === currentKey) return;
      showLoader();
    };

    const handlePopState = () => {
      showLoader();
    };

    document.addEventListener("click", handleDocumentClick);
    window.addEventListener(ROUTE_TRANSITION_START_EVENT, showLoader as EventListener);
    window.addEventListener("popstate", handlePopState);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
    } else if (isTransitionActiveRef.current) {
      hideLoader();
    }

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener(ROUTE_TRANSITION_START_EVENT, showLoader as EventListener);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [routeKey]);

  return <StateStatsLoader key={animationKey} visible={visible} />;
}
