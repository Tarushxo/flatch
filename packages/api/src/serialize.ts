import type { ListingPhotoRow, ListingRow } from "@repo/db";
import type { City, Listing } from "@repo/shared";

/*
 * Turns database rows into what the app is allowed to see.
 *
 * The private columns (society name, address, exact location) are not in the
 * row type this accepts, and the feed queries do not select them. So a flat's
 * real whereabouts cannot be sent by accident: there is nothing here to send.
 */

/** The listing columns that may be shown to anyone. */
export type PublicListingRow = Omit<
  ListingRow,
  "societyName" | "addressText" | "locationExact" | "listerId" | "localityId" | "seedKey"
> & {
  city: City;
  locality: string;
  listerName: string;
  listerAbout: string;
};

export type PublicPhotoRow = Pick<ListingPhotoRow, "url" | "roomTag" | "dominantColor">;

function inDays(days: number, today: Date): string {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function toListing(row: PublicListingRow, photos: PublicPhotoRow[], today: Date): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    city: row.city,
    locality: row.locality,
    commuteMinutes: row.seedCommuteMinutes,
    area: { lat: row.locationPublic.y, lng: row.locationPublic.x },
    nearby: row.nearby,
    rent: row.rent,
    maintenance: row.maintenance,
    utilitiesEstimate: row.utilitiesEst,
    deposit: row.deposit,
    roomType: row.roomType,
    bhk: row.bhk,
    furnishing: row.furnishing,
    // A seed flat's date is counted from today, so the demo never looks abandoned.
    availableFrom:
      row.availableInDays === null ? row.availableFrom : inDays(row.availableInDays, today),
    photos: photos.map((photo) => ({
      url: photo.url,
      roomTag: photo.roomTag,
      dominantColor: photo.dominantColor,
    })),
    amenities: row.amenities,
    houseRules: row.houseRules,
    societyRules: row.societyRules,
    expectations: row.expectations,
    lister: {
      name: row.listerName,
      role: row.listerRole,
      about: row.listerAbout,
      flatmateCount: row.flatmateCount,
    },
    compatibility: row.seedCompat ?? { percent: 0, reasons: [] },
    isOpen: row.status === "active",
    isVerified: row.isVerified,
    isSeed: row.isSeed,
    ...(row.seedStretchLabel ? { stretchLabel: row.seedStretchLabel } : {}),
  };
}
