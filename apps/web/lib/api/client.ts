import type {
  Applicant,
  City,
  FeedFilters,
  FeedPage,
  Listing,
  ListingDraft,
  ListingPhoto,
  Match,
  Message,
  MyListing,
  PendingLike,
  Swipe,
  TenantProfile,
} from "@repo/shared";
import { mockApi } from "./mock";

/**
 * Everything the app asks the server for. Components and hooks depend on this
 * interface only. In M1 it is backed by an in-memory mock; in M2 the real
 * HTTP client implements the same interface and is swapped in below.
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
  /** Forget the profile, as if the person had never been here. */
  resetProfile(): Promise<void>;

  /** The flats the person has posted, newest first. */
  getMyListings(): Promise<MyListing[]>;
  /** Post a flat. It starts open to likes. Rejects a draft that is not complete. */
  createListing(draft: ListingDraft): Promise<MyListing>;
  /** Switch the vacancy sign on or off. A closed flat takes no new likes. */
  setListingOpen(listingId: string, isOpen: boolean): Promise<MyListing>;
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

export const api: Api = mockApi;
