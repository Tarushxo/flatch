import { zValidator } from "@hono/zod-validator";
import { getDb, hasDatabase } from "@repo/db";
import { type Account, CITIES, ROOM_TYPES, SWIPE_ACTIONS } from "@repo/shared";
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
import { countFeed, getFeedPage, getLocalityNames } from "./services/feed";
import {
  confirmOnSite,
  createListing,
  deleteListing,
  getMyListings,
  Refused,
  renewListing,
  reportListing,
  setListingOpen,
} from "./services/listings";
import { getProfile, saveProfile } from "./services/me";
import { getSaved, recordSwipes, resetPasses, undoSwipe } from "./services/swipes";

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

/** The person asking, as the services and policies know them. */
function viewer(c: { get: (key: "userId" | "account") => unknown }) {
  return { userId: c.get("userId") as string, isGuest: (c.get("account") as Account).isGuest };
}

const routes = new Hono<Env>()
  .get("/me", async (c) =>
    c.json({ profile: await getProfile(getDb(), c.get("userId")), account: c.get("account") }),
  )

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
    await recordSwipes(getDb(), c.get("userId"), c.req.valid("json").swipes);
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

  // A ticket to send one photo straight to the image store.
  .post("/uploads/ticket", async (c) => {
    const storage = cloudinaryConfig();
    if (!storage) throw new Refused(409, "no_uploads", "Photo uploads are not set up here.");
    const refusal = mayUploadPhotos(viewer(c), { signInOffered: googleEnabled() });
    if (refusal) throw new Refused(403, refusal.code, refusal.message);
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
    const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
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
