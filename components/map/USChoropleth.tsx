'use client';

import { geoAlbersUsa, geoPath, GeoPermissibleObjects } from "d3-geo";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { NEUTRAL_COLOR } from "@/lib/mapScales";

type Props = {
  features: Feature<Geometry, { stateId?: string; name?: string; abbreviation?: string }>[];
  valuesByStateId: Record<string, number | null>;
  colorScale: (value: number | null) => string;
  onHover: (stateId: string | null, position?: { x: number; y: number }) => void;
  onClick: (stateId: string) => void;
  selectedYear: number;
  hoveredStateId?: string | null;
  pinnedStateId?: string | null;
};

export function USChoropleth({
  features,
  valuesByStateId,
  colorScale,
  onHover,
  onClick,
  selectedYear,
  hoveredStateId,
  pinnedStateId,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState({ width: 960, height: 560 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateSize = () => {
      const rect = svg.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setViewport((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const { path, projection } = useMemo(() => {
    const projection = geoAlbersUsa();
    const { width, height } = viewport;
    const padding = Math.max(12, Math.min(24, Math.round(Math.min(width, height) * 0.03)));
    const fallbackProjection = () =>
      projection.scale(Math.min(width, height) * 2.15).translate([Math.round(width / 2), Math.round(height / 2)]);

    if (!features.length) {
      fallbackProjection();
    } else {
      try {
        const collection = { type: "FeatureCollection", features } as FeatureCollection<Geometry>;
        projection.fitExtent(
          [
            [padding, padding],
            [Math.max(padding + 1, width - padding), Math.max(padding + 1, height - padding)],
          ],
          collection as unknown as GeoPermissibleObjects,
        );
      } catch {
        fallbackProjection();
      }
    }

    const path = geoPath(projection);
    return { path, projection };
  }, [features, viewport]);

  // If the projection failed to initialize, don't render.
  if (!projection) {
    return null;
  }

  const handleMouseEnter = (stateId: string | null) => (event: React.MouseEvent<SVGPathElement>) => {
    const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement)?.getBoundingClientRect();
    const position = rect
      ? {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
      : undefined;
    onHover(stateId, position);
  };

  const preserveAspectRatio = viewport.width < 640 ? "xMidYMin meet" : "xMidYMid meet";

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        role="img"
        aria-label={`Choropleth map of U.S. states for year ${selectedYear}`}
        className="h-full w-full"
        preserveAspectRatio={preserveAspectRatio}
      >
        <rect width="100%" height="100%" fill="transparent" />
        {features.map((feat) => {
          const stateId = (feat.id as string) ?? feat.properties?.stateId ?? "";
          const value = valuesByStateId[stateId] ?? null;
          const fill = colorScale(value);
          const d = path(feat) ?? undefined;
          const isHighlighted = stateId === hoveredStateId || stateId === pinnedStateId;

          return (
            <path
              key={stateId}
              d={d}
              fill={fill}
              stroke={isHighlighted ? "#ffffff" : "#e1e7ea"}
              strokeWidth={isHighlighted ? 1.5 : 0.7}
              onMouseEnter={handleMouseEnter(stateId)}
              onMouseMove={handleMouseEnter(stateId)}
              onMouseLeave={handleMouseEnter(null)}
              onClick={() => onClick(stateId)}
              className="cursor-pointer transition-[fill] duration-200 ease-out"
              tabIndex={0}
              role="button"
              aria-label={`${feat.properties?.name ?? stateId}: ${value ?? "No data"}`}
            />
          );
        })}
        <path
          d={path({ type: "Sphere" } as GeoPermissibleObjects) ?? undefined}
          fill="none"
          stroke={NEUTRAL_COLOR}
          strokeWidth={0.5}
        />
      </svg>
    </div>
  );
}
