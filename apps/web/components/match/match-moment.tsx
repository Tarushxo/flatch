"use client";

import { type Match, ROOM_TYPE_LABELS } from "@repo/shared";
import { useEffect, useRef } from "react";
import { KeyTag } from "@/components/motifs/key-tag";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { SignLink } from "@/components/sign-link";
import { buzz } from "@/lib/haptics";

/**
 * The match moment: the screen dims, a neon "YOU'RE IN" sign flickers on, the
 * room key swings onto its hook, and the marquee lights chase.
 *
 * It can appear over any screen in the app. Escape, "Keep swiping" and "Say
 * hi" all close it.
 */
export function MatchMoment({ match, onClose }: { match: Match; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const { listing } = match;
  const name = listing.lister.name;

  useEffect(() => {
    panel.current?.focus();
    buzz([30, 60, 30]);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      aria-describedby="match-text"
      tabIndex={-1}
      className="fixed inset-0 z-[70] grid animate-fade-in place-items-center overflow-y-auto bg-ink/95 p-6 outline-none"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <MarqueeBulbs total={11} chase />

        <h2
          id="match-title"
          className="sign mt-9 animate-flicker font-sign text-6xl leading-none tracking-wide [--glow:var(--win)] sm:text-7xl"
        >
          YOU'RE IN
        </h2>

        <div className="mt-9">
          <KeyTag locality={listing.locality} detail={ROOM_TYPE_LABELS[listing.roomType]} />
        </div>

        <div id="match-text" className="mt-8">
          <p className="font-display font-semibold text-xl tracking-tight">
            {name} liked you back.
          </p>
          <p className="mt-2 text-fg-2 text-sm leading-relaxed">
            Chat is open, and the address of "{listing.title}" is unlocked.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-5">
          <SignLink href={`/keys/${match.id}`} colour="var(--win)" onClick={onClose}>
            Say hi
          </SignLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-medium text-fg-2 text-sm transition-colors hover:text-fg"
          >
            Keep swiping
          </button>
        </div>

        <div className="mt-9">
          <MarqueeBulbs total={11} chase />
        </div>
      </div>
    </div>
  );
}
