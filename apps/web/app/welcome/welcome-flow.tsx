"use client";

import {
  CITIES,
  formatRupees,
  LIFESTYLE,
  LIFESTYLE_KEYS,
  LIFESTYLE_WORDING,
  type LifestyleKey,
  MOVE_IN,
  MOVE_IN_LABELS,
  preferencesToFilters,
  ROOM_TYPE_LABELS,
  ROOM_TYPES,
  STAY,
  STAY_LABELS,
  type TenantPreferences,
} from "@repo/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ambient } from "@/components/ambient";
import { StarIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { api } from "@/lib/api/client";
import { BUDGET } from "@/lib/deck/filters";
import { useProfile, useSaveProfile } from "@/lib/profile/use-profile";

const STEPS = ["city", "budget", "areas", "timing", "room", "lifestyle"] as const;

const QUESTIONS: Record<(typeof STEPS)[number], { title: string; help: string }> = {
  city: {
    title: "Where are you looking?",
    help: "You can change this any time from your profile.",
  },
  budget: {
    title: "What can you spend each month?",
    help: "Count everything: rent, maintenance and bills.",
  },
  areas: {
    title: "Which areas?",
    help: "Pick as many as you like, or none to see the whole city.",
  },
  timing: { title: "When, and for how long?", help: "Listers ask this first, so it helps to say." },
  room: { title: "What kind of place?", help: "Pick any that would work for you." },
  lifestyle: {
    title: "How do you live?",
    help: "Answer what you like. Star an answer if a mismatch would rule a flat out.",
  },
};

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((other) => other !== item) : [...list, item];
}

/**
 * Check-in: six short questions that become the tenant's preferences. Every
 * step can be skipped, and the whole thing can be skipped from the first
 * screen. Someone who has already checked in can come back here to change
 * their answers.
 */
