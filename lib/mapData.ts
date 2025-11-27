import { Feature, Geometry, FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import { states as stateList } from "./states";
import type { Topology } from "topojson-specification";

// Import the TopoJSON for US states and convert to GeoJSON features once at module load.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - us-atlas does not ship TypeScript types for the JSON payload.
import usStatesTopo from "us-atlas/states-10m.json" assert { type: "json" };

// Relax the Topology typing to avoid strict GeoJSON generic constraints from us-atlas.
const topology = usStatesTopo as unknown as Topology;

const rawFeatures = (
  feature(topology, "states") as unknown as FeatureCollection<Geometry>
).features;

// Attach state metadata (name, abbreviation, id) from our canonical list.
const featuresWithMetadata: Feature<Geometry, { stateId: string; name?: string; abbreviation?: string }>[] =
  rawFeatures.map((feat) => {
    const stateId = String(feat.id ?? "").padStart(2, "0");
    const match = stateList.find((state) => state.id === stateId);

    return {
      ...feat,
      id: stateId,
      properties: {
        stateId,
        name: match?.name,
        abbreviation: match?.abbreviation,
      },
    };
  });

export function getUSStateFeatures() {
  // Return a shallow copy to avoid accidental mutations downstream.
  return featuresWithMetadata.map((feat) => ({ ...feat }));
}
