"use client";

import {
  ABOUT_MAX_LENGTH,
  AGE_RANGES,
  formatRupees,
  lifestyleAnswered,
  MOVE_IN_LABELS,
  NAME_MAX_LENGTH,
  OCCUPATION_LABELS,
  OCCUPATIONS,
  ROOM_TYPE_LABELS,
  STAY_LABELS,
  type TenantPreferences,
  type TenantProfile,
} from "@repo/shared";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/icons";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { api } from "@/lib/api/client";
import { initial } from "@/lib/names";
import { useSwitchMode } from "@/lib/profile/use-mode";
import { useAccount, useProfile, useSaveProfile } from "@/lib/profile/use-profile";

const SIDES = [
  { mode: "tenant", sign: "Find a flat", label: "Swipe on rooms and flats" },
  { mode: "lister", sign: "List a flat", label: "Post yours and pick a tenant" },
] as const;

type About = Pick<TenantProfile, "name" | "ageRange" | "occupation" | "about">;

const aboutOf = (profile: TenantProfile): About => ({
  name: profile.name,
  ageRange: profile.ageRange,
  occupation: profile.occupation,
  about: profile.about,
});

/**
 * The Profile tab: which side of the app is in use, a little about the person
 * (this is what the other side sees), a summary of what a tenant is looking
 * for, and "check out" to start afresh.
 */
