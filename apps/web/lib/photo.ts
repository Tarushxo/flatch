/*
 * Photo sizing. A phone should never download a photo bigger than it can show,
 * so every photo is requested at a few widths and the browser picks one.
 *
 * In M1 the photos come from Unsplash's image server, which resizes on request
 * through the `w` and `q` parameters. From M2 they come from Cloudinary and
 * this is the one file that changes.
 */

/** Widths offered for each use. The browser picks the smallest that is sharp enough. */
export const PHOTO_WIDTHS = {
  /** A full card in the deck. */
  card: [400, 640, 800],
  /** A gallery tile or a saved-flat tile. */
  tile: [320, 480, 640],
} as const;

export type PhotoUse = keyof typeof PHOTO_WIDTHS;

const QUALITY = "60";

/** The address of a photo at a given pixel width. Unknown hosts are returned unchanged. */
export function photoUrl(url: string, width: number): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "images.unsplash.com") return url;
  parsed.searchParams.set("auto", "format");
  parsed.searchParams.set("fit", "crop");
  parsed.searchParams.set("w", String(width));
  parsed.searchParams.set("q", QUALITY);
  return parsed.toString();
}

/** The `srcset` for a photo: one candidate per offered width. */
export function photoSrcSet(url: string, use: PhotoUse): string {
  return PHOTO_WIDTHS[use].map((width) => `${photoUrl(url, width)} ${width}w`).join(", ");
}

/** The fallback `src`, for browsers that ignore `srcset`: the middle width. */
export function photoSrc(url: string, use: PhotoUse): string {
  return photoUrl(url, PHOTO_WIDTHS[use][1]);
}

/** How wide each kind of photo is drawn, so the browser can choose before layout. */
export const PHOTO_SIZES = {
  deckCard: "(min-width: 1024px) 416px, 100vw",
  showcaseCard: "320px",
  galleryTile: "(min-width: 640px) 440px, 82vw",
  savedTile: "(min-width: 1280px) 30vw, (min-width: 640px) 46vw, 100vw",
} as const;
