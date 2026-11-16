/*
 * Limits that keep one person, or one script, from filling the free database
 * and photo store. They are far above what anyone using the app normally
 * reaches; the point is that there is a ceiling at all.
 */

/** How many times one person may do each of these in a day (UTC). */
export const DAILY_LIMITS = {
  /** Chat messages sent. */
  message: 300,
  /** Photos sent to the image store. */
  upload: 40,
  /** Flats posted. */
  listing: 4,
} as const;

export type LimitedAction = keyof typeof DAILY_LIMITS;

export const CHAT_LIMITS = {
  /** The most messages one chat may hold, from both people together. */
  perChat: 500,
  /** How many of the latest messages an open chat is sent. */
  shown: 200,
} as const;

/** The most areas a profile or a set of filters may name. No city has this many. */
export const AREAS_MAX = 40;
/** The longest name an area may have. */
export const AREA_NAME_MAX = 80;
/** The most entries in any list of tags sent with a flat (amenities, rules, expectations). */
export const TAGS_MAX = 40;
/** The largest request the API reads, in bytes. The biggest real one, a posted flat, is a few KB. */
export const REQUEST_MAX_BYTES = 64 * 1024;
