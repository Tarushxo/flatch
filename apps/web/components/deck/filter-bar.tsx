"use client";

import { countActiveFilters, type FeedFilters, formatRupees, ROOM_TYPE_LABELS } from "@repo/shared";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CrossIcon, FiltersIcon } from "@/components/icons";
import { useFilterStore } from "@/lib/deck/filters";

// The filter sheet is fetched when the page goes quiet, not with the first download.
const loadFilterSheet = () => import("./filter-sheet");
const FilterSheet = dynamic(() => loadFilterSheet().then((module) => module.FilterSheet), {
  ssr: false,
});

/** A short description of each active filter, for the chips beside the button. */
function summarise(filters: FeedFilters): { key: string; label: string; without: FeedFilters }[] {
  const chips = [];
  if (filters.budgetMax !== null) {
    chips.push({
      key: "budget",
      label: `Up to ${formatRupees(filters.budgetMax)}`,
      without: { ...filters, budgetMax: null },
    });
  }
  if (filters.roomTypes.length > 0) {
    const [first, ...rest] = filters.roomTypes;
    chips.push({
      key: "rooms",
      label: first ? ROOM_TYPE_LABELS[first] + (rest.length ? ` +${rest.length}` : "") : "",
      without: { ...filters, roomTypes: [] },
    });
  }
  if (filters.localities.length > 0) {
    const [first, ...rest] = filters.localities;
    chips.push({
      key: "areas",
      label: `${first}${rest.length ? ` +${rest.length}` : ""}`,
      without: { ...filters, localities: [] },
    });
  }
  return chips;
}

/**
 * The strip above the deck: a Filters button and one chip per active filter.
 * Tapping a chip's cross removes that filter.
 */
export function FilterBar() {
  const filters = useFilterStore((state) => state.filters);
  const setFilters = useFilterStore((state) => state.setFilters);
  const [open, setOpen] = useState(false);
  const [sheetNeeded, setSheetNeeded] = useState(false);

  useEffect(() => {
    const warm = setTimeout(() => void loadFilterSheet(), 2500);
    return () => clearTimeout(warm);
  }, []);

  const active = countActiveFilters(filters);

  return (
    <div className="mx-auto flex w-full max-w-[26rem] items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setSheetNeeded(true);
          setOpen(true);
        }}
        className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 font-medium text-sm transition-colors ${
          active > 0
            ? "border-like/50 text-like"
            : "border-hairline bg-surface-1 text-fg-2 hover:text-fg"
        }`}
      >
        <FiltersIcon className="size-4" />
        Filters
        {active > 0 ? (
          <span className="grid size-5 place-items-center rounded-full bg-like font-semibold text-ink text-xs">
            {active}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
      </button>

      <ul className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]">
        {summarise(filters).map((chip) => (
          <li key={chip.key} className="shrink-0">
            <button
              type="button"
              onClick={() => setFilters(chip.without)}
              aria-label={`Remove filter: ${chip.label}`}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 py-2 pr-2.5 pl-3.5 text-fg text-sm transition-colors hover:bg-fg/10"
            >
              {chip.label}
              <CrossIcon className="size-3.5 text-fg-3" />
            </button>
          </li>
        ))}
      </ul>

      {sheetNeeded ? (
        <FilterSheet
          open={open}
          applied={filters}
          onApply={setFilters}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
