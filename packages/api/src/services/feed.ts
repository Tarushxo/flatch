import { type Db, listings, localities, profiles, swipes, users } from "@repo/db";
import {
  compatibility,
  isRuledOut,
  type Reader,
  rankScore,
  type ScoredFlat,
  type ScoredTenant,
} from "@repo/feed";
import {
  type City,
  DEFAULT_PREFERENCES,
  type FeedFilters,
  type FeedPage,
  type Listing,
} from "@repo/shared";
import { and, asc, desc, eq, gt, inArray, isNull, lte, ne, notExists, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "../cursor";
import { freeFrom, type PublicListingRow, type PublicPhotoRow, toListing } from "../serialize";

/*
 * The feed. Which flats a person may see is decided in SQL (open, in their
 * city, inside their filters, not already swiped). How well each one fits
 * them, and so the order, is worked out by the ranking engine in
 * `packages/feed`, here, on every request. A flat the person has swiped on is
 * left out by the query itself, so it cannot come back.
 */

export const PAGE_SIZE = 10;
/** The most flats ranked for one request. Far more than any city has today. */
const CANDIDATE_LIMIT = 400;

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
  listerName: users.name,
  listerAbout: users.about,
} satisfies Record<keyof PublicListingRow, unknown>;

/** What the flat really costs each month: rent plus the recurring extras. */
const monthlyCost = sql<number>`(${listings.rent} + ${listings.maintenance} + ${listings.utilitiesEst})`;

/**
 * A flat anyone may be shown: open, not run out of time, and not taken off
 * the board after reports.
 */
export const onTheBoard = and(
  eq(listings.status, "active"),
  eq(listings.underReview, false),
  or(isNull(listings.expiresAt), gt(listings.expiresAt, sql`now()`)),
);

/** Who the deck is for. A guest sees demo flats only; nobody is shown their own flat. */
export type Viewer = { userId: string; isGuest: boolean } | null;

