import {
  cleanMessage,
  type Listing,
  type Match,
  matchesFilters,
  type Swipe,
  type SwipeAction,
} from "@repo/shared";
import type { Api } from "../client";
import { MOCK_LISTINGS } from "./listings";
import {
  acceptTime,
  isMatched,
  type LikeRecord,
  openerFor,
  REPLY_DELAY,
  replyFor,
  type StoredMessage,
  toMatch,
  toPendingLike,
  visibleMessages,
} from "./matchmaker";

/*
 * An in-memory stand-in for the server. It keeps swipes for as long as the
 * page is open and answers after a short delay like a real network would.
 * The mock data is checked against the shared schemas in a test
 * (listings.test.ts), not here, so the validation library is not shipped to
 * the browser.
 */

const PAGE_SIZE = 10;

const swipes = new Map<string, SwipeAction>();
const seenClientIds = new Set<string>();

const ranked = [...MOCK_LISTINGS].sort((a, b) => b.compatibility.percent - a.compatibility.percent);

// Likes and what the bot listers did with them (see matchmaker.ts).
const likes = new Map<string, LikeRecord>();
const threads = new Map<string, StoredMessage[]>();
const lastRead = new Map<string, number>();
const ended = new Set<string>();
let messageCount = 0;

const listingById = new Map(MOCK_LISTINGS.map((listing) => [listing.id, listing]));

function storeMessage(matchId: string, from: "me" | "them", body: string, visibleAt: number) {
  messageCount += 1;
  const message: StoredMessage = {
    id: `${matchId}-${messageCount}`,
    matchId,
    from,
    body,
    sentAt: new Date(visibleAt).toISOString(),
    visibleAt,
  };
  threads.set(matchId, [...(threads.get(matchId) ?? []), message]);
  return message;
}

/** A like goes to the lister. If they will accept, their yes and first message are queued. */
function recordLike(listing: Listing, now: number) {
  if (likes.has(listing.id)) return;
  const matchId = `match-${listing.id}`;
  const acceptAt = acceptTime(listing.id, now);
  likes.set(listing.id, { listingId: listing.id, matchId, likedAt: now, acceptAt });
  if (acceptAt !== null) storeMessage(matchId, "them", openerFor(listing), acceptAt + 2500);
}

/** A like that is taken back before the lister answers simply disappears. */
function withdrawLike(listingId: string, now: number) {
  const like = likes.get(listingId);
  if (!like || isMatched(like, now)) return;
  likes.delete(listingId);
  threads.delete(like.matchId);
}

/** The like behind a match the person can still see, with its listing. */
function openMatch(matchId: string, now: number) {
  for (const like of likes.values()) {
    if (like.matchId !== matchId || ended.has(matchId) || !isMatched(like, now)) continue;
    const listing = listingById.get(like.listingId);
    if (listing) return { like, listing };
  }
  return null;
}

function lastActivity(match: Match): number {
  return Date.parse(match.lastMessage?.sentAt ?? match.matchedAt);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const mockApi: Api = {
  async getFeed(cursor, filters) {
    await delay(180);
    // The cursor is a position in the list of flats that pass the filters.
    const matching = ranked.filter((listing) => matchesFilters(listing, filters));
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const window = matching.slice(start, start + PAGE_SIZE);
    const end = start + window.length;
    return {
      items: window.filter((listing) => !swipes.has(listing.id)),
      nextCursor: end < matching.length ? String(end) : null,
    };
  },

  async countFeed(filters) {
    await delay(60);
    return ranked.filter((listing) => !swipes.has(listing.id) && matchesFilters(listing, filters))
      .length;
  },

  async getLocalities() {
    await delay(60);
    return [...new Set(MOCK_LISTINGS.map((listing) => listing.locality))].sort();
  },

  async sendSwipes(batch: Swipe[]) {
    await delay(100);
    for (const swipe of batch) {
      if (seenClientIds.has(swipe.clientId)) continue;
      seenClientIds.add(swipe.clientId);
      // Delete first so a changed decision moves to the end of the order.
      swipes.delete(swipe.listingId);
      swipes.set(swipe.listingId, swipe.action);

      const listing = listingById.get(swipe.listingId);
      if (!listing) continue;
      if (swipe.action === "like" || swipe.action === "superlike") recordLike(listing, Date.now());
      else withdrawLike(listing.id, Date.now());
    }
  },

  async undoSwipe(listingId) {
    await delay(80);
    swipes.delete(listingId);
    withdrawLike(listingId, Date.now());
  },

  async getSaved() {
    await delay(150);
    // A Map keeps insertion order, so reversing gives most recent first.
    const savedIds = [...swipes].filter(([, action]) => action === "save").map(([id]) => id);
    return savedIds.reverse().flatMap((id) => MOCK_LISTINGS.filter((listing) => listing.id === id));
  },

  async resetPasses() {
    await delay(150);
    for (const [listingId, action] of swipes) {
      if (action === "pass") swipes.delete(listingId);
    }
  },

  async getMatches() {
    await delay(80);
    const now = Date.now();
    const matches: Match[] = [];
    for (const like of likes.values()) {
      const listing = listingById.get(like.listingId);
      if (!listing || ended.has(like.matchId) || !isMatched(like, now)) continue;
      const thread = threads.get(like.matchId) ?? [];
      matches.push(toMatch(like, listing, thread, lastRead.get(like.matchId) ?? 0, now));
    }
    return matches.sort((a, b) => lastActivity(b) - lastActivity(a));
  },

  async getPendingLikes() {
    await delay(80);
    const now = Date.now();
    return [...likes.values()]
      .filter((like) => !isMatched(like, now))
      .sort((a, b) => b.likedAt - a.likedAt)
      .flatMap((like) => {
        const listing = listingById.get(like.listingId);
        return listing ? [toPendingLike(like, listing)] : [];
      });
  },

  async getMessages(matchId) {
    await delay(60);
    const now = Date.now();
    if (!openMatch(matchId, now)) throw new Error("This match is no longer open.");
    return visibleMessages(threads.get(matchId) ?? [], now);
  },

  async sendMessage(matchId, body) {
    await delay(100);
    const now = Date.now();
    const text = cleanMessage(body);
    if (!text) throw new Error("A message needs some text.");
    if (!openMatch(matchId, now)) throw new Error("This match is no longer open.");

    const { visibleAt: _visibleAt, ...sent } = storeMessage(matchId, "me", text, now);
    // The lister answers a few seconds later.
    const mine = (threads.get(matchId) ?? []).filter((message) => message.from === "me").length;
    const wait = REPLY_DELAY.min + Math.random() * (REPLY_DELAY.max - REPLY_DELAY.min);
    storeMessage(matchId, "them", replyFor(mine), now + wait);
    return sent;
  },

  async markRead(matchId) {
    await delay(40);
    lastRead.set(matchId, Date.now());
  },

  async unmatch(matchId) {
    await delay(100);
    ended.add(matchId);
  },
};
