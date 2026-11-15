"use client";

import { preferencesToFilters, type TenantProfile } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useFilterStore } from "@/lib/deck/filters";

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
 * Save the profile. Saved preferences become the deck's filters straight away,
 * so the deck is rebuilt for the new city, budget, areas and room types.
 */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: TenantProfile) => api.saveProfile(profile),
    onSuccess: (saved) => {
      queryClient.setQueryData(PROFILE_KEY, saved);
      useFilterStore.getState().start(preferencesToFilters(saved.preferences));
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
