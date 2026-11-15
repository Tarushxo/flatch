"use client";

import { daysLeft, formatRent, LISTING_LIMITS, type MyListing } from "@repo/shared";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import {
  BellIcon,
  CheckIcon,
  KeyIcon,
  MapPinIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
} from "@/components/icons";
import { shareAndTell } from "@/components/listing/flat-actions";
import { ListingThumb } from "@/components/match/listing-thumb";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { SignboardDrawing } from "@/components/motifs/neon-drawing";
import { VacancySign } from "@/components/motifs/vacancy-sign";
import { SignLink } from "@/components/sign-link";
import { ApiError } from "@/lib/api/http";
import { PositionError, whereAmI } from "@/lib/geo";
import {
  useConfirmOnSite,
  useDeleteListing,
  useMyListings,
  useRenewListing,
  useSetListingOpen,
} from "@/lib/lister/use-lister";

/**
 * The lister's first tab: the flats they have posted. Each one has its own
 * VACANCY sign, which is the switch that opens or closes it to likes.
 */
export function ListingsScreen() {
  const listings = useMyListings();

  if (listings.isPending) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-4">
          <MarqueeBulbs total={8} chase />
          <p className="text-fg-2 text-sm">Checking the board…</p>
        </div>
      </div>
    );
  }

  if (listings.isError) {
    return (
      <ScreenMessage
        art={<SignboardDrawing className="[--glow:var(--pass)]" />}
        title="Couldn't reach the front desk"
        body="Your flats could not be loaded. Check your connection and try again."
      >
        <button
          type="button"
          onClick={() => void listings.refetch()}
          className="rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
        >
          Try again
        </button>
      </ScreenMessage>
    );
  }

  if (listings.data.length === 0) {
    return (
      <ScreenMessage
        art={<SignboardDrawing className="[--glow:var(--like)]" />}
        title="Nothing on the board yet"
        body="Post your room or flat. It takes about two minutes, and in this demo a few tenants will like it within the first minute."
      >
        <SignLink href="/listings/new" size="sm">
          Post a flat
        </SignLink>
      </ScreenMessage>
    );
  }

  const atLimit =
    listings.data.filter((listing) => listing.isOpen).length >= LISTING_LIMITS.openMax;

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-semibold text-2xl tracking-tight">Your flats</h1>
            <p className="mt-1 text-fg-2 text-sm">
              Tap a sign to switch it off when the room goes.
            </p>
          </div>
          {atLimit ? null : (
            <Link
              href="/listings/new"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-like/40 px-3.5 py-2 font-medium text-like text-sm transition-colors hover:bg-like/10"
            >
              <PlusIcon className="size-4" />
              Post a flat
            </Link>
          )}
        </div>

        {atLimit ? (
          <p className="mt-5 rounded-2xl border border-save/30 bg-save/10 px-4 py-3 text-save text-sm leading-relaxed">
            You have {LISTING_LIMITS.openMax} flats open, which is the most allowed at once. Switch
            a sign off to post another.
          </p>
        ) : null}

        <ul className="mt-6 space-y-4">
          {listings.data.map((listing) => (
            <li key={listing.id}>
              <FlatCard listing={listing} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FlatCard({ listing }: { listing: MyListing }) {
  const setOpen = useSetListingOpen();
  const remove = useDeleteListing();
  const onSite = useConfirmOnSite();
  const renew = useRenewListing();
  const [confirming, setConfirming] = useState(false);
  const [locating, setLocating] = useState(false);
  const { interestedCount, matchCount } = listing;

  async function confirmHere() {
    setLocating(true);
    try {
      const position = await whereAmI();
      await onSite.mutateAsync({ id: listing.id, position });
      toast("Marked as posted on site");
    } catch (error) {
      toast.error(
        error instanceof PositionError || error instanceof ApiError
          ? error.message
          : "Couldn't confirm just now. Try again in a moment.",
      );
    } finally {
      setLocating(false);
    }
  }

  // Worked out when the card is drawn; the list is refreshed every few seconds anyway.
  const left = daysLeft(listing.expiresAt, new Date());
  const expired = left !== null && left <= 0;
  const endingSoon = left !== null && left > 0 && left <= LISTING_LIMITS.remindDays;

  function stillAvailable() {
    renew.mutate(listing.id, {
      onSuccess: () => toast(`Back on the board for ${LISTING_LIMITS.openDays} more days`),
      onError: (error) =>
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Couldn't renew just now. Try again in a moment.",
        ),
    });
  }

  function toggle() {
    const isOpen = !listing.isOpen;
    setOpen.mutate(
      { id: listing.id, isOpen },
      {
        onSuccess: () =>
          toast(isOpen ? "Sign on. Taking likes again." : "Sign off. No new likes for now."),
        onError: (error) =>
          toast.error(
            error instanceof ApiError
              ? error.message
              : "The sign didn't switch. Try again in a moment.",
          ),
      },
    );
  }

  function takeDown() {
    remove.mutate(listing.id, {
      onSuccess: () => toast(`"${listing.title}" was taken down`),
      onError: () => toast.error("Couldn't take it down just now. Try again in a moment."),
    });
  }

  return (
    <article className="surface rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <ListingThumb listing={listing} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-1 font-medium">{listing.title}</h2>
          <p className="mt-0.5 truncate text-fg-2 text-sm">
            {listing.locality}, {listing.city}
          </p>
          <p className="font-mono text-fg-2 text-sm tabular-nums">{formatRent(listing.rent)}</p>
        </div>
      </div>

      <div className="mt-3">
        {listing.isVerified ? (
          <p className="flex items-center gap-1.5 text-like text-xs">
            <CheckIcon className="size-3.5" />
            Posted on site
          </p>
        ) : (
          <button
            type="button"
            disabled={locating}
            onClick={() => void confirmHere()}
            className="flex items-center gap-1.5 text-fg-2 text-xs underline-offset-4 transition-colors hover:text-like hover:underline disabled:opacity-50"
          >
            <MapPinIcon className="size-3.5" />
            {locating ? "Finding you…" : 'At the flat now? Confirm it for a "Posted on site" mark'}
          </button>
        )}
      </div>

      {listing.underReview ? (
        <p className="mt-4 rounded-2xl border border-pass/30 bg-pass/10 px-4 py-3 text-pass text-sm leading-relaxed">
          This flat was taken off the board after several people reported it. It cannot be switched
          back on. If that is a mistake, take it down and post it again with correct details.
        </p>
      ) : expired ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-save/30 bg-save/10 px-4 py-3">
          <p className="text-save text-sm">
            Its {LISTING_LIMITS.openDays} days are up, so it is off the board.
          </p>
          <StillAvailable onClick={stillAvailable} busy={renew.isPending} />
        </div>
      ) : endingSoon ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-save/30 bg-save/10 px-4 py-3">
          <p className="text-save text-sm">
            Comes off the board in {left} {left === 1 ? "day" : "days"}.
          </p>
          <StillAvailable onClick={stillAvailable} busy={renew.isPending} />
        </div>
      ) : left !== null && listing.isOpen ? (
        <p className="mt-3 text-fg-3 text-xs">On the board for {left} more days.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-hairline border-t pt-4">
        <button
          type="button"
          role="switch"
          aria-checked={listing.isOpen}
          aria-label={`Taking likes for ${listing.title}`}
          onClick={toggle}
          disabled={listing.underReview || expired}
          className="rounded-lg transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          <VacancySign open={listing.isOpen} />
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/interested"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${
              interestedCount > 0
                ? "border-win/40 text-win hover:bg-win/10"
                : "border-hairline text-fg-3 hover:text-fg-2"
            }`}
          >
            <BellIcon className="size-4" />
            <span className="tabular-nums">{interestedCount}</span>
            <span className="sr-only sm:not-sr-only">waiting</span>
          </Link>
          <Link
            href="/keys"
            className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-2 text-fg-2 text-sm transition-colors hover:text-fg"
          >
            <KeyIcon className="size-4" />
            <span className="tabular-nums">{matchCount}</span>
            <span className="sr-only sm:not-sr-only">{matchCount === 1 ? "key" : "keys"}</span>
          </Link>
          {listing.isOpen && !listing.underReview ? (
            <button
              type="button"
              onClick={() => void shareAndTell(listing)}
              aria-label={`Share ${listing.title}`}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-2 text-fg-2 text-sm transition-colors hover:text-like"
            >
              <ShareIcon className="size-4" />
              <span className="sr-only sm:not-sr-only">Share</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (confirming ? takeDown() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            disabled={remove.isPending}
            aria-label={confirming ? "Tap again to take this flat down" : "Take this flat down"}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-colors ${
              confirming ? "bg-pass/15 text-pass" : "text-fg-3 hover:text-pass"
            }`}
          >
            <TrashIcon className="size-4" />
            {confirming ? "Tap again" : null}
          </button>
        </div>
      </div>
    </article>
  );
}

function StillAvailable({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="rounded-full border border-save/50 px-3.5 py-1.5 font-medium text-save text-sm transition-colors hover:bg-save/15 disabled:opacity-50"
    >
      Still available
    </button>
  );
}
