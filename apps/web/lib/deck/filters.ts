import {
  type City,
  clearedFilters,
  type FeedFilters,
  NO_FILTERS,
  ROOM_TYPES,
  type RoomType,
} from "@repo/shared";
import { create } from "zustand";

/*
 * The deck's filters. They live in a small store so the filter bar, the
 * filter sheet and the deck all see the same values, and they are mirrored
 * into the page address (?max=20000&area=Domlur&room=private_room) so a
 * filtered deck can be reloaded or shared.
 */

type FilterState = {
  filters: FeedFilters;
  /**
   * False until the starting filters have been set from the profile (or the
   * page address). The deck waits for this, so it never loads the wrong city.
   */
  ready: boolean;
  /** Set the starting filters and mark the store ready. */
  start: (filters: FeedFilters) => void;
  setFilters: (filters: FeedFilters) => void;
  clearFilters: () => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  filters: NO_FILTERS,
  ready: false,
  start: (filters) => set({ filters, ready: true }),
  setFilters: (filters) => set({ filters }),
  // Clearing keeps the city: that is where the person is looking, not a filter they added.
  clearFilters: () => set((state) => ({ filters: clearedFilters(state.filters) })),
}));

/** The budget slider's range, in rupees a month. The top of the range means "any budget". */
export const BUDGET = { min: 10_000, max: 35_000, step: 500 } as const;

const isRoomType = (value: string): value is RoomType =>
  (ROOM_TYPES as readonly string[]).includes(value);

/**
 * Read filters from an address's query string. Anything unrecognised is ignored.
 * The city is not in the address (it comes from the profile), so it is passed in.
 */
export function filtersFromSearch(search: string, city: City): FeedFilters {
  const params = new URLSearchParams(search);
  const max = Number.parseInt(params.get("max") ?? "", 10);
  return {
    city,
    budgetMax: Number.isInteger(max) && max > 0 ? max : null,
    localities: params.getAll("area").filter((area) => area.trim().length > 0),
    roomTypes: params.getAll("room").filter(isRoomType),
  };
}

/** Write filters as a query string ("" when nothing is set). The city is left out. */
export function filtersToSearch(filters: FeedFilters): string {
  const params = new URLSearchParams();
  if (filters.budgetMax !== null) params.set("max", String(filters.budgetMax));
  for (const area of filters.localities) params.append("area", area);
  for (const room of filters.roomTypes) params.append("room", room);
  const query = params.toString();
  return query ? `?${query}` : "";
}
