import type { Listing } from "@repo/shared";
import { FadeImage } from "@/components/listing/fade-image";

/** A small square photo of a flat, for rows in a list. */
export function ListingThumb({ listing, lazy = false }: { listing: Listing; lazy?: boolean }) {
  const photo = listing.photos[0];
  return (
    <span
      className="relative block size-14 shrink-0 overflow-hidden rounded-2xl border border-hairline"
      style={{ backgroundColor: photo?.dominantColor }}
    >
      {photo ? <FadeImage src={photo.url} alt="" use="tile" sizes="56px" lazy={lazy} /> : null}
    </span>
  );
}
