import { zValidator } from "@hono/zod-validator";
import { getDb, hasDatabase } from "@repo/db";
import {
  type Account,
  CITIES,
  hasCheckedIn,
  MESSAGE_MAX_LENGTH,
  preferencesToFilters,
  REQUEST_MAX_BYTES,
  ROOM_TYPES,
  SWIPE_ACTIONS,
} from "@repo/shared";
import {
  DevicePositionSchema,
  FeedFiltersSchema,
  ListingSubmissionSchema,
  ReportSchema,
  TenantProfileSchema,
} from "@repo/shared/schemas";
import { Hono } from "hono";
import { z } from "zod";
import { getAuth, googleEnabled } from "./auth";
import { cloudinaryConfig, uploadTicket } from "./cloudinary";
import { mayUploadPhotos } from "./policies";
import { Refused } from "./refused";
import { countFeed, getFeedPage, getLocalityNames } from "./services/feed";
import {
  confirmOnSite,
  createListing,
  deleteListing,
  getMyListings,
  renewListing,
  reportListing,
  setListingOpen,
} from "./services/listings";
import {
  decideApplicant,
  getApplicants,
  getMatches,
  getMessages,
  getPendingLikes,
  markRead,
  sendMessage,
  unmatch,
} from "./services/matching";
import { getProfile, saveProfile } from "./services/me";
import { getSaved, recordSwipes, resetPasses, undoSwipe } from "./services/swipes";
import { spend } from "./services/usage";

/*
 * The HTTP API, mounted by the web app at /api (see apps/web/app/api). Routes
 * check their input and call a service; the logic lives in the services.
 *
 * /api/auth/* belongs to the sign-in library. Everything under /api/v1 needs
 * a session, which every visitor has: the app makes a guest account for anyone
 * who arrives without one.
 */

type Env = { Variables: { userId: string; account: Account; requestId: string } };

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

