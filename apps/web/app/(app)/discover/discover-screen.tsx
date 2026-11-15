"use client";

import type { FeedFilters, Listing } from "@repo/shared";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FilterBar } from "@/components/deck/filter-bar";
import { SwipeDeck } from "@/components/deck/swipe-deck";
import { ListingDetail } from "@/components/listing/listing-detail";
import { filtersToSearch, useFilterStore } from "@/lib/deck/filters";

const WIDE_SCREEN = "(min-width: 1024px)";

// The details sheet (and the sheet library with it) is only needed once someone
// asks for details, so it is left out of the first download and fetched when the
// page goes quiet.
const loadDetailSheet = () => import("@/components/listing/detail-sheet");
const DetailSheet = dynamic(() => loadDetailSheet().then((module) => module.DetailSheet), {
  ssr: false,
});

/** The deck screen: filters, the swipe deck, and the details beside or over it. */
export function DiscoverScreen() {
  const [top, setTop] = useState<Listing | null>(null);
  const [sheet, setSheet] = useState<Listing | null>(null);
  const [sheetNeeded, setSheetNeeded] = useState(false);
  // Phones show details in the sheet; only wide screens draw the side panel.
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE_SCREEN);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    // Fetch the sheet in the background so the first open is instant.
    const warm = setTimeout(() => void loadDetailSheet(), 2500);
    return () => {
      query.removeEventListener("change", update);
      clearTimeout(warm);
    };
  }, []);
  const panel = useRef<HTMLElement>(null);

  // The page address follows the filters, so a filtered deck can be reloaded or
  // shared. (The starting filters are set by the onboarding gate.)
  useEffect(() => {
    const write = (filters: FeedFilters) => {
      window.history.replaceState(null, "", window.location.pathname + filtersToSearch(filters));
    };
    write(useFilterStore.getState().filters);
    return useFilterStore.subscribe((state) => write(state.filters));
  }, []);

  // On a wide screen the details are already showing beside the deck, so
  // "details" brings that panel to the top. On a phone it opens the sheet.
  function openDetails(listing: Listing) {
    if (window.matchMedia(WIDE_SCREEN).matches) {
      panel.current?.scrollTo({ top: 0, behavior: "smooth" });
      panel.current?.focus();
    } else {
      setSheetNeeded(true);
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
        {!wide ? null : top ? (
          <ListingDetail listing={top} />
        ) : (
          <p className="text-fg-3 text-sm">Details of the flat on top appear here.</p>
        )}
      </aside>

      {sheetNeeded ? <DetailSheet listing={sheet} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
