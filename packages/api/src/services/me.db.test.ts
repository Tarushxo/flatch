import { listings, sessions, users } from "@repo/db";
import { DAILY_LIMITS, DEFAULT_PROFILE } from "@repo/shared";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../policies";
import { person, postFlat, type TestDb, testDatabase } from "../testing/database";
import { decideApplicant, getApplicants, getMatches, getMessages, sendMessage } from "./matching";
import { getProfile, moveGuestData, purgeLapsedGuests, saveProfile } from "./me";
import { getSaved, recordSwipes } from "./swipes";
import { spend } from "./usage";

let t: TestDb;
beforeAll(async () => {
  t = await testDatabase();
}, 60_000);
afterAll(() => t.close());

const swipe = (who: Actor, listingId: string, action: "like" | "pass" | "save") =>
  recordSwipes(t.db, who, [{ clientId: crypto.randomUUID(), listingId, action }]);
/** The ids of a few demo flats. */
async function demoFlatIds(count: number): Promise<string[]> {
  const found = await t.db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.isSeed, true))
    .limit(count);
  return found.map((row) => row.id);
}
const exists = async (who: Actor) =>
  (await t.db.select({ id: users.id }).from(users).where(eq(users.id, who.userId))).length === 1;

describe("a profile", () => {
  it("is the blank one until something is saved", async () => {
    const guest = await person(t.db);
    expect(await getProfile(t.db, guest.userId)).toEqual(DEFAULT_PROFILE);
  });

  it("is tidied as it is saved, and read back the same", async () => {
    const asha = await person(t.db);
    const saved = await saveProfile(t.db, asha.userId, {
      ...DEFAULT_PROFILE,
      name: "   Asha   ",
      about: "  Quiet and tidy.  ",
      ageRange: "25-29",
      occupation: "working",
      onboardedAt: "2026-11-16T10:00:00.000Z",
      preferences: {
        ...DEFAULT_PROFILE.preferences,
        city: "Pune",
        budgetMax: 25000,
        lifestyle: { food: "veg" },
        // Smoking was never answered, so it cannot be a dealbreaker.
        dealbreakers: ["food", "smoking"],
      },
    });
    expect(saved).toMatchObject({ name: "Asha", about: "Quiet and tidy." });
    expect(saved.preferences.dealbreakers).toEqual(["food"]);
    expect(await getProfile(t.db, asha.userId)).toEqual(saved);

    const other = await person(t.db);
    expect(await getProfile(t.db, other.userId)).toEqual(DEFAULT_PROFILE);
  });

  it("forgets the chosen areas when the city changes", async () => {
    const asha = await person(t.db);
    const inPune = {
      ...DEFAULT_PROFILE,
      preferences: { ...DEFAULT_PROFILE.preferences, city: "Pune" as const, localities: ["Baner"] },
    };
    await saveProfile(t.db, asha.userId, inPune);
    const moved = await saveProfile(t.db, asha.userId, {
      ...inPune,
      preferences: { ...inPune.preferences, city: "Mumbai" },
    });
    expect(moved.preferences).toMatchObject({ city: "Mumbai", localities: [] });
  });
});

