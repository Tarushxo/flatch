import type { ListingDraft } from "@repo/shared";

/*
 * Where the mock keeps the flats a person has posted. Like the profile, they
 * are saved in the browser, so a posted flat is still there after a reload.
 * On the server, and in browsers that block storage, it falls back to memory.
 *
 * From M2 these are rows in the database.
 */

const STORAGE_KEY = "flatch.listings.v1";

/** What the lister decided about one tenant, and when (milliseconds since 1970). */
export type Decision = { decision: "accept" | "decline"; at: number };

/** A posted flat with the bookkeeping the mock needs. */
export type StoredListing = ListingDraft & {
  id: string;
  isOpen: boolean;
  createdAt: string;
  /** The moment the bot tenants' arrival times are counted from. */
  opensAt: number;
  /** When the vacancy sign was switched off, or null while it is on. */
  closedAt: number | null;
  /** The lister's answers, by applicant id. */
  decisions: Record<string, Decision>;
};

let inMemory: StoredListing[] = [];

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function looksValid(value: unknown): value is StoredListing {
  if (typeof value !== "object" || value === null) return false;
  const listing = value as Partial<StoredListing>;
  return (
    typeof listing.id === "string" &&
    typeof listing.title === "string" &&
    typeof listing.opensAt === "number" &&
    Array.isArray(listing.photos) &&
    typeof listing.decisions === "object" &&
    listing.decisions !== null
  );
}

export function readListings(): StoredListing[] {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return inMemory;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(looksValid) : inMemory;
  } catch {
    return inMemory;
  }
}

export function writeListings(listings: StoredListing[]): void {
  inMemory = listings;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch {
    // Storage is full or blocked: the flats last until the page is closed.
  }
}

export function clearListings(): void {
  inMemory = [];
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored, so there is nothing to remove.
  }
}
