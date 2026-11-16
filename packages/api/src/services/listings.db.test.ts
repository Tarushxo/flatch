import { interests, listings, swipes } from "@repo/db";
import { DAILY_LIMITS, LISTING_LIMITS, REPORTS_TO_PAUSE } from "@repo/shared";
import { MyListingSchema } from "@repo/shared/schemas";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../policies";
import { draftFlat, person, postFlat, type TestDb, testDatabase } from "../testing/database";
import { getPublicListing } from "./feed";
import {
  createListing,
  deleteListing,
  getMyListings,
  renewListing,
  reportListing,
  setListingOpen,
} from "./listings";
import { recordSwipes } from "./swipes";

let t: TestDb;
beforeAll(async () => {
  t = await testDatabase();
}, 60_000);
afterAll(() => t.close());

const gone = { status: 404 };
const WITH_SIGN_IN = { signInOffered: true, storage: null };
const report = (who: Actor, listingId: string, signInOffered = true) =>
  reportListing(t.db, who, listingId, { reason: "fake" }, { signInOffered });

describe("posting a flat", () => {
  it("stores it, and gives its private details back to its lister only", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    expect(MyListingSchema.safeParse(flat).error?.issues ?? []).toEqual([]);
    expect(flat).toMatchObject({
      society: "Secret Court",
      addressLine: "Flat 9Z, Hidden Street",
      isOpen: true,
      underReview: false,
      interestedCount: 0,
      matchCount: 0,
    });
    expect((await getMyListings(t.db, lister.userId)).map((each) => each.id)).toEqual([flat.id]);

    const stranger = await person(t.db, { guest: false });
    expect(await getMyListings(t.db, stranger.userId)).toEqual([]);
    const shared = JSON.stringify(await getPublicListing(t.db, flat.id));
    expect(shared).toContain("A room near the lake");
    expect(shared).not.toContain("Secret Court");
    expect(shared).not.toContain("Hidden Street");
  });

  it("is refused to a guest wherever signing in is on offer", async () => {
    const guest = await person(t.db);
    await expect(createListing(t.db, guest, draftFlat(), WITH_SIGN_IN)).rejects.toMatchObject({
      status: 403,
      code: "sign_in_required",
    });
    expect(await getMyListings(t.db, guest.userId)).toEqual([]);
  });

  it("is refused for an area that does not exist, or a photo from somewhere else", async () => {
    const lister = await person(t.db, { guest: false });
    await expect(postFlat(t.db, lister, { locality: "Atlantis" })).rejects.toMatchObject({
      status: 400,
      code: "unknown_area",
    });
    const stolen = {
      url: "https://example.com/someone-elses-photo.jpg",
      roomTag: "bedroom" as const,
      dominantColor: "#336699",
    };
    await expect(
      postFlat(t.db, lister, { photos: [stolen, ...draftFlat().photos.slice(0, 2)] }),
    ).rejects.toMatchObject({ status: 400, code: "unknown_photo" });
    expect(await getMyListings(t.db, lister.userId)).toEqual([]);
  });

  it("stops at the number of flats one person may have open, and at the day's limit", async () => {
    const lister = await person(t.db, { guest: false });
    for (let n = 0; n < LISTING_LIMITS.openMax; n++) await postFlat(t.db, lister);
    await expect(postFlat(t.db, lister)).rejects.toMatchObject({
      status: 409,
      code: "listing_limit",
    });

    // Switching one off makes room, until the day's count of posts runs out.
    const [first] = await getMyListings(t.db, lister.userId);
    await setListingOpen(t.db, lister, first?.id ?? "", false);
    await postFlat(t.db, lister);
    await t.db.execute(sql`
      update daily_usage set count = ${DAILY_LIMITS.listing}
      where user_id = ${lister.userId}::uuid and kind = 'listing'
    `);
    const [open] = (await getMyListings(t.db, lister.userId)).filter((each) => each.isOpen);
    await setListingOpen(t.db, lister, open?.id ?? "", false);
    await expect(postFlat(t.db, lister)).rejects.toMatchObject({
      status: 429,
      code: "daily_limit",
    });
  });
});

