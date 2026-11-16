import {
  type Db,
  type LatLng,
  listingPhotos,
  listings,
  localities,
  publicLocation,
  reports,
  users,
} from "@repo/db";
import { SAMPLE_PHOTOS } from "@repo/db/seed-data";
import {
  AMENITIES,
  checkOnSite,
  type DevicePosition,
  EXPECTATION_OPTIONS,
  expiryFrom,
  HOUSE_RULE_OPTIONS,
  type ListingDraft,
  type ListingPhoto,
  type MyListing,
  ON_SITE_REASONS,
  REPORTS_TO_PAUSE,
  type ReportReason,
  SOCIETY_RULE_OPTIONS,
} from "@repo/shared";
import { and, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { type CloudinaryConfig, destroyPhotos, ownedPublicId } from "../cloudinary";
import {
  type Actor,
  mayManageListing,
  mayPostListing,
  mayReportListing,
  maySwitchListing,
  type Refusal,
} from "../policies";
import { Refused } from "../refused";
import { inviteBotTenants, stopBotArrivals } from "./matching";
import { spend } from "./usage";

/*
 * A person's own flats: posting one, switching its sign, taking it down.
 * Every change is checked against the policies first. The private fields
 * (society, address) are returned here because the only person who ever gets
 * these answers is the flat's own lister.
 */

/** A refusal about the state of things is a conflict; one about who is asking is forbidden. */
const CONFLICTS: Refusal["code"][] = ["listing_limit", "under_review"];

function refuse(refusal: Refusal): never {
  throw new Refused(CONFLICTS.includes(refusal.code) ? 409 : 403, refusal.code, refusal.message);
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
      isVerified: listings.isVerified,
      expiresAt: listings.expiresAt,
      underReview: listings.underReview,
      // Tenants waiting for an answer, and matches still open.
      interestedCount: sql<number>`(
        select count(*)::int from interests i
        where i.listing_id = ${listings.id} and i.status = 'pending' and i.visible_at <= now()
      )`,
      matchCount: sql<number>`(
        select count(*)::int from conversations c
        where c.listing_id = ${listings.id} and c.ended_at is null and c.matched_at <= now()
      )`,
      photos: photosInOrder,
    })
    .from(listings)
    .innerJoin(localities, eq(localities.id, listings.localityId));
}

type OwnRow = Awaited<ReturnType<typeof ownListings>>[number];

const stillRunning = (expiresAt: Date | null, now: Date) =>
  expiresAt === null || expiresAt.getTime() > now.getTime();

function toMyListing(
  { listerId: _listerId, status, deposit, createdAt, expiresAt, ...row }: OwnRow,
  now = new Date(),
): MyListing {
  return {
    ...row,
    depositMonths: row.rent > 0 ? Math.round(deposit / row.rent) : 0,
    // A flat that has run out of time is closed, whatever its switch says.
    isOpen: status === "active" && stillRunning(expiresAt, now),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    createdAt: createdAt.toISOString(),
  };
}

/** The flats this person has posted, newest first. */
export async function getMyListings(db: Db, userId: string): Promise<MyListing[]> {
  const rows = await ownListings(db)
    .where(and(eq(listings.listerId, userId), ne(listings.status, "expired")))
    .orderBy(desc(listings.createdAt));
  const now = new Date();
  return rows.map((row) => toMyListing(row, now));
}

async function openCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      and(
        eq(listings.listerId, userId),
        eq(listings.status, "active"),
        // A flat that has run out of time no longer takes up one of the person's places.
        or(isNull(listings.expiresAt), gt(listings.expiresAt, sql`now()`)),
      ),
    );
  return row?.count ?? 0;
}

async function findOwn(db: Db, listingId: string): Promise<OwnRow> {
  const [row] = await ownListings(db).where(eq(listings.id, listingId));
  if (!row) throw GONE;
  return row;
}

/** The device's position as the flat's private location, to the nearest metre or so. */
function exactFrom(position: DevicePosition): LatLng {
  return { lat: Number(position.lat.toFixed(5)), lng: Number(position.lng.toFixed(5)) };
}

