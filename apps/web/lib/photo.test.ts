import { describe, expect, it } from "vitest";
import { photoPreviewUrl, photoSrc, photoSrcSet, photoUrl } from "./photo";

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

describe("uploaded photos", () => {
  const uploaded =
    "https://res.cloudinary.com/demo-cloud/image/upload/v1794760000/flatch/u/abc/photo-1.jpg";

  it("are asked for at the given width, in the best format for the browser", () => {
    expect(photoUrl(uploaded, 640)).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_640/v1794760000/flatch/u/abc/photo-1.jpg",
    );
  });

  it("do not stack one resize on another", () => {
    expect(photoUrl(photoUrl(uploaded, 640), 400)).toBe(photoUrl(uploaded, 400));
  });

  it("get a srcset like any other photo", () => {
    const candidates = photoSrcSet(uploaded, "tile").split(", ");
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatch(/w_320\/v1794760000.* 320w$/);
  });
});

describe("link preview photos", () => {
  it("crops a demo photo to the preview shape, as a JPEG every app can show", () => {
    const url = new URL(photoPreviewUrl(unsplash));
    expect(url.searchParams.get("w")).toBe("1200");
    expect(url.searchParams.get("h")).toBe("630");
    expect(url.searchParams.get("fm")).toBe("jpg");
  });

  it("crops an uploaded photo the same way", () => {
    const uploaded =
      "https://res.cloudinary.com/demo-cloud/image/upload/v1794760000/flatch/u/abc/photo-1.jpg";
    expect(photoPreviewUrl(uploaded)).toContain(
      "/upload/f_jpg,q_auto,c_fill,w_1200,h_630/v1794760000/",
    );
  });
});
