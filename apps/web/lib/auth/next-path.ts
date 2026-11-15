/** Where someone lands after the front desk when nothing else was asked for. */
export const DEFAULT_NEXT = "/discover";

/**
 * The page to go on to after signing in, taken from the `next` value in the
 * address. Only a path on this site is accepted, so a crafted link cannot use
 * the sign-in screen to send someone to another website.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return DEFAULT_NEXT;
  const onThisSite = value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
  if (!onThisSite || value.startsWith("/sign-in") || value.startsWith("/api/")) return DEFAULT_NEXT;
  return value;
}
