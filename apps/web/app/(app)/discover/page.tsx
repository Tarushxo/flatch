"use client";

import type { Listing } from "@repo/shared";
import { useRef, useState } from "react";
import { SwipeDeck } from "@/components/deck/swipe-deck";
import { DetailSheet } from "@/components/listing/detail-sheet";
import { ListingDetail } from "@/components/listing/listing-detail";

const WIDE_SCREEN = "(min-width: 1024px)";

export default function DiscoverPage() {
  const [top, setTop] = useState<Listing | null>(null);
  const [sheet, setSheet] = useState<Listing | null>(null);
  const panel = useRef<HTMLElement>(null);

  // On a wide screen the details are already showing beside the deck, so
  // "details" brings that panel to the top. On a phone it opens the sheet.
  function openDetails(listing: Listing) {
    if (window.matchMedia(WIDE_SCREEN).matches) {
      panel.current?.scrollTo({ top: 0, behavior: "smooth" });
      panel.current?.focus();
    } else {
      setSheet(listing);
    }
  }

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 px-4 pt-3 pb-1 lg:px-8 lg:py-8">
        <SwipeDeck onTopChange={setTop} onOpenDetails={openDetails} />
      </div>

      <aside
        ref={panel}
        tabIndex={-1}
        aria-label="Details of the flat on top"
        className="hidden w-[27rem] shrink-0 overflow-y-auto border-hairline border-l px-7 py-8 outline-none lg:block"
      >
        {top ? (
          <ListingDetail key={top.id} listing={top} />
        ) : (
          <p className="text-fg-3 text-sm">Details of the flat on top appear here.</p>
        )}
      </aside>

      <DetailSheet listing={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
