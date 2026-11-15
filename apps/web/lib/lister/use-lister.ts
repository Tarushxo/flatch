"use client";

import type { Applicant, DevicePosition, ListingDraft, MyListing } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { MATCHES_KEY } from "@/lib/matches/use-matches";

export const MY_LISTINGS_KEY = ["my-listings"] as const;
export const APPLICANTS_KEY = ["applicants"] as const;

// As with matches, these ask again every few seconds until there is a live connection.
const EVERY_MS = 2500;

/** The flats the person has posted, with their counts kept fresh. */
export function useMyListings() {
  return useQuery({
    queryKey: MY_LISTINGS_KEY,
    queryFn: () => api.getMyListings(),
    refetchInterval: EVERY_MS,
  });
}

/** Tenants waiting for an answer across every flat, oldest first. */
export function useApplicants({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: APPLICANTS_KEY,
    queryFn: () => api.getApplicants(),
    refetchInterval: EVERY_MS,
    enabled,
  });
}

/** The photos a lister can choose from. They never change, so they are fetched once. */
export function useSamplePhotos() {
  return useQuery({
    queryKey: ["sample-photos"],
    queryFn: () => api.getSamplePhotos(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, postedFrom }: { draft: ListingDraft; postedFrom?: DevicePosition }) =>
      api.createListing(draft, postedFrom),
    onSuccess: (created) => {
      queryClient.setQueryData<MyListing[]>(MY_LISTINGS_KEY, (current) => [
        created,
        ...(current ?? []),
      ]);
    },
  });
}

/** Switch a flat's vacancy sign. The sign changes at once and is confirmed in the background. */
export function useSetListingOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) => api.setListingOpen(id, isOpen),
    onMutate: async ({ id, isOpen }) => {
      await queryClient.cancelQueries({ queryKey: MY_LISTINGS_KEY });
      const before = queryClient.getQueryData<MyListing[]>(MY_LISTINGS_KEY);
      queryClient.setQueryData<MyListing[]>(MY_LISTINGS_KEY, (current) =>
        current?.map((listing) => (listing.id === id ? { ...listing, isOpen } : listing)),
      );
      return { before };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(MY_LISTINGS_KEY, context?.before);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: MY_LISTINGS_KEY }),
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteListing(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<MyListing[]>(MY_LISTINGS_KEY, (current) =>
        current?.filter((listing) => listing.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: APPLICANTS_KEY });
      void queryClient.invalidateQueries({ queryKey: MATCHES_KEY });
    },
  });
}

/** Say yes or no to a tenant. They leave the pile at once. */
export function useDecideApplicant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicant,
      decision,
    }: {
      applicant: Applicant;
      decision: "accept" | "decline";
    }) => api.decideApplicant(applicant.id, decision),
    onMutate: async ({ applicant }) => {
      await queryClient.cancelQueries({ queryKey: APPLICANTS_KEY });
      const before = queryClient.getQueryData<Applicant[]>(APPLICANTS_KEY);
      queryClient.setQueryData<Applicant[]>(APPLICANTS_KEY, (current) =>
        current?.filter((each) => each.id !== applicant.id),
      );
      return { before };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(APPLICANTS_KEY, context?.before);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: APPLICANTS_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_LISTINGS_KEY });
      void queryClient.invalidateQueries({ queryKey: MATCHES_KEY });
    },
  });
}

/** Mark a flat as posted on site, from where the lister's device is now. */
export function useConfirmOnSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: DevicePosition }) =>
      api.confirmOnSite(id, position),
    onSuccess: (confirmed) => {
      queryClient.setQueryData<MyListing[]>(MY_LISTINGS_KEY, (current) =>
        current?.map((listing) => (listing.id === confirmed.id ? confirmed : listing)),
      );
    },
  });
}
