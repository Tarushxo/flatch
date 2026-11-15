import type { Listing } from "@repo/shared";
import { type LatLng, publicLocation } from "../location";
import type { listingPhotos, listings, localities, users } from "../schema";
import { AVAILABLE_IN_DAYS, SEED_FLATS, seedLocalities } from "./flats";
import { stableId } from "./ids";

/*
 * Turns the demo flats into database rows. Kept apart from the script that
 * writes them, so the rows can be checked in a test without a database.
 */

const SOCIETIES = [
  "Sunrise Residency",
  "Lakeview Heights",
  "Maple Court",
  "Palm Grove Apartments",
  "Silver Oak Enclave",
  "Orchid Towers",
  "Green Meadows",
  "Royal Palms",
];

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function seedOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash;
}

/**
 * Where the flat "really" is. The demo flats were written with only an
 * approximate area, so the exact point is that area moved by up to ~250 m.
 */
function exactFor(flat: Listing): LatLng {
  const seed = seedOf(flat.id);
  const angle = (seed % 360) * (Math.PI / 180);
  const reach = 0.0006 + (seed % 7) * 0.00025;
  return {
    lat: Number((flat.area.lat + Math.sin(angle) * reach).toFixed(6)),
    lng: Number((flat.area.lng + Math.cos(angle) * reach).toFixed(6)),
  };
}

const xy = (point: LatLng) => ({ x: point.lng, y: point.lat });

function inDays(days: number, today: Date): string {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type SeedRows = {
  users: (typeof users.$inferInsert)[];
  localities: (typeof localities.$inferInsert)[];
  listings: (typeof listings.$inferInsert)[];
  photos: (typeof listingPhotos.$inferInsert)[];
};

/** Every row the seed script writes, for the demo flats as they stand today. */
export function buildSeedRows(today = new Date(), flats: Listing[] = SEED_FLATS): SeedRows {
  const localityRows = seedLocalities(flats).map((locality) => ({
    id: stableId(`locality:${locality.city}/${locality.name}`),
    city: locality.city,
    name: locality.name,
    centroid: xy(locality),
  }));

  const rows: SeedRows = { users: [], localities: localityRows, listings: [], photos: [] };

  for (const flat of flats) {
    const id = stableId(`listing:${flat.id}`);
    const listerId = stableId(`lister:${flat.id}`);
    const seed = seedOf(flat.id);
    const exact = exactFor(flat);
    const availableIn = AVAILABLE_IN_DAYS[flat.id] ?? 7;

    rows.users.push({
      id: listerId,
      displayName: flat.lister.name,
      about: flat.lister.about,
      isSeed: true,
      isGuest: false,
    });

    rows.listings.push({
      id,
      seedKey: flat.id,
      listerId,
      status: "active",
      title: flat.title,
      description: flat.description,
      localityId: stableId(`locality:${flat.city}/${flat.locality}`),
      societyName: SOCIETIES[seed % SOCIETIES.length] ?? "Sunrise Residency",
      addressText: `Flat ${(seed % 9) + 1}${"ABCD"[seed % 4]}, ${ordinal((seed % 12) + 1)} Cross`,
      locationExact: xy(exact),
      locationPublic: xy(publicLocation(exact, id)),
      rent: flat.rent,
      deposit: flat.deposit,
      maintenance: flat.maintenance,
      utilitiesEst: flat.utilitiesEstimate,
      roomType: flat.roomType,
      bhk: flat.bhk,
      furnishing: flat.furnishing,
      availableFrom: inDays(availableIn, today),
      availableInDays: availableIn,
      amenities: flat.amenities,
      nearby: flat.nearby,
      houseRules: flat.houseRules,
      societyRules: flat.societyRules,
      expectations: flat.expectations,
      listerRole: flat.lister.role,
      flatmateCount: flat.lister.flatmateCount,
      qualityScore: flat.compatibility.percent,
      seedCompat: flat.compatibility,
      seedCommuteMinutes: flat.commuteMinutes,
      seedStretchLabel: flat.stretchLabel ?? null,
      isSeed: true,
      isVerified: flat.isVerified,
    });

    flat.photos.forEach((photo, position) => {
      rows.photos.push({
        id: stableId(`photo:${flat.id}:${position}`),
        listingId: id,
        url: photo.url,
        roomTag: photo.roomTag,
        dominantColor: photo.dominantColor,
        position,
      });
    });
  }

  return rows;
}
