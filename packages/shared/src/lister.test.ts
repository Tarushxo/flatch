import { describe, expect, it } from "vitest";
import {
  checkOnSite,
  daysLeft,
  draftAsListing,
  draftProblems,
  EMPTY_DRAFT,
  expiryFrom,
  hasExpired,
  LISTING_STEPS,
  type ListingDraft,
  metresApart,
  ON_SITE,
} from "./lister";
import { ListingDraftSchema, ListingSchema } from "./schemas";

const photo = (n: number) => ({
  url: `https://images.unsplash.com/photo-${n}`,
  roomTag: "bedroom" as const,
  dominantColor: "#aa8866",
});

const complete: ListingDraft = {
  ...EMPTY_DRAFT,
  title: "Sunny room near the park",
  description: "East-facing, third floor.",
  city: "Pune",
  locality: "Baner",
  society: "Maple Court",
  addressLine: "Flat 3B, 4th Cross",
  availableFrom: "2026-12-01",
  rent: 18000,
  maintenance: 1500,
  utilitiesEstimate: 1200,
  depositMonths: 2,
  photos: [photo(1), photo(2), photo(3)],
};

describe("draftProblems", () => {
  it("finds nothing wrong with a complete draft, on any step", () => {
    for (const step of LISTING_STEPS) {
      expect(draftProblems(complete, step), step).toEqual([]);
    }
  });

  it("agrees with the schema about what a complete draft is", () => {
    expect(ListingDraftSchema.safeParse(complete).error?.issues ?? []).toEqual([]);
    expect(ListingDraftSchema.safeParse(EMPTY_DRAFT).success).toBe(false);
  });

  it("asks for a real title and a date on the first step", () => {
    expect(draftProblems({ ...complete, title: "Room" }, "basics")).toHaveLength(1);
    expect(draftProblems({ ...complete, availableFrom: "" }, "basics")).toHaveLength(1);
    expect(draftProblems(EMPTY_DRAFT, "basics")).toHaveLength(2);
  });

  it("needs the area and the private address", () => {
    expect(draftProblems(EMPTY_DRAFT, "where")).toHaveLength(3);
    expect(draftProblems({ ...complete, society: "  " }, "where")).toHaveLength(1);
  });

  it("refuses a missing, tiny or fractional rent", () => {
    expect(draftProblems({ ...complete, rent: 0 }, "costs")).toHaveLength(1);
    expect(draftProblems({ ...complete, rent: 2500 }, "costs")).toHaveLength(1);
    expect(draftProblems({ ...complete, rent: 18000.5 }, "costs")).toHaveLength(1);
  });

  it("allows zero maintenance and bills, but not negative ones", () => {
    expect(draftProblems({ ...complete, maintenance: 0, utilitiesEstimate: 0 }, "costs")).toEqual(
      [],
    );
    expect(draftProblems({ ...complete, maintenance: -1 }, "costs")).toHaveLength(1);
  });

  it("needs at least three photos", () => {
    expect(draftProblems({ ...complete, photos: [photo(1), photo(2)] }, "photos")).toHaveLength(1);
  });

  it("gathers every earlier problem on the preview step, so nothing incomplete is published", () => {
    const broken = { ...complete, title: "", photos: [] };
    expect(draftProblems(broken, "preview")).toHaveLength(2);
    expect(draftProblems(EMPTY_DRAFT, "preview").length).toBeGreaterThan(4);
  });
});

describe("draftAsListing", () => {
  const listing = draftAsListing(complete, { name: "Asha", about: "Designer" }, "mine-1");

  it("makes a listing that satisfies the contract", () => {
    expect(ListingSchema.safeParse(listing).error?.issues ?? []).toEqual([]);
  });

  it("works out the deposit from the months of rent", () => {
    expect(listing.deposit).toBe(36000);
  });

  it("never carries the private address onto the card", () => {
    const text = JSON.stringify(listing);
    expect(text).not.toContain("Maple Court");
    expect(text).not.toContain("Flat 3B");
  });

  it("still makes a usable card from a half-filled draft", () => {
    const early = draftAsListing(EMPTY_DRAFT, { name: "", about: "" });
    expect(early.title).toBe("Your flat");
    expect(early.lister.name).toBe("You");
    expect(early.availableFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("posted from here", () => {
  const hsr = { lat: 12.9116, lng: 77.6474 };

  it("passes for a device in the area with a tight fix", () => {
    expect(checkOnSite(hsr, { lat: 12.915, lng: 77.65, accuracy: 30 })).toEqual({ ok: true });
  });

  it("fails when the device is in another part of town", () => {
    const whitefield = { lat: 12.9698, lng: 77.75, accuracy: 20 };
    expect(checkOnSite(hsr, whitefield)).toEqual({ ok: false, reason: "elsewhere" });
  });

  it("fails when the device only roughly knows where it is, even if that is nearby", () => {
    expect(checkOnSite(hsr, { ...hsr, accuracy: ON_SITE.maxAccuracyMetres + 1 })).toEqual({
      ok: false,
      reason: "imprecise",
    });
  });

  it("measures distance in metres, near enough", () => {
    // A hundredth of a degree of latitude is about 1.1 km.
    expect(metresApart(hsr, { lat: hsr.lat + 0.01, lng: hsr.lng })).toBeGreaterThan(1090);
    expect(metresApart(hsr, { lat: hsr.lat + 0.01, lng: hsr.lng })).toBeLessThan(1130);
  });
});

describe("how long a flat stays on the board", () => {
  const posted = new Date("2026-11-16T10:00:00.000Z");
  const ends = expiryFrom(posted).toISOString();

  it("lasts thirty days from posting", () => {
    expect(ends).toBe("2026-12-16T10:00:00.000Z");
    expect(daysLeft(ends, posted)).toBe(30);
  });

  it("counts part of a day as a day, so the last day reads as 1, not 0", () => {
    expect(daysLeft(ends, new Date("2026-12-15T22:00:00.000Z"))).toBe(1);
    expect(hasExpired(ends, new Date("2026-12-15T22:00:00.000Z"))).toBe(false);
  });

  it("has expired at the end, and after", () => {
    expect(hasExpired(ends, new Date(ends))).toBe(true);
    expect(hasExpired(ends, new Date("2027-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("never expires a flat with no end date, such as a demo flat", () => {
    expect(daysLeft(null, posted)).toBeNull();
    expect(hasExpired(null, posted)).toBe(false);
  });
});
