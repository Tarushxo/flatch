import { CITIES } from "@repo/shared";
import { FeedPageSchema } from "@repo/shared/schemas";
import { describe, expect, it } from "vitest";
import { SEED_FLATS, seedLocalities } from "./flats";

describe("seed flats", () => {
  it("satisfy the shared contract, so the real API can replace the mock unnoticed", () => {
    const page = FeedPageSchema.safeParse({ items: SEED_FLATS, nextCursor: null });
    expect(page.error?.issues ?? []).toEqual([]);
  });

  it("have unique ids", () => {
    const ids = SEED_FLATS.map((listing) => listing.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("store photo addresses without a size, so each screen can ask for its own", () => {
    for (const listing of SEED_FLATS) {
      for (const photo of listing.photos) {
        expect(photo.url).not.toMatch(/[?&]w=/);
      }
    }
  });
});

describe("seed flats by city", () => {
  it("gives every city a deck with enough flats to swipe", () => {
    for (const city of CITIES) {
      const flats = SEED_FLATS.filter((listing) => listing.city === city);
      expect(flats.length, city).toBeGreaterThanOrEqual(12);
    }
  });

  it("gives every city several areas to choose from", () => {
    for (const city of CITIES) {
      const areas = new Set(
        SEED_FLATS.filter((listing) => listing.city === city).map((listing) => listing.locality),
      );
      expect(areas.size, city).toBeGreaterThanOrEqual(6);
    }
  });

  it("never reuses an area name in two cities, so the map cannot mix them up", () => {
    const cityOf = new Map<string, string>();
    for (const listing of SEED_FLATS) {
      const seen = cityOf.get(listing.locality);
      expect(seen === undefined || seen === listing.city, listing.locality).toBe(true);
      cityOf.set(listing.locality, listing.city);
    }
  });

  it("places each flat on the map near its own city, not the default one", () => {
    const mumbai = SEED_FLATS.filter((listing) => listing.city === "Mumbai");
    for (const listing of mumbai) {
      expect(listing.area.lat).toBeGreaterThan(18.8);
      expect(listing.area.lat).toBeLessThan(19.4);
    }
  });

  it("prices rents to the nearest five hundred rupees", () => {
    for (const listing of SEED_FLATS) {
      expect(listing.rent % 500, listing.id).toBe(0);
    }
  });
});

describe("seed localities", () => {
  it("lists each area once, inside its own city's bounds", () => {
    const localities = seedLocalities(SEED_FLATS);
    const keys = localities.map((locality) => `${locality.city}/${locality.name}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const locality of localities) {
      const flat = SEED_FLATS.find((each) => each.locality === locality.name);
      expect(Math.abs((flat?.area.lat ?? 0) - locality.lat), locality.name).toBeLessThan(0.02);
    }
  });
});
