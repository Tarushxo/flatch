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
