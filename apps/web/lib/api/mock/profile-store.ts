import { CITIES, DEFAULT_PROFILE, type TenantProfile } from "@repo/shared";

/*
 * Where the mock keeps the tenant's profile. Unlike swipes and matches, the
 * profile is saved in the browser, so onboarding is not repeated on every
 * reload. On the server, and in browsers that block storage, it falls back to
 * memory.
 *
 * From M3 the profile lives in the database, tied to a real account.
 */

const STORAGE_KEY = "flatch.profile.v1";

let inMemory: TenantProfile = DEFAULT_PROFILE;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Whether something read back from storage still looks like a profile we can use. */
function looksValid(value: unknown): value is TenantProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<TenantProfile>;
  const preferences = profile.preferences;
  return (
    typeof profile.name === "string" &&
    typeof profile.about === "string" &&
    typeof preferences === "object" &&
    preferences !== null &&
    (CITIES as readonly string[]).includes(preferences.city) &&
    Array.isArray(preferences.localities) &&
    Array.isArray(preferences.roomTypes) &&
    Array.isArray(preferences.dealbreakers) &&
    typeof preferences.lifestyle === "object" &&
    preferences.lifestyle !== null
  );
}

export function readProfile(): TenantProfile {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return inMemory;
  try {
    const parsed: unknown = JSON.parse(raw);
    // Fields added since this profile was saved (such as `mode`) take their defaults.
    return looksValid(parsed) ? { ...DEFAULT_PROFILE, ...parsed } : inMemory;
  } catch {
    return inMemory;
  }
}

export function writeProfile(profile: TenantProfile): void {
  inMemory = profile;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage is full or blocked: the profile lasts until the page is closed.
  }
}

export function clearProfile(): void {
  inMemory = DEFAULT_PROFILE;
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored, so there is nothing to remove.
  }
}
