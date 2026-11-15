import { getFeedPage } from "@repo/api";
import { getDb, hasDatabase } from "@repo/db";
import { type ListingPhoto, NO_FILTERS } from "@repo/shared";
import type { Metadata } from "next";
import { preload } from "react-dom";
import { mockApi } from "@/lib/api/mock";
import { PHOTO_SIZES, photoSrc, photoSrcSet } from "@/lib/photo";
import { DiscoverScreen } from "./discover-screen";

export const metadata: Metadata = { title: "Discover" };

// The page is built ahead of time and refreshed hourly, so it stays fast and
// the photo it points at keeps up with the database.
export const revalidate = 3600;

/** The photo on top of the default deck, asked for on the server. */
async function firstPhoto(): Promise<ListingPhoto | undefined> {
  try {
    const page = hasDatabase()
      ? await getFeedPage(getDb(), { filters: NO_FILTERS, userId: null, cursor: null })
      : await mockApi.getFeed(null, NO_FILTERS);
    return page.items[0]?.photos[0];
  } catch {
    // A slow or missing database must not break the page; the photo just loads a little later.
    return undefined;
  }
}

export default async function DiscoverPage() {
  // The deck is drawn by code that takes a moment to load, and the first photo
  // used to wait for it. Naming the photo in the page itself lets the browser
  // start fetching it at once, alongside the code.
  const first = await firstPhoto();
  if (first) {
    preload(photoSrc(first.url, "card"), {
      as: "image",
      imageSrcSet: photoSrcSet(first.url, "card"),
      imageSizes: PHOTO_SIZES.deckCard,
      fetchPriority: "high",
    });
  }

  return <DiscoverScreen />;
}
