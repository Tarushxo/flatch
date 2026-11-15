import type { ReactNode } from "react";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { CoffeeCupDrawing } from "@/components/motifs/neon-drawing";

const QUIET_BUTTON =
  "rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10";

/** The card-shaped placeholder shown while the first flats load. */
export function DeckLoading() {
  return (
    <div
      role="status"
      className="surface absolute inset-0 grid place-items-center rounded-[2rem] bg-surface-1"
    >
      <div className="flex flex-col items-center gap-4">
        <MarqueeBulbs total={8} chase />
        <p className="text-fg-2 text-sm">Finding flats for you…</p>
      </div>
    </div>
  );
}

/** Shown when every flat that fits has been swiped, or when the filters leave none. */
export function DeckEmpty({
  filtered,
  onRevisit,
  onClearFilters,
}: {
  filtered: boolean;
  onRevisit: () => void;
  onClearFilters: () => void;
}) {
  if (filtered) {
    return (
      <DeckMessage
        title="Nothing on the menu"
        body="No flats are left that match your filters. Widen them to see more."
      >
        <button type="button" className={QUIET_BUTTON} onClick={onClearFilters}>
          Clear filters
        </button>
      </DeckMessage>
    );
  }

  return (
    <DeckMessage
      title="Kitchen's closed"
      body="You have seen every flat that fits. Passed flats can come round again."
    >
      <button type="button" className={QUIET_BUTTON} onClick={onRevisit}>
        Revisit passed flats
      </button>
    </DeckMessage>
  );
}

export function DeckError({ onRetry }: { onRetry: () => void }) {
  return (
    <DeckMessage
      title="The sign's gone dark"
      body="We couldn't load flats just now. Check your connection and try again."
    >
      <button type="button" className={QUIET_BUTTON} onClick={onRetry}>
        Try again
      </button>
    </DeckMessage>
  );
}

function DeckMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-[2rem] border border-hairline border-dashed p-8 text-center">
      <div className="flex flex-col items-center">
        <CoffeeCupDrawing className="size-28 [--glow:var(--save)]" />
        <h2 className="mt-5 font-display font-semibold text-2xl tracking-tight">{title}</h2>
        <p className="mt-2 max-w-xs text-fg-2 text-sm leading-relaxed">{body}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
