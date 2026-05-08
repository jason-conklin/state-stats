import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "StateStats - About",
};

export default function AboutPage() {
  return (
    <main className="min-h-full w-full overflow-y-auto bg-slate-950 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-[0_20px_50px_rgba(15,23,42,0.35)]">
          <div className="relative">
            <Image
              src="/statestats-banner.png"
              alt="StateStats banner showing the StateStats logo and a U.S. data map"
              width={2475}
              height={793}
              priority
              className="h-auto w-full"
              sizes="(max-width: 1280px) 100vw, 1200px"
            />
            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                About StateStats
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
                State-level data, made clear.
              </h1>
              <p className="mt-2 hidden max-w-2xl text-sm text-slate-200/90 sm:block md:text-base">
                Explore public metrics across states, years, and trends through an interface built to
                make comparison fast and interpretation clear.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">About</p>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Why StateStats exists</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">
            StateStats helps users explore U.S. state-level data over time through interactive maps and
            comparison charts. The goal is to keep public data accessible, explorable, and transparent.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.22)] md:p-6">
            <h3 className="text-lg font-semibold text-white">Scope</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
              <li>U.S.-only: 50 states + District of Columbia.</li>
              <li>Data from public sources such as Census ACS and BLS.</li>
              <li>Time-series views designed to show how states change over years.</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.22)] md:p-6">
            <h3 className="text-lg font-semibold text-white">Caveats</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
              <li>Values may include sampling error, especially for ACS-based metrics.</li>
              <li>Coverage can vary by metric and year; missing values are shown as “No data”.</li>
              <li>Updates follow the cadence and availability of the upstream source.</li>
            </ul>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.22)] md:p-6">
          <h3 className="text-lg font-semibold text-white">How to use StateStats</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
            <li>Select a metric on the Map page to color states by value.</li>
            <li>Hover a state to see its value and ranking for the selected year.</li>
            <li>Click “Add to compare” to jump into the Graph page and analyze trends.</li>
            <li>Toggle normalization to compare relative changes over time.</li>
          </ol>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.22)] md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex justify-center sm:justify-start">
              <Image
                src="/jason_conklin.png"
                alt="Portrait of Jason Conklin, creator of StateStats"
                width={112}
                height={112}
                className="h-28 w-28 rounded-full border border-white/10 object-cover shadow-md"
                priority
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                About the creator
              </p>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Built by</p>
              <div>
                <p className="text-lg font-semibold text-slate-50">Jason Conklin</p>
                <p className="text-sm text-slate-300">Creator of StateStats</p>
                <p className="text-sm text-slate-400">
                  B.S. Computer Science, New Jersey Institute of Technology (NJIT)
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-200">
            <p>
              I created StateStats to make U.S. state-level data easier to explore, compare, and
              trust without needing spreadsheets or complicated tools. I enjoy combining clean design
              with public data so students, journalists, and policy-curious citizens can quickly see
              how states differ over time.
            </p>
            <p>
              My goal is to keep this site clear, transparent, and genuinely useful as new metrics and
              years of data are added.
            </p>
            <p>
              Learn more about Jason at{" "}
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
        </section>
      </div>
    </main>
  );
}
