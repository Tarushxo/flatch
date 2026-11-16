import { describe, expect, it } from "vitest";
import { AREAS_MAX, TAGS_MAX } from "./limits";
import { EMPTY_DRAFT } from "./lister";
import { FeedFiltersSchema, ListingDraftSchema, TenantPreferencesSchema } from "./schemas";
import { DEFAULT_PREFERENCES } from "./tenant";

const areas = (count: number) => Array.from({ length: count }, (_, n) => `Area ${n}`);

describe("lists a person can send are capped", () => {
  it("accepts as many areas as any city has, and no more, in a profile", () => {
    const ok = { ...DEFAULT_PREFERENCES, localities: areas(AREAS_MAX) };
    expect(TenantPreferencesSchema.safeParse(ok).success).toBe(true);
    const tooMany = { ...DEFAULT_PREFERENCES, localities: areas(AREAS_MAX + 1) };
    expect(TenantPreferencesSchema.safeParse(tooMany).success).toBe(false);
    const tooLong = { ...DEFAULT_PREFERENCES, localities: ["x".repeat(500)] };
    expect(TenantPreferencesSchema.safeParse(tooLong).success).toBe(false);
  });

  it("does the same for the deck's filters", () => {
    const base = { city: "Pune", budgetMax: null, roomTypes: [] };
    expect(FeedFiltersSchema.safeParse({ ...base, localities: areas(AREAS_MAX) }).success).toBe(
      true,
    );
    expect(FeedFiltersSchema.safeParse({ ...base, localities: areas(AREAS_MAX + 1) }).success).toBe(
      false,
    );
  });

  it("caps the tag lists sent with a flat", () => {
    const photo = {
      url: "https://images.unsplash.com/photo-1556020685-ae41abfc9365",
      roomTag: "bedroom",
      dominantColor: "#9ba474",
    };
    const flat = {
      ...EMPTY_DRAFT,
      title: "Sunny room near the park",
      locality: "Baner",
      city: "Pune",
      society: "Maple Court",
      addressLine: "Flat 4B",
      availableFrom: "2026-12-01",
      rent: 22000,
      photos: [photo, photo, photo],
    };
    expect(ListingDraftSchema.safeParse(flat).error?.issues ?? []).toEqual([]);
    const stuffed = { ...flat, amenities: areas(TAGS_MAX + 1) };
    expect(ListingDraftSchema.safeParse(stuffed).success).toBe(false);
  });
});
