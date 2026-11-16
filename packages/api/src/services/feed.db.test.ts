import { listings } from "@repo/db";
import { DEFAULT_PROFILE, type FeedFilters, type Listing, monthlyCost } from "@repo/shared";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../policies";
import { person, postFlat, type TestDb, testDatabase } from "../testing/database";
import { countFeed, getFeedPage, getPublicListing } from "./feed";
import { setListingOpen } from "./listings";
import { saveProfile } from "./me";
import { getSaved, recordSwipes, resetPasses, undoSwipe } from "./swipes";

let t: TestDb;
beforeAll(async () => {
  t = await testDatabase();
}, 60_000);
afterAll(() => t.close());

const inCity = (city: FeedFilters["city"], more: Partial<FeedFilters> = {}): FeedFilters => ({
  city,
  budgetMax: null,
  localities: [],
  roomTypes: [],
  ...more,
});
const BANGALORE = inCity("Bangalore");

/** The whole deck, page by page, as the app would fetch it. */
async function wholeDeck(viewer: Actor, filters: FeedFilters = BANGALORE): Promise<Listing[]> {
  const flats: Listing[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 40; page++) {
    const next = await getFeedPage(t.db, { filters, viewer, cursor });
    flats.push(...next.items);
    cursor = next.nextCursor;
    if (!cursor) return flats;
  }
  throw new Error("The deck never ended.");
}

const swipe = (who: Actor, listingId: string, action: "like" | "pass" | "save") =>
  recordSwipes(t.db, who, [{ clientId: crypto.randomUUID(), listingId, action }]);

describe("the deck", () => {
  it("deals a guest ten demo flats at a time", async () => {
    const guest = await person(t.db);
    const page = await getFeedPage(t.db, { filters: BANGALORE, viewer: guest, cursor: null });
    expect(page.items).toHaveLength(10);
    expect(page.items.every((flat) => flat.isSeed)).toBe(true);
    expect(page.nextCursor).not.toBeNull();
  });

  it("shows every flat exactly once across its pages, and the count agrees", async () => {
    const guest = await person(t.db);
    const deck = await wholeDeck(guest);
    const ids = deck.map((flat) => flat.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(20);
    expect(await countFeed(t.db, { filters: BANGALORE, viewer: guest })).toBe(ids.length);
  });

  it("gives the same order every time it is asked", async () => {
    const guest = await person(t.db);
    const first = (await wholeDeck(guest)).map((flat) => flat.id);
    expect((await wholeDeck(guest)).map((flat) => flat.id)).toEqual(first);
  });

  it("never sends where a flat really is", async () => {
    const lister = await person(t.db, { guest: false, name: "Lata" });
    const flat = await postFlat(t.db, lister, { city: "Kolkata", locality: "Salt Lake" });
    const tenant = await person(t.db, { guest: false });
    const deck = await wholeDeck(tenant, inCity("Kolkata"));
    expect(deck.map((each) => each.id)).toContain(flat.id);

    const sent = JSON.stringify(deck);
    for (const secret of ["Secret Court", "Hidden Street", "societyName", "addressText"]) {
      expect(sent, secret).not.toContain(secret);
    }
    for (const key of ["locationExact", "location_exact", "listerId", "seedKey"]) {
      expect(sent, key).not.toContain(key);
    }
    // The public page for one flat is held to the same rule.
    expect(JSON.stringify(await getPublicListing(t.db, flat.id))).not.toContain("Secret Court");
  });

  it("shows the area roughly: not the flat's own spot, and not the same spot for two flats", async () => {
    const guest = await person(t.db);
    const deck = await wholeDeck(guest);
    const [exact] = await t.db
      .select({ at: listings.locationExact })
      .from(listings)
      .where(eq(listings.id, deck[0]?.id ?? ""));
    expect(deck[0]?.area.lat).not.toBeCloseTo(exact?.at.y ?? 0, 5);
    const spots = new Set(deck.map((flat) => `${flat.area.lat},${flat.area.lng}`));
    expect(spots.size).toBeGreaterThan(deck.length / 2);
  });

  it("keeps real people's flats from guests, and a person's own flat from themselves", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister, { city: "Pune", locality: "Baner" });
    const ids = async (viewer: Actor) =>
      (await wholeDeck(viewer, inCity("Pune"))).map((each) => each.id);

    expect(await ids(await person(t.db))).not.toContain(flat.id);
    expect(await ids(await person(t.db, { guest: false }))).toContain(flat.id);
    expect(await ids(lister)).not.toContain(flat.id);
  });

  it("drops a flat that is switched off, has run out, or was taken down after reports", async () => {
    const lister = await person(t.db, { guest: false });
    const tenant = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister, { city: "Chennai", locality: "Adyar" });
    const inDeck = async () =>
      (await wholeDeck(tenant, inCity("Chennai"))).some((each) => each.id === flat.id);
    expect(await inDeck()).toBe(true);

    await setListingOpen(t.db, lister, flat.id, false);
    expect(await inDeck()).toBe(false);
    await setListingOpen(t.db, lister, flat.id, true);
    expect(await inDeck()).toBe(true);

    await t.db
      .update(listings)
      .set({ expiresAt: sql`now() - interval '1 minute'` })
      .where(eq(listings.id, flat.id));
    expect(await inDeck()).toBe(false);
    expect(await getPublicListing(t.db, flat.id)).toBeNull();

    await t.db
      .update(listings)
      .set({ expiresAt: sql`now() + interval '1 day'`, underReview: true })
      .where(eq(listings.id, flat.id));
    expect(await inDeck()).toBe(false);
  });
});