describe("someone else's flat", () => {
  it("cannot be switched, renewed or taken down, and reads as not there", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    const stranger = await person(t.db, { guest: false });
    await expect(setListingOpen(t.db, stranger, flat.id, false)).rejects.toMatchObject(gone);
    await expect(renewListing(t.db, stranger, flat.id)).rejects.toMatchObject(gone);
    await expect(deleteListing(t.db, stranger, flat.id, null)).rejects.toMatchObject(gone);
    expect((await getMyListings(t.db, lister.userId))[0]).toMatchObject({ isOpen: true });
  });
});

describe("a flat's time on the board", () => {
  it("runs out, and is put back by its lister saying it is still available", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    expect(flat.expiresAt).not.toBeNull();

    await t.db
      .update(listings)
      .set({ expiresAt: sql`now() - interval '1 hour'` })
      .where(eq(listings.id, flat.id));
    expect((await getMyListings(t.db, lister.userId))[0]).toMatchObject({ isOpen: false });
    expect(await getPublicListing(t.db, flat.id)).toBeNull();

    const renewed = await renewListing(t.db, lister, flat.id);
    expect(renewed.isOpen).toBe(true);
    expect(Date.parse(renewed.expiresAt ?? "")).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    expect(await getPublicListing(t.db, flat.id)).not.toBeNull();
  });
});

describe("reports", () => {
  it("take a flat off the board once enough different signed-in people have made one", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    const reporters = await Promise.all(
      Array.from({ length: REPORTS_TO_PAUSE }, () => person(t.db, { guest: false })),
    );

    // The same person reporting again and again counts once.
    const [keen, ...others] = reporters;
    if (!keen) throw new Error("no reporters");
    for (let n = 0; n < REPORTS_TO_PAUSE + 2; n++) await report(keen, flat.id);
    expect(await getPublicListing(t.db, flat.id)).not.toBeNull();

    for (const other of others) await report(other, flat.id);
    expect(await getPublicListing(t.db, flat.id)).toBeNull();
    expect((await getMyListings(t.db, lister.userId))[0]).toMatchObject({ underReview: true });

    // Its lister cannot simply switch it back on.
    for (const tryIt of [
      () => setListingOpen(t.db, lister, flat.id, true),
      () => renewListing(t.db, lister, flat.id),
    ]) {
      await expect(tryIt()).rejects.toMatchObject({ status: 409, code: "under_review" });
    }
  });

  it("are refused from a guest, on a demo flat, and on one's own flat", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    await expect(report(await person(t.db), flat.id)).rejects.toMatchObject({
      code: "sign_in_required",
    });
    await expect(report(lister, flat.id)).rejects.toMatchObject({ code: "own_flat" });

    const [demo] = await t.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.isSeed, true))
      .limit(1);
    await expect(
      report(await person(t.db, { guest: false }), demo?.id ?? ""),
    ).rejects.toMatchObject({ code: "demo_flat" });
    await expect(
      report(await person(t.db, { guest: false }), crypto.randomUUID()),
    ).rejects.toMatchObject(gone);
  });
});

describe("taking a flat down", () => {
  it("removes it with the swipes and likes on it", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    const tenant = await person(t.db, { guest: false });
    await recordSwipes(t.db, tenant, [
      { clientId: crypto.randomUUID(), listingId: flat.id, action: "like" },
    ]);
    const left = async () => ({
      swipes: (await t.db.select().from(swipes).where(eq(swipes.listingId, flat.id))).length,
      likes: (await t.db.select().from(interests).where(eq(interests.listingId, flat.id))).length,
    });
    expect((await left()).swipes).toBe(1);
    expect((await left()).likes).toBeGreaterThanOrEqual(1);

    await deleteListing(t.db, lister, flat.id, null);
    expect(await getMyListings(t.db, lister.userId)).toEqual([]);
    expect(await getPublicListing(t.db, flat.id)).toBeNull();
    expect(await left()).toEqual({ swipes: 0, likes: 0 });
  });
});
