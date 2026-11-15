"use client";

import type { Listing } from "@repo/shared";
import { useEffect, useRef, useState } from "react";
import { FilterBar } from "@/components/deck/filter-bar";
import { SwipeDeck } from "@/components/deck/swipe-deck";
import { DetailSheet } from "@/components/listing/detail-sheet";
import { ListingDetail } from "@/components/listing/listing-detail";
import { filtersFromSearch, filtersToSearch, useFilterStore } from "@/lib/deck/filters";

const WIDE_SCREEN = "(min-width: 1024px)";

export default function DiscoverPage() {
  const [top, setTop] = useState<Listing | null>(null);
  const [sheet, setSheet] = useState<Listing | null>(null);
  const panel = useRef<HTMLElement>(null);

  // Filters start from the page address, and the address follows the filters,
  // so a filtered deck can be reloaded or shared.
  useEffect(() => {
    const fromAddress = filtersFromSearch(window.location.search);
    const store = useFilterStore.getState();
    // Only replace the filters if the address really says something different.
    if (filtersToSearch(fromAddress) !== filtersToSearch(store.filters)) {
      store.setFilters(fromAddress);
    }
    return useFilterStore.subscribe((state) => {
      const address = window.location.pathname + filtersToSearch(state.filters);
      window.history.replaceState(null, "", address);
    });
  }, []);

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
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-3 pb-1 lg:gap-5 lg:px-8 lg:py-8">
        <FilterBar />
        <div className="min-h-0 flex-1">
          <SwipeDeck onTopChange={setTop} onOpenDetails={openDetails} />
        </div>
      </div>

      <aside
        ref={panel}
        tabIndex={-1}
        aria-label="Details of the flat on top"
        className="hidden w-[27rem] shrink-0 overflow-y-auto border-hairline border-l px-7 py-8 outline-none lg:block"
      >
        {top ? (
          <ListingDetail listing={top} />
        ) : (
          <p className="text-fg-3 text-sm">Details of the flat on top appear here.</p>
        )}
      </aside>

      <DetailSheet listing={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
