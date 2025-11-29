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
        <div className="space-y-4">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-emerald-300">
            ABOUT THE CREATORS
          </h2>
          <p className="text-sm text-slate-700 md:text-slate-300">
            StateStats is built and maintained by two friends who enjoy turning public data into something approachable and useful.
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Jason card */}
          <div className="flex gap-4 rounded-3xl bg-slate-900/70 p-4 sm:p-5">
            <div className="shrink-0">
              <Image
                src="/jason_conklin.png"
                alt="Portrait of Jason Conklin, founder of StateStats"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border border-slate-700 object-cover shadow-md"
              />
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-base font-semibold text-slate-50">
                Jason Conklin
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                Founder of StateStats
              </p>
              <p className="text-xs text-slate-400">
                B.S. Computer Science, New Jersey Institute of Technology (NJIT)
              </p>
              <p className="mt-2 text-slate-200">
                Jason created StateStats to make U.S. state-level data easier to explore, compare, and trust—without needing spreadsheets or complicated tools. He focuses on product design, data visualization, and the overall user experience.
              </p>
              <p className="mt-2 text-slate-200">
                Learn more at{" "}
                <a
                  href="https://jasonconklin.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-300 underline-offset-2 hover:underline"
                >
                  jasonconklin.dev
                </a>
                .
              </p>
            </div>
          </div>

          {/* Wesley card */}
          <div className="flex gap-4 rounded-3xl bg-slate-900/70 p-4 sm:p-5">
            <div className="shrink-0">
              <Image
                src="/wesley_wright.png"
                alt="Portrait of Wesley Wright, co-founder of StateStats"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border border-slate-700 object-cover shadow-md"
              />
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-base font-semibold text-slate-50">
                Wesley Wright
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                Co-Founder of StateStats
              </p>
              <p className="text-xs text-slate-400">
                B.S. Computer Science, University of North Carolina at Charlotte
              </p>
              <p className="mt-2 text-slate-200">
                Wesley helps shape the data model, backend infrastructure, and long-term roadmap. He’s passionate about building reliable systems that make complex data feel simple and fast for everyday users.
              </p>
              <p className="mt-2 text-slate-200">
                Learn more at{" "}
                <a
                  href="https://wesleywright.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-300 underline-offset-2 hover:underline"
                >
                  wesleywright.dev
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
      </section>
    </main>
  );
}
