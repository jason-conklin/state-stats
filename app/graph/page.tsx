export default function GraphPage() {
  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Graph (placeholder)
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Time-series explorer</h1>
      <p className="max-w-2xl text-slate-600">
        This page will host metric comparisons over time. Once the ingestion pipeline is
        live, we will surface line charts, comparisons, and export utilities here.
      </p>
    </section>
  );
}
