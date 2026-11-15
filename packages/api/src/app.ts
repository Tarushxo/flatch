import { zValidator } from "@hono/zod-validator";
import { getDb, hasDatabase } from "@repo/db";
import { CITIES, ROOM_TYPES, SWIPE_ACTIONS } from "@repo/shared";
import { FeedFiltersSchema } from "@repo/shared/schemas";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { countFeed, getFeedPage, getLocalityNames } from "./services/feed";
import { getSaved, recordSwipes, resetPasses, undoSwipe } from "./services/swipes";

/*
 * The HTTP API, mounted by the web app at /api (see apps/web/app/api). Routes
 * check their input and call a service; the logic lives in the services.
 *
 * Until sign-in arrives (M3) a person is a "visitor": a random id kept in a
 * cookie the page's own scripts cannot read. Swipes are stored against it.
 */

const VISITOR_COOKIE = "flatch_visitor";
const YEAR_SECONDS = 60 * 60 * 24 * 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Env = { Variables: { visitorId: string; requestId: string } };

/** One value or several under the same name in the address, always as a list. */
const many = <T extends z.ZodType>(item: T) =>
  z
    .union([item, z.array(item)])
    .optional()
    .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]));

const FeedQuerySchema = z.object({
  city: z.enum(CITIES),
  max: z.coerce.number().int().positive().optional(),
  area: many(z.string().min(1).max(80)),
  room: many(z.enum(ROOM_TYPES)),
  cursor: z.string().max(200).optional(),
});

const SwipeBatchSchema = z.object({
  swipes: z
    .array(
      z.object({
        clientId: z.uuid(),
        listingId: z.uuid(),
        action: z.enum(SWIPE_ACTIONS),
      }),
    )
    .max(100),
});

/** Every failure has the same shape, so the app has one thing to handle. */
function problem(code: string, message: string) {
  return { error: { code, message } };
}

const invalid = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) =>
  result.success
    ? undefined
    : c.json(problem("invalid_input", "That request was not understood."), 400);

const routes = new Hono<Env>()
  .get("/health", (c) => c.json({ ok: true, database: hasDatabase() }))

  .get(
    "/localities",
    zValidator("query", z.object({ city: z.enum(CITIES) }), invalid),
    async (c) => {
      const { city } = c.req.valid("query");
      return c.json({ localities: await getLocalityNames(getDb(), city) });
    },
  )

  .get("/feed", zValidator("query", FeedQuerySchema, invalid), async (c) => {
    const query = c.req.valid("query");
    const page = await getFeedPage(getDb(), {
      filters: {
        city: query.city,
        budgetMax: query.max ?? null,
        localities: query.area,
        roomTypes: query.room,
      },
      userId: c.get("visitorId"),
      cursor: query.cursor ?? null,
    });
    return c.json(page);
  })

  .post("/feed/count", zValidator("json", FeedFiltersSchema, invalid), async (c) => {
    const count = await countFeed(getDb(), {
      filters: c.req.valid("json"),
      userId: c.get("visitorId"),
    });
    return c.json({ count });
  })

  .post("/swipes", zValidator("json", SwipeBatchSchema, invalid), async (c) => {
    await recordSwipes(getDb(), c.get("visitorId"), c.req.valid("json").swipes);
    return c.json({ ok: true });
  })

  .post("/swipes/reset-passes", async (c) => {
    await resetPasses(getDb(), c.get("visitorId"));
    return c.json({ ok: true });
  })

  .delete(
    "/swipes/:listingId",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    async (c) => {
      await undoSwipe(getDb(), c.get("visitorId"), c.req.valid("param").listingId);
      return c.json({ ok: true });
    },
  )

  .get("/saved", async (c) => c.json({ items: await getSaved(getDb(), c.get("visitorId")) }));

export const app = new Hono<Env>()
  .basePath("/api/v1")
  .use(async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);

    let visitorId = getCookie(c, VISITOR_COOKIE);
    if (!visitorId || !UUID.test(visitorId)) {
      visitorId = crypto.randomUUID();
      setCookie(c, VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: "Lax",
        secure: new URL(c.req.url).protocol === "https:",
        path: "/",
        maxAge: YEAR_SECONDS,
      });
    }
    c.set("visitorId", visitorId);

    // Personal answers must never be kept by a shared cache.
    c.header("cache-control", "private, no-store");
    await next();
  })
  .route("/", routes)
  .notFound((c) => c.json(problem("not_found", "There is nothing at this address."), 404))
  .onError((error, c) => {
    console.error(`[${c.get("requestId")}] ${c.req.method} ${c.req.path}`, error);
    if (!hasDatabase()) {
      return c.json(problem("no_database", "The database is not set up on this server."), 503);
    }
    return c.json(problem("internal", "Something went wrong on our side."), 500);
  });

export type AppType = typeof app;