export function ProfileScreen() {
  const profile = useProfile();
  const save = useSaveProfile();
  const [draft, setDraft] = useState<About | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { switchTo, switching } = useSwitchMode();
  const account = useAccount();
  const signedIn = account.data ? !account.data.isGuest : false;

  useEffect(() => {
    if (profile.data && draft === null) setDraft(aboutOf(profile.data));
  }, [profile.data, draft]);

  if (!profile.data || draft === null) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <span className="sr-only">Loading…</span>
        <MarqueeBulbs total={8} chase />
      </div>
    );
  }

  const saved = profile.data;
  const lister = saved.mode === "lister";
  const changed = JSON.stringify(draft) !== JSON.stringify(aboutOf(saved));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    save.mutate(
      { ...saved, ...draft },
      {
        onSuccess: (stored) => {
          setDraft(aboutOf(stored));
          toast("Profile saved");
        },
        onError: () => toast.error("That didn't save. Try again in a moment."),
      },
    );
  }

  async function signIn() {
    try {
      await api.signInWithGoogle();
    } catch {
      toast.error("Couldn't reach Google just now. Try again in a moment.");
    }
  }

  async function signOut() {
    try {
      await api.signOut();
      window.location.assign("/");
    } catch {
      toast.error("Couldn't sign out just now. Try again in a moment.");
    }
  }

  async function checkOut() {
    await api.resetProfile();
    // A full reload, so swipes, matches and chats are forgotten too.
    window.location.assign("/");
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-8 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-a to-brand-b font-display font-semibold text-2xl text-white"
          >
            {saved.name ? initial(saved.name) : "?"}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display font-semibold text-2xl tracking-tight">
              {saved.name || "Your profile"}
            </h1>
            <p className="text-fg-2 text-sm">
              {lister ? "Listing a flat" : `Looking in ${saved.preferences.city}`}
            </p>
          </div>
        </header>

        <section aria-labelledby="side-heading">
          <SectionHeading id="side-heading">You are here to</SectionHeading>
          <div className="surface grid grid-cols-2 gap-1.5 rounded-2xl p-1.5">
            {SIDES.map((side) => {
              const on = saved.mode === side.mode;
              return (
                <button
                  key={side.mode}
                  type="button"
                  aria-pressed={on}
                  disabled={switching}
                  onClick={() => (on ? null : void switchTo(side.mode))}
                  className={`rounded-xl px-3 py-3 text-center transition-colors ${
                    on ? "bg-brand-b/15 ring-1 ring-brand-b" : "hover:bg-fg/5"
                  }`}
                >
                  <span
                    className={`block font-sign text-base uppercase tracking-[0.16em] ${
                      on ? "sign [--glow:var(--brand-b)]" : "text-fg-3"
                    }`}
                  >
                    {side.sign}
                  </span>
                  <span className="mt-1 block text-fg-2 text-xs">{side.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="about-heading">
          <SectionHeading id="about-heading">About you</SectionHeading>
          <p className="mb-5 text-fg-2 text-sm">
            {lister
              ? "This is what a tenant sees on your flat's card."
              : "This is what a lister sees when you like their flat."}
          </p>
          <form onSubmit={submit} className="space-y-6">
            <Field label="Name" htmlFor="profile-name">
              <input
                id="profile-name"
                value={draft.name}
                maxLength={NAME_MAX_LENGTH}
                autoComplete="given-name"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder={
                  lister ? "What should tenants call you?" : "What should listers call you?"
                }
                className="w-full rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-fg placeholder:text-fg-3"
              />
            </Field>

            <Field label="Age">
              <Chips
                options={AGE_RANGES.map((value) => ({ value, label: value }))}
                value={draft.ageRange}
                onChange={(ageRange) => setDraft({ ...draft, ageRange })}
              />
            </Field>

            <Field label="What you do">
              <Chips
                options={OCCUPATIONS.map((value) => ({ value, label: OCCUPATION_LABELS[value] }))}
                value={draft.occupation}
                onChange={(occupation) => setDraft({ ...draft, occupation })}
              />
            </Field>

            <Field label="A line or two about you" htmlFor="profile-about">
              <textarea
                id="profile-about"
                value={draft.about}
                maxLength={ABOUT_MAX_LENGTH}
                rows={3}
                onChange={(event) => setDraft({ ...draft, about: event.target.value })}
                placeholder="I'm the flatmate who…"
                className="w-full resize-none rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-fg leading-relaxed placeholder:text-fg-3"
              />
              <p className="mt-1 text-right text-fg-3 text-xs tabular-nums">
                {draft.about.length} / {ABOUT_MAX_LENGTH}
              </p>
            </Field>

            <button
              type="submit"
              disabled={!changed || save.isPending}
              className="button-primary disabled:opacity-40"
            >
              Save profile
            </button>
          </form>
        </section>

        {lister ? null : (
          <section aria-labelledby="looking-heading">
            <div className="flex items-center justify-between">
              <SectionHeading id="looking-heading">What you're looking for</SectionHeading>
              <Link href="/welcome" className="mb-4 font-medium text-like text-sm">
                Change
              </Link>
            </div>
            <Preferences preferences={saved.preferences} />
          </section>
        )}

        <section aria-labelledby="account-heading">
          <SectionHeading id="account-heading">Your account</SectionHeading>
          {signedIn ? (
            <div className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <p className="min-w-0 text-sm">
                <span className="block text-fg-2">Signed in as</span>
                <span className="block truncate font-medium">{account.data?.email}</span>
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="surface rounded-2xl p-4">
              <p className="font-sign text-save text-sm uppercase tracking-[0.18em]">Guest pass</p>
              <p className="mt-2 max-w-md text-fg-2 text-sm leading-relaxed">
                {account.data?.canSignIn
                  ? "Your swipes and profile are kept for this browser only. Sign in to keep them and pick up on any device."
                  : "Your swipes and profile are kept for this browser only. Signing in, to carry them between devices, is on its way."}
              </p>
              {account.data?.canSignIn ? (
                <button
                  type="button"
                  onClick={() => void signIn()}
                  className="mt-4 flex items-center gap-2.5 rounded-full border border-like/40 px-5 py-2.5 font-medium text-like text-sm transition-colors hover:bg-like/10"
                >
                  <GoogleIcon className="size-4" />
                  Continue with Google
                </button>
              ) : null}
            </div>
          )}
        </section>

        <section aria-labelledby="checkout-heading">
          <SectionHeading id="checkout-heading">
            {signedIn ? "Delete account" : "Check out"}
          </SectionHeading>
          <p className="mb-4 max-w-md text-fg-2 text-sm leading-relaxed">
            {signedIn
              ? "Deletes your account for good, with your profile, preferences, swipes, chats and any flats you posted."
              : "Clears your profile, preferences, swipes, chats and any flats you posted, and takes you back to the start."}
          </p>
          <button
            type="button"
            onClick={() => (leaving ? void checkOut() : setLeaving(true))}
            className="rounded-full border border-pass/40 px-5 py-2.5 font-medium text-pass text-sm transition-colors hover:bg-pass/10"
          >
            {leaving
              ? `Tap again to ${signedIn ? "delete it" : "check out"}`
              : signedIn
                ? "Delete my account"
                : "Check out"}
          </button>
        </section>
      </div>
    </div>
  );
}

function Preferences({ preferences }: { preferences: TenantPreferences }) {
  const answered = lifestyleAnswered(preferences);
  const starred = preferences.dealbreakers.length;
  const rows: [string, string][] = [
    ["City", preferences.city],
    [
      "Budget",
      preferences.budgetMax === null
        ? "Any"
        : `Up to ${formatRupees(preferences.budgetMax)} a month`,
    ],
    [
      "Areas",
      preferences.localities.length > 0
        ? preferences.localities.join(", ")
        : `Anywhere in ${preferences.city}`,
    ],
    ["Moving in", preferences.moveIn ? MOVE_IN_LABELS[preferences.moveIn] : "Not said"],
    ["Staying for", preferences.stay ? STAY_LABELS[preferences.stay] : "Not said"],
    [
      "Room type",
      preferences.roomTypes.length > 0
        ? preferences.roomTypes.map((room) => ROOM_TYPE_LABELS[room]).join(", ")
        : "Any",
    ],
    [
      "Lifestyle",
      answered === 0
        ? "Not answered yet"
        : `${answered} of 8 answered${starred > 0 ? `, ${starred} ${starred === 1 ? "dealbreaker" : "dealbreakers"}` : ""}`,
    ],
  ];

  return (
    <dl className="surface divide-y divide-hairline rounded-2xl">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-6 px-4 py-3.5">
          <dt className="shrink-0 text-fg-2 text-sm">{label}</dt>
          <dd className="text-right text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-4 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">
      {children}
    </h2>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="mb-2 block font-medium text-sm">
          {label}
        </label>
      ) : (
        <p className="mb-2 font-medium text-sm">{label}</p>
      )}
      {children}
    </div>
  );
}

/** A row of chips where one, or none, is chosen. */
function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              selected
                ? "border-brand-b bg-brand-b/15 text-fg"
                : "border-hairline bg-surface-2 text-fg-2 hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
