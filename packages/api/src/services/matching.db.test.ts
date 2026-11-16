import { messages } from "@repo/db";
import { botAccepts, CHAT_LIMITS, DAILY_LIMITS, type Listing } from "@repo/shared";
import { MatchSchema, MessageSchema } from "@repo/shared/schemas";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../policies";
import { person, postFlat, type TestDb, testDatabase, wait } from "../testing/database";
import { getFeedPage } from "./feed";
import { setListingOpen } from "./listings";
import {
  decideApplicant,
  getApplicants,
  getMatches,
  getMessages,
  getPendingLikes,
  markRead,
  sendMessage,
  unmatch,
} from "./matching";
import { recordSwipes, undoSwipe } from "./swipes";

let t: TestDb;
beforeAll(async () => {
  t = await testDatabase();
}, 60_000);
afterAll(() => t.close());

const swipe = (who: Actor, listingId: string, action: "like" | "pass" | "save") =>
  recordSwipes(t.db, who, [{ clientId: crypto.randomUUID(), listingId, action }]);

/** Demo flats in one city, as a guest's deck would show them. */
async function demoFlats(viewer: Actor, city: Listing["city"]): Promise<Listing[]> {
  const flats: Listing[] = [];
  let cursor: string | null = null;
  do {
    const page = await getFeedPage(t.db, {
      filters: { city, budgetMax: null, localities: [], roomTypes: [] },
      viewer,
      cursor,
    });
    flats.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return flats;
}

const gone = { status: 404 };

/** A tenant, a real lister's flat, and the tenant's like waiting on it. */
async function waitingLike() {
  const lister = await person(t.db, { guest: false, name: "Lata" });
  const tenant = await person(t.db, { guest: false, name: "Bela" });
  const flat = await postFlat(t.db, lister);
  await swipe(tenant, flat.id, "like");
  const [applicant] = (await getApplicants(t.db, lister.userId)).filter((each) => !each.isSeed);
  if (!applicant) throw new Error("the like did not reach the lister");
  return { lister, tenant, flat, applicant };
}

/** The same, answered with a yes: a match between two real people. */
async function realMatch() {
  const made = await waitingLike();
  const { matchId } = await decideApplicant(t.db, made.lister, made.applicant.id, "accept");
  if (!matchId) throw new Error("no match was opened");
  return { ...made, matchId };
}

describe("liking a demo flat", () => {
  it("is not a match at once: the bot lister answers in its own time", async () => {
    const guest = await person(t.db);
    const flat = (await demoFlats(guest, "Pune")).find((each) => botAccepts(each.id));
    if (!flat) throw new Error("no demo flat that says yes");
    await swipe(guest, flat.id, "like");

    expect(await getMatches(t.db, guest.userId)).toEqual([]);
    expect((await getPendingLikes(t.db, guest.userId)).map((like) => like.listing.id)).toEqual([
      flat.id,
    ]);

    await wait(t.db, 60);
    const [match] = await getMatches(t.db, guest.userId);
    expect(MatchSchema.safeParse(match).error?.issues ?? []).toEqual([]);
    expect(match).toMatchObject({ side: "tenant", applicant: null });
    expect(match?.listing.id).toBe(flat.id);
    expect(match?.person.name).toBe(flat.lister.name);
    expect(match?.address.society).not.toBe("");
    expect(match?.address.line).not.toBe("");
    expect(await getPendingLikes(t.db, guest.userId)).toEqual([]);

    // The lister's first message arrived with the match, and counts as unread.
    const thread = await getMessages(t.db, guest, match?.id ?? "");
    expect(thread).toHaveLength(1);
    expect(thread[0]).toMatchObject({ from: "them" });
    expect(match?.unreadCount).toBe(1);
  });

  it("stays unanswered for the bot listers who never reply", async () => {
    const guest = await person(t.db);
    const flat = (await demoFlats(guest, "Pune")).find((each) => !botAccepts(each.id));
    if (!flat) throw new Error("no demo flat that stays silent");
    await swipe(guest, flat.id, "like");
    await wait(t.db, 600);
    expect(await getMatches(t.db, guest.userId)).toEqual([]);
    expect(await getPendingLikes(t.db, guest.userId)).toHaveLength(1);
  });

  it("can be taken back before the answer, by passing or by undoing", async () => {
    const guest = await person(t.db);
    const [first, second] = (await demoFlats(guest, "Chennai")).filter((each) =>
      botAccepts(each.id),
    );
    if (!first || !second) throw new Error("not enough demo flats");
    await swipe(guest, first.id, "like");
    await swipe(guest, second.id, "like");
    await swipe(guest, first.id, "pass");
    await undoSwipe(t.db, guest.userId, second.id);
    expect(await getPendingLikes(t.db, guest.userId)).toEqual([]);
    await wait(t.db, 60);
    expect(await getMatches(t.db, guest.userId)).toEqual([]);
  });

  it("is not undone by taking the swipe back once it is a match", async () => {
    const guest = await person(t.db);
    const flat = (await demoFlats(guest, "Mumbai")).find((each) => botAccepts(each.id));
    if (!flat) throw new Error("no demo flat that says yes");
    await swipe(guest, flat.id, "like");
    await wait(t.db, 60);
    await undoSwipe(t.db, guest.userId, flat.id);
    expect(await getMatches(t.db, guest.userId)).toHaveLength(1);
  });
});

describe("liking a real person's flat", () => {
  it("reaches that lister, and nobody else", async () => {
    const { lister, tenant, flat, applicant } = await waitingLike();
    expect(applicant).toMatchObject({ name: "Bela", isSeed: false, listingId: flat.id });
    expect(JSON.stringify(applicant)).not.toContain("@");

    const someoneElse = await person(t.db, { guest: false });
    expect(await getApplicants(t.db, someoneElse.userId)).toEqual([]);
    expect(await getApplicants(t.db, tenant.userId)).toEqual([]);

    // The tenant sees the like waiting, with no match and no address.
    const pending = await getPendingLikes(t.db, tenant.userId);
    expect(pending.map((like) => like.listing.id)).toEqual([flat.id]);
    expect(JSON.stringify(pending)).not.toContain("Secret Court");
    expect(await getMatches(t.db, tenant.userId)).toEqual([]);
    expect(await getMatches(t.db, lister.userId)).toEqual([]);
  });

  it("does not happen for a guest, or for the lister themselves", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    await swipe(await person(t.db), flat.id, "like");
    await swipe(lister, flat.id, "like");
    expect((await getApplicants(t.db, lister.userId)).filter((each) => !each.isSeed)).toEqual([]);
  });

  it("is dropped when the flat has been switched off, and works again when it reopens", async () => {
    const lister = await person(t.db, { guest: false });
    const tenant = await person(t.db, { guest: false, name: "Bela" });
    const flat = await postFlat(t.db, lister);
    const real = async () =>
      (await getApplicants(t.db, lister.userId)).filter((each) => !each.isSeed);

    await setListingOpen(t.db, lister, flat.id, false);
    await swipe(tenant, flat.id, "like");
    expect(await real()).toEqual([]);
    expect(await getPendingLikes(t.db, tenant.userId)).toEqual([]);

    await setListingOpen(t.db, lister, flat.id, true);
    await swipe(tenant, flat.id, "like");
    expect((await real()).map((each) => each.name)).toEqual(["Bela"]);
  });
});

