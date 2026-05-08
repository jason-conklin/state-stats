
# StateStats

StateStats is a Next.js (App Router) + Prisma project for exploring U.S. state-level metrics. It ships with a typed domain model, a Supabase/PostgreSQL schema, ingestion pipelines, and interactive map/graph experiences.

<img width="1983" height="793" alt="statestats-banner" src="https://github.com/user-attachments/assets/ec238aee-eed4-4c33-a57e-201d5bf13b94" />

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

### Ingestion

- `npm run ingest:income` – median household income (Census ACS `B19013_001E`)
- `npm run ingest:population` – total population (Census ACS `B01003_001E`)
- `npm run ingest:median-age` – median age (Census ACS `B01002_001E`)
- `npm run ingest:home-value` – median home value (Census ACS `B25077_001E`)
- `npm run ingest:age` – alias for median age ingestion
- `npm run ingest:unemployment` – unemployment rate annual average (BLS LAUS)
- `npm run ingest:all` – run all ingestions sequentially
- `npm run ingest:verify` – print latest run metadata and metric coverage summary

Real API ingestion is used when keys are set:

- `CENSUS_API_KEY`
- `BLS_API_KEY`

If either key is missing, that metric falls back to deterministic synthetic data and is labeled with a synthetic fallback data source in the database.

Each ingestion writes an `IngestionRun` row with status, counts, and warning/error details.
`ingest:all` logs a preflight summary (Node version, DB host/port, and API key presence) before running.

Admin trigger endpoint:

- `POST /api/admin/ingest`
- Auth: `x-admin-ingest-secret` header or `Authorization: Bearer <token>`
- Env: `ADMIN_INGEST_SECRET` must be configured

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
- `scripts/ingestion/` – provider-backed ingestion pipelines and helpers

## Useful scripts

- `pnpm dev` – run Next.js locally
- `pnpm lint` – Next.js lint
- `pnpm db:migrate` / `pnpm db:generate` – Prisma tooling
- `pnpm ingest:income` – run the median household income importer
- `pnpm ingest:unemployment` – run the unemployment rate importer
- `pnpm ingest:all` – run all metrics ingestion
- `pnpm ingest:verify` – verify latest run + coverage

## Deployment (Vercel)
- Ensure `DATABASE_URL` is set in Vercel project settings (server-side).
- Run `pnpm build` locally to verify.
- Deploy via Vercel (Git integration or `vercel` CLI). The app uses App Router defaults; no special vercel.json required.

### Deploying to Vercel
- Prereqs: Supabase Postgres (Session Pooler URI) set as `DATABASE_URL` in Vercel project env vars.
- Set ingestion env vars in Vercel: `CENSUS_API_KEY`, `BLS_API_KEY`, `ADMIN_INGEST_SECRET`.
- Vercel will run `npm install` (or pnpm), `npm run build`, and `npm start`.
- Prisma client is generated automatically via `postinstall` (`prisma generate`). Migrations are **not** run automatically; apply them yourself before deploy (e.g., `npx prisma migrate deploy` against Supabase or run `pnpm db:migrate` locally then `db:generate`).
- Ingestion scripts are manual/cron-only; do not wire them into Vercel build/runtime.
- Optional: schedule a Vercel Cron job that calls `POST /api/admin/ingest` with `x-admin-ingest-secret`.

## Data model & ingestion
- Core tables: State, Metric, Observation, DataSource, IngestionRun.
- Metrics are linked to canonical real sources (`census_acs`, `bls_laus`) during real ingestion and fallback sources only when API keys are missing.
- Ingestion scripts normalize legacy source IDs and keep source/run metadata consistent.
- Latest successful ingestion is surfaced in the global banner and Data Sources page.

<!--
Vercel readiness edits:
- package.json (postinstall prisma generate), .env.example (DATABASE_URL placeholder), lib/mapScales.ts / components/map/Legend.tsx / components/map/MapExplorer.tsx for improved scales/legend domain, components/layout/Sidebar.tsx styling tweaks, README deployment notes.
Manual steps before deploy:
- Set DATABASE_URL in Vercel env vars (Supabase session pooler URI).
- Apply Prisma migrations manually (e.g., prisma migrate deploy) and run ingestion scripts manually if needed.
-->
