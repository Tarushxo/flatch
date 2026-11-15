import {
  type Db,
  type LatLng,
  listingPhotos,
  listings,
  localities,
  publicLocation,
} from "@repo/db";
import { SAMPLE_PHOTOS } from "@repo/db/seed-data";
import {
  AMENITIES,
  EXPECTATION_OPTIONS,
  HOUSE_RULE_OPTIONS,
  type ListingDraft,
  type ListingPhoto,
  type MyListing,
  SOCIETY_RULE_OPTIONS,
} from "@repo/shared";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  type Actor,
  mayManageListing,
  mayPostListing,
  maySwitchListing,
  type Refusal,
} from "../policies";

/*
 * A person's own flats: posting one, switching its sign, taking it down.
 * Every change is checked against the policies first. The private fields
 * (society, address) are returned here because the only person who ever gets
 * these answers is the flat's own lister.
 */

/** Thrown when a policy says no, or the flat does not exist. Routes turn it into an answer. */
export class Refused extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "Refused";
  }
}

function refuse(refusal: Refusal): never {
  throw new Refused(refusal.code === "listing_limit" ? 409 : 403, refusal.code, refusal.message);
}

const GONE = new Refused(404, "not_found", "That flat is no longer listed.");

const SAMPLE_BY_URL = new Map(SAMPLE_PHOTOS.map((photo) => [photo.url, photo]));

/** Keep only the choices the form offers, so nothing free-typed rides along in a list. */
function only<T extends string>(offered: readonly T[], chosen: string[]): T[] {
  return offered.filter((option) => chosen.includes(option));
}

/** A stable number from 0 up to (not including) 1, from any text. */
function unit(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/**
 * Where the flat is taken to be. The form has no map pin yet, so this is a
 * point within about 500 m of the middle of its area, fixed for each flat.
 */
function placeIn(centre: LatLng, listingId: string): LatLng {
  const angle = unit(`${listingId}:where`) * 2 * Math.PI;
  const reach = 0.001 + unit(`${listingId}:far`) * 0.0035;
  return {
    lat: Number((centre.lat + Math.sin(angle) * reach).toFixed(6)),
    lng: Number((centre.lng + Math.cos(angle) * reach).toFixed(6)),
  };
}

const photosInOrder = sql<ListingPhoto[]>`coalesce((
  select json_agg(
    json_build_object('url', p.url, 'roomTag', p.room_tag, 'dominantColor', p.dominant_color)
    order by p.position
  )
  from listing_photos p
  where p.listing_id = ${listings.id}
), '[]'::json)`;

function ownListings(db: Db) {
  return db
    .select({
      id: listings.id,
      listerId: listings.listerId,
      status: listings.status,
      title: listings.title,
      description: listings.description,
      city: localities.city,
      locality: localities.name,
      society: listings.societyName,
      addressLine: listings.addressText,
      roomType: listings.roomType,
      bhk: listings.bhk,
      furnishing: listings.furnishing,
      availableFrom: listings.availableFrom,
      rent: listings.rent,
      deposit: listings.deposit,
      maintenance: listings.maintenance,
      utilitiesEstimate: listings.utilitiesEst,
      amenities: listings.amenities,
      houseRules: listings.houseRules,
      societyRules: listings.societyRules,
      expectations: listings.expectations,
      createdAt: listings.createdAt,
      photos: photosInOrder,
    })
    .from(listings)
    .innerJoin(localities, eq(localities.id, listings.localityId));
}

type OwnRow = Awaited<ReturnType<typeof ownListings>>[number];

function toMyListing({
  listerId: _listerId,
  status,
  deposit,
  createdAt,
  ...row
}: OwnRow): MyListing {
  return {
    ...row,
    depositMonths: row.rent > 0 ? Math.round(deposit / row.rent) : 0,
    isOpen: status === "active",
    createdAt: createdAt.toISOString(),
    // Real likes and matches arrive with the match loop (M4).
    interestedCount: 0,
    matchCount: 0,
  };
}

/** The flats this person has posted, newest first. */
export async function getMyListings(db: Db, userId: string): Promise<MyListing[]> {
  const rows = await ownListings(db)
    .where(and(eq(listings.listerId, userId), ne(listings.status, "expired")))
    .orderBy(desc(listings.createdAt));
  return rows.map(toMyListing);
}

async function openCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.listerId, userId), eq(listings.status, "active")));
  return row?.count ?? 0;
}