describe("the deck's filters", () => {
  it("counts the whole monthly cost against the budget, not the rent alone", async () => {
    const guest = await person(t.db);
    const all = await wholeDeck(guest);
    const costs = all.map(monthlyCost).sort((a, b) => a - b);
    const budget = costs[Math.floor(costs.length / 2)] ?? 0;
    const within = await wholeDeck(guest, inCity("Bangalore", { budgetMax: budget }));
    expect(within.length).toBe(costs.filter((cost) => cost <= budget).length);
    expect(within.every((flat) => monthlyCost(flat) <= budget)).toBe(true);
    // At least one flat's rent alone would have passed, but its full cost does not.
    expect(all.some((flat) => flat.rent <= budget && monthlyCost(flat) > budget)).toBe(true);
  });

  it("narrows to the chosen areas and room types", async () => {
    const guest = await person(t.db);
    const all = await wholeDeck(guest);
    const area = all[0]?.locality ?? "";
    const there = await wholeDeck(guest, inCity("Bangalore", { localities: [area] }));
    expect(there.length).toBeGreaterThan(0);
    expect(there.every((flat) => flat.locality === area)).toBe(true);

    const whole = await wholeDeck(guest, inCity("Bangalore", { roomTypes: ["whole_flat"] }));
    expect(whole.length).toBe(all.filter((flat) => flat.roomType === "whole_flat").length);
    expect(whole.every((flat) => flat.roomType === "whole_flat")).toBe(true);
  });
});

describe("the deck, ranked for one person", () => {
  it("gives no score to someone who has said nothing, and real ones to someone who has", async () => {
    const quiet = await person(t.db);
    expect((await wholeDeck(quiet)).every((flat) => flat.compatibility.percent === 0)).toBe(true);

    const asha = await person(t.db);
    const area = (await wholeDeck(asha))[5]?.locality ?? "";
    await saveProfile(t.db, asha.userId, {
      ...DEFAULT_PROFILE,
      preferences: { ...DEFAULT_PROFILE.preferences, budgetMax: 20000, localities: [area] },
    });
    const deck = await wholeDeck(asha);
    expect(deck.every((flat) => flat.compatibility.percent >= 1)).toBe(true);
    // Flats in her area and budget come before flats that are neither.
    const fits = (flat: Listing) => flat.locality === area && monthlyCost(flat) <= 20000;
    const fitting = deck.filter(fits).length;
    expect(fitting).toBeGreaterThan(0);
    expect(deck.slice(0, fitting).every(fits)).toBe(true);
  });

  it("hides the flats that break a dealbreaker, and only those", async () => {
    const strict = await person(t.db);
    const before = await wholeDeck(strict);
    const cooksMeat = (flat: Listing) =>
      flat.houseRules.some((rule) => rule.label === "Non-veg cooking" && rule.allowed);
    expect(before.some(cooksMeat)).toBe(true);

    await saveProfile(t.db, strict.userId, {
      ...DEFAULT_PROFILE,
      preferences: {
        ...DEFAULT_PROFILE.preferences,
        lifestyle: { food: "veg" },
        dealbreakers: ["food"],
      },
    });
    const after = await wholeDeck(strict);
    expect(after.some(cooksMeat)).toBe(false);
    expect(after.length).toBe(before.filter((flat) => !cooksMeat(flat)).length);
    expect(await countFeed(t.db, { filters: BANGALORE, viewer: strict })).toBe(after.length);
  });
});

