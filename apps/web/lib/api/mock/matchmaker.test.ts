import { AddressSchema, MatchSchema } from "@repo/shared/schemas";
import { describe, expect, it } from "vitest";
import { MOCK_LISTINGS } from "./listings";
import {
  ACCEPT_DELAY,
  acceptTime,
  addressFor,
  isMatched,
  type LikeRecord,
  openerFor,
  ordinal,
  replyFor,
  type StoredMessage,
  toMatch,
  unreadCount,
  visibleMessages,
  willAccept,
} from "./matchmaker";

const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
const listing = MOCK_LISTINGS[0];
if (!listing) throw new Error("mock listings are empty");

const message = (id: string, from: "me" | "them", visibleAt: number): StoredMessage => ({
  id,
  matchId: "m1",
  from,
  body: `message ${id}`,
  sentAt: new Date(visibleAt).toISOString(),
  visibleAt,
});

describe("which listers answer", () => {
  it("is the same every time for a given listing", () => {
    for (const item of MOCK_LISTINGS) {
      expect(willAccept(item.id)).toBe(willAccept(item.id));
    }
  });

  it("leaves some likes waiting and accepts most", () => {
    const accepting = MOCK_LISTINGS.filter((item) => willAccept(item.id)).length;
    expect(accepting).toBeGreaterThan(MOCK_LISTINGS.length / 2);
    expect(accepting).toBeLessThan(MOCK_LISTINGS.length);
  });

  it("accepts a few seconds after the like, never instantly", () => {
    for (const item of MOCK_LISTINGS.filter((each) => willAccept(each.id))) {
      const wait = (acceptTime(item.id, T0) ?? 0) - T0;
      expect(wait).toBeGreaterThanOrEqual(ACCEPT_DELAY.min);
      expect(wait).toBeLessThan(ACCEPT_DELAY.max);
    }
  });

  it("never sets a time for a lister who does not answer", () => {
    const silent = MOCK_LISTINGS.find((item) => !willAccept(item.id));
    expect(silent).toBeDefined();
    if (silent) expect(acceptTime(silent.id, T0)).toBeNull();
  });
});

describe("isMatched", () => {
  const like: LikeRecord = { listingId: "x", matchId: "m1", likedAt: T0, acceptAt: T0 + 5000 };

  it("is false until the lister has accepted", () => {
    expect(isMatched(like, T0 + 4999)).toBe(false);
    expect(isMatched(like, T0 + 5000)).toBe(true);
  });

  it("is never true for a like nobody answers", () => {
    expect(isMatched({ ...like, acceptAt: null }, T0 + 10_000_000)).toBe(false);
  });
});

describe("what the lister says", () => {
  it("opens with their name as they gave it, their role, and the area", () => {
    const owner = MOCK_LISTINGS.find((item) => item.lister.name.startsWith("Mrs."));
    expect(owner).toBeDefined();
    if (!owner) return;
    const opener = openerFor(owner);
    expect(opener).toContain("Mrs. Rao here, the owner");
    expect(opener).toContain(owner.locality);
  });

  it("gives a different reply to each of the first messages, then repeats the last", () => {
    expect(new Set([1, 2, 3, 4].map(replyFor)).size).toBe(4);
    expect(replyFor(9)).toBe(replyFor(4));
  });
});

describe("a thread over time", () => {
  const thread = [
    message("b", "me", T0 + 2000),
    message("a", "them", T0 + 1000),
    message("c", "them", T0 + 6000),
  ];

  it("shows only what has arrived, oldest first, without the bookkeeping", () => {
    const shown = visibleMessages(thread, T0 + 3000);
    expect(shown.map((item) => item.id)).toEqual(["a", "b"]);
    expect(shown[0]).not.toHaveProperty("visibleAt");
  });

  it("counts only the lister's messages that arrived after the last read", () => {
    expect(unreadCount(thread, 0, T0 + 3000)).toBe(1);
    expect(unreadCount(thread, 0, T0 + 7000)).toBe(2);
    expect(unreadCount(thread, T0 + 1500, T0 + 7000)).toBe(1);
    expect(unreadCount(thread, T0 + 7000, T0 + 7000)).toBe(0);
  });
});

describe("ordinal", () => {
  it("writes street numbers the way people do", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
    ]);
  });
});

describe("the match the app receives", () => {
  it("satisfies the shared contract", () => {
    const like: LikeRecord = {
      listingId: listing.id,
      matchId: "m1",
      likedAt: T0,
      acceptAt: T0 + 5000,
    };
    const thread = [message("a", "them", T0 + 6000)];
    const match = toMatch(like, listing, thread, 0, T0 + 7000);
    expect(MatchSchema.safeParse(match).error?.issues ?? []).toEqual([]);
    expect(match.unreadCount).toBe(1);
    expect(match.lastMessage?.id).toBe("a");
  });

  it("gives every listing a stable, valid address", () => {
    for (const item of MOCK_LISTINGS) {
      expect(AddressSchema.safeParse(addressFor(item)).success).toBe(true);
      expect(addressFor(item)).toEqual(addressFor(item));
    }
  });
});
