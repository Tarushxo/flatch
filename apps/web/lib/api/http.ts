import type { AppType } from "@repo/api";
import type { Account, FeedFilters, FeedPage, Listing, TenantProfile } from "@repo/shared";
import { hc } from "hono/client";
import { authClient, ensureSession, forgetSession } from "@/lib/auth/client";
import type { Api } from "./client";

/*
 * The parts of the app's API that are served by the real server: the feed,
 * the areas of a city, swipes and saved flats (M2), and the person's account
 * and profile (M3). The client is typed from the server's own routes, so the
 * two cannot drift apart.
 */

const v1 = hc<AppType>("/").api.v1;

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
 * answer. A session is started first if there is none. If the server says the
 * session has ended, a new one is started and the request is made once more.
 */
async function answer<T>(request: () => Promise<Response>): Promise<T> {
  await ensureSession();
  let response = await request();
  if (response.status === 401) {
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

export const httpApi = {
  getFeed: (cursor, filters) =>
    answer<FeedPage>(() => v1.feed.$get({ query: feedQuery(filters, cursor) })),

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

  getProfile: async () => (await me()).profile,

  getAccount: async () => (await me()).account,

  saveProfile: async (profile) =>
    (
      await answer<{ profile: TenantProfile }>(() =>
        v1.me["tenant-profile"].$patch({ json: profile }),
      )
    ).profile,

  /**
   * Leave for good: the account and everything of this person's on the server
   * is deleted. If the server will not delete it just now (it asks for a
   * recent sign-in first), the person is at least signed out of this browser.
   */
  resetProfile: async () => {
    const session = await authClient.getSession();
    const guest = Boolean(
      (session.data?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous,
    );
    const gone = guest ? await authClient.deleteAnonymousUser() : await authClient.deleteUser();
    if (gone.error) await authClient.signOut();
    forgetSession();
  },

  /** Hand over to Google. The page leaves, and comes back to the Profile tab signed in. */
  signInWithGoogle: async () => {
    const started = await authClient.signIn.social({ provider: "google", callbackURL: "/profile" });
    if (started.error) throw new Error(started.error.message ?? "Could not start sign-in.");
  },

  signOut: async () => {
    await authClient.signOut();
    forgetSession();
  },
} satisfies Partial<Api>;

function me() {
  return answer<{ profile: TenantProfile; account: Account }>(() => v1.me.$get());
}