export function WelcomeFlow() {
  const router = useRouter();
  const profile = useProfile();
  const save = useSaveProfile();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TenantPreferences | null>(null);

  // Start from whatever is already saved.
  useEffect(() => {
    if (profile.data && draft === null) setDraft(profile.data.preferences);
  }, [profile.data, draft]);

  if (!profile.data || draft === null) {
    return (
      <div role="status" className="grid min-h-dvh place-items-center">
        <span className="sr-only">Loading…</span>
        <MarqueeBulbs total={6} chase />
      </div>
    );
  }

  const returning = profile.data.onboardedAt !== null;
  const current = STEPS[step] ?? "city";
  const last = step === STEPS.length - 1;
  // Changes are merged into the latest draft, never a stale copy, so two quick
  // taps cannot overwrite each other.
  const set: SetDraft = (change) =>
    setDraft((latest) =>
      latest ? { ...latest, ...(typeof change === "function" ? change(latest) : change) } : latest,
    );

  function finish(preferences: TenantPreferences) {
    if (!profile.data) return;
    save.mutate(
      {
        ...profile.data,
        preferences,
        onboardedAt: profile.data.onboardedAt ?? new Date().toISOString(),
      },
      {
        onSuccess: () => router.push(returning ? "/profile" : "/discover"),
        onError: () => toast.error("That didn't save. Try again in a moment."),
      },
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Ambient />

      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href="/" className="rounded-lg">
          <Logo size="sm" />
        </Link>
        {returning ? (
          <Link href="/profile" className="px-2 py-2 font-medium text-fg-2 text-sm hover:text-fg">
            Cancel
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => finish(draft)}
            className="px-2 py-2 font-medium text-fg-2 text-sm hover:text-fg"
          >
            Skip, just show me flats
          </button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <MarqueeBulbs total={STEPS.length} lit={step + 1} label="Check-in progress" />
        <p className="mt-5 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">
          {returning ? "Your preferences" : "Check in"} · {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-3 text-balance font-display font-semibold text-3xl tracking-tight sm:text-4xl">
          {QUESTIONS[current].title}
        </h1>
        <p className="mt-3 text-fg-2">{QUESTIONS[current].help}</p>

        <div className="mt-8 flex-1">
          {current === "city" ? <CityStep draft={draft} set={set} /> : null}
          {current === "budget" ? <BudgetStep draft={draft} set={set} /> : null}
          {current === "areas" ? <AreasStep draft={draft} set={set} /> : null}
          {current === "timing" ? <TimingStep draft={draft} set={set} /> : null}
          {current === "room" ? <RoomStep draft={draft} set={set} /> : null}
          {current === "lifestyle" ? <LifestyleStep draft={draft} set={set} /> : null}
        </div>

        <footer className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className={`rounded-full px-4 py-3 font-medium text-fg-2 text-sm hover:text-fg ${
              step === 0 ? "invisible" : ""
            }`}
          >
            Back
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => (last ? finish(draft) : setStep(step + 1))}
            className="button-primary min-w-40 disabled:opacity-50"
          >
            {last ? (returning ? "Save changes" : "Show my flats") : "Next"}
          </button>
        </footer>
      </main>
    </div>
  );
}

/** Change the draft: pass the changes, or a function that works them out from the latest draft. */
type SetDraft = (
  change: Partial<TenantPreferences> | ((latest: TenantPreferences) => Partial<TenantPreferences>),
) => void;

type StepProps = {
  draft: TenantPreferences;
  set: SetDraft;
};

function CityStep({ draft, set }: StepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CITIES.map((city) => {
        const chosen = draft.city === city;
        return (
          <button
            key={city}
            type="button"
            aria-pressed={chosen}
            // A new city has different areas, so the old choices are dropped.
            onClick={() => set(chosen ? {} : { city, localities: [] })}
            className={`rounded-2xl border bg-surface-2 px-5 py-7 text-center font-sign text-2xl uppercase tracking-[0.2em] transition-colors ${
              chosen ? "glow border-transparent" : "border-hairline hover:border-fg/25"
            }`}
            style={{ "--glow": "var(--like)" } as CSSProperties}
          >
            <span className={chosen ? "sign" : "text-fg-3"}>{city}</span>
          </button>
        );
      })}
    </div>
  );
}

function BudgetStep({ draft, set }: StepProps) {
  const value = draft.budgetMax ?? BUDGET.max;
  return (
    <div>
      <label htmlFor="welcome-budget" className="block">
        <span className="font-mono font-semibold text-4xl tabular-nums tracking-tight">
          {draft.budgetMax === null ? "Any budget" : `Up to ${formatRupees(value)}`}
        </span>
      </label>
      <input
        id="welcome-budget"
        type="range"
        min={BUDGET.min}
        max={BUDGET.max}
        step={BUDGET.step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          set({ budgetMax: next >= BUDGET.max ? null : next });
        }}
        className="mt-6 h-2 w-full cursor-pointer accent-brand-b"
      />
      <div className="mt-1 flex justify-between text-fg-3 text-xs" aria-hidden="true">
        <span>{formatRupees(BUDGET.min)}</span>
        <span>Any</span>
      </div>
      <FlatCount draft={draft} />
    </div>
  );
}

