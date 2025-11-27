export default function AboutPage() {
  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About</p>
      <h1 className="text-2xl font-semibold text-slate-900">StateStats roadmap</h1>
      <p className="max-w-3xl text-slate-600">
        StateStats is a state-level statistics explorer built with Next.js, Prisma, and
        PostgreSQL. This first cut focuses on solid data modeling, ingestion plumbing, and
        navigation. Next steps are interactive maps, time-series charts, and richer data
        export options.
      </p>
    </section>
  );
}
