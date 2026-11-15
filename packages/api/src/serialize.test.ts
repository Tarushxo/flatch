import { buildSeedRows } from "@repo/db/seed-rows";
import { ListingSchema } from "@repo/shared/schemas";
import { describe, expect, it } from "vitest";
import { type PublicListingRow, toListing } from "./serialize";

const TODAY = new Date("2026-11-15T00:00:00Z");
const seed = buildSeedRows(TODAY);

/** A seed row as the feed query would return it, with the private columns still attached. */
function fullRow(index: number) {
  const row = seed.listings[index];
  const lister = seed.users.find((user) => user.id === row?.listerId);
  const locality = seed.localities.find((each) => each.id === row?.localityId);
  if (!row || !lister || !locality) throw new Error("seed row missing");
  return {
    ...row,
    status: "active" as const,
    description: row.description ?? "",
    publishedAt: TODAY,
    createdAt: TODAY,
    city: locality.city,
    locality: locality.name,
    listerName: lister.name ?? "",
    listerAbout: lister.about ?? "",
  };
}

describe("what the API sends for a listing", () => {
  it("satisfies the shared contract for every seed flat", () => {
    seed.listings.forEach((row, index) => {
      const photos = seed.photos.filter((photo) => photo.listingId === row.id);
      const listing = toListing(fullRow(index) as unknown as PublicListingRow, photos, TODAY);
      expect(ListingSchema.safeParse(listing).error?.issues ?? [], row.title).toEqual([]);
    });
  });

  it("never includes the exact location, the society or the address", () => {
    seed.listings.forEach((row, index) => {
      // Even when a careless query hands over the private columns, they are not passed on.
      const sent = JSON.stringify(
        toListing(fullRow(index) as unknown as PublicListingRow, [], TODAY),
      );
      expect(sent, row.title).not.toContain(row.societyName);
      expect(sent, row.title).not.toContain(row.addressText);
      expect(sent, row.title).not.toContain(String(row.locationExact.y));
      expect(sent, row.title).not.toContain(String(row.locationExact.x));
    });
  });

  it("dates a seed flat from today, whatever date is stored", () => {
    const row = { ...fullRow(0), availableFrom: "2020-01-01", availableInDays: 3 };
    const listing = toListing(row as unknown as PublicListingRow, [], TODAY);
    expect(listing.availableFrom).toBe("2026-11-18");
  });
});