/** What the page asks for as it opens: `deck=1` when it is the deck, plus any filters in its address. */
const StartQuerySchema = z.object({
  deck: z.literal("1").optional(),
  max: z.coerce.number().int().positive().optional(),
  area: many(z.string().min(1).max(80)),
  room: many(z.enum(ROOM_TYPES)),
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

const MatchParam = z.object({ matchId: z.uuid() });

/** The person asking, as the services and policies know them. */
function viewer(c: { get: (key: "userId" | "account") => unknown }) {
  return { userId: c.get("userId") as string, isGuest: (c.get("account") as Account).isGuest };
}

const routes = new Hono<Env>()
  .get("/me", async (c) =>
    c.json({ profile: await getProfile(getDb(), c.get("userId")), account: c.get("account") }),
  )

  /**
   * Everything a page needs as it opens, in one trip: who the person is and,
   * for the deck, its first cards. The page asks for this before its own code
   * has loaded, so the first card is not kept waiting behind two requests made
   * one after the other. The deck starts from the saved preferences, or from
   * the filters in the page's address if it carries any (the same rule the app
   * itself uses), and the answer says which filters were used.
   */
  .get("/start", zValidator("query", StartQuerySchema, invalid), async (c) => {
    const query = c.req.valid("query");
    const db = getDb();
    const profile = await getProfile(db, c.get("userId"));
    const account = c.get("account");
    // Only someone who will be shown the deck gets one dealt.
    if (query.deck !== "1" || profile.mode !== "tenant" || !hasCheckedIn(profile)) {
      return c.json({ profile, account, deck: null });
    }
    const saved = preferencesToFilters(profile.preferences);
    const inAddress = query.max !== undefined || query.area.length > 0 || query.room.length > 0;
    const filters = inAddress
      ? {
          city: saved.city,
          budgetMax: query.max ?? null,
          localities: query.area,
          roomTypes: query.room,
        }
      : saved;
    const page = await getFeedPage(db, {
      filters,
      viewer: viewer(c),
      cursor: null,
      tenant: profile.preferences,
    });
    return c.json({ profile, account, deck: { filters, page } });
  })

  .patch("/me/tenant-profile", zValidator("json", TenantProfileSchema, invalid), async (c) =>
    c.json({ profile: await saveProfile(getDb(), c.get("userId"), c.req.valid("json")) }),
  )

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
      viewer: viewer(c),
      cursor: query.cursor ?? null,
    });
    return c.json(page);
  })

  .post("/feed/count", zValidator("json", FeedFiltersSchema, invalid), async (c) => {
    const count = await countFeed(getDb(), {
      filters: c.req.valid("json"),
      viewer: viewer(c),
    });
    return c.json({ count });
  })

  .post("/swipes", zValidator("json", SwipeBatchSchema, invalid), async (c) => {
    await recordSwipes(getDb(), viewer(c), c.req.valid("json").swipes);
    return c.json({ ok: true });
  })

  .post("/swipes/reset-passes", async (c) => {
    await resetPasses(getDb(), c.get("userId"));
    return c.json({ ok: true });
  })

  .delete(
    "/swipes/:listingId",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    async (c) => {
      await undoSwipe(getDb(), c.get("userId"), c.req.valid("param").listingId);
      return c.json({ ok: true });
    },
  )

  .get("/saved", async (c) => c.json({ items: await getSaved(getDb(), c.get("userId")) }))

  .get("/listings/mine", async (c) =>
    c.json({ items: await getMyListings(getDb(), c.get("userId")) }),
  )

  .post("/listings", zValidator("json", ListingSubmissionSchema, invalid), async (c) => {
    const listing = await createListing(getDb(), viewer(c), c.req.valid("json"), {
      signInOffered: googleEnabled(),
      storage: cloudinaryConfig(),
    });
    return c.json({ listing }, 201);
  })

  .post(
    "/listings/:listingId/on-site",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    zValidator("json", DevicePositionSchema, invalid),
    async (c) => {
      const { listingId } = c.req.valid("param");
      const listing = await confirmOnSite(getDb(), viewer(c), listingId, c.req.valid("json"));
      return c.json({ listing });
    },
  )

  .post(
    "/listings/:listingId/renew",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    async (c) =>
      c.json({
        listing: await renewListing(getDb(), viewer(c), c.req.valid("param").listingId),
      }),
  )

  .post(
    "/listings/:listingId/report",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    zValidator("json", ReportSchema, invalid),
    async (c) => {
      await reportListing(getDb(), viewer(c), c.req.valid("param").listingId, c.req.valid("json"), {
        signInOffered: googleEnabled(),
      });
      return c.json({ ok: true });
    },
  )

  // ---- likes, matches and chat
  .get("/likes/pending", async (c) =>
    c.json({ items: await getPendingLikes(getDb(), c.get("userId")) }),
  )

  .get("/matches", async (c) => c.json({ items: await getMatches(getDb(), c.get("userId")) }))

  .get("/matches/:matchId/messages", zValidator("param", MatchParam, invalid), async (c) =>
    c.json({ items: await getMessages(getDb(), viewer(c), c.req.valid("param").matchId) }),
  )

  .post(
    "/matches/:matchId/messages",
    zValidator("param", MatchParam, invalid),
    zValidator("json", z.object({ body: z.string().max(MESSAGE_MAX_LENGTH * 2) }), invalid),
    async (c) => {
      const { matchId } = c.req.valid("param");
      const message = await sendMessage(getDb(), viewer(c), matchId, c.req.valid("json").body);
      return c.json({ message }, 201);
    },
  )

  .post("/matches/:matchId/read", zValidator("param", MatchParam, invalid), async (c) => {
    await markRead(getDb(), viewer(c), c.req.valid("param").matchId);
    return c.json({ ok: true });
  })

  .delete("/matches/:matchId", zValidator("param", MatchParam, invalid), async (c) => {
    await unmatch(getDb(), viewer(c), c.req.valid("param").matchId);
    return c.json({ ok: true });
  })

  // ---- the lister's side: tenants who liked a flat
  .get(
    "/applicants",
    zValidator("query", z.object({ listingId: z.uuid().optional() }), invalid),
    async (c) =>
      c.json({
        items: await getApplicants(getDb(), c.get("userId"), c.req.valid("query").listingId),
      }),
  )

  .post(
    "/applicants/:applicantId/decision",
    zValidator("param", z.object({ applicantId: z.uuid() }), invalid),
    zValidator("json", z.object({ decision: z.enum(["accept", "decline"]) }), invalid),
    async (c) =>
      c.json(
        await decideApplicant(
          getDb(),
          viewer(c),
          c.req.valid("param").applicantId,
          c.req.valid("json").decision,
        ),
      ),
  )

  // A ticket to send one photo straight to the image store.
  .post("/uploads/ticket", async (c) => {
    const storage = cloudinaryConfig();
    if (!storage) throw new Refused(409, "no_uploads", "Photo uploads are not set up here.");
    const refusal = mayUploadPhotos(viewer(c), { signInOffered: googleEnabled() });
    if (refusal) throw new Refused(403, refusal.code, refusal.message);
    // Each ticket lets one photo into the image store, so tickets are what is counted.
    await spend(getDb(), c.get("userId"), "upload");
    return c.json({ ticket: uploadTicket(storage, c.get("userId")) });
  })

  .patch(
    "/listings/:listingId",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    zValidator("json", z.object({ isOpen: z.boolean() }), invalid),
    async (c) => {
      const { listingId } = c.req.valid("param");
      const { isOpen } = c.req.valid("json");
      return c.json({ listing: await setListingOpen(getDb(), viewer(c), listingId, isOpen) });
    },
  )

  .delete(
    "/listings/:listingId",
    zValidator("param", z.object({ listingId: z.uuid() }), invalid),
    async (c) => {
      await deleteListing(getDb(), viewer(c), c.req.valid("param").listingId, cloudinaryConfig());
      return c.json({ ok: true });
    },
  );

