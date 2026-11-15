"use client";

import { formatRent, type Listing } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { HeartIcon, TrashIcon } from "@/components/icons";
import { CompatRing } from "@/components/listing/compat-ring";
import { DetailSheet } from "@/components/listing/detail-sheet";
import { FadeImage } from "@/components/listing/fade-image";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { BedDrawing } from "@/components/motifs/neon-drawing";
import { SignLink } from "@/components/sign-link";
import { api } from "@/lib/api/client";
import { SAVED_KEY } from "@/lib/deck/use-deck";

/** The flats saved with a swipe up. From here each one can be liked or removed. */
export function SavedFlats() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Listing | null>(null);

  const saved = useQuery({
    queryKey: SAVED_KEY,
    queryFn: () => api.getSaved(),
    refetchOnMount: "always",
  });

  // Liking or removing is a new decision on the same flat. It leaves the list at once.
  const decide = useMutation({
    mutationFn: ({ listing, action }: { listing: Listing; action: "like" | "pass" }) =>
      api.sendSwipes([{ clientId: crypto.randomUUID(), listingId: listing.id, action }]),
    onMutate: async ({ listing }) => {
      await queryClient.cancelQueries({ queryKey: SAVED_KEY });
      const before = queryClient.getQueryData<Listing[]>(SAVED_KEY);
      queryClient.setQueryData<Listing[]>(SAVED_KEY, (current) =>
        current?.filter((item) => item.id !== listing.id),
      );
      return { before };
    },
    onSuccess: (_result, { listing, action }) => {
      toast(action === "like" ? `Liked ${listing.title}` : `Removed ${listing.title}`);
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(SAVED_KEY, context?.before);
      toast.error("That didn't go through. Try again in a moment.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SAVED_KEY }),
  });

  if (saved.isPending) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-4">
          <MarqueeBulbs total={8} chase />
          <p className="text-fg-2 text-sm">Fetching your saved flats…</p>
        </div>
      </div>
    );
  }

  if (saved.isError) {
    return (
      <ScreenMessage
        art={<BedDrawing className="[--glow:var(--pass)]" />}
        title="Couldn't load your saved flats"
        body="Check your connection and try again."
      >
        <button
          type="button"
          onClick={() => saved.refetch()}
          className="rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
        >
          Try again
        </button>
      </ScreenMessage>
    );
  }

  if (saved.data.length === 0) {
    return (
      <ScreenMessage
        art={<BedDrawing className="[--glow:var(--save)]" />}
        title="Nothing saved yet"
        body="Swipe up on a flat you are not sure about, and it waits for you here."
      >
        <SignLink href="/discover" size="sm">
          Back to the deck
        </SignLink>
      </ScreenMessage>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-6 lg:px-8 lg:py-8">
      <h1 className="font-display font-semibold text-2xl tracking-tight">Saved</h1>
      <p className="mt-1 text-fg-2 text-sm">
        {saved.data.length === 1 ? "1 flat" : `${saved.data.length} flats`} you swiped up on.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {saved.data.map((listing) => {
          const photo = listing.photos[0];
          return (
            <li key={listing.id} className="surface overflow-hidden rounded-3xl">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen(listing)}
                  aria-label={`Details for ${listing.title}`}
                  className="relative block aspect-[4/3] w-full text-left"
                  style={{ backgroundColor: photo?.dominantColor }}
                >
                  {photo ? <FadeImage src={photo.url} alt="" /> : null}
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/90 to-transparent" />
                  <span className="absolute inset-x-4 bottom-3 block">
                    <span className="block font-mono font-semibold text-xl tabular-nums tracking-tight">
                      {formatRent(listing.rent)}
                    </span>
                    <span className="mt-1 line-clamp-1 block font-medium">{listing.title}</span>
                    <span className="block text-fg-2 text-sm">{listing.locality}</span>
                  </span>
                </button>
                <div className="pointer-events-none absolute top-3 right-3">
                  <CompatRing percent={listing.compatibility.percent} />
                </div>
              </div>
              <div className="flex gap-2 p-3">
                <button
                  type="button"
                  onClick={() => decide.mutate({ listing, action: "like" })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-like/40 px-4 py-2.5 font-medium text-like text-sm transition-colors hover:bg-like/10"
                >
                  <HeartIcon className="size-4" />
                  Like
                </button>
                <button
                  type="button"
                  onClick={() => decide.mutate({ listing, action: "pass" })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline px-4 py-2.5 font-medium text-fg-2 text-sm transition-colors hover:bg-fg/10"
                >
                  <TrashIcon className="size-4" />
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <DetailSheet listing={open} onClose={() => setOpen(null)} />
    </div>
  );
}
