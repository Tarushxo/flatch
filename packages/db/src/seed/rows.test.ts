import { describe, expect, it } from "vitest";
import { metresBetween } from "../location";
import { SEED_FLATS } from "./flats";
import { stableId } from "./ids";
import { buildSeedRows } from "./rows";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("seed ids", () => {
  it("are valid UUIDs, the same on every run, and different for different names", () => {
    expect(stableId("listing:mock-01")).toMatch(UUID);
    expect(stableId("listing:mock-01")).toBe(stableId("listing:mock-01"));
    expect(stableId("listing:mock-01")).not.toBe(stableId("listing:mock-02"));
  });
});

describe("seed rows", () => {
  const rows = buildSeedRows(new Date("2026-11-15T00:00:00Z"));

  it("has one listing and one lister per demo flat", () => {
    expect(rows.listings).toHaveLength(SEED_FLATS.length);
    expect(rows.users).toHaveLength(SEED_FLATS.length);
    expect(new Set(rows.listings.map((row) => row.id)).size).toBe(SEED_FLATS.length);
  });

  it("points every listing at a locality and a lister that exist", () => {
    const localities = new Set(rows.localities.map((row) => row.id));
    const users = new Set(rows.users.map((row) => row.id));
    for (const listing of rows.listings) {
      expect(localities.has(listing.localityId), listing.title).toBe(true);
      expect(users.has(listing.listerId), listing.title).toBe(true);
    }
  });

  it("keeps the public point apart from the exact one, but in the same neighbourhood", () => {
    for (const listing of rows.listings) {
      const exact = { lat: listing.locationExact.y, lng: listing.locationExact.x };
      const shown = { lat: listing.locationPublic.y, lng: listing.locationPublic.x };
      expect(shown).not.toEqual(exact);
      expect(metresBetween(exact, shown), listing.title).toBeLessThan(450);
    }
  });

  it("dates each flat from today, so the demo never looks stale", () => {
    for (const listing of rows.listings) {
      expect(listing.availableFrom >= "2026-11-15", listing.title).toBe(true);
    }
  });

  it("gives every listing at least three photos in order", () => {
    for (const listing of rows.listings) {
      const photos = rows.photos.filter((photo) => photo.listingId === listing.id);
      expect(photos.length, listing.title).toBeGreaterThanOrEqual(3);
      expect(photos.map((photo) => photo.position)).toEqual(photos.map((_, index) => index));
    }
  });
});
