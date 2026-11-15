import { type Db, listings, swipes } from "@repo/db";
import type { Listing, SwipeAction } from "@repo/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { publicListings, toListings } from "./feed";

/*
 * Swipes: one decision per person per flat. Everything here is scoped to the
 * person asking, so nobody can read or change anyone else's.
 */

export type SwipeInput = { clientId: string; listingId: string; action: SwipeAction };

/**
 * Record a batch of swipes. Safe to send twice: a swipe that was already
 * stored under the same `clientId` is left as it is. A later swipe on the same
 * flat replaces the earlier decision.
 */
export async function recordSwipes(db: Db, userId: string, batch: SwipeInput[]): Promise<void> {
  if (batch.length === 0) return;

  // Flats that have gone since the deck was loaded are skipped rather than failing the batch.
  const known = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      inArray(
        listings.id,
        batch.map((swipe) => swipe.listingId),
      ),
    );
  const exists = new Set(known.map((row) => row.id));

  // If one flat appears twice in a batch, the last decision wins.
  const latest = new Map<string, SwipeInput>();
  for (const swipe of batch) if (exists.has(swipe.listingId)) latest.set(swipe.listingId, swipe);
  if (latest.size === 0) return;

  await db.transaction(async (tx) => {
    await tx
      .insert(swipes)
      .values([...latest.values()].map((swipe) => ({ userId, ...swipe })))
      .onConflictDoUpdate({
        target: [swipes.userId, swipes.listingId],
        set: {
          action: sql`excluded.action`,
          clientId: sql`excluded.client_id`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`${swipes.clientId} <> excluded.client_id`,
      });
  });
}

/** Take back a swipe, so the flat can be shown again. */
export async function undoSwipe(db: Db, userId: string, listingId: string): Promise<void> {
  await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.listingId, listingId)));
}

/** Forget every pass, so passed flats come round again. */
export async function resetPasses(db: Db, userId: string): Promise<void> {
  await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.action, "pass")));
}

/** The flats this person saved for later, most recent first. */
export async function getSaved(db: Db, userId: string): Promise<Listing[]> {
  const rows = await publicListings(db)
    .innerJoin(swipes, eq(swipes.listingId, listings.id))
    .where(and(eq(swipes.userId, userId), eq(swipes.action, "save")))
    .orderBy(desc(swipes.updatedAt));
  return toListings(rows);
}
