"use client";

import { preferencesToFilters } from "@repo/shared";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { filtersFromSearch, useFilterStore } from "@/lib/deck/filters";
import { useProfile } from "@/lib/profile/use-profile";

/**
 * The front desk. Nobody gets into the app until they have checked in (or
 * skipped check-in): a new visitor is sent to the welcome flow. For everyone
 * else it sets the deck's starting filters from their saved preferences, or
 * from the page address if that carries filters, before the app is shown.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const profile = useProfile();
  const ready = useFilterStore((state) => state.ready);

  const checkedIn = profile.data ? profile.data.onboardedAt !== null : undefined;

  useEffect(() => {
    if (checkedIn === false) router.replace("/welcome");
  }, [checkedIn, router]);

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

  if (!checkedIn || !ready) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <span className="sr-only">Loading…</span>
        <MarqueeBulbs total={8} chase />
      </div>
    );
  }

  return children;
}
