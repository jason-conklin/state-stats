import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StateStats - About",
};

export default function AboutPage() {
  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <section className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About</p>
          <h1 className="text-3xl font-semibold text-slate-900">Why StateStats exists</h1>
          <p className="max-w-3xl text-slate-600">
            StateStats helps users explore U.S. state-level data over time through interactive maps and
            comparison charts. The goal is to keep public data accessible, explorable, and transparent.
          </p>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Scope</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>U.S.-only: 50 states + District of Columbia.</li>
            <li>Data from public sources (e.g., Census ACS).</li>
            <li>Time-series focus to show change over years.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Caveats</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Values may include sampling error (e.g., ACS margins of error).</li>
            <li>Coverage can vary by metric and year; missing data is shown as “No data”.</li>
            <li>Updates follow the cadence of the upstream source.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">How to use StateStats</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal pl-4">
          <li>Select a metric on the Map page to color states by value.</li>
          <li>Hover a state to see its value and ranking for the selected year.</li>
          <li>Click “Add to Compare” to jump into the Graph page and analyze trends.</li>
          <li>Toggle normalization to compare relative changes over time.</li>
        </ol>
      </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">About the creator</h2>
          <p className="mt-2 text-sm text-slate-700">
            Placeholder bio: This section will introduce the creator, motivation for building StateStats,
            and ways to get in touch. Content coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
