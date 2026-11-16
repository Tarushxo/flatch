import { type Db, dailyUsage } from "@repo/db";
import { DAILY_LIMITS, type LimitedAction } from "@repo/shared";
import { sql } from "drizzle-orm";
import { Refused } from "../refused";

/*
 * Daily limits. Each limited action is counted against the person doing it,
 * per UTC day, in one small table. There is no separate rate limiter to run:
 * Postgres is already there, and one statement both counts and reports.
 */

const OVER: Record<LimitedAction, string> = {
  message: "You have sent a lot of messages today. Chat opens again tomorrow.",
  upload: "You have uploaded a lot of photos today. Try again tomorrow.",
  listing: "You have posted several flats today. You can post again tomorrow.",
};

/**
 * Count one more of this action for this person today, and refuse if that is
 * past the day's limit. Call it only once the request is otherwise allowed, so
 * a refused or mistaken request does not use up someone's day.
 */
export async function spend(db: Db, userId: string, action: LimitedAction): Promise<void> {
  const today = sql`(now() at time zone 'utc')::date`;
  const [row] = await db
    .insert(dailyUsage)
    .values({ userId, kind: action, day: today, count: 1 })
    .onConflictDoUpdate({
      target: [dailyUsage.userId, dailyUsage.kind, dailyUsage.day],
      set: { count: sql`${dailyUsage.count} + 1` },
    })
    .returning({ count: dailyUsage.count });
  if (row && row.count > DAILY_LIMITS[action]) throw new Refused(429, "daily_limit", OVER[action]);
}
