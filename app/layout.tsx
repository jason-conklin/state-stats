import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLatestSuccessfulIngestion } from "@/lib/ingestion";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const navLinks = [
  { href: "/", label: "Map" },
  { href: "/graph", label: "Graph" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/about", label: "About" },
];

export const metadata: Metadata = {
  title: "StateStats",
  description: "Explore U.S. state-level metrics with maps, charts, and data downloads.",
};

// Disable static prerendering so database lookups occur only at runtime.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const latestIngestion = await getLatestSuccessfulIngestion();
  const lastUpdatedLabel = latestIngestion?.completedAt
    ? formatDateTime(latestIngestion.completedAt)
    : "—";
  const defaultMetric =
    (await prisma.metric.findFirst({ where: { isDefault: true } })) ??
    (await prisma.metric.findFirst({ orderBy: { name: "asc" } }));
  let maxObservationYear: number | null = null;
  if (defaultMetric) {
    const agg = await prisma.observation.aggregate({
      where: { metricId: defaultMetric.id },
      _max: { year: true },
    });
    maxObservationYear = agg._max.year ?? null;
  }
  const statusText = `Live data auto-ingestion: Active — last updated: ${lastUpdatedLabel} — data through ${maxObservationYear ?? "—"} for ${defaultMetric?.name ?? "default metric"}`;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-[var(--background)] text-slate-900 antialiased`}>
        <AppShell navLinks={navLinks} statusText={statusText}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
