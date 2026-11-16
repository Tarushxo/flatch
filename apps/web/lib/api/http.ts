import type { AppType } from "@repo/api";
import type {
  Account,
  Applicant,
  FeedFilters,
  FeedPage,
  Listing,
  Match,
  Message,
  MyListing,
  PendingLike,
  TenantProfile,
  UploadTicket,
} from "@repo/shared";
import { hc } from "hono/client";
import { preparePhoto, sendPhoto } from "@/lib/photo-upload";
import { dropEarly, sameFilters, takeEarly } from "@/lib/start/early";
import type { Api } from "./client";

/*
 * The app's API, served by the real server: flats and swipes, accounts and
 * profiles, posted flats, and likes, matches and chat. The client is typed
 * from the server's own routes, so the two cannot drift apart.
 */

const v1 = hc<AppType>("/").api.v1;

/**
 * The sign-in library, fetched when it is first needed. Almost every visit
 * already has a session and never touches it: only signing in, signing out,
 * leaving for good, and the rare request the server turns away for want of a
 * session do. Kept out of the app's first download, it is that much less code
 * between a phone and the first card.
 */
const signIn = () => import("@/lib/auth/client");

/** Thrown when the server answers with a failure. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function failure(response: Response): Promise<ApiError> {
  let code = "unknown";
  let message = "The server could not do that.";
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    // Not one of our error bodies: keep the general message.
  }
  return new ApiError(response.status, code, message);
}

/**
 * Make a request as the person using this browser and return the body of the
 * answer. Nearly everyone already has a session, so the request is simply
 * made. Only if the server says there is none is one started (a guest pass, or
 * a trip to the front desk), and the request made once more. Checking first
 * would cost every page a wasted trip to the server.
 */
async function answer<T>(request: () => Promise<Response>): Promise<T> {
  let response = await request();
  if (response.status === 401) {
    const { forgetSession, ensureSession } = await signIn();
    forgetSession();
    await ensureSession();
    response = await request();
  }
  if (response.ok) return (await response.json()) as T;
  throw await failure(response);
}

function feedQuery(filters: FeedFilters, cursor: string | null) {
  return {
    city: filters.city,
    ...(filters.budgetMax === null ? {} : { max: String(filters.budgetMax) }),
    ...(filters.localities.length > 0 ? { area: filters.localities } : {}),
    ...(filters.roomTypes.length > 0 ? { room: filters.roomTypes } : {}),
    ...(cursor ? { cursor } : {}),
  };
}

/** Things the app used to keep in the browser before the server held them. Cleared on leaving. */
const OLD_BROWSER_COPIES = ["flatch.profile.v1", "flatch.listings.v1"];

function forgetBrowserCopies() {
  try {
    for (const key of OLD_BROWSER_COPIES) window.localStorage.removeItem(key);
  } catch {
    // Storage is blocked, so nothing was kept there either.
  }
}

