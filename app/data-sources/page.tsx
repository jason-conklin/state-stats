import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "StateStats - Data Sources",
};

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
    <main className="h-full w-full overflow-y-auto bg-sky-50 px-4 py-8 md:bg-slate-950 md:px-8 md:py-12">
      <section className="space-y-4 md:space-y-8">
        <div className="space-y-1 md:space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Data sources</p>
          <h1 className="text-2xl md:text-3xl font-semibold leading-tight text-slate-900 md:text-white">Pipelines and providers</h1>
          <p className="max-w-3xl text-sm text-slate-700 md:text-slate-300">
            See where each metric originates, when it last ingested, and which metrics are powered by each source.
          </p>
        </div>

        <div className="space-y-3 md:space-y-4">
          <h2 className="text-lg md:text-xl font-semibold text-slate-900 md:text-white">Sources</h2>
          <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
            {dataSources.map((source) => {
              const lastRun = source.ingestionRuns[0];
              return (
                <div
                  key={source.id}
                  id={`source-${source.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 md:bg-slate-900 md:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-slate-900 md:text-white">{source.name}</h3>
                      <p className="text-xs text-slate-500 md:text-slate-400">{source.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-[color:var(--ss-green)]">
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
                  <p className="text-sm text-slate-700 md:text-slate-300">
                    {source.description ?? "No description provided."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 md:text-slate-400">
                    <span className="rounded-full bg-[color:var(--ss-green-light)] px-3 py-1 text-[color:var(--ss-green-dark)]">
                      Metrics: {source.metrics.length}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 md:bg-slate-800 md:text-slate-200">
                      Last success: {lastRun?.completedAt ? formatDateTime(lastRun.completedAt) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      <div className="space-y-3 md:space-y-4">
        <h2 className="text-lg md:text-xl font-semibold text-slate-900 md:text-white">Metrics</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:bg-slate-900 md:border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 md:bg-slate-800 md:text-slate-200">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 md:divide-slate-800">
              {metrics.map((metric) => (
                <tr key={metric.id} className="hover:bg-slate-50 md:hover:bg-slate-800">
                  <td className="px-4 py-3 font-semibold text-slate-900 md:text-white">{metric.name}</td>
                  <td className="px-4 py-3 text-slate-700 md:text-slate-300">{metric.category}</td>
                  <td className="px-4 py-3 text-slate-700 md:text-slate-300">{metric.unit}</td>
                  <td className="px-4 py-3 text-slate-700 md:text-slate-300">
                    {metric.source ? (
                      <a
                        className="text-[color:var(--ss-green)] hover:underline"
                        href={`#source-${metric.sourceId}`}
                        title={metric.source.name}
                      >
                        {metric.source.name}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 md:text-slate-300">
                    {metric.description ?? <span className="text-slate-400 md:text-slate-500">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    </main>
  );
}
