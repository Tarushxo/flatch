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
- Two kinds of primary control: `SignLink` (the neon arrow sign) for a link that takes you somewhere, and the `button-primary` class for the main action in a form or sheet. Chosen chips and the sender's chat bubbles use the brand pink/violet, toned down. Avoid large blocks of bright cyan; cyan is for links, small accents and the like action.
- Import icons only from `apps/web/components/icons.tsx` (Phosphor, re-exported under our names). Add new ones there.
- Photos use `FadeImage` inside a box whose background is the photo's `dominantColor`, so they fade in instead of popping. Always pass `use` and `sizes` (from `lib/photo.ts`) so phones get phone-sized images; mark the first visible photo `priority` and off-screen ones `lazy`.
- No `backdrop-blur` and no large `blur()` filters or blend modes. They are slow on phones. Use a more opaque background, or a radial gradient for soft light.
- Zod schemas live in `@repo/shared/schemas`. Import them only on the server and in tests; the app imports types and helpers from `@repo/shared`, which keeps the validation library out of the browser.
- Load anything a screen does not need at first (sheets, the map) with `next/dynamic`, and warm it after a short delay.
- Serve images through Cloudinary transformation URLs, not `next/image` optimization.
- Everything must stay on free tiers. Do not add a paid service or a new third-party dependency without asking.

## Working here

- Node 24 via nvm (`.nvmrc`); a plain shell may still default to an older Node, so run `nvm use` first. pnpm comes from corepack. There is no Docker: the local database is a Neon dev branch.
- Biome is the linter and formatter (`pnpm lint`, `pnpm format`). TypeScript is pinned to 6.0.x; check that Next.js supports a newer major before bumping it.
- Secrets live in `.env.local` (git-ignored). Keep `.env.example` current with every variable and where to get it. Never print secret values or ask for them in chat.
- Verify changes by running them: `pnpm typecheck`, `pnpm test`, and the app in a mobile viewport. UI work is not done until it has been looked at.
- Commit in small steps with conventional commit messages. Do not push or deploy unless asked.
