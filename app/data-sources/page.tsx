import { dataSources } from "@/lib/metrics";

export default function DataSourcesPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Data sources
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Pipelines and providers</h1>
        <p className="max-w-3xl text-slate-600">
          StateStats tracks every upstream provider for provenance. Below is the catalog
          we have scaffolded so far.
        </p>
      </div>
      <div className="grid gap-4">
        {dataSources.map((source) => (
          <div key={source.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{source.name}</h2>
                <p className="text-sm text-slate-500">{source.id}</p>
              </div>
              <div className="flex gap-3 text-sm">
                {source.homepageUrl && (
                  <a
                    className="text-blue-700 hover:underline"
                    href={source.homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Homepage
                  </a>
                )}
                {source.apiDocsUrl && (
                  <a
                    className="text-blue-700 hover:underline"
                    href={source.apiDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    API docs
                  </a>
                )}
              </div>
            </div>
            {source.description && <p className="mt-2 text-sm text-slate-600">{source.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
