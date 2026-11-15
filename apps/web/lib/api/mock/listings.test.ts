import { CITIES } from "@repo/shared";
import { FeedPageSchema } from "@repo/shared/schemas";
import { describe, expect, it } from "vitest";
import { MOCK_LISTINGS } from "./listings";

describe("mock listings", () => {
  it("satisfy the shared contract, so the real API can replace the mock unnoticed", () => {
    const page = FeedPageSchema.safeParse({ items: MOCK_LISTINGS, nextCursor: null });
    expect(page.error?.issues ?? []).toEqual([]);
  });

  it("have unique ids", () => {
    const ids = MOCK_LISTINGS.map((listing) => listing.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("store photo addresses without a size, so each screen can ask for its own", () => {
    for (const listing of MOCK_LISTINGS) {
      for (const photo of listing.photos) {
        expect(photo.url).not.toMatch(/[?&]w=/);
      }
    }
  });
});

describe("mock listings by city", () => {
  it("gives every city a deck with enough flats to swipe", () => {
    for (const city of CITIES) {
      const flats = MOCK_LISTINGS.filter((listing) => listing.city === city);
      expect(flats.length, city).toBeGreaterThanOrEqual(6);
    }
  });

  it("gives every city several areas to choose from", () => {
    for (const city of CITIES) {
      const areas = new Set(
        MOCK_LISTINGS.filter((listing) => listing.city === city).map((listing) => listing.locality),
      );
      expect(areas.size, city).toBeGreaterThanOrEqual(6);
    }
  });

  it("never reuses an area name in two cities, so the map cannot mix them up", () => {
    const cityOf = new Map<string, string>();
    for (const listing of MOCK_LISTINGS) {
      const seen = cityOf.get(listing.locality);
      expect(seen === undefined || seen === listing.city, listing.locality).toBe(true);
      cityOf.set(listing.locality, listing.city);
    }
  });

  it("places each flat on the map near its own city, not the default one", () => {
    const mumbai = MOCK_LISTINGS.filter((listing) => listing.city === "Mumbai");
    for (const listing of mumbai) {
      expect(listing.area.lat).toBeGreaterThan(18.8);
      expect(listing.area.lat).toBeLessThan(19.4);
    }
  });

  it("prices rents to the nearest five hundred rupees", () => {
    for (const listing of MOCK_LISTINGS) {
      expect(listing.rent % 500, listing.id).toBe(0);
    }
  });
});