describe("answering a tenant", () => {
  it("is refused to anyone but the flat's lister, as if the tenant were not there", async () => {
    const { tenant, applicant } = await waitingLike();
    const stranger = await person(t.db, { guest: false });
    for (const who of [stranger, tenant]) {
      await expect(decideApplicant(t.db, who, applicant.id, "accept")).rejects.toMatchObject(gone);
    }
    await expect(
      decideApplicant(t.db, stranger, crypto.randomUUID(), "accept"),
    ).rejects.toMatchObject(gone);
  });

  it("with a yes opens a match that both see from their own side, address included", async () => {
    const { lister, tenant, flat, matchId } = await realMatch();
    const [forTenant] = await getMatches(t.db, tenant.userId);
    const [forLister] = await getMatches(t.db, lister.userId);

    expect(forTenant).toMatchObject({ id: matchId, side: "tenant", applicant: null });
    expect(forTenant?.person.name).toBe("Lata");
    expect(forTenant?.address).toEqual({ society: "Secret Court", line: "Flat 9Z, Hidden Street" });

    expect(forLister).toMatchObject({ id: matchId, side: "lister" });
    expect(forLister?.person.name).toBe("Bela");
    expect(forLister?.applicant?.name).toBe("Bela");
    expect(forLister?.listing.id).toBe(flat.id);

    expect(await getPendingLikes(t.db, tenant.userId)).toEqual([]);
    expect((await getApplicants(t.db, lister.userId)).filter((each) => !each.isSeed)).toEqual([]);
  });

  it("with a no clears the tenant quietly, with no match", async () => {
    const { lister, tenant, applicant } = await waitingLike();
    expect(await decideApplicant(t.db, lister, applicant.id, "decline")).toEqual({ matchId: null });
    expect(await getMatches(t.db, tenant.userId)).toEqual([]);
    expect(await getPendingLikes(t.db, tenant.userId)).toEqual([]);
  });

  it("cannot be done twice, whatever the second answer is", async () => {
    const { lister, applicant } = await waitingLike();
    await decideApplicant(t.db, lister, applicant.id, "accept");
    for (const again of ["accept", "decline"] as const) {
      await expect(decideApplicant(t.db, lister, applicant.id, again)).rejects.toMatchObject({
        status: 409,
      });
    }
    expect(await getMatches(t.db, lister.userId)).toHaveLength(1);
  });
});

