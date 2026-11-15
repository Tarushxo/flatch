# Flatch

Swipe right on your next flat. A swipe-based way to find a flat and the people in it: tenants swipe through flats, listers accept the tenants they like, and a match opens chat and unlocks the address.

This is a portfolio project. The two things it is built to show are a front end that feels like a top consumer app, and a feed engine that ranks flats by how well both sides would fit.

**Live:** https://flatch-lac.vercel.app

**Status:** Milestone 0 of 7 (foundations). The full plan is in [docs/SPEC.md](docs/SPEC.md).

## Run it

Requires Node 24 (`nvm use` picks it up from `.nvmrc`) and pnpm (`corepack enable pnpm`).

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. The design tokens are at `/styleguide`.

## Commands

| Command          | What it does                     |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start the web app in development |
| `pnpm build`     | Production build                 |
| `pnpm lint`      | Lint and format check (Biome)    |
| `pnpm format`    | Fix lint and formatting          |
| `pnpm typecheck` | TypeScript across all packages   |
| `pnpm test`      | Unit tests (Vitest)              |

## Layout

```
apps/web          Next.js app: all UI; mounts the API at /api
packages/api      The HTTP API (Hono): routes and services
packages/db       Database tables (Drizzle), migrations and demo data
packages/shared   Constants, formatting, shared schemas
packages/feed     The ranking engine as pure functions
docs/SPEC.md      Product, design, architecture and milestone plan
```

## Database (optional)

Without a database the app runs on demo data held in the browser. To use a real one, put a
Postgres address with PostGIS (Neon's free plan works) in `.env.local` as `DATABASE_URL`
(see `.env.example`), then:

```bash
pnpm --filter @repo/db db:migrate   # create the tables
pnpm --filter @repo/db db:seed      # load the demo flats (safe to run again)
```
