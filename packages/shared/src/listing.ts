import type { z } from "zod";
import { DEFAULT_CITY } from "./constants";
import type {
  CompatibilitySchema,
  FeedFiltersSchema,
  FeedPageSchema,
  HouseRuleSchema,
  ListingPhotoSchema,
  ListingSchema,
  SwipeSchema,
} from "./schemas";

/*
 * Listings, the feed and swipes: the types, the fixed lists of choices, and
 * the small pure functions that work on them.
 *
 * The types come from the Zod schemas in schemas.ts, imported as types only,
 * so nothing here pulls the validation library into the app.
 */

export const ROOM_TYPES = ["private_room", "shared_room", "whole_flat"] as const;
export const FURNISHINGS = ["furnished", "semi_furnished", "unfurnished"] as const;
export const ROOM_TAGS = [
  "bedroom",
  "living",
  "kitchen",
  "bathroom",
  "balcony",
  "building",
] as const;
export const SWIPE_ACTIONS = ["like", "pass", "save", "superlike"] as const;

export type RoomType = (typeof ROOM_TYPES)[number];
export type Furnishing = (typeof FURNISHINGS)[number];
export type SwipeAction = (typeof SWIPE_ACTIONS)[number];

export type ListingPhoto = z.infer<typeof ListingPhotoSchema>;
export type HouseRule = z.infer<typeof HouseRuleSchema>;
export type Compatibility = z.infer<typeof CompatibilitySchema>;
export type Listing = z.infer<typeof ListingSchema>;
export type FeedPage = z.infer<typeof FeedPageSchema>;
export type FeedFilters = z.infer<typeof FeedFiltersSchema>;
export type Swipe = z.infer<typeof SwipeSchema>;

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  private_room: "Private room",
  shared_room: "Shared room",
  whole_flat: "Whole flat",
};

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  furnished: "Furnished",
  semi_furnished: "Semi-furnished",
  unfurnished: "Unfurnished",
};

/** Rent plus the recurring extras: what the flat really costs each month. */
export function monthlyCost(listing: Pick<Listing, "rent" | "maintenance" | "utilitiesEstimate">) {
  return listing.rent + listing.maintenance + listing.utilitiesEstimate;
}

/** No limits beyond the default city. */
export const NO_FILTERS: FeedFilters = {
  city: DEFAULT_CITY,
  budgetMax: null,
  localities: [],
  roomTypes: [],
};

/** The same city with every other filter cleared. */
export function clearedFilters(filters: FeedFilters): FeedFilters {
  return { ...NO_FILTERS, city: filters.city };
}

/** How many kinds of filter are switched on (for the badge on the Filters button). The city is not one. */
export function countActiveFilters(filters: FeedFilters): number {
  return (
    (filters.budgetMax === null ? 0 : 1) +
    (filters.localities.length > 0 ? 1 : 0) +
    (filters.roomTypes.length > 0 ? 1 : 0)
  );
}

/** Whether a flat passes the filters. Budget is checked against the real monthly cost. */
export function matchesFilters(
  listing: Pick<
    Listing,
    "city" | "rent" | "maintenance" | "utilitiesEstimate" | "locality" | "roomType"
  >,
  filters: FeedFilters,
): boolean {
  if (listing.city !== filters.city) return false;
  if (filters.budgetMax !== null && monthlyCost(listing) > filters.budgetMax) return false;
  if (filters.localities.length > 0 && !filters.localities.includes(listing.locality)) return false;
  if (filters.roomTypes.length > 0 && !filters.roomTypes.includes(listing.roomType)) return false;
  return true;
}
