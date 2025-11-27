import { GraphExplorer } from "@/components/graph/GraphExplorer";
import { prisma } from "@/lib/db";
import { states as stateList } from "@/lib/states";

type QueryParams = { [key: string]: string | string[] | undefined };

const DEFAULT_STATE_ABBRS = ["CA", "TX", "NY", "FL"];

function normalizeStateIds(param: string | string[] | undefined) {
  const values = Array.isArray(param) ? param.join(",") : param ?? "";
  const codes = values
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

  const ids = codes
    .map((code) => {
      const match =
        stateList.find((state) => state.abbreviation.toUpperCase() === code) ??
        stateList.find((state) => state.id === code);
      return match?.id;
    })
    .filter(Boolean) as string[];

  return Array.from(new Set(ids));
}

async function loadMetricData(metricId: string) {
  const metric = await prisma.metric.findUnique({
    where: { id: metricId },
    include: { source: true },
  });
  if (!metric) return null;

  const observations = await prisma.observation.findMany({
    where: { metricId },
    select: { stateId: true, year: true, value: true },
    orderBy: [{ year: "asc" }],
  });

  const years = Array.from(new Set(observations.map((o) => o.year))).sort((a, b) => a - b);

  const seriesMap = new Map<
    string,
    { stateId: string; stateName: string; points: { year: number; value: number | null }[] }
  >();

  observations.forEach((obs) => {
    if (!seriesMap.has(obs.stateId)) {
      const match = stateList.find((state) => state.id === obs.stateId);
      seriesMap.set(obs.stateId, {
        stateId: obs.stateId,
        stateName: match?.name ?? obs.stateId,
        points: [],
      });
    }
    const entry = seriesMap.get(obs.stateId);
    if (entry) {
      entry.points.push({ year: obs.year, value: obs.value });
    }
  });

  return {
    metric: {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      description: metric.description,
      sourceName: metric.source?.name ?? null,
    },
    availableYears: years,
    series: Array.from(seriesMap.values()),
  };
}

type GraphPageProps = { searchParams?: Promise<QueryParams> | QueryParams };

export default async function GraphPage(props: GraphPageProps) {
  try {
    const resolvedParams = (await Promise.resolve(props.searchParams)) ?? {};
    const params: QueryParams = resolvedParams;
    const getStringParam = (key: string): string | undefined => {
      const val = params[key];
      if (typeof val === "string") return val;
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") return val[0];
      return undefined;
    };

    const metrics = await prisma.metric.findMany({ orderBy: { name: "asc" } });
    const fallbackMetricId =
      metrics.find((m) => m.id === "median_household_income")?.id ??
      metrics.find((m) => m.isDefault)?.id ??
      metrics[0]?.id;
    const metricParam = getStringParam("metric");
    const requestedMetric = typeof metricParam === "string" ? metricParam : undefined;
    const selectedMetricId = metrics.find((m) => m.id === requestedMetric)?.id ?? fallbackMetricId;

    if (!selectedMetricId) {
      return (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Compare states over time</h1>
          <p className="text-slate-600">No metrics are available. Please ingest data first.</p>
        </section>
      );
    }

    const metricData = await loadMetricData(selectedMetricId);

    const availableYears = metricData?.availableYears ?? [];
    const defaultStart = availableYears[0] ?? new Date().getFullYear();
    const defaultEnd = availableYears[availableYears.length - 1] ?? defaultStart;

    const statesParam = getStringParam(params.states);
    const requestedStates = normalizeStateIds(typeof statesParam === "string" ? statesParam : undefined);
    const defaultStates = DEFAULT_STATE_ABBRS.map(
      (abbr) => stateList.find((s) => s.abbreviation === abbr)?.id,
    ).filter(Boolean) as string[];
    const selectedStates = requestedStates.length > 0 ? requestedStates : defaultStates;

    const startYearParamRaw = getStringParam(params.startYear);
    const endYearParamRaw = getStringParam(params.endYear);
    const startYearParam = startYearParamRaw ? Number(startYearParamRaw) : undefined;
    const endYearParam = endYearParamRaw ? Number(endYearParamRaw) : undefined;

    const startYear =
      startYearParam && availableYears.includes(startYearParam) ? startYearParam : defaultStart;
    const endYear =
      endYearParam && availableYears.includes(endYearParam) ? endYearParam : defaultEnd;

    const modeParam = getStringParam(params.mode);
    const normalization = modeParam === "indexed" ? "indexed" : "raw";

    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Compare
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900">
            Compare states over time
          </h1>
          <p className="text-slate-600">
            Select a metric, pick states, and explore trends across years. Use indexed mode to
            compare relative changes.
          </p>
        </div>
        <GraphExplorer
          metrics={metrics.map((m) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            description: m.description,
          }))}
          states={stateList}
          initialMetricId={selectedMetricId}
          initialSelectedStates={selectedStates}
          availableYears={availableYears}
          initialYearRange={{ start: startYear, end: endYear }}
          initialNormalization={normalization === "indexed" ? "indexed" : "raw"}
          initialSeries={metricData?.series ?? []}
        />
      </section>
    );
  } catch (error) {
    console.error("Graph page error:", error);
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Compare states over time</h1>
        <p className="text-slate-600">Unable to load data for this view. Please try again later.</p>
      </section>
    );
  }
}