describe("swipes", () => {
  it("take a flat out of the deck, and undo puts it back", async () => {
    const guest = await person(t.db);
    const [first] = await wholeDeck(guest);
    if (!first) throw new Error("empty deck");
    await swipe(guest, first.id, "pass");
    expect((await wholeDeck(guest)).map((flat) => flat.id)).not.toContain(first.id);
    await undoSwipe(t.db, guest.userId, first.id);
    expect((await wholeDeck(guest))[0]?.id).toBe(first.id);
  });

  it("are stored once however many times the same one is sent", async () => {
    const guest = await person(t.db);
    const [first] = await wholeDeck(guest);
    if (!first) throw new Error("empty deck");
    const once = { clientId: crypto.randomUUID(), listingId: first.id, action: "save" as const };
    await recordSwipes(t.db, guest, [once]);
    await recordSwipes(t.db, guest, [once, once]);
    // A replay of the same swipe carrying a different decision changes nothing.
    await recordSwipes(t.db, guest, [{ ...once, action: "pass" }]);
    expect((await getSaved(t.db, guest.userId)).map((flat) => flat.id)).toEqual([first.id]);
  });

  it("let a new decision on the same flat replace the old one", async () => {
    const guest = await person(t.db);
    const [first, second] = await wholeDeck(guest);
    if (!first || !second) throw new Error("empty deck");
    await swipe(guest, first.id, "save");
    await swipe(guest, second.id, "save");
    expect((await getSaved(t.db, guest.userId)).map((flat) => flat.id)).toEqual([
      second.id,
      first.id,
    ]);
    await swipe(guest, first.id, "pass");
    expect((await getSaved(t.db, guest.userId)).map((flat) => flat.id)).toEqual([second.id]);
  });

  it("bring passed flats back round on request, but not saved ones", async () => {
    const guest = await person(t.db);
    const [first, second] = await wholeDeck(guest);
    if (!first || !second) throw new Error("empty deck");
    await swipe(guest, first.id, "pass");
    await swipe(guest, second.id, "save");
    await resetPasses(t.db, guest.userId);
    const ids = (await wholeDeck(guest)).map((flat) => flat.id);
    expect(ids).toContain(first.id);
    expect(ids).not.toContain(second.id);
  });

  it("from a guest on a real person's flat are not stored at all", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister, { city: "Delhi", locality: "Saket" });
    const guest = await person(t.db);
    await swipe(guest, flat.id, "save");
    expect(await getSaved(t.db, guest.userId)).toEqual([]);
  });

  it("skip a flat that no longer exists without failing the rest of the batch", async () => {
    const guest = await person(t.db);
    const [first] = await wholeDeck(guest);
    if (!first) throw new Error("empty deck");
    await recordSwipes(t.db, guest, [
      { clientId: crypto.randomUUID(), listingId: crypto.randomUUID(), action: "save" },
      { clientId: crypto.randomUUID(), listingId: first.id, action: "save" },
    ]);
    expect((await getSaved(t.db, guest.userId)).map((flat) => flat.id)).toEqual([first.id]);
  });
});