/** Routes that need to know who is asking. */
const signedIn = new Hono<Env>()
  .use(async (c, next) => {
    // The sign-in library answers with the session and with cookies to set: a fresh short-lived
    // copy of the session once the last one has run out, and the session cookie itself, renewed,
    // when it is a day or more old. Those cookies have to travel back on our answer. When they
    // were dropped, every request after the first five minutes looked the session up in the
    // database again, and everyone was signed out a week after signing in however often they
    // came back, which for a guest means losing everything.
    const { response: session, headers: fromAuth } = await getAuth().api.getSession({
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    for (const cookie of fromAuth.getSetCookie()) c.header("set-cookie", cookie, { append: true });
    if (!session) {
      return c.json(
        problem("signed_out", "Your session has ended. Reload to start a new one."),
        401,
      );
    }
    const guest = Boolean((session.user as { isAnonymous?: boolean | null }).isAnonymous);
    c.set("userId", session.user.id);
    c.set("account", {
      isGuest: guest,
      email: guest ? null : session.user.email,
      canSignIn: googleEnabled(),
      canUpload: cloudinaryConfig() !== null && !(guest && googleEnabled()),
    });
    await next();
  })
  .route("/", routes);

export const app = new Hono<Env>()
  .basePath("/api")
  .use(async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  })
  // Sign-in, sign-out and the session itself.
  .on(["GET", "POST"], "/auth/*", (c) => getAuth().handler(c.req.raw))
  .get("/v1/health", (c) =>
    c.json({
      ok: true,
      database: hasDatabase(),
      google: googleEnabled(),
      uploads: cloudinaryConfig() !== null,
    }),
  )
  .use("/v1/*", async (c, next) => {
    // Personal answers must never be kept by a shared cache.
    c.header("cache-control", "private, no-store");
    await next();
  })
  // Nothing the app sends is anywhere near this size; anything that says it is bigger is not
  // read at all. (Hono's own body-limit helper is not used: it rebuilds the request, which
  // fails inside Next for a request with no body, such as an undo or an unmatch.)
  .use("/v1/*", async (c, next) => {
    if (Number(c.req.header("content-length") ?? 0) > REQUEST_MAX_BYTES) {
      return c.json(problem("too_large", "That request is too large."), 413);
    }
    await next();
  })
  .route("/v1", signedIn)
  .notFound((c) => c.json(problem("not_found", "There is nothing at this address."), 404))
  .onError((error, c) => {
    // A refusal is an ordinary answer, not a fault.
    if (error instanceof Refused) return c.json(problem(error.code, error.message), error.status);
    console.error(`[${c.get("requestId")}] ${c.req.method} ${c.req.path}`, error);
    if (!hasDatabase()) {
      return c.json(problem("no_database", "The database is not set up on this server."), 503);
    }
    return c.json(problem("internal", "Something went wrong on our side."), 500);
  });

export type AppType = typeof app;
