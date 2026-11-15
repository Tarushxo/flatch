import type {
  Account,
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
import { httpApi } from "./http";
import { mockApi, rememberListings } from "./mock";
import { readProfile, writeProfile } from "./mock/profile-store";

/**
 * Everything the app asks the server for. Components and hooks depend on this
 * interface only. The real server takes it over a piece at a time: flats and
 * swipes (M2), then accounts and profiles (M3). Matches, chat and the lister
 * side are still the in-browser mock until their milestones.
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
  /** Start signing in with Google. The page leaves for Google and comes back signed in. */
  signInWithGoogle(): Promise<void>;
  /** Sign out of this browser. The account and its data stay. */
  signOut(): Promise<void>;

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

/**
 * Flats and swipes from the real server, everything else from the mock. The
 * mock is still told about each like, with the flat it was for, because the
 * bot listers who answer likes live there until M4.
 */
const withServer: Api = {
  ...mockApi,
  ...httpApi,

  async getFeed(cursor, filters) {
    const page = await httpApi.getFeed(cursor, filters);
    rememberListings(page.items);
    return page;
  },

  async getSaved() {
    const saved = await httpApi.getSaved();
    rememberListings(saved);
    return saved;
  },

  // The profile lives on the server. A copy is kept in the browser because the
  // mock's bot tenants and chats read the person's name from there.
  async getProfile() {
    const stored = await httpApi.getProfile();
    const local = readProfile();
    // Someone who used the app before accounts existed still has their answers in this
    // browser only. The first time the server has nothing for them, those are sent up.
    const untouched = stored.onboardedAt === null && stored.mode === "tenant" && stored.name === "";
    const carried = local.onboardedAt !== null || local.mode === "lister";
    const profile = untouched && carried ? await httpApi.saveProfile(local) : stored;
    writeProfile(profile);
    return profile;
  },

  async saveProfile(profile) {
    const saved = await httpApi.saveProfile(profile);
    writeProfile(saved);
    return saved;
  },

  async resetProfile() {
    await httpApi.resetProfile();
    await mockApi.resetProfile();
  },

  async signOut() {
    await httpApi.signOut();
    // The next person at this browser should not find the last one's answers.
    await mockApi.resetProfile();
  },

  // Both at once, so the bot lister's answer is not held up by the trip to the server.
  // The mock ignores a swipe it has already seen, so a retry after a failure is safe.
  async sendSwipes(swipes) {
    await Promise.all([httpApi.sendSwipes(swipes), mockApi.sendSwipes(swipes)]);
  },

  async undoSwipe(listingId) {
    await Promise.all([httpApi.undoSwipe(listingId), mockApi.undoSwipe(listingId)]);
  },
};

export const api: Api = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? withServer : mockApi;
