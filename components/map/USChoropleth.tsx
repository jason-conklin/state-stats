'use client';

import { geoAlbersUsa, geoPath, GeoPermissibleObjects } from "d3-geo";
import { Feature, Geometry } from "geojson";
import { useMemo } from "react";
import { NEUTRAL_COLOR } from "@/lib/mapScales";

type Props = {
  features: Feature<Geometry, { stateId?: string; name?: string; abbreviation?: string }>[];
  valuesByStateId: Record<string, number | null>;
  colorScale: (value: number | null) => string;
  onHover: (stateId: string | null, position?: { x: number; y: number }) => void;
  onClick: (stateId: string) => void;
  selectedYear: number;
};

export function USChoropleth({
  features,
  valuesByStateId,
  colorScale,
  onHover,
  onClick,
  selectedYear,
}: Props) {
  const { path, projection } = useMemo(() => {
    const projection = geoAlbersUsa().scale(1200).translate([480, 280]);
    const path = geoPath(projection);
    return { path, projection };
  }, []);

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

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-slate-50">
      <svg
        viewBox="0 0 960 560"
        role="img"
        aria-label={`Choropleth map of U.S. states for year ${selectedYear}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect width="100%" height="100%" fill="#f8fafc" />
        {features.map((feat) => {
          const stateId = (feat.id as string) ?? feat.properties?.stateId ?? "";
          const value = valuesByStateId[stateId] ?? null;
          const fill = colorScale(value);
          const d = path(feat) ?? undefined;

          return (
            <path
              key={stateId}
              d={d}
              fill={fill}
              stroke="#fff"
              strokeWidth={1}
              onMouseEnter={handleMouseEnter(stateId)}
              onMouseMove={handleMouseEnter(stateId)}
              onMouseLeave={handleMouseEnter(null)}
              onClick={() => onClick(stateId)}
              className="cursor-pointer transition-[fill] duration-200 ease-out"
              tabIndex={0}
              aria-label={`${feat.properties?.name ?? stateId}: ${value ?? "No data"}`}
            >
              <title>{feat.properties?.name ?? stateId}</title>
            </path>
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
