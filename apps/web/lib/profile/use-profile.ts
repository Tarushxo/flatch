"use client";

import { preferencesToFilters, type TenantProfile } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useFilterStore } from "@/lib/deck/filters";
import { useDeckStore } from "@/lib/deck/store";
import { FEED_KEY, SAVED_KEY } from "@/lib/deck/use-deck";

export const PROFILE_KEY = ["profile"] as const;

/** The tenant's profile and preferences. */
export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => api.getProfile(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Save the profile. Changed preferences become the deck's filters straight away,
 * so the deck is rebuilt for the new city, budget, areas and room types. The
 * order of the deck and every match score also come from the preferences, so
 * when they change the deck is dealt again, even if the filters are the same.
 */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: TenantProfile) => api.saveProfile(profile),
    onSuccess: (saved) => {
      const before = queryClient.getQueryData<TenantProfile>(PROFILE_KEY);
      queryClient.setQueryData(PROFILE_KEY, saved);
      // A change of name or mode leaves the deck alone. It used to reset the filters every
      // time, which dropped any the person had set on the deck while keeping its old cards.
      if (JSON.stringify(before?.preferences) === JSON.stringify(saved.preferences)) return;
      useFilterStore.getState().start(preferencesToFilters(saved.preferences));
      useDeckStore.getState().clearCards();
      void queryClient.resetQueries({ queryKey: FEED_KEY });
      void queryClient.invalidateQueries({ queryKey: SAVED_KEY });
    },
  });
}

export const ACCOUNT_KEY = ["account"] as const;

/** How the person is signed in: as a guest, or with an account. */
export function useAccount() {
  return useQuery({
    queryKey: ACCOUNT_KEY,
    queryFn: () => api.getAccount(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
