"use client";

import { useState } from "react";
import { BookmarkIcon, CardsIcon, KeyIcon, UserIcon } from "@/components/icons";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { VacancySign } from "@/components/motifs/vacancy-sign";

/*
 * Interactive samples for the style guide. The motifs themselves live in
 * components/motifs; these wrappers only add the state needed to try them.
 */

const QUIET_BUTTON =
  "rounded-full border border-hairline bg-surface-2 px-4 py-2 text-sm transition-colors hover:bg-fg/10 disabled:opacity-40 disabled:hover:bg-surface-2";

export function VacancyDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col items-start gap-5">
      <VacancySign open={open} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={QUIET_BUTTON} onClick={() => setOpen((value) => !value)}>
          {open ? "Mark the flat as taken" : "Open the flat again"}
        </button>
        <span className="flex items-center gap-2 text-fg-3 text-xs">
          On a card: <VacancySign open={open} size="sm" />
        </span>
      </div>
    </div>
  );
}

const STEPS = 6;

export function BulbsDemo() {
  const [step, setStep] = useState(2);

  return (
    <div className="flex flex-col items-start gap-5">
      <div>
        <MarqueeBulbs total={STEPS} lit={step} label="Onboarding progress" />
        <p className="mt-3 text-fg-2 text-sm" aria-live="polite">
          Step {step} of {STEPS}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className={QUIET_BUTTON}
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className={QUIET_BUTTON}
          disabled={step === STEPS}
          onClick={() => setStep((value) => Math.min(STEPS, value + 1))}
        >
          Next
        </button>
      </div>
      <div className="flex items-center gap-3 text-fg-3 text-xs">
        <MarqueeBulbs total={10} chase />
        Chasing, for a match only
      </div>
    </div>
  );
}

const TABS = [
  { id: "discover", label: "Discover", icon: CardsIcon },
  { id: "saved", label: "Saved", icon: BookmarkIcon },
  { id: "keys", label: "Keys", icon: KeyIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
];

export function TabBarDemo() {
  const [active, setActive] = useState("discover");

  return (
    <nav
      aria-label="Sample tab bar"
      className="surface flex w-full max-w-80 gap-1 rounded-full p-1.5"
    >
      {TABS.map(({ id, label, icon: TabIcon }) => {
        const lit = id === active;
        return (
          <button
            key={id}
            type="button"
            aria-current={lit ? "page" : undefined}
            onClick={() => setActive(id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-1 py-2 font-medium text-[0.6875rem] transition-colors ${
              lit ? "text-like" : "text-fg-3 hover:text-fg-2"
            }`}
          >
            <TabIcon
              key={lit ? "lit" : "unlit"}
              weight={lit ? "fill" : "regular"}
              className={`size-6 ${
                lit ? "animate-switch-on [filter:drop-shadow(0_0_6px_var(--like))]" : ""
              }`}
            />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
