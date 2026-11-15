import { describe, expect, it } from "vitest";
import { photoSrc, photoSrcSet, photoUrl } from "./photo";

const unsplash = "https://images.unsplash.com/photo-123?auto=format&fit=crop";

describe("photoUrl", () => {
  it("asks the image server for the given width at a lower quality", () => {
    const url = new URL(photoUrl(unsplash, 640));
    expect(url.searchParams.get("w")).toBe("640");
    expect(url.searchParams.get("q")).toBe("60");
    expect(url.searchParams.get("auto")).toBe("format");
  });

  it("replaces a width that is already there", () => {
    const url = new URL(photoUrl(`${unsplash}&w=900&q=70`, 400));
    expect(url.searchParams.getAll("w")).toEqual(["400"]);
    expect(url.searchParams.getAll("q")).toEqual(["60"]);
  });

  it("leaves photos from other hosts alone", () => {
    expect(photoUrl("https://example.com/a.jpg", 400)).toBe("https://example.com/a.jpg");
    expect(photoUrl("not a url", 400)).toBe("not a url");
  });
});

describe("photoSrcSet", () => {
  it("offers one candidate per width, smallest first", () => {
    const candidates = photoSrcSet(unsplash, "card").split(", ");
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatch(/w=400.* 400w$/);
    expect(candidates[2]).toMatch(/w=800.* 800w$/);
  });

  it("never offers a card wider than 800 pixels", () => {
    expect(photoSrcSet(unsplash, "card")).not.toMatch(/w=9\d\d|w=1\d\d\d/);
  });
});

describe("photoSrc", () => {
  it("falls back to the middle width", () => {
    expect(photoSrc(unsplash, "card")).toContain("w=640");
    expect(photoSrc(unsplash, "tile")).toContain("w=480");
  });
});