/** The conditions a flat must meet to be in this person's deck. */
function inDeck(db: Db, filters: FeedFilters, viewer: Viewer) {
  const swiped = db
    .select({ one: sql`1` })
    .from(swipes)
    .where(and(eq(swipes.userId, viewer?.userId ?? ""), eq(swipes.listingId, listings.id)));

  return and(
    onTheBoard,
    eq(localities.city, filters.city),
    filters.budgetMax === null ? undefined : lte(monthlyCost, filters.budgetMax),
    filters.localities.length === 0 ? undefined : inArray(localities.name, filters.localities),
    filters.roomTypes.length === 0 ? undefined : inArray(listings.roomType, filters.roomTypes),
    // Guests only ever interact with demo data (see CLAUDE.md), and so does the public preview.
    viewer === null || viewer.isGuest ? eq(listings.isSeed, true) : undefined,
    viewer === null ? undefined : ne(listings.listerId, viewer.userId),
    viewer === null ? undefined : notExists(swiped),
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

/** What the ranking engine needs to know about a flat, taken from its public columns. */
export function scoredFlat(
  row: Pick<
    ListingWithPhotos,
    | "rent"
    | "maintenance"
    | "utilitiesEst"
    | "locality"
    | "availableFrom"
    | "availableInDays"
    | "houseRules"
    | "description"
    | "isVerified"
    | "publishedAt"
  > & { photoCount: number },
  today: Date,
): ScoredFlat {
  return {
    monthlyCost: row.rent + row.maintenance + row.utilitiesEst,
    locality: row.locality,
    availableFrom: freeFrom(row, today),
    houseRules: row.houseRules,
    photoCount: row.photoCount,
    descriptionLength: row.description.length,
    isVerified: row.isVerified,
    publishedAt: new Date(row.publishedAt),
  };
}

/** What a person said they are looking for, as the ranking engine reads it. Null if nothing is saved. */
export async function tenantFor(db: Db, userId: string | null): Promise<ScoredTenant | null> {
  if (userId === null) return null;
  const [row] = await db
    .select({ preferences: profiles.preferences })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return row ? { ...DEFAULT_PREFERENCES, ...row.preferences } : null;
}

/**
 * Shape rows for the app. Given what the person is looking for, each flat
 * also carries how well it fits them; without it, flats carry no score.
 */
export function toListings(
  rows: ListingWithPhotos[],
  tenant: ScoredTenant | null = null,
  reader: Reader = "tenant",
): Listing[] {
  const today = new Date();
  return rows.map(({ photos, ...row }) => {
    const fit = tenant
      ? compatibility(
          tenant,
          scoredFlat({ ...row, photoCount: photos.length }, today),
          today,
          reader,
        )
      : undefined;
    return toListing(row, photos, today, fit);
  });
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
  input: {
    filters: FeedFilters;
    viewer: Viewer;
    cursor: string | null;
    /** What the person is looking for, when the caller has already read it. Saves a lookup. */
    tenant?: ScoredTenant;
  },
): Promise<FeedPage> {
  const today = new Date();
  // Both at once: the flats that could be in the deck, and what the person is looking for.
  const [candidates, saved] = await Promise.all([
    publicListings(db)
      .where(inDeck(db, input.filters, input.viewer))
      .orderBy(desc(listings.publishedAt), asc(listings.id))
      .limit(CANDIDATE_LIMIT),
    input.tenant ?? tenantFor(db, input.viewer?.userId ?? null),
  ]);
  const tenant = saved ?? DEFAULT_PREFERENCES;

  // Rank every candidate for this person. Best first; the id settles ties, so the order is
  // the same on every request and a cursor can pick up exactly where the last page ended.
  const ranked = candidates
    .map((row) => {
      const flat = scoredFlat({ ...row, photoCount: row.photos.length }, today);
      return { row, flat, score: rankScore(tenant, flat, today) };
    })
    .filter(({ flat }) => !isRuledOut(tenant, flat))
    .sort((a, b) => b.score - a.score || (a.row.id < b.row.id ? -1 : 1));

  const after = decodeCursor(input.cursor);
  const rest = after
    ? ranked.filter(
        ({ row, score }) => score < after.score || (score === after.score && row.id > after.id),
      )
    : ranked;
  const page = rest.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];

  return {
    items: page.map(({ row: { photos, ...row }, flat }) =>
      toListing(row, photos, today, compatibility(tenant, flat, today)),
    ),
    nextCursor:
      rest.length > PAGE_SIZE && last ? encodeCursor({ score: last.score, id: last.row.id }) : null,
  };
}

/**
 * One flat, as anyone with its link may see it: the public details only, and
 * only while it is on the board. Null otherwise.
 */
export async function getPublicListing(db: Db, listingId: string): Promise<Listing | null> {
  const rows = await publicListings(db)
    .where(and(eq(listings.id, listingId), onTheBoard))
    .limit(1);
  return toListings(rows)[0] ?? null;
}

/** How many flats the filters leave in this person's deck, after their dealbreakers. */
export async function countFeed(
  db: Db,
  input: { filters: FeedFilters; viewer: Viewer },
): Promise<number> {
  const [rows, saved] = await Promise.all([
    db
      .select({ houseRules: listings.houseRules })
      .from(listings)
      .innerJoin(localities, eq(localities.id, listings.localityId))
      .where(inDeck(db, input.filters, input.viewer))
      .limit(CANDIDATE_LIMIT),
    tenantFor(db, input.viewer?.userId ?? null),
  ]);
  if (!saved || saved.dealbreakers.length === 0) return rows.length;
  // Only the house rules matter for ruling a flat out; the rest of the flat is not needed.
  const blank = {
    monthlyCost: 0,
    locality: "",
    availableFrom: "1970-01-01",
    photoCount: 0,
    descriptionLength: 0,
    isVerified: false,
    publishedAt: new Date(0),
  };
  return rows.filter((row) => !isRuledOut(saved, { ...blank, houseRules: row.houseRules })).length;
}

/** The areas of a city that have at least one open flat, in alphabetical order. */
export async function getLocalityNames(db: Db, city: City): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: localities.name })
    .from(localities)
    .innerJoin(listings, eq(listings.localityId, localities.id))
    .where(and(eq(localities.city, city), onTheBoard))
    .orderBy(asc(localities.name));
  return rows.map((row) => row.name);
}
