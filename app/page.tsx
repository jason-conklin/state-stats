import { MapExplorer } from "@/components/map/MapExplorer";
import { prisma } from "@/lib/db";
import { getUSStateFeatures } from "@/lib/mapData";
import { states as stateList } from "@/lib/states";

type MetricData = {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  sourceName?: string | null;
  category?: string | null;
  isDefault?: boolean | null;
  years: number[];
  dataByYear: Record<number, Record<string, number | null>>;
  minValue: number | null;
  maxValue: number | null;
};

async function loadMapData() {
  const metrics = await prisma.metric.findMany({
    include: { source: true },
    orderBy: { name: "asc" },
  });

  const metricIds = metrics.map((m) => m.id);
  const observations = await prisma.observation.findMany({
    where: { metricId: { in: metricIds } },
    select: { metricId: true, stateId: true, year: true, value: true },
  });

  const metricData: Record<string, MetricData> = {};
  metrics.forEach((metric) => {
    metricData[metric.id] = {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      description: metric.description,
      sourceName: metric.source?.name ?? null,
      category: metric.category,
      isDefault: metric.isDefault,
      years: [],
      dataByYear: {},
      minValue: null,
      maxValue: null,
    };
  });

  observations.forEach((obs) => {
    const metric = metricData[obs.metricId];
    if (!metric) return;

    const yearBucket = metric.dataByYear[obs.year] ?? {};
    yearBucket[obs.stateId] = typeof obs.value === "number" ? obs.value : Number(obs.value);
    metric.dataByYear[obs.year] = yearBucket;

    // Track min/max
    const numericValue = yearBucket[obs.stateId];
    if (numericValue !== null && numericValue !== undefined && !Number.isNaN(numericValue)) {
      metric.minValue = metric.minValue === null ? numericValue : Math.min(metric.minValue, numericValue);
      metric.maxValue = metric.maxValue === null ? numericValue : Math.max(metric.maxValue, numericValue);
    }
  });

  // Finalize year arrays
  Object.values(metricData).forEach((metric) => {
    const years = Object.keys(metric.dataByYear)
      .map((year) => Number(year))
      .sort((a, b) => a - b);
    metric.years = years;
  });

  const defaultMetricId =
    metricData["median_household_income"]?.id ??
    metrics.find((m) => m.isDefault)?.id ??
    metrics[0]?.id ??
    "median_household_income";
  const defaultYear = metricData[defaultMetricId]?.years[metricData[defaultMetricId].years.length - 1] ?? new Date().getFullYear();

  return {
    metrics: Object.values(metricData),
    defaultMetricId,
    defaultYear,
  };
}

export default async function Home() {
  const { metrics, defaultMetricId, defaultYear } = await loadMapData();
  const features = getUSStateFeatures();

  return (
    <section className="-mt-2">
      <MapExplorer
        metrics={metrics}
        defaultMetricId={defaultMetricId}
        defaultYear={defaultYear}
        states={stateList}
        features={features}
      />
    </section>
  );
}