describe("a chat", () => {
  it("is closed to everyone but the two people in it", async () => {
    const { matchId } = await realMatch();
    const outsider = await person(t.db, { guest: false });
    await expect(getMessages(t.db, outsider, matchId)).rejects.toMatchObject(gone);
    await expect(sendMessage(t.db, outsider, matchId, "hello")).rejects.toMatchObject(gone);
    await expect(markRead(t.db, outsider, matchId)).rejects.toMatchObject(gone);
    await expect(unmatch(t.db, outsider, matchId)).rejects.toMatchObject(gone);
    expect(await getMatches(t.db, outsider.userId)).toEqual([]);
  });

  it("carries messages both ways, tidied, with unread counts", async () => {
    const { lister, tenant, matchId } = await realMatch();
    const sent = await sendMessage(t.db, tenant, matchId, "   When can I visit?   ");
    expect(MessageSchema.safeParse(sent).error?.issues ?? []).toEqual([]);
    expect(sent).toMatchObject({ from: "me", body: "When can I visit?" });
    await expect(sendMessage(t.db, tenant, matchId, "    ")).rejects.toMatchObject({ status: 400 });

    const asLister = await getMessages(t.db, lister, matchId);
    expect(asLister.map((message) => [message.from, message.body])).toEqual([
      ["them", "When can I visit?"],
    ]);
    expect((await getMatches(t.db, lister.userId))[0]?.unreadCount).toBe(1);
    expect((await getMatches(t.db, tenant.userId))[0]?.unreadCount).toBe(0);

    await markRead(t.db, lister, matchId);
    expect((await getMatches(t.db, lister.userId))[0]?.unreadCount).toBe(0);

    await sendMessage(t.db, lister, matchId, "Saturday morning?");
    const asTenant = await getMessages(t.db, tenant, matchId);
    expect(asTenant.map((message) => message.from)).toEqual(["me", "them"]);
    expect((await getMatches(t.db, tenant.userId))[0]?.lastMessage?.body).toBe("Saturday morning?");
  });

  it("gets a reply from a demo account a little later, and none from a real person", async () => {
    const guest = await person(t.db);
    const flat = (await demoFlats(guest, "Delhi")).find((each) => botAccepts(each.id));
    if (!flat) throw new Error("no demo flat that says yes");
    await swipe(guest, flat.id, "like");
    await wait(t.db, 60);
    const [match] = await getMatches(t.db, guest.userId);
    const id = match?.id ?? "";

    await sendMessage(t.db, guest, id, "Is it still free?");
    expect((await getMessages(t.db, guest, id)).map((each) => each.from)).toEqual(["them", "me"]);
    await wait(t.db, 10);
    expect((await getMessages(t.db, guest, id)).map((each) => each.from)).toEqual([
      "them",
      "me",
      "them",
    ]);

    const real = await realMatch();
    await sendMessage(t.db, real.tenant, real.matchId, "Hello");
    await wait(t.db, 60);
    expect(await getMessages(t.db, real.tenant, real.matchId)).toHaveLength(1);
  });

  it("ends for both when either unmatches", async () => {
    const { lister, tenant, matchId } = await realMatch();
    await unmatch(t.db, lister, matchId);
    expect(await getMatches(t.db, lister.userId)).toEqual([]);
    expect(await getMatches(t.db, tenant.userId)).toEqual([]);
    await expect(getMessages(t.db, tenant, matchId)).rejects.toMatchObject(gone);
    await expect(sendMessage(t.db, tenant, matchId, "still there?")).rejects.toMatchObject(gone);
  });

  it("holds a limited number of messages and sends only the latest ones", async () => {
    const { tenant, matchId } = await realMatch();
    await t.db.execute(sql`
      insert into ${messages} (conversation_id, sender_id, body, visible_at)
      select ${matchId}::uuid, ${tenant.userId}::uuid, 'filler ' || n,
        now() - interval '1 day' + (n || ' seconds')::interval
      from generate_series(1, ${CHAT_LIMITS.perChat - 1}) n
    `);
    await sendMessage(t.db, tenant, matchId, "The last one that fits");
    await expect(sendMessage(t.db, tenant, matchId, "One too many")).rejects.toMatchObject({
      status: 409,
      code: "chat_full",
    });

    const shown = await getMessages(t.db, tenant, matchId);
    expect(shown).toHaveLength(CHAT_LIMITS.shown);
    expect(shown.at(-1)?.body).toBe("The last one that fits");
    const times = shown.map((message) => message.sentAt);
    expect(times).toEqual([...times].sort());
  });

  it("stops a person at the day's limit, without storing the message", async () => {
    const { tenant, matchId } = await realMatch();
    await t.db.execute(sql`
      insert into daily_usage (user_id, kind, day, count)
      values (${tenant.userId}::uuid, 'message', (now() at time zone 'utc')::date,
        ${DAILY_LIMITS.message - 1})
    `);
    await sendMessage(t.db, tenant, matchId, "Just inside the limit");
    await expect(sendMessage(t.db, tenant, matchId, "Over it")).rejects.toMatchObject({
      status: 429,
      code: "daily_limit",
    });
    expect((await getMessages(t.db, tenant, matchId)).map((each) => each.body)).toEqual([
      "Just inside the limit",
    ]);
  });
});

describe("demo tenants on a newly posted flat", () => {
  it("turn up one after another, and stop coming once the sign is off", async () => {
    const lister = await person(t.db, { guest: false });
    const flat = await postFlat(t.db, lister);
    expect(await getApplicants(t.db, lister.userId)).toEqual([]);

    await wait(t.db, 15);
    const first = await getApplicants(t.db, lister.userId);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ isSeed: true, listingId: flat.id });
    expect(first[0]?.compatibility.percent).toBeGreaterThan(0);

    await setListingOpen(t.db, lister, flat.id, false);
    await wait(t.db, 120);
    expect(await getApplicants(t.db, lister.userId)).toHaveLength(1);
  });
});
