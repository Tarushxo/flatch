import { getTableColumns, type SQL, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { createDb } from "../client";
import { listingPhotos, listings, localities, users } from "../schema";
import { buildSeedRows } from "./rows";

/*
 * Fills the database with the demo flats. Run with
 * `pnpm --filter @repo/db db:seed`. Safe to run again: every row has a fixed
 * id, so a second run updates what is there instead of adding copies, and
 * people's swipes on those flats are kept.
 */

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Paste the Neon snippet into .env.local first.");
  process.exit(1);
}

/** `column = excluded.column` for every column named, for "insert or update". */
function overwrite<T extends PgTable>(table: T, keys: (keyof T["_"]["columns"] & string)[]) {
  const columns = getTableColumns(table) as Record<string, { name: string }>;
  return Object.fromEntries(
    keys.map((key) => [key, sql.raw(`excluded."${columns[key]?.name}"`)]),
  ) as Record<string, SQL>;
}

/** Rows are written a batch at a time, to stay well inside the limit on query size. */
function batches<T>(rows: T[], size = 50): T[][] {
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) =>
    rows.slice(index * size, (index + 1) * size),
  );
}

const db = createDb(url);
const rows = buildSeedRows();

try {
  await db.transaction(async (tx) => {
    for (const batch of batches(rows.users)) {
      await tx
        .insert(users)
        .values(batch)
        .onConflictDoUpdate({
          target: users.id,
          set: overwrite(users, ["displayName", "about", "isSeed", "isGuest"]),
        });
    }

    for (const batch of batches(rows.localities)) {
      await tx
        .insert(localities)
        .values(batch)
        .onConflictDoUpdate({
          target: localities.id,
          set: overwrite(localities, ["city", "name", "centroid"]),
        });
    }

    const listingColumns = Object.keys(rows.listings[0] ?? {}).filter(
      (key) => key !== "id",
    ) as (keyof typeof listings.$inferInsert & string)[];
    for (const batch of batches(rows.listings, 25)) {
      await tx
        .insert(listings)
        .values(batch)
        .onConflictDoUpdate({
          target: listings.id,
          set: overwrite(listings, listingColumns),
        });
    }

    // Photos are replaced whole, so a flat that now has fewer does not keep old ones.
    const seeded = rows.listings.map((row) => row.id as string);
    for (const batch of batches(seeded, 100)) {
      await tx.delete(listingPhotos).where(sql`${listingPhotos.listingId} in ${batch}`);
    }
    for (const batch of batches(rows.photos, 100)) {
      await tx.insert(listingPhotos).values(batch);
    }
  });

  console.log(
    `Seeded ${rows.listings.length} flats in ${rows.localities.length} areas, with ${rows.photos.length} photos.`,
  );
} finally {
  await db.close();
}
