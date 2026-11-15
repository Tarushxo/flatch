import {
  ABOUT_MAX_LENGTH,
  cleanMessage,
  cleanPreferences,
  draftProblems,
  type Listing,
  type Match,
  matchesFilters,
  NAME_MAX_LENGTH,
  type Swipe,
  type SwipeAction,
  type TenantProfile,
} from "@repo/shared";
import type { Api } from "../client";
import {
  acceptedFor,
  applicantOpener,
  applicantReplyFor,
  listerMatchId,
  toListerMatch,
  toMyListing,
  waitingFor,
} from "./applicants";
import { clearListings, readListings, type StoredListing, writeListings } from "./lister-store";
import { MOCK_LISTINGS, SAMPLE_PHOTOS } from "./listings";

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
import { clearProfile, readProfile, writeProfile } from "./profile-store";

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

/**
 * Tell the mock about flats that came from the real server, so a like on one
 * of them can still be answered by a bot lister.
 */
export function rememberListings(more: Listing[]): void {
  for (const listing of more) listingById.set(listing.id, listing);
}

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

/** How long a bot tenant takes to say hello after being accepted. */
const HELLO_DELAY_MS = 2500;
/** A first message older than this can only be one written again after a reload. */
const REWRITTEN_AFTER_MS = 30_000;

/**
 * The lister's side of a match they can still see: the flat and the tenant
 * they accepted. Chats are kept in memory, so after a reload the tenant's
 * first message is written again.
 */
function openListerMatch(matchId: string, now: number) {
  if (ended.has(matchId)) return null;
  for (const listing of readListings()) {
    for (const accepted of acceptedFor(listing, now)) {
      if (listerMatchId(accepted.applicant.id) !== matchId) continue;
      if (!threads.has(matchId)) {
        const hello = applicantOpener(accepted.applicant, listing);
        const helloAt = accepted.acceptedAt + HELLO_DELAY_MS;
        storeMessage(matchId, "them", hello, helloAt);
        // Written again after a reload: it was seen the first time, so it is not new.
        if (now - helloAt > REWRITTEN_AFTER_MS) lastRead.set(matchId, helloAt);
      }
      return { listing, accepted };
    }
  }
  return null;
}