/**
 * Post a flat. It starts open to likes. If the lister said where they are
 * standing and that is in the flat's area, the flat is marked as posted from
 * there and that spot becomes its private location.
 */
export async function createListing(
  db: Db,
  actor: Actor,
  draft: ListingDraft & { postedFrom?: DevicePosition },
  context: { signInOffered: boolean; storage: CloudinaryConfig | null },
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

  // A photo is either one of the offered samples (taken from the server's own list, never
  // from what was sent) or one this person uploaded to their own folder. Nothing else.
  const photos = draft.photos.flatMap((photo): ListingPhoto[] => {
    const sample = SAMPLE_BY_URL.get(photo.url);
    if (sample) return [sample];
    const mine = context.storage && ownedPublicId(photo.url, context.storage, actor.userId);
    return mine ? [photo] : [];
  });
  const distinct = new Set(photos.map((photo) => photo.url));
  if (photos.length !== draft.photos.length || distinct.size !== photos.length) {
    throw new Refused(400, "unknown_photo", "Use photos you uploaded here, or the ones offered.");
  }

  // Everything about the flat checks out, so it counts towards today's posts.
  await spend(db, actor.userId, "listing");

  const id = crypto.randomUUID();
  const centre = { lat: locality.centroid.y, lng: locality.centroid.x };
  const onSite = draft.postedFrom ? checkOnSite(centre, draft.postedFrom).ok : false;
  const exact = onSite && draft.postedFrom ? exactFrom(draft.postedFrom) : placeIn(centre, id);
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
      // No longer read: the ranking engine scores each flat for each tenant.
      qualityScore: 70,
      isSeed: false,
      isVerified: onSite,
      expiresAt: expiryFrom(new Date()),
    });
    // The demo's bot tenants turn up over the next minute, so there is someone to answer.
    await inviteBotTenants(tx, id, new Date());
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

/**
 * Switch a flat's vacancy sign on or off. Switching on a flat that had run out
 * of time also gives it a fresh thirty days.
 */
export async function setListingOpen(
  db: Db,
  actor: Actor,
  listingId: string,
  open: boolean,
): Promise<MyListing> {
  const row = await findOwn(db, listingId);
  const now = new Date();
  const refusal = maySwitchListing(
    actor,
    {
      listerId: row.listerId,
      isOpen: row.status === "active" && stillRunning(row.expiresAt, now),
      underReview: row.underReview,
    },
    { open, openCount: await openCount(db, actor.userId) },
  );
  // Someone else's flat is reported as missing, so its existence is not given away.
  if (refusal?.code === "not_yours") throw GONE;
  if (refusal) refuse(refusal);

  const status = open ? ("active" as const) : ("paused" as const);
  const expiresAt = open && !stillRunning(row.expiresAt, now) ? expiryFrom(now) : row.expiresAt;
  await db.update(listings).set({ status, expiresAt }).where(eq(listings.id, listingId));
  if (!open) await stopBotArrivals(db, listingId);
  return toMyListing({ ...row, status, expiresAt }, now);
}

/** "Still available": give a flat a fresh thirty days on the board, and switch it on. */
export async function renewListing(db: Db, actor: Actor, listingId: string): Promise<MyListing> {
  const row = await findOwn(db, listingId);
  const now = new Date();
  const refusal = maySwitchListing(
    actor,
    {
      listerId: row.listerId,
      isOpen: row.status === "active" && stillRunning(row.expiresAt, now),
      underReview: row.underReview,
    },
    { open: true, openCount: await openCount(db, actor.userId) },
  );
  if (refusal?.code === "not_yours") throw GONE;
  if (refusal) refuse(refusal);

  const expiresAt = expiryFrom(now);
  await db.update(listings).set({ status: "active", expiresAt }).where(eq(listings.id, listingId));
  return toMyListing({ ...row, status: "active", expiresAt }, now);
}

