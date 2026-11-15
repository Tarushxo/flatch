# Flatmate Swipe: Build Spec

Working title: **Flatch** (flat + match). Rename any time; nothing in the code should depend on the name except one `APP_NAME` constant.

This document is the source of truth for what we are building and why. `CLAUDE.md` in the repo root holds the short standing rules; this file holds the detail. If the two disagree, fix the disagreement instead of guessing.

---

## 1. What this is

A swipe-based app for finding a flat and the people in it. Tenants swipe through full-screen flat photos. A right swipe sends interest to the lister, who sees the tenant as a card and accepts or declines. Acceptance on both sides is a match: chat opens and the exact address is revealed.

**Goals, in priority order**

1. A front end that feels as good as a top consumer app: fluid gestures, a distinctive dark neon look, no jank.
2. A feed engine worth explaining in an interview: reciprocal filtering, explainable scoring, measured with a simulation.
3. A live demo that works for a stranger in under 10 seconds and still works six months from now.
4. Total running cost of ₹0.

**Non-goals**

- Payments, monetization, KYC, phone OTP, email sending.
- Native apps. This is a PWA; a native wrapper is a later project.
- Every city in India. Ten are covered, the big metros and IT hubs: Bangalore, Hyderabad, Pune, Chennai, Mumbai, Delhi, Gurgaon, Noida, Kolkata and Ahmedabad. The city is something the tenant chooses, and the feed, the locality list and the landing sign's city plaque all follow it. The list lives in one place (`CITIES` in `packages/shared`); adding a city means adding it there and giving it data.
- ML models. Ranking is hand-built features plus simple online learning.

---

## 2. Roles and the core loop