describe("a guest who signs in", () => {
  it("keeps their saved flats, their match and what was said in it", async () => {
    const lister = await person(t.db, { guest: false, name: "Lata" });
    const flat = await postFlat(t.db, lister);
    // On a server with no sign-in, a guest is as good as anyone; this stands in for one.
    const guest = await person(t.db, { guest: false, name: "Bela" });
    await swipe(guest, flat.id, "like");
    const [applicant] = (await getApplicants(t.db, lister.userId)).filter((each) => !each.isSeed);
    const { matchId } = await decideApplicant(t.db, lister, applicant?.id ?? "", "accept");
    await sendMessage(t.db, guest, matchId ?? "", "Hello from before I signed in");

    const [someDemo] = await demoFlatIds(1);
    if (!someDemo) throw new Error("no demo flats");
    await swipe(guest, someDemo, "save");

    const account = await person(t.db, { guest: false, name: "Bela K" });
    await moveGuestData(t.db, guest.userId, account.userId);

    expect((await getSaved(t.db, account.userId)).map((each) => each.id)).toEqual([someDemo]);
    const [match] = await getMatches(t.db, account.userId);
    expect(match).toMatchObject({ id: matchId, side: "tenant" });
    expect((await getMessages(t.db, account, matchId ?? "")).map((each) => each.from)).toEqual([
      "me",
    ]);
    // The lister still sees one match, now with the account.
    expect(await getMatches(t.db, lister.userId)).toHaveLength(1);
    expect(await getMatches(t.db, guest.userId)).toEqual([]);
  });

  it("keeps the account's own decision where both had swiped the same flat", async () => {
    const guest = await person(t.db);
    const account = await person(t.db, { guest: false });
    const [shared, onlyGuest] = await demoFlatIds(2);
    if (!shared || !onlyGuest) throw new Error("no demo flats");
    await swipe(account, shared, "pass");
    await swipe(guest, shared, "save");
    await swipe(guest, onlyGuest, "save");

    await moveGuestData(t.db, guest.userId, account.userId);
    expect((await getSaved(t.db, account.userId)).map((each) => each.id)).toEqual([onlyGuest]);
  });
});

describe("clearing guest accounts nobody can come back to", () => {
  /** Make this person look as if they arrived days ago and their session has since run out. */
  async function lapse(who: Actor, { withSession = true } = {}) {
    await t.db
      .update(users)
      .set({ createdAt: sql`now() - interval '9 days'` })
      .where(eq(users.id, who.userId));
    if (!withSession) return;
    await t.db.insert(sessions).values({
      userId: who.userId,
      token: crypto.randomUUID(),
      expiresAt: sql`now() - interval '1 hour'`,
    });
  }
  async function signedIn(who: Actor) {
    await t.db.insert(sessions).values({
      userId: who.userId,
      token: crypto.randomUUID(),
      expiresAt: sql`now() + interval '6 days'`,
    });
  }

  it("removes a guest whose session has run out, with everything of theirs", async () => {
    const lapsed = await person(t.db);
    const [demo] = await demoFlatIds(1);
    await swipe(lapsed, demo ?? "", "save");
    await lapse(lapsed);

    expect(await purgeLapsedGuests(t.db)).toBeGreaterThanOrEqual(1);
    expect(await exists(lapsed)).toBe(false);
    const left = await t.db.execute(
      sql`select count(*)::int as n from swipes where user_id = ${lapsed.userId}::uuid`,
    );
    expect((left.rows[0] as { n: number }).n).toBe(0);
  });

  it("leaves alone everyone who could still come back, or who is not a guest", async () => {
    const stillIn = await person(t.db);
    await lapse(stillIn, { withSession: false });
    await signedIn(stillIn);

    const justArrived = await person(t.db);

    const account = await person(t.db, { guest: false });
    await lapse(account);

    const withAFlat = await person(t.db);
    await postFlat(t.db, withAFlat);
    await lapse(withAFlat);

    await purgeLapsedGuests(t.db);
    for (const kept of [stillIn, justArrived, account, withAFlat]) {
      expect(await exists(kept)).toBe(true);
    }
    // The demo accounts are never guests, and are never touched.
    const bots = await t.db.execute(sql`select count(*)::int as n from users where is_seed = true`);
    expect((bots.rows[0] as { n: number }).n).toBeGreaterThan(100);
  });
});

describe("the daily count", () => {
  it("lets a person do something up to the day's limit, then refuses, each person on their own", async () => {
    const busy = await person(t.db);
    const other = await person(t.db);
    for (let n = 0; n < DAILY_LIMITS.listing; n++) await spend(t.db, busy.userId, "listing");
    await expect(spend(t.db, busy.userId, "listing")).rejects.toMatchObject({
      status: 429,
      code: "daily_limit",
    });
    // Another kind of action, and another person, are counted separately.
    await spend(t.db, busy.userId, "upload");
    await spend(t.db, other.userId, "listing");
  });
});