function AreasStep({ draft, set }: StepProps) {
  const areas = useQuery({
    queryKey: ["localities", draft.city],
    queryFn: () => api.getLocalities(draft.city),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return (
    <div>
      {areas.data ? (
        <div className="flex flex-wrap gap-2">
          {areas.data.map((area) => (
            <Choice
              key={area}
              selected={draft.localities.includes(area)}
              onToggle={() => set((latest) => ({ localities: toggle(latest.localities, area) }))}
            >
              {area}
            </Choice>
          ))}
        </div>
      ) : (
        <p className="text-fg-3 text-sm">Loading areas…</p>
      )}
      <FlatCount draft={draft} />
    </div>
  );
}

function TimingStep({ draft, set }: StepProps) {
  return (
    <div className="space-y-8">
      <Group title="Moving in">
        {MOVE_IN.map((option) => (
          <Choice
            key={option}
            selected={draft.moveIn === option}
            onToggle={() => set((latest) => ({ moveIn: latest.moveIn === option ? null : option }))}
          >
            {MOVE_IN_LABELS[option]}
          </Choice>
        ))}
      </Group>
      <Group title="Staying for">
        {STAY.map((option) => (
          <Choice
            key={option}
            selected={draft.stay === option}
            onToggle={() => set((latest) => ({ stay: latest.stay === option ? null : option }))}
          >
            {STAY_LABELS[option]}
          </Choice>
        ))}
      </Group>
    </div>
  );
}

function RoomStep({ draft, set }: StepProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ROOM_TYPES.map((room) => (
          <Choice
            key={room}
            selected={draft.roomTypes.includes(room)}
            onToggle={() => set((latest) => ({ roomTypes: toggle(latest.roomTypes, room) }))}
          >
            {ROOM_TYPE_LABELS[room]}
          </Choice>
        ))}
      </div>
      <FlatCount draft={draft} />
    </div>
  );
}

function LifestyleStep({ draft, set }: StepProps) {
  function answer(key: LifestyleKey, value: string) {
    set((latest) => {
      const lifestyle = { ...latest.lifestyle } as Record<string, string | undefined>;
      if (lifestyle[key] === value) {
        // Tapping the chosen answer again clears it, and its star with it.
        delete lifestyle[key];
        return {
          lifestyle: lifestyle as TenantPreferences["lifestyle"],
          dealbreakers: latest.dealbreakers.filter((item) => item !== key),
        };
      }
      lifestyle[key] = value;
      return { lifestyle: lifestyle as TenantPreferences["lifestyle"] };
    });
  }

  return (
    <ul className="space-y-3">
      {LIFESTYLE_KEYS.map((key) => {
        const chosen = draft.lifestyle[key];
        const starred = draft.dealbreakers.includes(key);
        const { question, answers } = LIFESTYLE_WORDING[key];
        return (
          <li key={key} className="surface rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{question}</p>
              <button
                type="button"
                aria-pressed={starred}
                aria-label={`Dealbreaker: ${question}`}
                title="Dealbreaker"
                disabled={chosen === undefined}
                onClick={() =>
                  set((latest) => ({ dealbreakers: toggle(latest.dealbreakers, key) }))
                }
                className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-25 ${
                  starred ? "text-save" : "text-fg-3 hover:text-fg-2"
                }`}
              >
                <StarIcon weight={starred ? "fill" : "regular"} className="size-5" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {LIFESTYLE[key].map((value, position) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={chosen === value}
                  onClick={() => answer(key, value)}
                  className={`rounded-xl border px-2 py-2.5 text-sm transition-colors ${
                    chosen === value
                      ? "border-brand-b bg-brand-b/15 text-fg"
                      : "border-hairline bg-surface-2 text-fg-2 hover:text-fg"
                  }`}
                >
                  {answers[position]}
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** How many flats the answers so far leave. The first sign that the answers do something. */
function FlatCount({ draft }: { draft: TenantPreferences }) {
  const filters = preferencesToFilters(draft);
  const count = useQuery({
    queryKey: ["feed-count", filters],
    queryFn: () => api.countFeed(filters),
    placeholderData: keepPreviousData,
  });
  if (count.data === undefined) return <p className="mt-8 h-6" />;
  return (
    <p className="mt-8 text-fg-2" aria-live="polite">
      <span className="font-mono font-semibold text-fg text-lg tabular-nums">{count.data}</span>{" "}
      {count.data === 1 ? "flat" : "flats"} in {draft.city} fit so far.
      {count.data === 0 ? " Try loosening something." : ""}
    </p>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

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
      className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
        selected
          ? "border-brand-b bg-brand-b/15 text-fg"
          : "border-hairline bg-surface-2 text-fg-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