One account can hold both roles. The app has a mode switch (like Airbnb's travelling/hosting), and each mode has its own tab bar.

- **Tenant**: has a tenant profile (photo, basics, lifestyle, preferences). Swipes on listings.
- **Lister**: an owner _or_ an existing flatmate with a spare room. Owns one or more listings. Reviews interested tenants.
- **Guest (demo)**: an anonymous account with a pre-filled persona. Can do everything a tenant can, but **only against seed listings** (never real listers).
- **Bot**: a seed lister or seed tenant flagged `is_seed`. Responds automatically so the loop always completes.

**The loop as a state machine**

```
tenant swipes right ──► interest: PENDING
                          ├─ lister accepts ──► ACCEPTED ──► conversation created, address unlocked
                          ├─ lister declines ─► DECLINED   (silent to the tenant)
                          ├─ tenant undoes ───► WITHDRAWN
                          └─ 14 days pass ────► EXPIRED
```

Swipe actions: `like`, `pass`, `save` (swipe up, a "maybe" pile), `superlike` (like + a short note, 2 per day).

**Progressive profile.** A new tenant can start swiping after the preference steps. The profile basics (photo, name, a line about themselves) are required only at the first _like_, because that is the moment a lister needs to see them. This keeps time-to-first-swipe short.

**Listing lifecycle:** `draft → active → paused → filled`, plus automatic `expired` after 45 days without the lister confirming it is still open.

---

## 3. Screens

### 3.1 Signed-out landing (`/`)

Most portfolio visitors arrive on a desktop and will not sign in with Google. The landing page must sell the app by itself.

- The neon sign logo flickers on.
- A **showcase deck that swipes itself**: the real card component, playing a loop of likes, passes and saves with the stamps showing. It cannot be dragged or tapped; the whole scene is one link into the app. A room key and a guest check peek out around it. The working deck is deliberately kept behind the "Start swiping" sign, so there is a reason to go in.
- Primary button: **Try the demo** (creates a guest session with a persona and drops straight into the feed). Secondary: Sign in with Google. Primary calls to action use `SignLink`, a neon arrow sign that flickers on when hovered, never a plain gradient pill.
- A short "How the feed works" section linking to the ranking lab (`/lab`) and the GitHub repo.
- `/privacy` and `/terms` pages exist (needed to publish the Google OAuth consent screen).

### 3.2 Tenant onboarding

**As built on the mock API (`/welcome`, "check in").** Six steps with a marquee-bulb progress row: city, monthly budget, areas, timing, room type, lifestyle. Budget, areas and room type show a live "N flats in <city> fit so far". Every step can be skipped, and "Skip, just show me flats" on the first screen goes straight to the deck with the defaults. Differences from the plan below, to revisit with the backend:

- Timing is two quick choices (when, how long), not a date picker.
- The eight lifestyle questions are on one scrolling screen, each with a star for "dealbreaker".
- Lifestyle answers and dealbreakers are saved but do not change the feed or the match percentage yet. That is the feed engine's job (M5).
- No work/college anchor or commute limit yet.
- The profile is kept in the browser (`localStorage`), not in an account, so it survives a reload but not a different device. Swipes and matches still reset on reload.
- Saved preferences become the deck's starting filters; the Profile tab shows them and links back here to change them. "Check out" on the Profile tab clears everything.
- The app is gated: anyone who has not checked in (or skipped) is sent here first.

One question per screen, large type, a thin neon progress line. Every step has a sensible default and can be skipped.

1. Role (tenant / lister), then city (one of the ten in `CITIES`).
2. Budget: dual slider. **A live counter shows "42 flats match" and updates as the user drags.** This is the first moment the feed engine is visible; make it feel instant (debounced call to `POST /feed/count`).
3. Where: pick localities from our own list, and/or pick a work/college anchor plus a max commute.
4. Move-in date and expected stay.
5. Room type (private room, shared room, whole flat).
6. Lifestyle: eight quick cards (see 8.2). Each answer can be starred as a **dealbreaker**.
7. Done: into the feed.

Deferred to first like: photo, name, age range, gender, occupation, bio, two Hinge-style prompts ("I'm the flatmate who…", "My ideal Sunday at home…"), optional LinkedIn/Instagram links.

### 3.3 Discover (the deck)

**Card anatomy**

- Full-bleed photo. Segmented progress bars at the top (stories style) show the photo index.
- Tap the right/left third of the photo for next/previous photo.
- Bottom scrim with: rent in large monospaced numerals (`₹18,500/mo`), locality and commute ("HSR Layout · 22 min to work"), and three chips (room type, furnishing, available date).
- Top right: compatibility ring with a percentage. Top left: `Verified` tick and, for seed listings, a `Demo` tag.
- Swipe up or tap the info area to open details.

**Gesture spec**

- Only the top three cards are in the DOM.
- Drag moves the top card in x and (dampened) y. Rotation = `x / cardWidth × 12°`; the sign flips when the card is grabbed in its bottom half, the way a physical card pivots.
- Commit when `|x| > 35%` of card width **or** horizontal velocity `> 600 px/s`. The card then flies out along its velocity vector in 250–350 ms. Otherwise it springs back (stiffness ≈ 300, damping ≈ 25).
- A mostly-vertical drag past 30% of card height is `save`.
- A mostly-vertical pull **down** past 15% of card height (or a quick downward flick) opens the details. The card does not leave: it follows the finger at half speed, shows a **DETAILS** stamp, and settles back as the details open. The card behind does not move.
- Stamps fade in with drag distance: **MOVE IN** (cyan, right), **PASS** (coral, left), **MAYBE** (amber, up), **DETAILS** (violet, down), set in the neon display face.
- The card's edge glow shifts toward the action colour as the drag progresses. The card behind scales `0.94 → 1`, rises 12 px and brightens.
- A short haptic tick fires when the threshold is crossed (`navigator.vibrate(10)`; a no-op on iOS).
- Animate only `transform` and `opacity`. Set `touch-action` so horizontal drags never scroll the page, and `overscroll-behavior: none` so pull-to-refresh never fires.

**Buttons and keyboard.** Below the deck: Pass, Undo, Save, Like. Keyboard: `←` pass, `→` like, `↑` save, `↓` or `Space` details, `Z` undo, `A`/`D` previous/next photo. Every gesture has a button and a key equivalent; swiping is never the only way to act.

**Optimistic swipes.** The card leaves immediately. Swipes go into a client queue, each with a client-generated id, and are sent in small batches with retry and backoff. The server treats repeats as no-ops. If a swipe fails permanently, show a toast and put the card back.

**Undo.** Last swipe only. The card returns with the reverse animation; the server deletes the swipe and withdraws the interest if the lister has not decided.

**Prefetch.** Fetch the next page when four cards remain. Preload the first photo of the next three cards and the second photo of the top card.

**Filters.** A bar above the deck holds a Filters button and one removable chip per active filter. The sheet has a monthly budget slider (checked against rent + maintenance + bills, not rent alone), room type and areas, with a live "Show N flats" count. Filters are mirrored in the page address (`?max=20000&area=Domlur&room=private_room`), and each set of filters fetches a fresh feed.

**Running out of cards.** With a small inventory, strict filters empty the deck fast. The feed therefore has tiers (see 8.3): exact matches first, then labelled **stretch picks** ("₹1,500 over budget", "4 km further"). When everything is exhausted, the empty state offers: widen budget, widen area, revisit passed flats.

### 3.4 Listing detail

Opens as a bottom sheet. As it rises, the screen behind steps back and dims (Vaul's scaled background), so the deck and its details read as two layers of one place. A shared-element morph from the card photo into the gallery was considered and dropped: it fights the sheet library's own motion. Sections, in order:

1. **Gallery** with room tags (bedroom, living, kitchen, bathroom, balcony, building).
2. **Cost**: rent as the hero number, then a stacked bar for the _real monthly cost_ (rent + maintenance + estimated utilities share). Upfront cash is shown separately ("Deposit ₹55,500 · 3 months, refundable"). A price badge compares with the locality average.
3. **Why this flat**: the compatibility ring, three reasons it fits and at most one caution ("✓ Both vegetarian · ✓ Within budget · ✓ 22 min commute · ! Early risers, you're a night owl").
4. **The flat**: amenity icon grid, furnishing, floor, bathroom, area.
5. **House rules**: do/don't chips (guests, overnight guests, alcohol, smoking, pets, quiet hours, cleaning, food).
6. **Society rules**: visitor timings, bachelors allowed, pets, parking, move-in charges, gate timings.
7. **What the lister expects**: short list in their words.
8. **Who you'd live with**: lister card with prompts and how many flatmates.
9. **Neighbourhood**: dark map with a glowing ~400 m circle (never a pin), nearby metro/grocery/gym chips, commute chips. Caption: "Exact address shared after you match."
10. Sticky action bar: Pass, Save, Like. Report is in the overflow menu.

A public share link `/l/[id]` renders the same content server-side with an Open Graph image.

### 3.5 Tenant tabs

`Discover · Saved · Matches · Profile`

- **Saved**: grid of saved flats; like or pass from here.
- **Matches**: conversations first, then "Likes sent" with status (pending / matched). Declines are not shown; pending likes simply expire.
- **Profile**: edit profile and preferences. Changing preferences rebuilds the feed.

### 3.6 Lister mode

`Listings · Interested · Matches · Profile`

- **Create listing wizard**: basics → location (locality picker, then drag a pin; a preview shows the circle strangers will see) → costs → photos (minimum 3, tag rooms, reorder) → household and lifestyle → rules (preset chips plus free text for house rules, society rules, expectations) → who you're looking for (requirements) → preview as a card → publish.
- **Interested**: a swipe deck of tenants who liked the listing, ordered by compatibility. Card shows photo, name, age range, occupation, compatibility ring, lifestyle chips, prompts, and the note if it was a superlike. Accept or decline.
- **Listing stats**: views, like rate, pending count.

**As built on the mock API.** A person uses one side of the app at a time (`mode` on the profile: `tenant` or `lister`), switched from the Profile tab, or from "List a flat" on the first check-in screen, which skips the tenant's questions. Lister tabs: `Your flats · Interested · Keys · Profile`. Each side's screens send the other side home.

- **Post a flat** (`/listings/new`): six steps: basics, where, costs (with a live guest check), photos, home and rules, preview as a card. Pressing Next on an unfinished step lists what is missing. A half-filled form survives a reload. The checks are `draftProblems` in `packages/shared`, shared by the form and the mock.
- **Your flats** (`/listings`): each flat has a VACANCY sign that is the on/off switch for likes, counts of tenants waiting and keys given, and a two-tap "take down". Flats are kept in the browser (`flatch.listings.v1`).
- **Interested** (`/interested`): one tenant at a time, oldest first. Drag the card, use the buttons, or the arrow keys. Yes gives a key (a match) and opens the chat; the lister is told with a toast rather than the full match moment, since they made the match themselves.
- **Keys and chat** are shared with tenants. A match carries `side`, the other `person`, and for a lister the `applicant`. A lister sees who has the key instead of the address card.
- **Bot tenants** (`mock/applicants.ts`): five of eight like each new flat over the first 50 seconds, and reply in chat. A closed flat takes no new likes.

Differences from the plan above, to revisit with the backend: photos are picked from samples (uploads need storage, M2); the area is chosen from a list with no map pin; no "who you're looking for" step and no free-text rules; tenants are ordered by arrival, not compatibility, and their match % is written by hand; no listing stats beyond the two counts; a posted flat does not appear in the tenant deck; there is no editing a flat after posting.

### 3.7 Match moment and chat

- **Match moment**: the screen dims, a neon sign reading "YOU'RE IN" flickers on (three flickers, then steady), both photos slide in, light particles drift. Buttons: Say hi, Keep swiping. With reduced motion: a simple fade. It can appear over any screen: a watcher in the app's frame queues each new match and shows them one at a time. Matches that already existed when the app opened are not replayed.
- **Chat**: the first item is a system card with the listing and the now-unlocked address ("Open in Maps"). Quick replies ("When can I visit?"). A one-time safety banner: never pay before visiting. Report, block and unmatch in the header menu. Built on the mock API: the Keys tab is a key rack of matches (photo, name, last message, unread count) with "Likes sent" underneath; the chat hides the tab bar, shows "typing" while a reply is on its way, and has a two-tap Unmatch in its menu. Until there is a push connection the app asks for new matches every 2.5 s and for new messages every 2.5 s while a chat is open.

### 3.8 Desktop layout (≥ 1024 px)

Three columns: a nav rail on the left, the deck at phone width (~420 px) in the centre, and the details of the top card live in the right panel (no sheet needed). Keyboard hints are visible. The app must look intentional on a laptop, because that is where it will be judged.

### 3.9 Ranking lab (`/lab`, public, read-only)

Pick a demo persona, move sliders for the scoring weights, and watch the ranked list reorder with per-feature bars and up/down arrows. Shows the latest simulation metrics. It reads only seed data.

### 3.10 States that must be designed, not left to chance

Loading skeletons (violet-tinted shimmer), empty deck, offline, failed image, error boundary, first-run hints for the gestures (shown once), unread badges.

---

## 4. Design system: "After Hours"

**The idea.** Flat hunting happens at night on a phone. The city is dark and the flats are the lit windows. The brand motif is the neon **VACANCY** sign.

**The rule that keeps neon from looking cheap:** neon is _light_, not paint. About 90% of the interface is quiet dark neutrals. Glow appears only where there is energy: the active control, a drag in progress, a match. One glowing thing per moment.

### 4.1 Colour tokens

Define as CSS variables and expose through Tailwind's theme. The app is dark-only.

| Token                     | Value                    | Use                                                                       |
| ------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `--bg`                    | `#07070C`                | App background                                                            |
| `--surface-1`             | `#0F0F17`                | Cards, sheets                                                             |
| `--surface-2`             | `#171722`                | Raised controls, inputs                                                   |
| `--border`                | `rgba(255,255,255,0.08)` | 1 px hairlines                                                            |
| `--text`                  | `#F4F4F8`                | Primary text                                                              |
| `--text-2`                | `#A3A3BA`                | Secondary text                                                            |
| `--text-3`                | `#8585A0`                | Muted, captions (lightest value that still passes 4.5:1 on `--surface-2`) |
| `--brand-a` → `--brand-b` | `#8B5CFF` → `#FF3DA6`    | Brand gradient (logo, primary buttons)                                    |
| `--like`                  | `#22E6FF`                | Like, active, links                                                       |
| `--pass`                  | `#FF4D5E`                | Pass, destructive                                                         |
| `--save`                  | `#FFC53D`                | Save / maybe, superlike                                                   |
| `--win`                   | `#C8FF3D`                | Match, positive money ("below average")                                   |

Notes:

- The brand colour is deliberately **not** the reject colour.
- Neon colours are for large type, icons, borders and glows. Body text stays on the neutral scale. All text meets 4.5:1 contrast.
- Colour is never the only signal: like/pass/save always carry an icon or word too.

### 4.2 Light effects

- **Deck halo.** The top card throws soft light in its own shape, like a lit window. The colour starts from the current photo's dominant colour, is pulled most of the way to the brand pink and redrawn deep and saturated, so it always sits inside the palette (warm rooms give hot coral-pink, blue ones violet). A photo's true average is usually a dull beige that reads as brown haze; never use it raw, and never let the light wash across the whole screen.
- **Glow recipe.** `box-shadow: 0 0 0 1px <c>, 0 0 24px -4px <c at 60%>, 0 0 64px -8px <c at 30%>`.
- **Surfaces.** A 1 px inner highlight at the top edge, hairline border, and a fine film-grain noise overlay (2–3% opacity) so dark gradients do not band.
- **Glass.** The floating tab bar and sticky action bar use backdrop blur over a translucent surface.

### 4.3 Type

- **Display:** Bricolage Grotesque (headings, big statements).
- **Body:** Geist (or Inter).
- **Numbers:** Geist Mono with tabular figures for rent and stats.
- **Logo face:** Yellowtail, a retro diner and motel sign script, used _only_ for the logo.
- **Sign face:** Tilt Neon, used _only_ for the swipe stamps and the match sign.
- Format money for India: `₹18,500`, `₹1.2L`. Locale `en-IN`.

### 4.4 Motion

- Springs, not durations, for anything the finger touches.
- Shared-element transitions for card → detail and card → match.
- Stagger list and chip entrances by 20–30 ms.
- The logo is always the `Logo` component, so its typeface, colour and flicker are the same on every screen; only the size varies. It behaves like an old motel sign (`NeonSign`): it flickers on at load, the whole sign buzzes a few times a minute, and one letter has a loose connection. Only the lit layer's opacity animates, over an always-visible unlit tube.
- Respect `prefers-reduced-motion`: remove rotation, flings, flicker and particles; keep fades.

### 4.5 Components and libraries

Tailwind v4, shadcn/ui primitives restyled to these tokens, Motion for gestures and layout animation, Vaul for bottom sheets, Phosphor icons, Sonner for toasts, MapLibre GL with a dark vector style re-tinted to the palette (lazy-loaded; only the detail and create-listing screens need it).

### 4.6 References to study before building

- Tinder / Bumble for deck physics; Hinge for prompts and how a person is presented.
- Airbnb listing pages for information order and the "approximate location until booking" map.
- Linear, Raycast and Vercel for dark-surface craft: hairlines, restraint, type.
- Apple Music / YouTube ambient mode for colour bleeding from media into the background.
- Real neon signage and night-city photography for how glow falls off.

### 4.7 Roadside theme: the motel and diner motifs

The neon logo is one piece of a larger setting: a roadside motel and diner at night. These motifs carry that setting through the whole app, so it feels like one place and not a dark app with a fancy logo.

**Rules for using them**

- **Theme lives in moments, not controls.** The landing page, the match, empty states, loaders, section headers and status indicators get the motifs. Buttons, forms, filters and the chat box stay plain and familiar.
- **Plain words on anything a person acts on.** Themed wording is for headings and empty states, and it always sits next to a plain explanation.
- **One showpiece per screen.** A screen with a marquee, a postcard and a flickering sign all at once is a theme park.
- **Drawn in code.** Every motif is CSS or inline SVG: no texture photos, no new colours, no new fonts.
- **Every animated motif has a still version** for people who prefer reduced motion.

**Core motifs (build each with the screen it belongs to)**

| Motif                | Where it appears                                       | What it does                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lit and unlit tubes  | Tab bar, toggles, any on/off state                     | Active is lit neon, inactive is the dark glass tube. The same language as the logo.                                                                                                                       |
| VACANCY / NO VACANCY | Listing status everywhere; the lister's on/off switch  | An open listing shows VACANCY lit. A filled or paused one shows NO VACANCY with "NO" lit. A lister opens a listing by switching the sign on.                                                              |
| Marquee bulbs        | Onboarding progress, loaders, the frame around a match | A row of bulbs that light one by one as steps complete. Chasing lights are reserved for a match or a superlike.                                                                                           |
| Amenity plaques      | Listing detail, card chips                             | Amenities as the small stacked plaques that hang under a motel sign: WIFI, AC, PARKING, LIFT.                                                                                                             |
| Guest check          | The real monthly cost breakdown                        | The costs laid out as a diner bill: mono type, dotted leaders, a total line, a torn bottom edge.                                                                                                          |
| Room key             | Match moment, Matches tab, address unlock              | A match hands over a motel key tag with the flat's locality on it. The Matches tab is a key rack. Revealing the address is using the key.                                                                 |
| Neon line drawings   | Empty and error states                                 | Single-line neon sketches (coffee cup, key, arrow, bed) that flicker on like the logo.                                                                                                                    |
| The sign assembly    | Landing page hero                                      | A roadside sign on a pole: the logo on top, a VACANCY plaque, and hanging plaques. The last plaque names the person's chosen city (`SignAssembly city`), so it reads GURGAON for someone searching there. |

**Second wave (add when their screen is built)**

- **Front desk bell:** lister notifications ("someone's at the desk") and the header of the Interested queue.
- **House rules placard:** rules printed like a motel's framed house rules, numbered, with small roadside-sign icons.
- **Management notice:** the chat safety banner as a placard ("Management reminds guests: never pay before visiting").
- **Do Not Disturb hanger:** pausing your profile or muting a chat.
- **Postcards:** "Greetings from HSR Layout" large-letter cards for neighbourhood headers, and as the share image for a listing.
- **Starburst sticker:** "New" and "below area average" badges.
- **OPEN sign:** lit when the other person is online in chat.

**Voice**

Light motel and diner wording in headings and empty states: "Check in" (sign in), "Check out" (sign out), "Today's specials" (top picks), "Off the menu" (stretch picks), "Kitchen's closed" (empty deck), "Front desk" (lister mode). Actions keep plain labels: Like, Pass, Save, Send.

**The setting is American, the product is local.** Prices stay in rupees, places are real Bangalore localities, and a postcard says "Greetings from Koramangala". The mix is part of the charm; do not swap in dollars, diners or highways as content.

---

## 5. Architecture

### 5.1 Decisions (and what changed from the chat plan)

| Topic           | Decision                                                                                                            | Why                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment      | **One Vercel project.** The API is a standalone Hono app in `packages/api`, mounted inside Next.js at `/api/*`.     | Two `*.vercel.app` domains cannot share a login cookie, and browsers block it as third-party. Same origin removes that, removes CORS, and keeps preview deployments in sync. The Hono app stays portable: moving it to its own service later is a small change. |
| Source of truth | **Postgres.** Redis is a cache only.                                                                                | The app must work with Redis empty or missing.                                                                                                                                                                                                                  |
| Feed            | Compute-on-read first; add the Redis cache and background jobs in a later milestone and **measure the difference**. | Simpler early, and the before/after numbers are a README story.                                                                                                                                                                                                 |
| Auth            | Better Auth: Google provider + anonymous plugin for demo guests.                                                    | Guest → Google upgrade keeps their swipes.                                                                                                                                                                                                                      |
| Typed client    | Hono RPC (`hc`) from the API's exported type.                                                                       | End-to-end types with no codegen.                                                                                                                                                                                                                               |
| Realtime        | A `RealtimeTransport` interface: polling implementation first, Pusher second.                                       | Chat works without any third party.                                                                                                                                                                                                                             |
| Maps            | MapLibre GL **v5** + OpenFreeMap's keyless dark style, loaded only when the map scrolls near the screen.            | Dark style that matches the theme, no key. v6 ships its worker as a separate module that Turbopack does not serve; v5 bundles it.                                                                                                                               |
| Place search    | Our own `localities` table.                                                                                         | Public Nominatim forbids autocomplete use; our own list is instant and free.                                                                                                                                                                                    |
| Commute times   | A precomputed `locality × anchor` matrix built once in the seed step.                                               | Zero routing calls at runtime.                                                                                                                                                                                                                                  |
| Images          | Cloudinary, signed uploads, delivered via transformation URLs (`f_auto,q_auto`). Not Next's image optimizer.        | Stays inside free limits; strips EXIF location from delivered images.                                                                                                                                                                                           |
| Jobs            | Inngest, introduced only with the feed cache milestone.                                                             | Fewer moving parts until they earn their place.                                                                                                                                                                                                                 |

### 5.2 Repository layout

```
apps/web            Next.js app: all UI; mounts the API at app/api/[[...route]]
packages/api        Hono app: routes → services → policies (no Next imports)
packages/db         Drizzle schema, migrations, seed pipeline
packages/feed       Pure ranking engine and simulation (no I/O, no framework)
packages/shared     Zod schemas, enums, constants, formatting helpers
```

pnpm workspaces + Turborepo. `packages/feed` being pure is what lets the API, the lab and the simulation share one implementation.

### 5.3 Front-end structure

- Server components for the landing page, share pages and legal pages. The signed-in app shell is client-rendered.
- TanStack Query for server state; a small Zustand store for the deck and swipe queue; URL params for filter overrides; React Hook Form + Zod for forms.
- Build the UI against the shared Zod contracts with an in-memory mock API first, so swapping in the real API changes no component.

### 5.4 Back-end structure

- Routes validate with Zod and call services. Services hold the logic and never import Hono. **Policies** are small functions answering "may this user do this to that record"; every service call that touches someone else's data goes through one.
- Versioned under `/api/v1`. Cursor pagination everywhere. One error envelope. A request id on every log line.
- Neon via the serverless driver's `Pool` (interactive transactions are needed for swipe → interest and accept → conversation).

### 5.5 Local development

Node 24 through nvm (`.nvmrc`), pnpm through corepack, and no Docker. So: use a **Neon dev branch** as the local database; Redis is optional locally (an in-memory implementation of the cache interface). CI uses a PostGIS service container.

---

## 6. Data model

Money is integer rupees. Times are `timestamptz` in UTC. Ids are UUIDs.

- **Auth tables** (managed by Better Auth): `user`, `session`, `account`, `verification`. Extra user fields: `is_seed`, `is_guest`, `is_admin`.
- **`tenant_profiles`**: `user_id` PK; display name, age range, gender, occupation type, workplace (optional), bio, `prompts` jsonb, photo; `budget_min`, `budget_max`; `move_in_date`, `stay_months`; `room_types[]`; `locality_ids[]`; `anchor_id` or custom `anchor_point` + `max_commute_min`; lifestyle columns (8 enums); `dealbreakers` jsonb; `flatmate_gender_pref`; links; `is_active`; `prefs_version` (bumped on any preference change).
- **`listings`**: `lister_id`, `status`, title, description, `locality_id`; **private:** `society_name`, `address_text`, `location_exact` (geography point); **public:** `location_public` (see 10.1); `rent`, `deposit`, `maintenance`, `utilities_est`; `room_type`, `bhk`, furnishing, bathroom, floor, area; `available_from`, `min_stay_months`; `amenities[]`; `flatmate_count`; household lifestyle columns (same 8 enums); `requirements` jsonb (gender, occupation, veg-only, couples); `house_rules` jsonb; `society_rules` jsonb; `expectations[]`; `quality_score`; `pending_interest_count`; `is_seed`; `published_at`, `expires_at`.
- **`listing_photos`**: Cloudinary id, width, height, `dominant_color`, blur placeholder, `room_tag`, `position`.
- **`localities`**: city, name, centroid, rent statistics per room type.
- **`anchors`** (tech parks, colleges, metro hubs) and **`locality_commute`** (`locality_id`, `anchor_id`, `minutes`).
- **`swipes`**: `user_id`, `listing_id`, `action`, `note`, `request_id`, `position`, `score`, `algo_version`; **unique (`user_id`, `listing_id`)**.
- **`interests`**: `tenant_id`, `listing_id`, `status`, `note`, `compat_snapshot` jsonb, `visible_at`, `decided_at`; **unique (`tenant_id`, `listing_id`)**.
- **`conversations`**: `interest_id` unique, `tenant_id`, `lister_id`, `listing_id`, `last_message_at`, per-side `last_read_at`.
- **`messages`**: `conversation_id`, `sender_id`, `kind` (text / system / visit), `body`, `meta` jsonb, `visible_at`.
- **`impressions`**: `user_id`, `listing_id`, `request_id`, `position`, `score`, `breakdown` jsonb, `algo_version`. This is what makes the ranking measurable.
- **`ranking_configs`**: `version`, `weights` jsonb, `is_active`.
- **`notifications`**, **`reports`**, **`blocks`**.

**Indexes:** GiST on `listings.location_exact`; partial btree on `(rent)` and `(available_from)` where `status = 'active'`; `interests (listing_id, status)`; `messages (conversation_id, created_at desc)`; `impressions (user_id, shown_at)`.

---

## 7. API surface

```
/api/auth/*                               Better Auth
POST   /api/v1/demo/start                 create a guest with a persona
GET    /api/v1/me
PATCH  /api/v1/me/tenant-profile
GET    /api/v1/localities?q=
POST   /api/v1/feed/count                 live count for draft preferences
GET    /api/v1/feed?cursor=&overrides=
POST   /api/v1/swipes                     batch, idempotent by client id
DELETE /api/v1/swipes/last                undo
GET    /api/v1/saved
GET    /api/v1/listings/:id               public or unlocked view, decided server-side
POST   /api/v1/listings      PATCH /api/v1/listings/:id
POST   /api/v1/uploads/sign               signed Cloudinary upload params
GET    /api/v1/interests?as=tenant|lister&listingId=
POST   /api/v1/interests/:id/decision     accept | decline
GET    /api/v1/conversations
GET    /api/v1/conversations/:id/messages?cursor=
POST   /api/v1/conversations/:id/messages
POST   /api/v1/conversations/:id/read
GET    /api/v1/notifications
POST   /api/v1/reports       POST /api/v1/blocks
GET    /api/v1/lab/rank                   ranking lab (seed data only)
GET    /api/health
GET    /api/cron/daily                    secured with CRON_SECRET
```

---

## 8. The feed engine

### 8.1 Principles

- **Reciprocal.** A good recommendation is one both sides would accept. Never show a tenant a flat whose lister's requirements they fail.
- **Explainable.** Every score comes with a breakdown that can be shown to the user and in the lab.
- **Honest percentage.** The compatibility % shown to users is built only from fit (budget, location, timing, lifestyle). Ranking extras like freshness and exposure balancing affect order but never the number.
- **Measured.** Every card shown is logged with its position, score and algorithm version.

### 8.2 Lifestyle dimensions

Eight ordinal answers on both tenant profiles and listings (the household's habits):

`food` (veg / eggetarian / non-veg) · `smoking` (no / outside only / yes) · `drinking` (no / social / regular) · `pets` (none / fine with / have) · `sleep` (early / flexible / night owl) · `cleanliness` (relaxed / tidy / spotless) · `guests` (rarely / sometimes / often) · `work_mode` (office / hybrid / home)

Each dimension has a small similarity table (same = 1, adjacent = 0.5–0.7, opposite = 0). Each person marks a dimension as _dealbreaker_, _matters_ or _don't mind_; that sets its weight, and dealbreakers become hard filters.

### 8.3 Pipeline

**Stage 0: eligibility (SQL).** Active listing; not the user's own; not already swiped (anti-join); no block in either direction; tenant passes the lister's requirements; listing passes the tenant's dealbreakers; guests see seed listings only.

**Stage 1: retrieval in tiers (SQL).**

- _Tier A, exact:_ total monthly cost ≤ budget max; inside chosen localities or commute limit; available within ±30 days of the move-in date.
- _Tier B, stretch:_ cost ≤ 1.15 × budget; 1.5 × distance or commute; ±45 days. Each stretch card carries a label saying what was stretched.

**Stage 2: scoring (pure TypeScript in `packages/feed`).** Every feature is in `[0, 1]`.

| Feature          | Meaning                                                                    | Default weight |
| ---------------- | -------------------------------------------------------------------------- | -------------- |
| `budget_fit`     | 1 at or under budget, falling to 0 at 1.2×                                 | 0.22           |
| `location_fit`   | Smooth decay on commute minutes (or distance) against the user's limit     | 0.22           |
| `lifestyle_fit`  | Harmonic mean of tenant→household and household→tenant weighted similarity | 0.25           |
| `timing_fit`     | Decay on the gap between availability and move-in date                     | 0.08           |
| `quality`        | Photo count, profile completeness, verified                                | 0.08           |
| `freshness`      | Exponential decay, 14-day half-life                                        | 0.07           |
| `affinity`       | Learned from this user's swipes (0 until the learning milestone)           | 0.08           |
| `demand_penalty` | Subtracts for listings with many pending interests, to spread exposure     | −0.05 max      |

Displayed compatibility % = `budget 0.25 + location 0.25 + timing 0.10 + lifestyle 0.40`, with the three strongest reasons and the weakest one turned into sentences.

Weights live in `ranking_configs`, are versioned, and are what the lab's sliders change.

**Stage 3: re-rank.** No two consecutive cards from the same lister or society. One slot in every eight goes to a fresh or under-exposed listing. Stretch picks are interleaved after position five and never lead.

**Stage 4: serve.** Return ten cards per page with a cursor, hydrate from Postgres, drop anything that went stale, write impressions.

### 8.4 Caching and jobs (later milestone)

- Ranked ids in a Redis sorted set `feed:{userId}:{prefsVersion}`, TTL six hours. Miss → compute and fill.
- Swipe → remove the id. Preference change → bump `prefs_version` (old key simply expires).
- New listing → an Inngest job inserts it into the cached feeds of eligible active tenants.
- Record p50/p95 for the feed endpoint before and after, and put the numbers in the README.

### 8.5 Learning from swipes (stretch)

Keep a small per-user preference vector over listing attributes (price delta, furnishing, balcony, distance, room type…) updated as a running average of liked minus passed. Its dot product with a listing becomes `affinity`. If a user repeatedly likes stretch cards, widen their Tier A bounds slightly and tell them.

### 8.6 Simulation harness

A script creates synthetic tenants with hidden "true" preferences, lets them swipe on the ranked feed, and reports: like rate in the first ten cards, swipes until first match, share of listings that ever get shown, and how unevenly impressions are spread. Run it for each ranking config; the lab displays the results. This is how ranking changes are judged, not by feel.

---

## 9. Seed data and bots

- **Ten cities, real geography.** For each city, a hand-checked file of localities with centroids and typical rent ranges, and commute anchors (major tech parks, colleges, metro hubs). Society names are invented. Ten cities is a lot of seed data: start M2 with Bangalore and one other at full depth (~20 localities, ~100 listings each) and give the rest a thinner set (~8 localities, ~30 listings), rather than spreading evenly thin. In the M1 mock, Bangalore and Gurgaon are hand-written and the other eight get six generated flats each (`lib/api/mock/city-flats.ts`).
- **~200 listings, ~80 tenants**, generated with Faker from those ranges so prices and commutes are believable.
- **Coherent photo sets.** Photos are curated into sets that plausibly belong to one flat (bedroom, living room, kitchen, bathroom, balcony, building), ~40 sets with variation. Random stock photos per listing look fake immediately. Downloaded once from free-licence sources and uploaded to Cloudinary by the seed script.
- **Rolling dates.** Seed `available_from` and `published_at` are stored relative to "today" and refreshed by the daily job, so the demo never looks abandoned.
- **Bots respond lazily.** When a tenant likes a seed listing, the interest is written as already accepted with `visible_at = now + 2–10 min` (shorter for guests: 20–40 s). A scripted two-or-three message opener is written with staggered `visible_at`. Queries only return rows whose `visible_at` has passed. No scheduler is needed. In the M1 mock (`lib/api/mock/matchmaker.ts`) two listers in three accept, 2.5 to 5 seconds after the like, and the rest never answer so that "Likes sent" has something to show; each then replies to up to four messages.
- **Labelled honestly.** Seed listings and bot profiles carry a visible `Demo` tag.

---

## 10. Privacy, safety and authorization

### 10.1 Location

- The API returns `location_public` only: the exact point snapped to a ~400 m grid plus a per-listing fixed offset. The exact point, society name and address text are returned **only** to a matched tenant and the lister. Blurring in the UI is not privacy; the server must not send what the client may not see.
- Commute times are computed server-side and rounded to 5 minutes.
- Delivered photos are Cloudinary transformations, which strip EXIF GPS.

### 10.2 Authorization

All checks live in policy functions and are covered by a test matrix: a user can read only their own interests, conversations, messages and notifications; only the lister can decide an interest; only matched parties get unlocked listing fields; guests cannot touch non-seed records.

### 10.3 Abuse limits

Rate limits on swipes, messages, listing creation and uploads (Upstash rate limiter, with an in-memory fallback). Upload signing enforces type, size (client-side compression first) and a maximum of 10 photos per listing. Message length capped. Report and block are available on every card and chat; a block hides both parties from each other everywhere.

### 10.4 Data rights

Account deletion removes the profile, listings, photos and messages. Guest accounts and their data are purged after 48 hours by the daily job.

---

## 11. Free-tier budget and demo longevity

| Service                   | Needed from   | If it disappears                                   |
| ------------------------- | ------------- | -------------------------------------------------- |
| Vercel Hobby              | M0            | —                                                  |
| Neon Postgres (+ PostGIS) | M2            | App is down (accepted)                             |
| Cloudinary                | M2            | Photos missing; show placeholders                  |
| Google OAuth              | M3            | Guest demo still works                             |
| Pusher                    | M4 (optional) | Falls back to polling                              |
| Upstash Redis             | M6            | Falls back to compute-on-read and in-memory limits |
| Inngest                   | M6            | Feeds refresh by TTL only                          |
| Sentry                    | M6            | No error reports                                   |

Rules: every dependency except Postgres is optional at runtime and guarded by an env check. The daily Vercel cron (Hobby allows one run per day) purges guests, expires interests and listings, rolls seed dates forward and touches Redis so free resources are not archived for inactivity. Check current free-tier limits at sign-up; they change.

**Google sign-in notes.** Publish the OAuth consent screen (basic scopes need no review) or only 100 hand-added test users can log in. Google login will not work on Vercel preview URLs because redirect URIs must match exactly; test login on localhost and the production domain, and use the guest demo on previews.

---

## 12. Quality bar

**Performance**

- Swiping holds 60 fps on a mid-range Android phone.
- Feed screen LCP under 2.5 s on a throttled 4G profile; first card image under ~120 KB. **Measured in M1: 4.8 s** (down from 5.8 s). The first photo is preloaded from the page, but the card itself is drawn by client code, so it waits for that code. Server-rendering the first card in M2 is what closes the gap.
- Feed endpoint p95 under 300 ms warm.
- MapLibre and the lab's charts are lazy-loaded.

**Accessibility**

- Every action reachable by button and keyboard; visible focus rings; labelled controls; photo alt text from room tags; reduced-motion support; contrast per 4.1.

**Mobile web details**

- `100dvh` layouts, safe-area insets, no rubber-band scrolling under the deck, PWA manifest and icons, sheet scrolling that does not fight card gestures.

**Testing**

- `packages/feed`: unit tests plus property tests (scores stay in range; a cheaper otherwise-identical flat never ranks lower).
- API: integration tests against PostGIS, including the authorization matrix and "exact location never leaks before a match".
- End-to-end (Playwright, mobile viewport): guest demo → swipe → bot match → chat.
- CI on every push: lint, typecheck, tests, build.

**Portfolio finish**

- README with a GIF, an architecture diagram, how the ranking works, the cache before/after numbers and one `EXPLAIN ANALYZE` story.

---

## 13. Milestones

**Progress (16 Nov 2026).** M0, M1 and M2 are done and live. **M3 is nearly done.** Live: the front-desk sign-in screen, guest accounts, Google sign-in, profiles in the database, privacy and terms pages, and posting a flat to the database with the two posting rules. Built and tested, waiting to be pushed: photo uploads, the "posted on site" location mark, the name prompt at the first like, flats that expire after thirty days, the report button, and a public share page for each flat. Photo uploads also wait on the three Cloudinary settings; they have been tested with stand-in settings only, not with a real upload. Left out of M3 on purpose: "Try the demo" with a persona, since "Continue as a guest" now does that job. Then M4 real matching, M5 feed engine, M6 scale.

Each milestone ends deployed to Vercel and demoable. Do not start the next one until the "done when" list is true.

**M0. Foundations**
Monorepo, TypeScript strict, lint/format, CI, design tokens and fonts, an empty app shell deployed.
_Done when:_ the production URL shows the styled shell and CI is green.

**M1. The feel (front end on mock data)**
Deck with full gesture spec, card anatomy, detail sheet, tab bar, desktop layout, landing page with the live deck, empty/loading states. Each screen brings its roadside motifs from 4.7 (lit/unlit tab bar, sign assembly on the landing page, amenity plaques, guest check, neon line drawings). Mock API behind the shared contracts.
_Done when:_ swiping on a real phone feels right, every action works by keyboard, and the desktop layout looks deliberate.

**M2. Data and a real feed (v0)**
Schema and migrations, city dataset, photo sets, seed pipeline, Hono API, typed client, feed with hard filters (compute-on-read), swipes persisted, undo.
_Done when:_ the deck runs on database data and a swiped flat never comes back.

_As built._ `packages/db` holds the Drizzle schema (users, localities, listings, listing photos, swipes), one migration, and the seed pipeline: 142 demo flats across the ten cities (the 22 hand-written ones plus two generated rounds per city), with fixed ids so re-seeding updates in place. The same flats feed the in-browser mock (`@repo/db/seed-data`). `packages/api` is the Hono app (`/api/v1`: feed, feed count, localities, swipes, undo, reset passes, saved), mounted in Next at `app/api/[[...route]]`. The web app reads flats and swipes from it when `DATABASE_URL` is set at build time, and from the mock otherwise; profiles, matches, chat and the lister side stay on the mock until M3 and M4. Choices made where the plan was silent or heavier than needed:

- **Who is swiping.** Until sign-in (M3), a visitor is a random id in an http-only cookie (`flatch_visitor`), and swipes are stored against it. M3 replaces this with Better Auth's guest accounts.
- **Photos** stay on Unsplash's image server, stored as plain addresses. Cloudinary moves to M3, when people upload their own. One less account for now.
- **Dates.** A seed flat stores "free in N days" and the API counts from today on every read, so no daily job is needed for dates.
- **Match score, commute and stretch label** are the hand-written seed values, stored on the listing, until M5 works them out per tenant. The feed is ordered by that score.
- **Location.** `location_public` is the exact point snapped to a ~400 m grid plus a fixed per-flat offset (`packages/db/src/location.ts`). The feed query does not select the private columns and the serializer's input type has no place for them; both are tested.
- **One database for now.** Local development and the live site share it. A separate Neon dev branch is worth adding when real accounts arrive.
- **One query per page.** Photos are gathered in the same query as the flats (`json_agg`), which took the feed from about 850 ms to about 300 ms when the database is far away.
- **Tests.** Pure parts are unit-tested (location, seed rows, cursors, serializer). The SQL was checked by hand against the real database (paging, filters, swipes, undo, saved, two visitors kept apart); automated tests that run SQL need the PostGIS container in CI (section 12) and are not written yet.
- **Not yet:** commute anchors and the commute matrix (M5), ~80 seed tenants (M4), server-rendering the first card.

**M3. Accounts and onboarding**
Better Auth (Google + guest), "Try the demo", tenant onboarding with the live match counter, profile-at-first-like, lister onboarding and the create-listing wizard with signed uploads.
_Done when:_ a stranger reaches a personalised feed in under 10 seconds via the demo, and a Google user can publish a listing with photos.

_As built so far._ Sign-in is Better Auth, mounted by the API at `/api/auth/*`, with its tables in `packages/db` (`users`, `sessions`, `accounts`, `verifications`) and UUID ids. Choices made where the plan was silent:

- **The front desk (`/sign-in`).** A visitor with no session who presses "Start swiping" (or opens any app screen) is asked once how they want to come in: "Continue with Google" or "Continue as a guest". The choice is theirs; nothing is created before they make it. Someone who already has a session goes straight through, and the landing page stays open to everyone. Where Google sign-in is not set up there is nothing to choose, so a guest session is started quietly. Every `/api/v1` route needs a session and answers 401 without one; the app then sends the person back to the front desk. This replaces M2's visitor cookie.
- **Signing in with Google** later, from the Profile tab, carries the guest's swipes and profile to the account (`moveGuestData`). Sign-in itself was checked by hand; the carry-over has no automated test.
- **Profile storage.** The name and "about" live on the user; the rest is one `profiles` row with the preferences kept whole as JSON. M5 will pull out the columns it needs to rank by.
- **Session cookie signing.** `BETTER_AUTH_SECRET` if set, otherwise a key worked out from `DATABASE_URL`, so a deployment needs no extra setting.
- **Check out** deletes a guest's account and everything of theirs. A signed-in person gets "Sign out" and "Delete my account" instead.
- **Check-in belongs to the tenant side.** A lister is let in without it; switching to the tenant side takes someone who never answered it to check-in (`hasCheckedIn`).
- **Posting a flat** is saved on the server (`/api/v1/listings`). Rules, all in `packages/api/src/policies.ts` with a test matrix: a guest cannot post wherever sign-in is offered; one person can have two flats open at once; only the lister can switch or take down a flat, and anyone else is told it does not exist. Photos must be from the offered sample set and list choices from the offered options, so nothing free-typed rides along. The flat's location is a point near the middle of its area (the form has no map pin yet), and only the snapped public point is sent out.
- **Photo uploads** (`packages/api/src/cloudinary.ts`, `apps/web/lib/photo-upload.ts`). The browser redraws each photo on a canvas at no more than 1600 px and saves a fresh JPEG, which makes it quick to send and removes everything hidden in the file, including where it was taken. It then asks the API for a ticket and sends the photo straight to Cloudinary. A ticket is signed for one photo, in the person's own folder, image formats only. When a flat is posted, each photo must be a sample or an address in the poster's own folder; anything else is refused. Taking a flat down removes its uploads. Uploads are offered only when the three Cloudinary settings exist and the person may post. Photos left behind by an abandoned form are not cleaned up yet (M6).
- **"Posted on site"** (`checkOnSite` in `packages/shared`). A lister can confirm, when posting or later from Your flats, that they are at the flat: the browser asks for the device's location once and sends it. If it is precise to 500 m and within 6 km of the middle of the chosen area, the flat gets the mark (`isVerified`) and that spot becomes its private location, from which the public point is worked out as usual. It shows the lister stood there; it does not prove the flat is theirs, and a determined person can fake a browser's location. The card and the detail sheet say "Posted on site", not "Verified".
- **Name prompt at the first like.** A tenant with no name who likes a flat is asked once, by a toast, whether to add one.
- **Flats expire.** A posted flat stays on the board for thirty days (`expires_at`; demo flats have none). The feed and the share page leave out a flat whose time is up, checked on every read, so no scheduled job is needed. From seven days before, Your flats shows a reminder with a "Still available" button, which gives a fresh thirty days. An expired flat does not use up one of the lister's two places.
- **Reports** (`reports` table, `mayReportListing`). A signed-in person can report a flat someone else posted, from the bottom of its details: a reason from a short list and an optional note. One report per person per flat. Reports from three different signed-in people set `under_review`, which takes the flat off the board and the share page; its lister is told, and cannot switch it back on. Guests cannot report (a guest costs nothing to make), and demo flats and one's own flat cannot be reported. There is no screen for reviewing reports yet: clearing `under_review` is done in the database by hand. Reporting a chat waits for real chat (M4).
- **Share page** (`/flat/[id]`). Anyone with the link can open it, signed in or not. It shows only the public details, without the personal match score, and carries a preview image and description so the link looks right in messaging apps. It is drawn fresh on each visit, so a flat that is taken down, expired or reported stops showing at once. Share buttons are on the flat's details and on Your flats; they use the phone's share sheet where there is one and copy the link otherwise.
- **Who sees a posted flat.** Signed-in people see it in the deck for its city; its lister does not, and guests see demo flats only. It shows no match score until M5. A like on it is stored but nothing answers yet: the bot listers only speak for demo flats, and real interest and acceptance are M4.
- **Bot tenants for a posted flat** still come from the browser mock, which keeps a copy of the person's flats for that purpose (`syncListings`), so the lister side stays a working demo until M4.
- **Browser copy.** The profile is also kept in the browser, because the mock's chats and bot tenants read the person's name from there until M4. Answers given before accounts existed are sent up once.

**M4. The match loop**
Interests, lister deck, accept/decline, bot responses, match moment, conversations and chat (polling behind the transport interface, then Pusher), in-app notifications, address unlock, report/block.
_Done when:_ the guest demo goes like → match → chat with no manual help, and the authorization tests pass.

**M5. Feed engine v1**
Scoring, reciprocal filters, tiers and stretch labels, re-rank, compatibility ring and reasons, commute matrix, real monthly cost, price badge, impressions, ranking lab, simulation harness.
_Done when:_ the lab reorders live, the simulation prints metrics for at least two configs, and feed tests pass.

**M6. Scale and polish**
Redis feed cache, Inngest jobs, rate limits, Sentry, daily cron, performance and accessibility passes, PWA, end-to-end tests, README.
_Done when:_ the quality bar in section 12 is met and the before/after cache numbers are recorded.

**M7. Stretch (pick any)**
Learning from swipes, duplicate-photo detection with perceptual hashes, visit scheduling in chat, lister analytics, web push, LinkedIn verified badge, group approval for multi-flatmate listings.

---

## 14. Kickoff prompts

**Master prompt (start of any work session):**

> We're building the flatmate swipe app in this repo. Read `CLAUDE.md` and `docs/SPEC.md` in full before writing code; the spec is the source of truth. We are on milestone **M_**. Build only what that milestone lists, to the "done when" criteria. Work in small steps and verify each one by running it: typecheck, tests, and the app itself in a mobile viewport. Where the spec is silent, choose the simplest option consistent with it and tell me what you chose. Tell me when you need me to create an account or paste a key into `.env.local`; never ask me to paste secrets in chat. At the end, show me the app running, list what is done and what is not, and stop. Do not start the next milestone.

**Per-milestone additions**

- **M1:** "Spend your effort on how the deck feels. Follow the gesture numbers in 3.3 exactly, then tune by trying it. Build against the mock API. Show me the deck on a phone-sized viewport and the desktop layout before polishing anything else."
- **M2:** "Before generating data, show me the locality and anchor list for review. Seed data must follow section 9, including coherent photo sets and rolling dates."
- **M3:** "The guest demo is the priority path; Google sign-in comes second. Walk me through the Google Cloud console steps when you reach them."
- **M4:** "Write the authorization test matrix first, then the endpoints."
- **M5:** "Implement the feed in `packages/feed` as pure functions with tests before wiring it to the API. Then build the lab on top of the same functions."
- **M6:** "Measure the feed endpoint before adding the cache, and again after. Keep both sets of numbers."

---

## 15. Defaults chosen (change any of these by telling me)

- Cities: Bangalore, Hyderabad, Pune, Chennai, Mumbai, Delhi, Gurgaon, Noida, Kolkata and Ahmedabad. Bangalore is shown by default.
- Name: Flatch.
- Guests can only interact with seed listings.
- Declines are silent.
- Interests expire after 14 days; listings after 45.
- Dark theme only.
