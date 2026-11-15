"use client";

import type { Match, PendingLike } from "@repo/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { KeyIcon } from "@/components/icons";
import { ListingThumb } from "@/components/match/listing-thumb";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { KeyDrawing } from "@/components/motifs/neon-drawing";
import { SignLink } from "@/components/sign-link";
import { useMatches, usePendingLikes } from "@/lib/matches/use-matches";
import { clockTime } from "@/lib/time";

/**
 * The Keys tab: the key rack. Each match is a key to a flat; tapping one opens
 * the chat. Likes the lister has not answered yet are listed underneath.
 */
export function KeysScreen() {
  const matches = useMatches();
  const pending = usePendingLikes();

  if (matches.isPending || pending.isPending) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-4">
          <MarqueeBulbs total={8} chase />
          <p className="text-fg-2 text-sm">Checking the key rack…</p>
        </div>
      </div>
    );
  }

  if (matches.isError || pending.isError) {
    return (
      <ScreenMessage
        art={<KeyDrawing className="[--glow:var(--pass)]" />}
        title="Couldn't reach the front desk"
        body="Your keys could not be loaded. Check your connection and try again."
      >
        <button
          type="button"
          onClick={() => {
            void matches.refetch();
            void pending.refetch();
          }}
          className="rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
        >
          Try again
        </button>
      </ScreenMessage>
    );
  }

  if (matches.data.length === 0 && pending.data.length === 0) {
    return (
      <ScreenMessage
        art={<KeyDrawing className="[--glow:var(--win)]" />}
        title="No keys on the rack yet"
        body="Like a flat on the deck. When the lister likes you back, its key hangs here and you can chat."
      >
        <SignLink href="/discover" size="sm">
          Back to the deck
        </SignLink>
      </ScreenMessage>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display font-semibold text-2xl tracking-tight">Keys</h1>
        <p className="mt-1 text-fg-2 text-sm">Flats where the lister liked you back.</p>

        {matches.data.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {matches.data.map((match) => (
              <li key={match.id}>
                <MatchRow match={match} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="surface mt-6 rounded-3xl p-5 text-fg-2 text-sm leading-relaxed">
            No keys yet. Your likes are with the listers; in this demo they usually answer within a
            few seconds.
          </p>
        )}

        {pending.data.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">
              Likes sent
            </h2>
            <ul className="mt-4 space-y-3">
              {pending.data.map((like) => (
                <li key={like.listing.id}>
                  <PendingRow like={like} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const { listing, lastMessage, unreadCount } = match;
  const name = listing.lister.name;
  const unread = unreadCount > 0;

  return (
    <Link
      href={`/keys/${match.id}`}
      className="surface flex items-center gap-3 rounded-3xl p-3 transition-colors hover:bg-surface-2"
    >
      <span className="relative shrink-0">
        <ListingThumb listing={listing} />
        {/* The key on the hook */}
        <span className="absolute -right-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full bg-win text-ink ring-2 ring-surface-1">
          <KeyIcon className="size-3.5" />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-medium">{name}</span>
          <span className="shrink-0 text-fg-3 text-xs">{listing.locality}</span>
        </span>
        <span
          className={`mt-0.5 line-clamp-1 text-sm ${unread ? "font-medium text-fg" : "text-fg-2"}`}
        >
          {lastMessage
            ? `${lastMessage.from === "me" ? "You: " : ""}${lastMessage.body}`
            : `Say hi to ${name}`}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-fg-3 text-xs">
          {clockTime(lastMessage?.sentAt ?? match.matchedAt)}
        </span>
        {unread ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-win px-1.5 font-semibold text-ink text-xs">
            {unreadCount}
            <span className="sr-only"> unread</span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function PendingRow({ like }: { like: PendingLike }) {
  const { listing } = like;
  return (
    <Row>
      <ListingThumb listing={listing} lazy />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 font-medium">{listing.title}</span>
        <span className="mt-0.5 block text-fg-2 text-sm">
          Waiting for {listing.lister.name} · liked at {clockTime(like.likedAt)}
        </span>
      </span>
    </Row>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-hairline border-dashed p-3">
      {children}
    </div>
  );
}
