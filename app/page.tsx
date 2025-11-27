export default function Home() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Map (placeholder)
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-900">
          Visualize state-level metrics across the U.S.
        </h1>
        <p className="max-w-3xl text-base text-slate-600">
          This page will host the interactive choropleth map. For now, it is a simple
          landing spot while we wire up the backend, ingestion pipeline, and shared data
          definitions.
        </p>
      </div>
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">What&apos;s coming</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-600">
          <li>Choropleth and hover tooltips powered by d3-geo + topojson-client</li>
          <li>Metric selector with defaults from our Prisma-backed catalog</li>
          <li>Live data refreshed by the ingestion pipeline</li>
        </ul>
      </div>
    </section>
  );
}
