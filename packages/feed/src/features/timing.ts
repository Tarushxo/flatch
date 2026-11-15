import type { TenantPreferences } from "@repo/shared";

type MoveIn = NonNullable<TenantPreferences["moveIn"]>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today until the room is free. A room that is already free is 0. */
export function daysUntilFree(availableFrom: string, today: Date): number {
  const free = Date.parse(`${availableFrom}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((free - start) / DAY_MS));
}

/** For each answer: the wait that is ideal (in days), and where the fit reaches zero. */
const WINDOWS: Record<
  Exclude<MoveIn, "browsing">,
  { idealFrom: number; idealTo: number; zeroAt: number }
> = {
  asap: { idealFrom: 0, idealTo: 10, zeroAt: 45 },
  month: { idealFrom: 0, idealTo: 30, zeroAt: 75 },
  quarter: { idealFrom: 21, idealTo: 90, zeroAt: 135 },
};

/**
 * How well the date a room is free fits when the tenant wants to move, from 0
 * to 1. Null when the tenant has not said, or is only browsing: no preference
 * is "unknown", not a perfect fit.
 */
export function timingFit(
  availableFrom: string,
  moveIn: TenantPreferences["moveIn"],
  today: Date,
): number | null {
  if (moveIn === null || moveIn === "browsing") return null;
  const wait = daysUntilFree(availableFrom, today);
  const { idealFrom, idealTo, zeroAt } = WINDOWS[moveIn];
  if (wait < idealFrom) {
    // Free sooner than the tenant plans to move: workable, but the lister would be waiting.
    return 0.6 + 0.4 * (wait / idealFrom);
  }
  if (wait <= idealTo) return 1;
  if (wait >= zeroAt) return 0;
  return 1 - (wait - idealTo) / (zeroAt - idealTo);
}
