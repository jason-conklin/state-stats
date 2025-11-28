# StateStats

StateStats is a Next.js (App Router) + Prisma project for exploring U.S. state-level metrics. It ships with a typed domain model, a Supabase/PostgreSQL schema, ingestion pipelines, and interactive map/graph experiences.

![StateStats Map](public/map-placeholder.svg)

## Tech stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma 6.19.0 + Supabase Postgres
- Recharts for line charts
- d3-geo + topojson-client for the choropleth map

## Prerequisites

- Node.js 18.17+ (20+ recommended)
- pnpm
- PostgreSQL with a `DATABASE_URL` connection string

## Setup

```bash
pnpm install
cp .env.example .env      # configure DATABASE_URL
pnpm db:migrate           # creates tables
pnpm db:generate          # generates the Prisma client
```

### Ingestion (demo data)

- `npm run ingest:income` – median household income (synthetic)
- `npm run ingest:unemployment` – unemployment rate (synthetic)
- `npm run ingest:population` – population total (synthetic)
- `npm run ingest:home-value` – median home value (synthetic)
- `npm run ingest:median-age` – median age (synthetic)
- `npm run ingest:all` – run all ingestions sequentially
- API: `POST /api/admin/ingest` to trigger ingestion from the server runtime

All ingestions currently use synthetic demo data and will switch to real Census/BLS APIs once keys (e.g., CENSUS_API_KEY, BLS_API_KEY) are configured.

The ingestion run is recorded in the `IngestionRun` table with basic counts and errors.

## Pages
- `/` Map: Choropleth by metric + year, legend, tooltip, pinned state, accessible table.
- `/graph` Compare: Multi-state line chart over time with metric selector, year range, normalization.
- `/data-sources` Provenance: Data sources, last successful ingestions, metrics catalog.
- `/about` Overview, usage tips, caveats.

## Getting started
```bash
git clone <repo-url>
cd StateStats
pnpm install
cp .env.example .env   # set DATABASE_URL (Supabase)
pnpm db:migrate
pnpm db:generate
pnpm ingest:median-income
pnpm dev
```
Open http://localhost:3000 to view the app.

## Project structure

- `app/` – App Router pages + API routes (admin ingestion, graph data)
- `components/` – Map and graph UI components
- `lib/` – shared types, Prisma client helper, state list, and metric definitions
- `prisma/schema.prisma` – PostgreSQL schema and enums
- `scripts/ingestMedianHouseholdIncome.ts` – example ingestion pipeline (mocked ACS calls)

## Useful scripts

- `pnpm dev` – run Next.js locally
- `pnpm lint` – Next.js lint
- `pnpm db:migrate` / `pnpm db:generate` – Prisma tooling
- `pnpm ingest:income` – run the median household income importer
- `pnpm ingest:unemployment` – run the unemployment rate importer

## Deployment (Vercel)
- Ensure `DATABASE_URL` is set in Vercel project settings (server-side).
- Run `pnpm build` locally to verify.
- Deploy via Vercel (Git integration or `vercel` CLI). The app uses App Router defaults; no special vercel.json required.

### Deploying to Vercel
- Prereqs: Supabase Postgres (Session Pooler URI) set as `DATABASE_URL` in Vercel project env vars.
- Vercel will run `npm install` (or pnpm), `npm run build`, and `npm start`.
- Prisma client is generated automatically via `postinstall` (`prisma generate`). Migrations are **not** run automatically; apply them yourself before deploy (e.g., `npx prisma migrate deploy` against Supabase or run `pnpm db:migrate` locally then `db:generate`).
- Ingestion scripts (`pnpm ingest:median-income`) are manual/cron-only; do not wire them into Vercel build/runtime.

## Data model & ingestion
- Core tables: State, Metric, Observation, DataSource, IngestionRun.
- Ingestion pipeline seeds states, data source, metric (median household income), and synthetic observations for development.
- Latest successful ingestion is surfaced in the global banner and Data Sources page.

<!--
Vercel readiness edits:
- package.json (postinstall prisma generate), .env.example (DATABASE_URL placeholder), lib/mapScales.ts / components/map/Legend.tsx / components/map/MapExplorer.tsx for improved scales/legend domain, components/layout/Sidebar.tsx styling tweaks, README deployment notes.
Manual steps before deploy:
- Set DATABASE_URL in Vercel env vars (Supabase session pooler URI).
- Apply Prisma migrations manually (e.g., prisma migrate deploy) and run ingestion scripts manually if needed.
-->
