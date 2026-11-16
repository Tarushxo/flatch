"use client";

import {
  clearedFilters,
  countActiveFilters,
  type FeedFilters,
  formatRupees,
  ROOM_TYPE_LABELS,
  ROOM_TYPES,
} from "@repo/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { Drawer } from "vaul";
import { api } from "@/lib/api/client";
import { BUDGET } from "@/lib/deck/filters";
import { useSettled } from "@/lib/use-settled";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((other) => other !== item) : [...list, item];
}

/**
 * The filter controls, in a bottom sheet. Changes are a draft until "Show
 * flats" is pressed, and a live counter says how many flats the draft leaves.
 */
export function FilterSheet({
  open,
  applied,
  onApply,
  onClose,
}: {
  open: boolean;
  applied: FeedFilters;
  onApply: (filters: FeedFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(applied);

  // Start each visit from what is currently applied.
  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  const localities = useQuery({
    queryKey: ["localities", applied.city],
    queryFn: () => api.getLocalities(applied.city),
    staleTime: Number.POSITIVE_INFINITY,
    enabled: open,
  });

  // Asked once the choices have stopped moving: a slider dragged across its range used to
  // send a request for every step.
  const asked = useSettled(draft);
  const count = useQuery({
    queryKey: ["feed-count", asked],
    queryFn: () => api.countFeed(asked),
    placeholderData: keepPreviousData,
    enabled: open,
  });

  const budget = draft.budgetMax ?? BUDGET.max;
  const matching = count.data;

  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/75" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[2rem] border border-hairline border-b-0 bg-surface-1 outline-none"
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-fg/25"
          />
          <div className="flex items-center justify-between px-5 pt-4">
            <Drawer.Title className="font-display font-semibold text-xl tracking-tight">
              Filters
            </Drawer.Title>
            <button
              type="button"
              disabled={countActiveFilters(draft) === 0}
              onClick={() => setDraft(clearedFilters(draft))}
              className="rounded-full px-3 py-1.5 font-medium text-like text-sm transition-opacity disabled:opacity-0"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-8 overflow-y-auto overscroll-contain px-5 pt-6 pb-6">
            <Group title="Monthly budget">
              <label htmlFor="filter-budget" className="flex items-baseline justify-between">
                <span className="font-mono font-semibold text-2xl tabular-nums tracking-tight">
                  {draft.budgetMax === null ? "Any budget" : `Up to ${formatRupees(budget)}`}
                </span>
                <span className="text-fg-3 text-xs">rent + maintenance + bills</span>
              </label>
              <input
                id="filter-budget"
                type="range"
                min={BUDGET.min}
                max={BUDGET.max}
                step={BUDGET.step}
                value={budget}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraft({ ...draft, budgetMax: value >= BUDGET.max ? null : value });
                }}
                className="mt-4 h-2 w-full cursor-pointer accent-like"
              />
              <div className="mt-1 flex justify-between text-fg-3 text-xs" aria-hidden="true">
                <span>{formatRupees(BUDGET.min)}</span>
                <span>Any</span>
              </div>
            </Group>

            <Group title="Room type">
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.map((room) => (
                  <Choice
                    key={room}
                    selected={draft.roomTypes.includes(room)}
                    onToggle={() =>
                      setDraft({ ...draft, roomTypes: toggle(draft.roomTypes, room) })
                    }
                  >
                    {ROOM_TYPE_LABELS[room]}
                  </Choice>
                ))}
              </div>
            </Group>

            <Group title="Areas">
              {localities.data ? (
                <div className="flex flex-wrap gap-2">
                  {localities.data.map((area) => (
                    <Choice
                      key={area}
                      selected={draft.localities.includes(area)}
                      onToggle={() =>
                        setDraft({ ...draft, localities: toggle(draft.localities, area) })
                      }
                    >
                      {area}
                    </Choice>
                  ))}
                </div>
              ) : (
                <p className="text-fg-3 text-sm">Loading areas…</p>
              )}
            </Group>
          </div>

          <div className="shrink-0 border-hairline border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={matching === 0}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              className="button-primary w-full disabled:opacity-40"
            >
              <span aria-live="polite">
                {matching === undefined
                  ? "Show flats"
                  : matching === 0
                    ? "No flats match"
                    : `Show ${matching} ${matching === 1 ? "flat" : "flats"}`}
              </span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">{title}</h3>
      {children}
    </section>
  );
}

/** A chip that is either chosen or not. */
function Choice({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        selected
          ? "border-like bg-like/15 text-like"
          : "border-hairline bg-surface-2 text-fg-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
