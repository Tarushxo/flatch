import { type Db, listings, localities, swipes, users } from "@repo/db";
import type { City, FeedFilters, FeedPage, Listing } from "@repo/shared";
import { and, asc, desc, eq, gt, inArray, lt, lte, notExists, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "../cursor";
import { type PublicListingRow, type PublicPhotoRow, toListing } from "../serialize";

/*
 * The feed, version 0: hard filters and a fixed order, worked out on every
 * request. A flat the person has swiped on is left out by the query itself,
 * so it cannot come back. The ranking engine (M5) replaces the ordering.
 */

export const PAGE_SIZE = 10;

/** Everything the app may see about a listing. The private columns are deliberately not here. */
const PUBLIC_COLUMNS = {
  id: listings.id,
  status: listings.status,
  title: listings.title,
  description: listings.description,
  locationPublic: listings.locationPublic,
  rent: listings.rent,
  deposit: listings.deposit,
  maintenance: listings.maintenance,
  utilitiesEst: listings.utilitiesEst,
  roomType: listings.roomType,
  bhk: listings.bhk,
  furnishing: listings.furnishing,
  availableFrom: listings.availableFrom,
  availableInDays: listings.availableInDays,
  amenities: listings.amenities,
  nearby: listings.nearby,
  houseRules: listings.houseRules,
  societyRules: listings.societyRules,
  expectations: listings.expectations,
  listerRole: listings.listerRole,
  flatmateCount: listings.flatmateCount,
  qualityScore: listings.qualityScore,
  seedCompat: listings.seedCompat,
  seedCommuteMinutes: listings.seedCommuteMinutes,
  seedStretchLabel: listings.seedStretchLabel,
  isSeed: listings.isSeed,
  isVerified: listings.isVerified,
  publishedAt: listings.publishedAt,
  createdAt: listings.createdAt,
  city: localities.city,
  locality: localities.name,
  listerName: users.displayName,
  listerAbout: users.about,
} satisfies Record<keyof PublicListingRow, unknown>;

/** What the flat really costs each month: rent plus the recurring extras. */
const monthlyCost = sql<number>`(${listings.rent} + ${listings.maintenance} + ${listings.utilitiesEst})`;

/** The conditions a flat must meet to be in this person's deck. */
function inDeck(db: Db, filters: FeedFilters, userId: string | null) {
  const swiped = db
    .select({ one: sql`1` })
    .from(swipes)
    .where(and(eq(swipes.userId, userId ?? ""), eq(swipes.listingId, listings.id)));

  return and(
    eq(listings.status, "active"),
    eq(localities.city, filters.city),
    filters.budgetMax === null ? undefined : lte(monthlyCost, filters.budgetMax),
    filters.localities.length === 0 ? undefined : inArray(localities.name, filters.localities),
    filters.roomTypes.length === 0 ? undefined : inArray(listings.roomType, filters.roomTypes),
    userId === null ? undefined : notExists(swiped),
  );
}

/**
 * A listing's photos, in order, fetched as part of the same query as the
 * listing. One trip to the database instead of two matters when the database
 * is an ocean away.
 */
const photosInOrder = sql<PublicPhotoRow[]>`coalesce((
  select json_agg(
    json_build_object('url', p.url, 'roomTag', p.room_tag, 'dominantColor', p.dominant_color)
    order by p.position
  )
  from listing_photos p
  where p.listing_id = ${listings.id}
), '[]'::json)`;

type ListingWithPhotos = PublicListingRow & { photos: PublicPhotoRow[] };

/** Shape rows for the app. */
export function toListings(rows: ListingWithPhotos[]): Listing[] {
  const today = new Date();
  return rows.map(({ photos, ...row }) => toListing(row, photos, today));
}

/** The public columns of listings with their photos, joined to their area and lister. */
export function publicListings(db: Db) {
  return db
    .select({ ...PUBLIC_COLUMNS, photos: photosInOrder })
    .from(listings)
    .innerJoin(localities, eq(localities.id, listings.localityId))
    .innerJoin(users, eq(users.id, listings.listerId));
}

export async function getFeedPage(
  db: Db,
  input: { filters: FeedFilters; userId: string | null; cursor: string | null },
): Promise<FeedPage> {
  const after = decodeCursor(input.cursor);
  const rows = await publicListings(db)
    .where(
      and(
        inDeck(db, input.filters, input.userId),
        after === null
          ? undefined
          : or(
              lt(listings.qualityScore, after.score),
              and(eq(listings.qualityScore, after.score), gt(listings.id, after.id)),
            ),
      ),
    )
    .orderBy(desc(listings.qualityScore), asc(listings.id))
    // One more than a page, to know whether there is another page without a second query.
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  return {
    items: toListings(page),
    nextCursor:
      rows.length > PAGE_SIZE && last
        ? encodeCursor({ score: last.qualityScore, id: last.id })
        : null,
  };
}

/** How many flats the filters leave in this person's deck. */
export async function countFeed(
  db: Db,
  input: { filters: FeedFilters; userId: string | null },
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .innerJoin(localities, eq(localities.id, listings.localityId))
    .where(inDeck(db, input.filters, input.userId));
  return row?.count ?? 0;
}

/** The areas of a city that have at least one open flat, in alphabetical order. */
export async function getLocalityNames(db: Db, city: City): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: localities.name })
    .from(localities)
    .innerJoin(listings, eq(listings.localityId, localities.id))
    .where(and(eq(localities.city, city), eq(listings.status, "active")))
    .orderBy(asc(localities.name));
  return rows.map((row) => row.name);
}
