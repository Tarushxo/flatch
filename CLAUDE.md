# Flatmate Swipe (working title: Flatch)

A swipe-based flat and flatmate finder: tenants swipe on flats, listers accept interested tenants, a match opens chat and unlocks the address. A zero-cost portfolio project whose two points of pride are the front-end feel and the feed engine.

**Read `docs/SPEC.md` before doing any work.** It is the source of truth for product behaviour, design, architecture, data model, the feed engine and the milestone plan. Build one milestone at a time, to its "done when" list, and stop there.

## Stack

- pnpm workspaces + Turborepo, TypeScript strict.
- `apps/web`: Next.js (App Router), Tailwind v4, shadcn/ui restyled, Motion, Vaul, TanStack Query, Zustand.
- `packages/api`: Hono, mounted in Next at `/api/*`. One Vercel project, same origin.
- `packages/db`: Drizzle + Neon Postgres with PostGIS.
- `packages/feed`: the ranking engine as pure functions. No I/O, no framework imports.
- `packages/shared`: Zod schemas and constants used by both sides.
- Auth: Better Auth (Google + anonymous guests). Images: Cloudinary. Later: Upstash Redis, Inngest, Pusher, Sentry.

## Rules that matter here

- **Exact locations never leave the server before a match.** Send `location_public` only. Hiding it in the UI is not enough. There is a test for this; keep it passing.
- **Every access to another user's data goes through a policy function**, and new endpoints get a row in the authorization test matrix.
- **Postgres is the source of truth.** Redis, Pusher, Inngest and Sentry are optional at runtime: guard each with an env check and a working fallback.
- **Guests only interact with seed data.** Seed listings and bot profiles show a `Demo` tag.
- Validate every API input with a Zod schema from `packages/shared`. Money is integer rupees. Times are UTC `timestamptz`.
- Routes call services; services never import Hono or Next.
- Swipe endpoints are idempotent by client-generated id.
- Animate only `transform` and `opacity`. Every swipe action also has a button and a keyboard shortcut. Honour `prefers-reduced-motion`.
- Use the design tokens in SPEC section 4; do not introduce new colours. Glow is for state and energy, one glowing thing per moment.
- Show the logo only through the `Logo` component (`apps/web/components/logo.tsx`), never as hand-styled text, so the font and neon flicker stay identical on every screen.
- Two kinds of primary control: `SignLink` (the neon arrow sign) for a link that takes you somewhere, and the `button-primary` class (a lit pink neon tube, like the logo) for the main action in a form or sheet. Chosen chips and the sender's chat bubbles use the brand pink/violet, toned down. Avoid large blocks of bright cyan; cyan is for links, small accents and the like action.
- One person, two sides: `mode` on the profile is `tenant` or `lister`. Tabs and side-only screens follow it (`lib/profile/use-mode.ts`, `OnboardingGate`); Keys, chat and Profile are shared and branch on `match.side`.
- Import icons only from `apps/web/components/icons.tsx` (Phosphor, re-exported under our names). Add new ones there.
- Photos use `FadeImage` inside a box whose background is the photo's `dominantColor`, so they fade in instead of popping. Always pass `use` and `sizes` (from `lib/photo.ts`) so phones get phone-sized images; mark the first visible photo `priority` and off-screen ones `lazy`.
- No `backdrop-blur` and no large `blur()` filters or blend modes. They are slow on phones. Use a more opaque background, or a radial gradient for soft light.
- Zod schemas live in `@repo/shared/schemas`. Import them only on the server and in tests; the app imports types and helpers from `@repo/shared`, which keeps the validation library out of the browser.
- Load anything a screen does not need at first (sheets, the map) with `next/dynamic`, and warm it after a short delay.
- Serve images through Cloudinary transformation URLs, not `next/image` optimization. Uploaded photos are redrawn in the browser before they are sent (`lib/photo-upload.ts`), which is what removes location data from them; never add a path that uploads the original file.
- Everything must stay on free tiers. Do not add a paid service or a new third-party dependency without asking.

## Working here

- Node 24 via nvm (`.nvmrc`); a plain shell may still default to an older Node, so run `nvm use` first. pnpm comes from corepack. There is no Docker: the local database is a Neon dev branch.
- Database: `pnpm --filter @repo/db db:generate` writes a migration from the schema (no database needed), `db:migrate` applies it, `db:seed` loads the demo flats (safe to re-run). The web app uses the real API for everything when `DATABASE_URL` is set, and the in-browser mock for everything when it is not (CI, a fresh clone), so check which one you are looking at (`/api/v1/health`). A change to behaviour has to be made in both, or the mock stops being a faithful stand-in.
- A setting the build must see (not only the running server) has to be listed under `env` for the `build` task in `turbo.json`; Turborepo hides anything not listed. `DATABASE_URL` is there for this reason. Settings only the running server reads (sign-in, photo storage, the database integration's extras) are under `passThroughEnv`, which just stops Vercel warning about them.
- Sign-in is Better Auth (`packages/api/src/auth.ts`). Its tables are ordinary Drizzle tables in `packages/db`, and the property names on them are the ones the library expects, so do not rename them. `kysely` is a dependency of `packages/db` only so that every package resolves the same copy of `drizzle-orm`; without it the types stop matching.
- Match scores and the order of the deck come from `packages/feed` and nowhere else: the API (`services/feed.ts`, `services/matching.ts`) and the in-browser mock both call it. A score of 0 means "nothing to go on" and is shown as no ring; never invent a number to fill it. New scoring goes in as a pure function under `packages/feed/src/features` with tests.
- The app's pages carry a head-start script (`apps/web/lib/start`) that asks `GET /api/v1/start` for the profile and the top of the deck before the app's code loads. It cannot import anything, so it repeats the photo sizing from `lib/photo.ts` in plain script; a test compares the two. If you change how card photos are sized, or what the first `/me` or `/feed` request returns, keep the script and `/start` in step, or the first photo is fetched twice.
- Anything a person could repeat to fill the free database or photo store is counted per day with `spend()` (`packages/api/src/services/usage.ts`, limits in `packages/shared/src/limits.ts`). Call it once the request is otherwise allowed, just before the write. Do not use Hono's `bodyLimit` helper: it rebuilds the request, which fails inside Next for requests with no body (undo, unmatch).
- The sign-in library (`apps/web/lib/auth/client.ts`) is imported with `import()` where it is used, never at the top of a file the app loads at first: almost no visit needs it, and it is a sizeable download.
- In a Drizzle query on a single table, a column is written without its table name. Inside a hand-written inner query that bare name can then mean the inner table's column (a message's `id`, not the chat's). Name the table explicitly in inner queries, as `THIS_CHAT` does in `services/matching.ts`.
- The database (Neon, `ap-southeast-1`) and the Vercel functions (`sin1`) are both in Singapore and must stay in the same region as each other. `BETTER_AUTH_SECRET` is pinned in Vercel and in `.env.local`; changing or removing it signs everyone out and strands every guest's data.
- Local development and the live site share one database. A migration must leave the currently deployed code working (add columns with defaults; never drop or rename in the same step), because it is applied before the new code is pushed.
- Biome is the linter and formatter (`pnpm lint`, `pnpm format`). TypeScript is pinned to 6.0.x; check that Next.js supports a newer major before bumping it.
- Secrets live in `.env.local` (git-ignored). Keep `.env.example` current with every variable and where to get it. Never print secret values or ask for them in chat.
- Verify changes by running them: `pnpm typecheck`, `pnpm test`, and the app in a mobile viewport. UI work is not done until it has been looked at.
- Commit in small steps with conventional commit messages. Do not push or deploy unless asked.