async function findOwn(db: Db, listingId: string): Promise<OwnRow> {
  const [row] = await ownListings(db).where(eq(listings.id, listingId));
  if (!row) throw GONE;
  return row;
}

/** Post a flat. It starts open to likes. */
export async function createListing(
  db: Db,
  actor: Actor,
  draft: ListingDraft,
  context: { signInOffered: boolean },
): Promise<MyListing> {
  const refusal = mayPostListing(actor, {
    signInOffered: context.signInOffered,
    openCount: await openCount(db, actor.userId),
  });
  if (refusal) refuse(refusal);

  const [locality] = await db
    .select({ id: localities.id, centroid: localities.centroid })
    .from(localities)
    .where(and(eq(localities.city, draft.city), eq(localities.name, draft.locality)));
  if (!locality) throw new Refused(400, "unknown_area", "Choose an area from the list.");

  // Photos are taken from the server's own list by address, never from what was sent.
  const photos = draft.photos.flatMap((photo) => {
    const known = SAMPLE_BY_URL.get(photo.url);
    return known ? [known] : [];
  });
  if (photos.length !== draft.photos.length || new Set(photos).size !== photos.length) {
    throw new Refused(400, "unknown_photo", "Choose photos from the ones offered.");
  }

  const id = crypto.randomUUID();
  const exact = placeIn({ lat: locality.centroid.y, lng: locality.centroid.x }, id);
  const shown = publicLocation(exact, id);

  await db.transaction(async (tx) => {
    await tx.insert(listings).values({
      id,
      listerId: actor.userId,
      status: "active",
      title: draft.title,
      description: draft.description.trim(),
      localityId: locality.id,
      societyName: draft.society,
      addressText: draft.addressLine,
      locationExact: { x: exact.lng, y: exact.lat },
      locationPublic: { x: shown.lng, y: shown.lat },
      rent: draft.rent,
      deposit: draft.rent * draft.depositMonths,
      maintenance: draft.maintenance,
      utilitiesEst: draft.utilitiesEstimate,
      roomType: draft.roomType,
      bhk: draft.bhk,
      furnishing: draft.furnishing,
      availableFrom: draft.availableFrom,
      amenities: only(AMENITIES, draft.amenities),
      houseRules: HOUSE_RULE_OPTIONS.flatMap((label) => {
        const rule = draft.houseRules.find((each) => each.label === label);
        return rule ? [{ label, allowed: rule.allowed }] : [];
      }),
      societyRules: only(SOCIETY_RULE_OPTIONS, draft.societyRules),
      expectations: only(EXPECTATION_OPTIONS, draft.expectations),
      listerRole: "flatmate",
      flatmateCount: 1,
      // A fixed place in the deck's order until the ranking engine scores flats per tenant (M5).
      qualityScore: 70,
      isSeed: false,
      isVerified: false,
    });
    await tx.insert(listingPhotos).values(
      photos.map((photo, position) => ({
        listingId: id,
        url: photo.url,
        roomTag: photo.roomTag,
        dominantColor: photo.dominantColor,
        position,
      })),
    );
  });

  return toMyListing(await findOwn(db, id));
}

/** Switch a flat's vacancy sign on or off. */
export async function setListingOpen(
  db: Db,
  actor: Actor,
  listingId: string,
  open: boolean,
): Promise<MyListing> {
  const row = await findOwn(db, listingId);
  const refusal = maySwitchListing(
    actor,
    { listerId: row.listerId, isOpen: row.status === "active" },
    { open, openCount: await openCount(db, actor.userId) },
  );
  // Someone else's flat is reported as missing, so its existence is not given away.
  if (refusal?.code === "not_yours") throw GONE;
  if (refusal) refuse(refusal);

  await db
    .update(listings)
    .set({ status: open ? "active" : "paused" })
    .where(eq(listings.id, listingId));
  return toMyListing({ ...row, status: open ? "active" : "paused" });
}

/** Take a flat down for good, with its photos and the swipes on it. */
export async function deleteListing(db: Db, actor: Actor, listingId: string): Promise<void> {
  const row = await findOwn(db, listingId);
  if (mayManageListing(actor, row)) throw GONE;
  await db.delete(listings).where(eq(listings.id, listingId));
}