/**
 * Report a flat. One report per person per flat; reporting again replaces the
 * earlier one. Once enough different people have reported it, the flat comes
 * off the board. Nothing about other people's reports is given back.
 */
export async function reportListing(
  db: Db,
  actor: Actor,
  listingId: string,
  report: { reason: ReportReason; note?: string },
  context: { signInOffered: boolean },
): Promise<void> {
  const [listing] = await db
    .select({ listerId: listings.listerId, isSeed: listings.isSeed })
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing) throw GONE;
  const refusal = mayReportListing(actor, listing, context);
  if (refusal) refuse(refusal);

  await db.transaction(async (tx) => {
    const details = { reason: report.reason, note: report.note ?? "" };
    await tx
      .insert(reports)
      .values({ reporterId: actor.userId, listingId, ...details })
      .onConflictDoUpdate({ target: [reports.reporterId, reports.listingId], set: details });

    // Only reports from signed-in people count towards taking a flat down.
    const [tally] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.reporterId))
      .where(
        and(
          eq(reports.listingId, listingId),
          context.signInOffered ? eq(users.isAnonymous, false) : undefined,
        ),
      );
    if ((tally?.count ?? 0) >= REPORTS_TO_PAUSE) {
      await tx.update(listings).set({ underReview: true }).where(eq(listings.id, listingId));
    }
  });
}

/**
 * "Posted from here", after the fact: the lister is at the flat now and says
 * so. If their device agrees, the flat is marked and that spot becomes its
 * private location.
 */
export async function confirmOnSite(
  db: Db,
  actor: Actor,
  listingId: string,
  position: DevicePosition,
): Promise<MyListing> {
  const row = await findOwn(db, listingId);
  if (mayManageListing(actor, row)) throw GONE;

  const [area] = await db
    .select({ centroid: localities.centroid })
    .from(listings)
    .innerJoin(localities, eq(localities.id, listings.localityId))
    .where(eq(listings.id, listingId));
  if (!area) throw GONE;

  const result = checkOnSite({ lat: area.centroid.y, lng: area.centroid.x }, position);
  if (!result.ok)
    throw new Refused(409, `on_site_${result.reason}`, ON_SITE_REASONS[result.reason]);

  const exact = exactFrom(position);
  const shown = publicLocation(exact, listingId);
  await db
    .update(listings)
    .set({
      isVerified: true,
      locationExact: { x: exact.lng, y: exact.lat },
      locationPublic: { x: shown.lng, y: shown.lat },
    })
    .where(eq(listings.id, listingId));
  return toMyListing({ ...row, isVerified: true });
}

/**
 * Remove from the image store every photo this person uploaded for their flats.
 * Called just before their account is deleted: the flats go with the account,
 * and without this their photos would stay reachable at their addresses.
 */
export async function destroyUploadsOf(
  db: Db,
  userId: string,
  storage: CloudinaryConfig,
): Promise<number> {
  const rows = await db
    .select({ url: listingPhotos.url })
    .from(listingPhotos)
    .innerJoin(listings, eq(listings.id, listingPhotos.listingId))
    .where(eq(listings.listerId, userId));
  const uploads = rows.flatMap((row) => {
    const publicId = ownedPublicId(row.url, storage, userId);
    return publicId ? [publicId] : [];
  });
  await destroyPhotos(storage, uploads);
  return uploads.length;
}

/** Take a flat down for good, with its photos and the swipes on it. */
export async function deleteListing(
  db: Db,
  actor: Actor,
  listingId: string,
  storage: CloudinaryConfig | null,
): Promise<void> {
  const row = await findOwn(db, listingId);
  if (mayManageListing(actor, row)) throw GONE;
  await db.delete(listings).where(eq(listings.id, listingId));

  // The lister's own uploads go with the flat. Sample photos are shared and stay.
  if (storage) {
    const uploads = row.photos.flatMap((photo) => {
      const publicId = ownedPublicId(photo.url, storage, actor.userId);
      return publicId ? [publicId] : [];
    });
    await destroyPhotos(storage, uploads);
  }
}

export { Refused };
