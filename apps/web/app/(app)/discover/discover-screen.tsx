"use client";

import type { FeedFilters, Listing } from "@repo/shared";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type WheelEvent } from "react";
import { FilterBar } from "@/components/deck/filter-bar";
import { FirstLikePrompt } from "@/components/deck/first-like-prompt";
import { SwipeDeck } from "@/components/deck/swipe-deck";
import { filtersToSearch, useFilterStore } from "@/lib/deck/filters";

const WIDE_SCREEN = "(min-width: 1024px)";

/** How far a wheel or trackpad has to scroll down, in pixels, to count as asking for the details. */
const WHEEL_OPENS_AT = 60;
/** A pause this long, in milliseconds, means the next scroll is a new one. */
const WHEEL_GAP = 250;

// The details sheet (and the sheet library with it) is only needed once someone
// asks for details, so it is left out of the first download and fetched when the
// page goes quiet.
const loadDetailSheet = () => import("@/components/listing/detail-sheet");
const DetailSheet = dynamic(() => loadDetailSheet().then((module) => module.DetailSheet), {
  ssr: false,
});

// The details beside the deck exist only on wide screens, so a phone never downloads them
// for this (it gets them with the sheet, later).
const SidePanelDetail = dynamic(
  () => import("@/components/listing/listing-detail").then((module) => module.ListingDetail),
  { ssr: false },
);

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
  // Counts the times details were asked for on a wide screen; each one flashes the panel's edge.
  const [nudge, setNudge] = useState(0);
  const wheel = useRef({ sum: 0, at: 0, used: false });

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
  // "details" brings that panel to the top and lights its edge for a moment:
  // without that, a pull down on the card appeared to do nothing at all. On a
  // narrow one it opens the sheet.
  function openDetails(listing: Listing) {
    if (window.matchMedia(WIDE_SCREEN).matches) {
      // Focus first, and without scrolling: a focus that scrolls cancels the smooth scroll.
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollTo({ top: 0, behavior: "smooth" });
      setNudge((count) => count + 1);
    } else {
      setSheetNeeded(true);
      setSheet(listing);
    }
  }

  // A mouse wheel or trackpad has no finger to pull the card down with, so
  // scrolling over the deck stands in for it. Beside a wide deck it scrolls the
  // details that are already there; on a narrow one, a scroll down opens the sheet.
  function onWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    // A sheet or prompt that is open keeps its own scrolling.
    if (document.querySelector("[role=dialog]")) return;
    // Some mice report lines, not pixels.
    const down = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;
    if (window.matchMedia(WIDE_SCREEN).matches) {
      panel.current?.scrollBy({ top: down });
      return;
    }
    const state = wheel.current;
    if (event.timeStamp - state.at > WHEEL_GAP) {
      state.sum = 0;
      state.used = false;
    }
    state.at = event.timeStamp;
    // One scroll opens the sheet once, however long the trackpad keeps coasting.
    if (state.used || !top) return;
    state.sum += down;
    if (state.sum > WHEEL_OPENS_AT) {
      state.used = true;
      openDetails(top);
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-3 pb-1 lg:gap-5 lg:px-8 lg:py-8">
        <FilterBar />
        <div className="min-h-0 flex-1" onWheel={onWheel}>
          <SwipeDeck onTopChange={setTop} onOpenDetails={openDetails} />
          <FirstLikePrompt />
        </div>
      </div>

      <div className="relative hidden w-[27rem] shrink-0 lg:block">
        <aside
          ref={panel}
          tabIndex={-1}
          aria-label="Details of the flat on top"
          // Tells the deck's keyboard shortcuts that, in here, the scrolling keys are for reading.
          data-reading=""
          className="h-full overflow-y-auto border-hairline border-l px-7 py-8 outline-none"
        >
          {!wide ? null : top ? (
            <SidePanelDetail listing={top} />
          ) : (
            <p className="text-fg-3 text-sm">Details of the flat on top appear here.</p>
          )}
        </aside>
        {/* "Here they are": the panel's edge lights up each time details are asked for. */}
        {nudge > 0 ? (
          <div
            key={nudge}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-panel-flash"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--brand-a) 26%, transparent), transparent 55%)",
              boxShadow: "inset 2px 0 0 var(--brand-a)",
            }}
          />
        ) : null}
      </div>

      {sheetNeeded ? <DetailSheet listing={sheet} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