export const httpApi: Api = {
  getFeed: async (cursor, filters) => {
    // The page may already have asked for the top of this very deck (lib/start).
    if (cursor === null) {
      const early = (await takeEarly("deck"))?.deck;
      if (early && sameFilters(early.filters, filters)) return early.page;
    }
    return answer<FeedPage>(() => v1.feed.$get({ query: feedQuery(filters, cursor) }));
  },

  countFeed: async (filters) =>
    (await answer<{ count: number }>(() => v1.feed.count.$post({ json: filters }))).count,

  getLocalities: async (city) =>
    (await answer<{ localities: string[] }>(() => v1.localities.$get({ query: { city } })))
      .localities,

  sendSwipes: async (swipes) => {
    await answer(() => v1.swipes.$post({ json: { swipes } }));
  },

  undoSwipe: async (listingId) => {
    await answer(() => v1.swipes[":listingId"].$delete({ param: { listingId } }));
  },

  getSaved: async () => (await answer<{ items: Listing[] }>(() => v1.saved.$get())).items,

  resetPasses: async () => {
    await answer(() => v1.swipes["reset-passes"].$post());
  },

  getProfile: async () => ((await takeEarly("profile")) ?? (await me())).profile,

  getAccount: async () => ((await takeEarly("account")) ?? (await me())).account,

  saveProfile: async (profile) => {
    dropEarly();
    return (
      await answer<{ profile: TenantProfile }>(() =>
        v1.me["tenant-profile"].$patch({ json: profile }),
      )
    ).profile;
  },

  /**
   * Leave for good: the account and everything of this person's on the server
   * is deleted. If the server will not delete it just now (it asks for a
   * recent sign-in first), the person is at least signed out of this browser.
   */
  resetProfile: async () => {
    dropEarly();
    const { authClient, forgetSession } = await signIn();
    const session = await authClient.getSession();
    const guest = Boolean(
      (session.data?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous,
    );
    const gone = guest ? await authClient.deleteAnonymousUser() : await authClient.deleteUser();
    if (gone.error) await authClient.signOut();
    forgetSession();
    forgetBrowserCopies();
  },

  getMatches: async () => (await answer<{ items: Match[] }>(() => v1.matches.$get())).items,

  getPendingLikes: async () =>
    (await answer<{ items: PendingLike[] }>(() => v1.likes.pending.$get())).items,

  getMessages: async (matchId) =>
    (
      await answer<{ items: Message[] }>(() =>
        v1.matches[":matchId"].messages.$get({ param: { matchId } }),
      )
    ).items,

  sendMessage: async (matchId, body) =>
    (
      await answer<{ message: Message }>(() =>
        v1.matches[":matchId"].messages.$post({ param: { matchId }, json: { body } }),
      )
    ).message,

  markRead: async (matchId) => {
    await answer(() => v1.matches[":matchId"].read.$post({ param: { matchId } }));
  },

  unmatch: async (matchId) => {
    await answer(() => v1.matches[":matchId"].$delete({ param: { matchId } }));
  },

  getApplicants: async (listingId) =>
    (
      await answer<{ items: Applicant[] }>(() =>
        v1.applicants.$get({ query: listingId ? { listingId } : {} }),
      )
    ).items,

  decideApplicant: (applicantId, decision) =>
    answer<{ matchId: string | null }>(() =>
      v1.applicants[":applicantId"].decision.$post({ param: { applicantId }, json: { decision } }),
    ),

  // The sample photos are fixed, so there is nothing to ask the server. They come with the
  // rest of the demo data, which is only fetched when someone reaches the photos step.
  getSamplePhotos: async () => (await import("@repo/db/seed-data")).SAMPLE_PHOTOS,

  getMyListings: async () =>
    (await answer<{ items: MyListing[] }>(() => v1.listings.mine.$get())).items,

  createListing: async (draft, postedFrom) =>
    (
      await answer<{ listing: MyListing }>(() =>
        v1.listings.$post({ json: postedFrom ? { ...draft, postedFrom } : draft }),
      )
    ).listing,

  confirmOnSite: async (listingId, position) =>
    (
      await answer<{ listing: MyListing }>(() =>
        v1.listings[":listingId"]["on-site"].$post({ param: { listingId }, json: position }),
      )
    ).listing,

  /**
   * Upload one photo: shrink and clean it in the browser, get a ticket from our
   * server, then send the photo straight to the image store.
   */
  uploadPhoto: async (file) => {
    const prepared = await preparePhoto(file);
    const { ticket } = await answer<{ ticket: UploadTicket }>(() => v1.uploads.ticket.$post());
    return { url: await sendPhoto(ticket, prepared.blob), dominantColor: prepared.dominantColor };
  },

  setListingOpen: async (listingId, isOpen) =>
    (
      await answer<{ listing: MyListing }>(() =>
        v1.listings[":listingId"].$patch({ param: { listingId }, json: { isOpen } }),
      )
    ).listing,

  renewListing: async (listingId) =>
    (
      await answer<{ listing: MyListing }>(() =>
        v1.listings[":listingId"].renew.$post({ param: { listingId } }),
      )
    ).listing,

  reportListing: async (listingId, report) => {
    await answer(() =>
      v1.listings[":listingId"].report.$post({ param: { listingId }, json: report }),
    );
  },

  deleteListing: async (listingId) => {
    await answer(() => v1.listings[":listingId"].$delete({ param: { listingId } }));
  },

  getEntry: async () => (await signIn()).entryState(),

  continueAsGuest: async () => (await signIn()).startGuestSession(),

  /** Hand over to Google. The page leaves, and comes back signed in. */
  signInWithGoogle: async (next = "/profile") => {
    const { authClient } = await signIn();
    const started = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (started.error) throw new Error(started.error.message ?? "Could not start sign-in.");
  },

  signOut: async () => {
    const { authClient, forgetSession } = await signIn();
    await authClient.signOut();
    forgetSession();
    forgetBrowserCopies();
  },
};

function me() {
  return answer<{ profile: TenantProfile; account: Account }>(() => v1.me.$get());
}
