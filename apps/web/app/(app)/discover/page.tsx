import { NO_FILTERS } from "@repo/shared";
import type { Metadata } from "next";
import { preload } from "react-dom";
import { api } from "@/lib/api/client";
import { PHOTO_SIZES, photoSrc, photoSrcSet } from "@/lib/photo";
import { DiscoverScreen } from "./discover-screen";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage() {
  // The deck is drawn by code that takes a moment to load, and the first photo
  // used to wait for it. Naming the photo in the page itself lets the browser
  // start fetching it at once, alongside the code.
  const first = (await api.getFeed(null, NO_FILTERS)).items[0]?.photos[0];
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
