"use client";

import { hasCheckedIn, type Mode, preferencesToFilters } from "@repo/shared";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { filtersFromSearch, useFilterStore } from "@/lib/deck/filters";
import { HOME } from "@/lib/profile/use-mode";
import { useProfile } from "@/lib/profile/use-profile";

/** Screens that belong to one side of the app. Keys and Profile are shared. */
const SCREENS: Record<Mode, string[]> = {
  tenant: ["/discover", "/saved"],
  lister: ["/listings", "/interested"],
};

/** Whether a page belongs to the side of the app the person is not using. */
function onTheOtherSide(pathname: string, mode: Mode): boolean {
  const other: Mode = mode === "tenant" ? "lister" : "tenant";
  return SCREENS[other].some((screen) => pathname === screen || pathname.startsWith(`${screen}/`));
}

/**
 * The front desk. Nobody gets into the app until they have checked in (or
 * skipped check-in): a new visitor is sent to the welcome flow. For everyone
 * else it sets the deck's starting filters from their saved preferences, or
 * from the page address if that carries filters, before the app is shown.
 * Someone who lands on a screen for the other side of the app (a lister on
 * the deck, say) is walked to their own first screen.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useProfile();
  const ready = useFilterStore((state) => state.ready);

  const checkedIn = profile.data ? hasCheckedIn(profile.data) : undefined;

  const mode = profile.data?.mode ?? "tenant";
  const misplaced = checkedIn === true && onTheOtherSide(pathname, mode);

  useEffect(() => {
    if (checkedIn === false) router.replace("/welcome");
    else if (misplaced) router.replace(HOME[mode]);
  }, [checkedIn, misplaced, mode, router]);

  useEffect(() => {
    if (!profile.data || !checkedIn || ready) return;
    const saved = preferencesToFilters(profile.data.preferences);
    const inAddress = window.location.pathname === "/discover" ? window.location.search : "";
    const hasFilters = /[?&](max|area|room)=/.test(inAddress);
    useFilterStore.getState().start(hasFilters ? filtersFromSearch(inAddress, saved.city) : saved);
  }, [profile.data, checkedIn, ready]);

  if (profile.isError) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="font-display font-semibold text-xl">The front desk isn't answering</p>
          <p className="mt-2 text-fg-2 text-sm">Your profile could not be loaded.</p>
          <button
            type="button"
            onClick={() => profile.refetch()}
            className="mt-5 rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!checkedIn || !ready || misplaced) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <span className="sr-only">Loading…</span>
        <MarqueeBulbs total={8} chase />
      </div>
    );
  }

  return children;
}
