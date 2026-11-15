/*
 * Where a page of the feed ended. The feed is ordered by score, then id, so
 * the cursor holds both for the last flat on the page, and the next page
 * starts just after it. To the app it is an opaque string.
 */

export type FeedCursor = { score: number; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify([cursor.score, cursor.id])).toString("base64url");
}

/** The cursor a string stands for, or null if it is missing or not one of ours. */
export function decodeCursor(text: string | null | undefined): FeedCursor | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(text, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return null;
    const [score, id] = parsed;
    if (typeof score !== "number" || !Number.isFinite(score)) return null;
    if (typeof id !== "string" || !UUID.test(id)) return null;
    return { score, id };
  } catch {
    return null;
  }
}
