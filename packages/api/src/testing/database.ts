import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import * as tables from "@repo/db";
import { type Db, listingPhotos, listings, localities, profiles, users } from "@repo/db";
import { buildSeedRows } from "@repo/db/seed-rows";
import type { ListingDraft } from "@repo/shared";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Actor } from "../policies";
import { createListing } from "../services/listings";

/*
 * A real Postgres, with PostGIS, that lives inside the test and is thrown away
 * afterwards. It is built from the project's own migrations and filled with the
 * same demo flats as the live site, so the services run here exactly the SQL
 * they run there. Nothing touches the network or the real database.
 *
 * Each test file makes one of these. Tests within a file share it, so each
 * test makes its own people and flats and looks only at those.
 */

const MIGRATIONS = fileURLToPath(new URL("../../../db/migrations", import.meta.url));

const batches = <T>(rows: T[], size = 100): T[][] =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, n) =>
    rows.slice(n * size, (n + 1) * size),
  );

export type TestDb = { db: Db; close: () => Promise<void> };

export async function testDatabase(): Promise<TestDb> {
  const postgres = new PGlite({ extensions: { postgis } });
  const local = drizzle(postgres, { schema: tables });
  await migrate(local, { migrationsFolder: MIGRATIONS });

  const rows = buildSeedRows();
  for (const batch of batches(rows.users)) await local.insert(users).values(batch);
  for (const batch of batches(rows.profiles)) await local.insert(profiles).values(batch);
  for (const batch of batches(rows.localities)) await local.insert(localities).values(batch);
  for (const batch of batches(rows.listings)) await local.insert(listings).values(batch);
  for (const batch of batches(rows.photos)) await local.insert(listingPhotos).values(batch);

  // The services are written against the live site's driver. This one speaks the same
  // dialect and has the same methods; only the wire underneath differs.
  return { db: local as unknown as Db, close: () => postgres.close() };
}

let people = 0;

/** A new person. A guest by default, as most visitors are. */
export async function person(
  db: Db,
  { guest = true, name = "" }: { guest?: boolean; name?: string } = {},
): Promise<Actor> {
  people += 1;
  const [row] = await db
    .insert(users)
    .values({ name, email: `person-${people}-${Date.now()}@test.invalid`, isAnonymous: guest })
    .returning({ id: users.id });
  if (!row) throw new Error("Could not make a test person.");
  return { userId: row.id, isGuest: guest };
}

const SAMPLE = (id: string) => ({
  url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop`,
  roomTag: "bedroom" as const,
  dominantColor: "#336699",
});

/** A flat as someone would fill it in, with three of the sample photos. */
export function draftFlat(changes: Partial<ListingDraft> = {}): ListingDraft {
  return {
    title: "A room near the lake",
    description: "",
    city: "Kolkata",
    locality: "Salt Lake",
    society: "Secret Court",
    addressLine: "Flat 9Z, Hidden Street",
    roomType: "private_room",
    bhk: 2,
    furnishing: "furnished",
    availableFrom: "2026-12-01",
    rent: 15000,
    maintenance: 0,
    utilitiesEstimate: 0,
    depositMonths: 1,
    photos: [
      SAMPLE("1771287491132-4954b32210d6"),
      SAMPLE("1663756915302-78b3bc4be8f1"),
      SAMPLE("1737467026661-31b5a87098fe"),
    ],
    amenities: [],
    houseRules: [],
    societyRules: [],
    expectations: [],
    ...changes,
  };
}

/** Post a flat as this person, on a server that has no sign-in to insist on. */
export function postFlat(db: Db, lister: Actor, changes: Partial<ListingDraft> = {}) {
  return createListing(db, lister, draftFlat(changes), { signInOffered: false, storage: null });
}

/**
 * Let time pass. Bots answer "in a while": their likes, matches and messages
 * are written with the moment they become visible. Moving every such moment
 * back by this many seconds is the same as waiting that long.
 */
export async function wait(db: Db, seconds: number): Promise<void> {
  const gap = sql.raw(`interval '${Math.round(seconds)} seconds'`);
  await db.execute(sql`update interests set visible_at = visible_at - ${gap}`);
  await db.execute(sql`update conversations set matched_at = matched_at - ${gap}`);
  await db.execute(sql`update messages set visible_at = visible_at - ${gap}`);
}
