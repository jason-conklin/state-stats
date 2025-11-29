import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "StateStats - About",
};

export default function AboutPage() {
  return (
    <main className="h-full w-full overflow-y-auto bg-sky-50 px-4 py-8 md:bg-slate-950 md:px-8 md:py-12">
      <section className="space-y-4 md:space-y-8">
        <div className="space-y-1 md:space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 md:text-white">Why StateStats exists</h1>
          <p className="max-w-3xl text-sm text-slate-700 md:text-slate-300">
            StateStats helps users explore U.S. state-level data over time through interactive maps and
            comparison charts. The goal is to keep public data accessible, explorable, and transparent.
          </p>
        </div>

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 md:bg-slate-900 md:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 md:text-white">Scope</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-700 md:text-slate-300">
            <li>U.S.-only: 50 states + District of Columbia.</li>
            <li>Data from public sources (e.g., Census ACS).</li>
            <li>Time-series focus to show change over years.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 md:bg-slate-900 md:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 md:text-white">Caveats</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-700 md:text-slate-300">
            <li>Values may include sampling error (e.g., ACS margins of error).</li>
            <li>Coverage can vary by metric and year; missing data is shown as “No data”.</li>
            <li>Updates follow the cadence of the upstream source.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 md:bg-slate-900 md:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 md:text-white">How to use StateStats</h2>
        <ol className="mt-2 space-y-2 text-sm text-slate-700 list-decimal pl-4 md:text-slate-300">
          <li>Select a metric on the Map page to color states by value.</li>
          <li>Hover a state to see its value and ranking for the selected year.</li>
          <li>Click “Add to Compare” to jump into the Graph page and analyze trends.</li>
          <li>Toggle normalization to compare relative changes over time.</li>
        </ol>
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 md:bg-slate-900 md:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex justify-center sm:justify-start">
            <Image
              src="/jason_conklin.png"
              alt="Portrait of Jason Conklin, creator of StateStats"
              width={112}
              height={112}
              className="h-28 w-28 rounded-full border border-slate-200 md:border-slate-700 object-cover shadow-md"
              priority
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-emerald-600 md:text-emerald-300">
              ABOUT THE CREATOR
            </h2>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500 md:text-slate-300">
              Built by
            </p>
            <div>
              <p className="text-lg font-semibold text-slate-900 md:text-slate-50">
                Jason Conklin
              </p>
              <p className="text-sm text-slate-700 md:text-slate-300">
                Creator of StateStats
              </p>
              <p className="text-sm text-slate-600 md:text-slate-400">
                B.S. Computer Science, New Jersey Institute of Technology (NJIT)
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700 md:text-slate-200">
          <p>
            I created StateStats to make U.S. state-level data easier to explore, compare, and trust—without needing spreadsheets or complicated tools. I enjoy combining clean design with public data so that students, journalists, and policy-curious citizens can quickly see how states differ over time.
          </p>
          <p>
            My goal is to keep this site clear, transparent, and genuinely useful as new metrics and years of data are added.
          </p>
          <p>
            Learn more about Jason at{" "}
            <a
              href="https://jasonconklin.dev"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-600 md:text-emerald-300 underline-offset-2 hover:underline"
            >
              jasonconklin.dev
            </a>
            .
          </p>
        </div>
      </section>
      </section>
    </main>
  );
}
