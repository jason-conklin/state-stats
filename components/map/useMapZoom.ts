"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent } from "react";

export type MapTransform = {
  scale: number;
  x: number;
  y: number;
};

type UseMapZoomOptions = {
  containerRef: RefObject<HTMLElement | null>;
  minScale?: number;
  maxScale?: number;
};

const DEFAULT_TRANSFORM: MapTransform = {
  scale: 1,
  x: 0,
  y: 0,
};

const ZOOM_EPSILON = 0.01;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isZeroLike(value: number): boolean {
  return Math.abs(value) <= 0.5;
}

function clampTransform(transform: MapTransform, width: number, height: number, minScale: number, maxScale: number): MapTransform {
  const nextScale = clamp(transform.scale, minScale, maxScale);

  if (nextScale <= minScale + ZOOM_EPSILON) {
    return DEFAULT_TRANSFORM;
  }

  const minX = width * (1 - nextScale);
  const minY = height * (1 - nextScale);

  return {
    scale: nextScale,
    x: clamp(transform.x, minX, 0),
    y: clamp(transform.y, minY, 0),
  };
}

function getContainerSize(container: HTMLElement | null): { width: number; height: number } | null {
  if (!container) return null;
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  return { width, height };
}

export function useMapZoom({ containerRef, minScale = 1, maxScale = 4.5 }: UseMapZoomOptions) {
  const [transform, setTransform] = useState<MapTransform>(DEFAULT_TRANSFORM);
  const [isPanning, setIsPanning] = useState(false);
  const [hasFinePointer, setHasFinePointer] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const transformRef = useRef<MapTransform>(DEFAULT_TRANSFORM);
  const frameRef = useRef<number | null>(null);
  const panRef = useRef({
    isActive: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    dragDistance: 0,
    suppressClickUntil: 0,
  });

  const commitTransform = useCallback(
    (next: MapTransform) => {
      const size = getContainerSize(containerRef.current);
      const bounded = size ? clampTransform(next, size.width, size.height, minScale, maxScale) : next;
      transformRef.current = bounded;
      setTransform(bounded);
    },
    [containerRef, maxScale, minScale],
  );

  const cancelAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target: MapTransform) => {
      cancelAnimation();

      if (prefersReducedMotion) {
        commitTransform(target);
        return;
      }

      const start = transformRef.current;
      const startedAt = performance.now();
      const duration = 180;

      const tick = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        commitTransform({
          scale: start.scale + (target.scale - start.scale) * eased,
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
        });

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
          return;
        }

        frameRef.current = null;
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [cancelAnimation, commitTransform, prefersReducedMotion],
  );

  const reset = useCallback(() => {
    const current = transformRef.current;
    if (current.scale <= minScale + ZOOM_EPSILON && isZeroLike(current.x) && isZeroLike(current.y)) {
      return;
    }
    animateTo(DEFAULT_TRANSFORM);
  }, [animateTo, minScale]);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      if (!hasFinePointer) return;

      event.preventDefault();
      cancelAnimation();

      const rect = event.currentTarget.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const current = transformRef.current;
      const factor = Math.exp(-event.deltaY * 0.0015);
      const nextScale = clamp(current.scale * factor, minScale, maxScale);

      const worldX = (mouseX - current.x) / current.scale;
      const worldY = (mouseY - current.y) / current.scale;
      const next = clampTransform(
        {
          scale: nextScale,
          x: mouseX - worldX * nextScale,
          y: mouseY - worldY * nextScale,
        },
        rect.width,
        rect.height,
        minScale,
        maxScale,
      );

      if (
        Math.abs(next.scale - current.scale) < 0.001 &&
        Math.abs(next.x - current.x) < 0.5 &&
        Math.abs(next.y - current.y) < 0.5
      ) {
        return;
      }

      transformRef.current = next;
      setTransform(next);
    },
    [cancelAnimation, hasFinePointer, maxScale, minScale],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!hasFinePointer || transformRef.current.scale <= minScale + ZOOM_EPSILON || event.button !== 0) {
        return;
      }

      cancelAnimation();
      panRef.current.isActive = true;
      panRef.current.pointerId = event.pointerId;
      panRef.current.lastX = event.clientX;
      panRef.current.lastY = event.clientY;
      panRef.current.dragDistance = 0;
      panRef.current.suppressClickUntil = 0;
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [cancelAnimation, hasFinePointer, minScale],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!panRef.current.isActive || panRef.current.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - panRef.current.lastX;
      const dy = event.clientY - panRef.current.lastY;
      panRef.current.lastX = event.clientX;
      panRef.current.lastY = event.clientY;
      panRef.current.dragDistance += Math.hypot(dx, dy);

      const rect = event.currentTarget.getBoundingClientRect();
      const next = clampTransform(
        {
          scale: transformRef.current.scale,
          x: transformRef.current.x + dx,
          y: transformRef.current.y + dy,
        },
        rect.width,
        rect.height,
        minScale,
        maxScale,
      );

      transformRef.current = next;
      setTransform(next);
      event.preventDefault();
    },
    [maxScale, minScale],
  );

  const endPan = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (!panRef.current.isActive || panRef.current.pointerId !== event.pointerId) {
      return;
    }

    panRef.current.isActive = false;
    panRef.current.pointerId = -1;
    panRef.current.suppressClickUntil = panRef.current.dragDistance > 6 ? performance.now() + 250 : 0;
    setIsPanning(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const consumeClickSuppressed = useCallback(() => {
    const shouldSuppress = performance.now() < panRef.current.suppressClickUntil;
    panRef.current.suppressClickUntil = 0;
    return shouldSuppress;
  }, []);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const legacyPointerQuery = pointerQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const legacyMotionQuery = motionQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    const updateQueries = () => {
      setHasFinePointer(pointerQuery.matches);
      setPrefersReducedMotion(motionQuery.matches);
    };

    updateQueries();
    if (typeof pointerQuery.addEventListener === "function") {
      pointerQuery.addEventListener("change", updateQueries);
      motionQuery.addEventListener("change", updateQueries);
    } else if (legacyPointerQuery.addListener && legacyMotionQuery.addListener) {
      legacyPointerQuery.addListener(updateQueries);
      legacyMotionQuery.addListener(updateQueries);
    }

    return () => {
      if (typeof pointerQuery.removeEventListener === "function") {
        pointerQuery.removeEventListener("change", updateQueries);
        motionQuery.removeEventListener("change", updateQueries);
      } else if (legacyPointerQuery.removeListener && legacyMotionQuery.removeListener) {
        legacyPointerQuery.removeListener(updateQueries);
        legacyMotionQuery.removeListener(updateQueries);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const current = transformRef.current;
      if (current.scale <= minScale + ZOOM_EPSILON && isZeroLike(current.x) && isZeroLike(current.y)) {
        return;
      }
      commitTransform(current);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [commitTransform, containerRef, minScale]);

  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  return {
    transform,
    hasFinePointer,
    isPanning,
    isZoomed: transform.scale > minScale + ZOOM_EPSILON || !isZeroLike(transform.x) || !isZeroLike(transform.y),
    reset,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: endPan,
    handlePointerCancel: endPan,
    consumeClickSuppressed,
  };
}
