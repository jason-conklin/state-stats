import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function DataSourcesPage() {
  const dataSources = await prisma.dataSource.findMany({
    include: {
      ingestionRuns: {
        where: { status: "success" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
      metrics: true,
    },
    orderBy: { name: "asc" },
  });

  const metrics = await prisma.metric.findMany({
    include: { source: true },
    orderBy: { name: "asc" },
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Data sources</p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-900">Pipelines and providers</h1>
        <p className="max-w-3xl text-slate-600">
          See where each metric originates, when it last ingested, and which metrics are powered by each source.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Sources</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {dataSources.map((source) => {
            const lastRun = source.ingestionRuns[0];
            return (
              <div
                key={source.id}
                id={`source-${source.id}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{source.name}</h3>
                    <p className="text-xs text-slate-500">{source.id}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-blue-700">
                    {source.homepageUrl && (
                      <a href={source.homepageUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        Homepage
                      </a>
                    )}
                    {source.apiDocsUrl && (
                      <a href={source.apiDocsUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        API docs
                      </a>
                    )}
                  </div>
                </div>
                {source.description ? (
                  <p className="text-sm text-slate-700">{source.description}</p>
                ) : (
                  <p className="text-sm text-slate-500">No description provided.</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    Metrics: {source.metrics.length}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Last success: {lastRun?.completedAt ? formatDateTime(lastRun.completedAt) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Metrics</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((metric) => (
                <tr key={metric.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{metric.name}</td>
                  <td className="px-4 py-3 text-slate-700">{metric.category}</td>
                  <td className="px-4 py-3 text-slate-700">{metric.unit}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {metric.source ? (
                      <a
                        className="text-blue-700 hover:underline"
                        href={`#source-${metric.sourceId}`}
                        title={metric.source.name}
                      >
                        {metric.source.name}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {metric.description ?? <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
