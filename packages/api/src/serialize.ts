import type { ListingPhotoRow, ListingRow } from "@repo/db";
import { type City, type Compatibility, homeDatePlus, type Listing } from "@repo/shared";

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
  | "societyName"
  | "addressText"
  | "locationExact"
  | "listerId"
  | "localityId"
  | "seedKey"
  | "expiresAt"
  | "underReview"
  // Left over from before flats were scored for each person; no longer read.
  | "qualityScore"
  | "seedCompat"
  | "seedCommuteMinutes"
  | "seedStretchLabel"
> & {
  city: City;
  locality: string;
  listerName: string;
  listerAbout: string;
};

export type PublicPhotoRow = Pick<ListingPhotoRow, "url" | "roomTag" | "dominantColor">;

/** The date a flat is free from. A seed flat's date is counted from today, so the demo never looks abandoned. */
export function freeFrom(
  row: Pick<PublicListingRow, "availableFrom" | "availableInDays">,
  today: Date,
): string {
  return row.availableInDays === null
    ? row.availableFrom
    : homeDatePlus(today, row.availableInDays);
}

export function toListing(
  row: PublicListingRow,
  photos: PublicPhotoRow[],
  today: Date,
  /** How well this flat fits the person looking, if that has been worked out. */
  compatibility: Compatibility = { percent: 0, reasons: [] },
): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    city: row.city,
    locality: row.locality,
    // Commute times need a place of work to measure from, which tenants cannot set yet.
    commuteMinutes: null,
    area: { lat: row.locationPublic.y, lng: row.locationPublic.x },
    nearby: row.nearby,
    rent: row.rent,
    maintenance: row.maintenance,
    utilitiesEstimate: row.utilitiesEst,
    deposit: row.deposit,
    roomType: row.roomType,
    bhk: row.bhk,
    furnishing: row.furnishing,
    availableFrom: freeFrom(row, today),
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
    compatibility,
    isOpen: row.status === "active",
    isVerified: row.isVerified,
    isSeed: row.isSeed,
  };
}
