import type {
  Account,
  Applicant,
  City,
  DevicePosition,
  FeedFilters,
  FeedPage,
  Listing,
  ListingDraft,
  ListingPhoto,
  Match,
  Message,
  MyListing,
  PendingLike,
  ReportReason,
  Swipe,
  TenantProfile,
} from "@repo/shared";
import type { Entry } from "@/lib/auth/client";
import { httpApi } from "./http";
import { mockApi } from "./mock";

/**
 * Everything the app asks the server for. Components and hooks depend on this
 * interface only. Two things implement it: the real HTTP client (`http.ts`)
 * and an in-browser mock that behaves the same way (`mock/`).
 */
export interface Api {
  /** One page of the ranked feed. Pass the previous page's `nextCursor` to continue. */
  getFeed(cursor: string | null, filters: FeedFilters): Promise<FeedPage>;
  /** How many flats the filters would leave in the deck. Powers the live counter. */
  countFeed(filters: FeedFilters): Promise<number>;
  /** The areas of a city a tenant can choose from, in alphabetical order. */
  getLocalities(city: City): Promise<string[]>;
  /** Record a batch of swipes. Safe to retry: repeats of a `clientId` are ignored. */
  sendSwipes(swipes: Swipe[]): Promise<void>;
  /** Take back a swipe so the listing can be shown again. */
  undoSwipe(listingId: string): Promise<void>;
  /** The flats the person has saved for later, most recent first. */
  getSaved(): Promise<Listing[]>;
  /** Forget every pass, so passed flats can come round again. */
  resetPasses(): Promise<void>;

  /**
   * Every match the person is part of, most recent activity first: as a tenant
   * (`side: "tenant"`) and as a lister (`side: "lister"`). Chat is open on both.
   */
  getMatches(): Promise<Match[]>;
  /** Likes still waiting for the lister, most recent first. */
  getPendingLikes(): Promise<PendingLike[]>;
  /** The messages in one match, oldest first. */
  getMessages(matchId: string): Promise<Message[]>;
  /** Send a message. Returns it as stored. */
  sendMessage(matchId: string, body: string): Promise<Message>;
  /** Record that the person has seen everything in this match so far. */
  markRead(matchId: string): Promise<void>;
  /** End a match. The chat and the address are no longer available. */
  unmatch(matchId: string): Promise<void>;

  /** The tenant's profile and preferences. A new visitor gets the defaults. */
  getProfile(): Promise<TenantProfile>;
  /** Save the profile. Returns it as stored. */
  saveProfile(profile: TenantProfile): Promise<TenantProfile>;
  /** Forget the person entirely, as if they had never been here. Deletes a guest's account. */
  resetProfile(): Promise<void>;

  /** How the person is signed in, and whether signing in is on offer. */
  getAccount(): Promise<Account>;
  /**
   * What the front desk needs to know: whether this browser already has a
   * session, and whether signing in is on offer. Starts nothing.
   */
  getEntry(): Promise<Entry>;
  /** Carry on without signing in: start a guest session for this browser. */
  continueAsGuest(): Promise<void>;
  /**
   * Start signing in with Google. The page leaves for Google and comes back
   * signed in, at `next` (a path on this site) or the Profile tab.
   */
  signInWithGoogle(next?: string): Promise<void>;
  /** Sign out of this browser. The account and its data stay. */
  signOut(): Promise<void>;

  /** The flats the person has posted, newest first. */
  getMyListings(): Promise<MyListing[]>;
  /**
   * Post a flat. It starts open to likes. Rejects a draft that is not complete.
   * Pass where the lister's device is, if they chose to share it, to have the
   * flat marked "posted on site" when that is in the flat's area.
   */
  createListing(draft: ListingDraft, postedFrom?: DevicePosition): Promise<MyListing>;
  /** Mark a flat already posted as "posted on site", from where the lister's device is now. */
  confirmOnSite(listingId: string, position: DevicePosition): Promise<MyListing>;
  /** Upload one of the lister's own photos. Returns its address and overall colour. */
  uploadPhoto(file: File): Promise<{ url: string; dominantColor: string }>;
  /** Switch the vacancy sign on or off. A closed flat takes no new likes. */
  setListingOpen(listingId: string, isOpen: boolean): Promise<MyListing>;
  /** "Still available": give a flat a fresh thirty days on the board, and switch it on. */
  renewListing(listingId: string): Promise<MyListing>;
  /** Report a flat someone posted. Enough reports take it off the board. */
  reportListing(listingId: string, report: { reason: ReportReason; note?: string }): Promise<void>;
  /** Take a flat down for good, with its likes and matches. */
  deleteListing(listingId: string): Promise<void>;
  /** Tenants waiting for an answer, oldest first. Pass a listing to see only its tenants. */
  getApplicants(listingId?: string): Promise<Applicant[]>;
  /** Say yes or no to a tenant. A yes opens a match; its id is returned. */
  decideApplicant(
    applicantId: string,
    decision: "accept" | "decline",
  ): Promise<{ matchId: string | null }>;
  /** Photos to choose from when posting a flat, until uploads arrive with the backend. */
  getSamplePhotos(): Promise<ListingPhoto[]>;
}

/*
 * With a database behind the site, everything comes from the real server.
 * Without one (CI, a fresh clone) the in-browser mock stands in for all of it,
 * so the app always runs. Which one is decided when the site is built.
 */
export const api: Api = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? httpApi : mockApi;
