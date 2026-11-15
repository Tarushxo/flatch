import type { AppType } from "@repo/api";
import type { FeedFilters, FeedPage, Listing } from "@repo/shared";
import { hc } from "hono/client";
import type { Api } from "./client";

/*
 * The parts of the app's API that are served by the real server (M2): the
 * feed, the areas of a city, swipes and saved flats. The client is typed from
 * the server's own routes, so the two cannot drift apart.
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

/** The body of a successful answer, or an ApiError for a failed one. */
async function answer<T>(request: Promise<Response>): Promise<T> {
  const response = await request;
  if (response.ok) return (await response.json()) as T;
  let code = "unknown";
  let message = "The server could not do that.";
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    // Not one of our error bodies: keep the general message.
  }
  throw new ApiError(response.status, code, message);
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
    answer<FeedPage>(v1.feed.$get({ query: feedQuery(filters, cursor) })),

  countFeed: async (filters) =>
    (await answer<{ count: number }>(v1.feed.count.$post({ json: filters }))).count,

  getLocalities: async (city) =>
    (await answer<{ localities: string[] }>(v1.localities.$get({ query: { city } }))).localities,

  sendSwipes: async (swipes) => {
    await answer(v1.swipes.$post({ json: { swipes } }));
  },

  undoSwipe: async (listingId) => {
    await answer(v1.swipes[":listingId"].$delete({ param: { listingId } }));
  },

  getSaved: async () => (await answer<{ items: Listing[] }>(v1.saved.$get())).items,

  resetPasses: async () => {
    await answer(v1.swipes["reset-passes"].$post());
  },
} satisfies Partial<Api>;
