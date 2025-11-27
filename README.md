# StateStats

StateStats is a Next.js (App Router) + Prisma starter for exploring U.S. state-level metrics. It ships with a typed domain model, PostgreSQL schema, and an ingestion pipeline for median household income from the U.S. Census ACS.

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

- CLI: `pnpm ingest:median-income` (or `pnpm ingest:all`)
- API: `POST /api/admin/ingest` to trigger ingestion from the server runtime

The ingestion run is recorded in the `IngestionRun` table with basic counts and errors.

## Project structure

- `app/` – App Router pages (`/`, `/graph`, `/data-sources`, `/about`) and admin ingestion API route
- `lib/` – shared types, Prisma client helper, state list, and metric definitions
- `prisma/schema.prisma` – PostgreSQL schema and enums
- `scripts/ingestMedianHouseholdIncome.ts` – example ingestion pipeline (mocked ACS calls)

## Useful scripts

- `pnpm dev` – run Next.js locally
- `pnpm lint` – Next.js lint
- `pnpm db:migrate` / `pnpm db:generate` – Prisma tooling
- `pnpm ingest:median-income` – run the median household income importer