function updateListing(listingId: string, change: (listing: StoredListing) => StoredListing) {
  let updated: StoredListing | null = null;
  const next = readListings().map((listing) => {
    if (listing.id !== listingId) return listing;
    updated = change(listing);
    return updated;
  });
  if (!updated) throw new Error("That flat is no longer listed.");
  writeListings(next);
  return updated as StoredListing;
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

  async getLocalities(city) {
    await delay(60);
    const inCity = MOCK_LISTINGS.filter((listing) => listing.city === city);
    return [...new Set(inCity.map((listing) => listing.locality))].sort();
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
    const me = readProfile();
    for (const listing of readListings()) {
      for (const accepted of acceptedFor(listing, now)) {
        const matchId = listerMatchId(accepted.applicant.id);
        if (!openListerMatch(matchId, now)) continue;
        const thread = threads.get(matchId) ?? [];
        matches.push(toListerMatch(listing, accepted, me, thread, lastRead.get(matchId) ?? 0, now));
      }
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
    if (!openMatch(matchId, now) && !openListerMatch(matchId, now)) {
      throw new Error("This match is no longer open.");
    }
    return visibleMessages(threads.get(matchId) ?? [], now);
  },

  async sendMessage(matchId, body) {
    await delay(100);
    const now = Date.now();
    const text = cleanMessage(body);
    if (!text) throw new Error("A message needs some text.");
    const asLister = !openMatch(matchId, now);
    if (asLister && !openListerMatch(matchId, now))
      throw new Error("This match is no longer open.");

    const { visibleAt: _visibleAt, ...sent } = storeMessage(matchId, "me", text, now);
    // The other person answers a few seconds later.
    const mine = (threads.get(matchId) ?? []).filter((message) => message.from === "me").length;
    const wait = REPLY_DELAY.min + Math.random() * (REPLY_DELAY.max - REPLY_DELAY.min);
    storeMessage(matchId, "them", asLister ? applicantReplyFor(mine) : replyFor(mine), now + wait);
    return sent;
  },

  async markRead(matchId) {
    await delay(40);
    lastRead.set(matchId, Date.now());
  },

  async unmatch(matchId) {
    await delay(100);
    const now = Date.now();
    const asLister = openMatch(matchId, now) ? null : openListerMatch(matchId, now);
    if (asLister) {
      // Saved with the flat, so the match stays ended after a reload.
      updateListing(asLister.listing.id, (listing) => ({
        ...listing,
        decisions: {
          ...listing.decisions,
          [asLister.accepted.applicant.id]: { decision: "decline", at: now },
        },
      }));
    }
    ended.add(matchId);
  },

  async getProfile() {
    await delay(40);
    return readProfile();
  },

  async saveProfile(profile) {
    await delay(100);
    const previous = readProfile();
    const saved: TenantProfile = {
      ...profile,
      name: profile.name.trim().slice(0, NAME_MAX_LENGTH),
      about: profile.about.trim().slice(0, ABOUT_MAX_LENGTH),
      preferences: cleanPreferences(profile.preferences, previous.preferences),
    };
    writeProfile(saved);
    return saved;
  },

  async resetProfile() {
    await delay(60);
    clearProfile();
    clearListings();
  },

  async getMyListings() {
    await delay(80);
    const now = Date.now();
    return readListings()
      .map((listing) => toMyListing(listing, now))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async createListing(draft) {
    await delay(350);
    const problems = draftProblems(draft, "preview");
    if (problems[0]) throw new Error(problems[0]);
    const now = Date.now();
    const listing: StoredListing = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      society: draft.society.trim(),
      addressLine: draft.addressLine.trim(),
      id: `mine-${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
      isOpen: true,
      createdAt: new Date(now).toISOString(),
      opensAt: now,
      closedAt: null,
      decisions: {},
    };
    writeListings([listing, ...readListings()]);
    return toMyListing(listing, now);
  },

  async setListingOpen(listingId, isOpen) {
    await delay(100);
    const now = Date.now();
    const updated = updateListing(listingId, (listing) => {
      if (listing.isOpen === isOpen) return listing;
      if (!isOpen) return { ...listing, isOpen: false, closedAt: now };
      // The clock for new likes picks up where it stopped, so nobody arrives "while closed".
      const pausedFor = now - (listing.closedAt ?? now);
      return { ...listing, isOpen: true, closedAt: null, opensAt: listing.opensAt + pausedFor };
    });
    return toMyListing(updated, now);
  },

  async deleteListing(listingId) {
    await delay(120);
    writeListings(readListings().filter((listing) => listing.id !== listingId));
  },

  async getApplicants(listingId) {
    await delay(80);
    const now = Date.now();
    return readListings()
      .filter((listing) => listingId === undefined || listing.id === listingId)
      .flatMap((listing) => waitingFor(listing, now))
      .sort((a, b) => Date.parse(a.likedAt) - Date.parse(b.likedAt));
  },

  async decideApplicant(applicantId, decision) {
    await delay(120);
    const now = Date.now();
    const listing = readListings().find((each) =>
      waitingFor(each, now).some((applicant) => applicant.id === applicantId),
    );
    if (!listing) throw new Error("That tenant is no longer waiting.");
    updateListing(listing.id, (each) => ({
      ...each,
      decisions: { ...each.decisions, [applicantId]: { decision, at: now } },
    }));
    if (decision === "decline") return { matchId: null };
    const matchId = listerMatchId(applicantId);
    openListerMatch(matchId, now);
    return { matchId };
  },

  async getSamplePhotos() {
    await delay(60);
    return SAMPLE_PHOTOS;
  },
};
