"use client";

import {
  AMENITIES,
  CITIES,
  draftAsListing,
  draftProblems,
  EMPTY_DRAFT,
  EXPECTATION_OPTIONS,
  FURNISHING_LABELS,
  FURNISHINGS,
  formatRupees,
  HOUSE_RULE_OPTIONS,
  LISTING_LIMITS,
  LISTING_STEPS,
  type ListingDraft,
  type ListingPhoto,
  type ListingStep,
  NAME_MAX_LENGTH,
  ROOM_TYPE_LABELS,
  ROOM_TYPES,
  SOCIETY_RULE_OPTIONS,
} from "@repo/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CardFace } from "@/components/deck/card-face";
import { CheckIcon, KeyIcon } from "@/components/icons";
import { FadeImage } from "@/components/listing/fade-image";
import { GuestCheck } from "@/components/motifs/guest-check";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { api } from "@/lib/api/client";
import { useCreateListing, useSamplePhotos } from "@/lib/lister/use-lister";
import { PROFILE_KEY, useProfile } from "@/lib/profile/use-profile";

/** A half-filled form survives a reload, until the tab is closed. */
const DRAFT_KEY = "flatch.listing-draft.v1";

const QUESTIONS: Record<ListingStep, { title: string; help: string }> = {
  basics: {
    title: "What are you letting?",
    help: "The title is the first thing a tenant reads on your card.",
  },
  where: {
    title: "Where is it?",
    help: "Tenants see the area. The building and flat number stay private until you say yes to someone.",
  },
  costs: {
    title: "What does it cost?",
    help: "Tenants are shown the full monthly bill, so there are no surprises on either side.",
  },
  photos: {
    title: "Show the place",
    help: `Choose ${LISTING_LIMITS.photosMin} to ${LISTING_LIMITS.photosMax}. The first one you pick is the cover.`,
  },
  home: {
    title: "What is it like to live there?",
    help: "All optional, but flats that say more get better matches.",
  },
  preview: {
    title: "Ready for the board?",
    help: "This is the card tenants will swipe on.",
  },
};

const ROOM_HEADINGS: Record<string, string> = {
  bedroom: "Bedrooms",
  living: "Living rooms",
  kitchen: "Kitchens",
  balcony: "Balconies",
};

const DEPOSIT_CHOICES = [0, 1, 2, 3, 6, 10] as const;

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((other) => other !== item) : [...list, item];
}

// Rupees are written the Indian way as they are typed: 1,20,000.
const grouped = new Intl.NumberFormat("en-IN");

/** What someone typed into a rupee box, as whole rupees. */
function rupees(text: string): number {
  const amount = Number.parseInt(text.replace(/\D/g, ""), 10);
  return Number.isFinite(amount) ? amount : 0;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readSavedDraft(): ListingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListingDraft>;
    return typeof parsed === "object" && parsed !== null && Array.isArray(parsed.photos)
      ? { ...EMPTY_DRAFT, ...parsed }
      : null;
  } catch {
    return null;
  }
}

type SetDraft = (
  change: Partial<ListingDraft> | ((latest: ListingDraft) => Partial<ListingDraft>),
) => void;
type StepProps = { draft: ListingDraft; set: SetDraft };

/**
 * Posting a flat: six short steps that end in a preview of the card. A step
 * that is not finished says what is missing when Next is pressed, rather than
 * greying the button out and leaving the person to guess.
 */
export function PostFlat() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const create = useCreateListing();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [name, setName] = useState("");
  const [pressed, setPressed] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // Start from a half-filled form if there is one, else a blank one in the person's city.
  useEffect(() => {
    if (!profile.data || draft !== null) return;
    setDraft(readSavedDraft() ?? { ...EMPTY_DRAFT, city: profile.data.preferences.city });
    setName(profile.data.name);
  }, [profile.data, draft]);

  useEffect(() => {
    if (draft === null) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage is blocked: the form still works, it just does not survive a reload.
    }
  }, [draft]);

  if (!profile.data || draft === null) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <span className="sr-only">Loading…</span>
        <MarqueeBulbs total={6} chase />
      </div>
    );
  }

  const me = profile.data;
  const current = LISTING_STEPS[step] ?? "basics";
  const last = step === LISTING_STEPS.length - 1;
  const problems = draftProblems(draft, current);
  // Changes are merged into the latest draft, so two quick taps cannot overwrite each other.
  const set: SetDraft = (change) =>
    setDraft((latest) =>
      latest ? { ...latest, ...(typeof change === "function" ? change(latest) : change) } : latest,
    );

  function go(to: number) {
    setPressed(false);
    setStep(to);
    top.current?.scrollTo({ top: 0 });
  }

  async function publish(ready: ListingDraft) {
    try {
      const typed = name.trim().slice(0, NAME_MAX_LENGTH);
      if (typed !== me.name) {
        const saved = await api.saveProfile({ ...me, name: typed });
        queryClient.setQueryData(PROFILE_KEY, saved);
      }
      await create.mutateAsync(ready);
      window.sessionStorage.removeItem(DRAFT_KEY);
      toast("Your flat is on the board", {
        description: "Tenants who like it will show up under Interested.",
      });
      router.push("/listings");
    } catch {
      toast.error("That didn't post. Try again in a moment.");
    }
  }

  function next() {
    if (problems.length > 0) {
      setPressed(true);
      return;
    }
    if (last) void publish(draft as ListingDraft);
    else go(step + 1);
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col">
      <div ref={top} className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8">
        <MarqueeBulbs total={LISTING_STEPS.length} lit={step + 1} label="Posting progress" />
        <p className="mt-5 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">
          Post a flat · {step + 1} of {LISTING_STEPS.length}
        </p>
        <h1 className="mt-3 text-balance font-display font-semibold text-3xl tracking-tight">
          {QUESTIONS[current].title}
        </h1>
        <p className="mt-3 text-fg-2">{QUESTIONS[current].help}</p>

        <div className="mt-8">
          {current === "basics" ? <BasicsStep draft={draft} set={set} /> : null}
          {current === "where" ? <WhereStep draft={draft} set={set} /> : null}
          {current === "costs" ? <CostsStep draft={draft} set={set} /> : null}
          {current === "photos" ? <PhotosStep draft={draft} set={set} /> : null}
          {current === "home" ? <HomeStep draft={draft} set={set} /> : null}
          {current === "preview" ? (
            <PreviewStep draft={draft} about={me.about} name={name} onName={setName} />
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-hairline border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {pressed && problems.length > 0 ? (
          <ul role="alert" className="mb-3 space-y-1 text-save text-sm">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          {step === 0 ? (
            <Link
              href="/listings"
              className="rounded-full px-4 py-3 font-medium text-fg-2 text-sm hover:text-fg"
            >
              Cancel
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="rounded-full px-4 py-3 font-medium text-fg-2 text-sm hover:text-fg"
            >
              Back
            </button>
          )}
          <button
            type="button"
            disabled={create.isPending}
            onClick={next}
            className="button-primary min-w-40 disabled:opacity-50"
          >
            {last ? "Put it on the board" : "Next"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function BasicsStep({ draft, set }: StepProps) {
  return (
    <div className="space-y-7">
      <Field label="Title" htmlFor="flat-title">
        <input
          id="flat-title"
          value={draft.title}
          maxLength={LISTING_LIMITS.titleMax}
          onChange={(event) => set({ title: event.target.value })}
          placeholder="Sunny room in a 3 BHK near the metro"
          className={INPUT}
        />
        <Count used={draft.title.length} of={LISTING_LIMITS.titleMax} />
      </Field>

      <Field label="What is on offer">
        <Chips>
          {ROOM_TYPES.map((room) => (
            <Choice
              key={room}
              selected={draft.roomType === room}
              onToggle={() => set({ roomType: room })}
            >
              {ROOM_TYPE_LABELS[room]}
            </Choice>
          ))}
        </Chips>
      </Field>

      <Field label="Size of the flat">
        <Chips>
          {[1, 2, 3, 4, 5].map((bhk) => (
            <Choice key={bhk} selected={draft.bhk === bhk} onToggle={() => set({ bhk })}>
              {bhk} BHK
            </Choice>
          ))}
        </Chips>
      </Field>

      <Field label="Furnishing">
        <Chips>
          {FURNISHINGS.map((furnishing) => (
            <Choice
              key={furnishing}
              selected={draft.furnishing === furnishing}
              onToggle={() => set({ furnishing })}
            >
              {FURNISHING_LABELS[furnishing]}
            </Choice>
          ))}
        </Chips>
      </Field>

      <Field label="Free from" htmlFor="flat-from">
        <input
          id="flat-from"
          type="date"
          value={draft.availableFrom}
          min={today()}
          onChange={(event) => set({ availableFrom: event.target.value })}
          className={`${INPUT} [color-scheme:dark]`}
        />
        <button
          type="button"
          onClick={() => set({ availableFrom: today() })}
          className="mt-2 font-medium text-like text-sm"
        >
          It is free now
        </button>
      </Field>

      <Field label="A few words about it (optional)" htmlFor="flat-description">
        <textarea
          id="flat-description"
          value={draft.description}
          maxLength={LISTING_LIMITS.descriptionMax}
          rows={4}
          onChange={(event) => set({ description: event.target.value })}
          placeholder="Who lives there now, what the light is like, what is nearby…"
          className={`${INPUT} resize-none leading-relaxed`}
        />
        <Count used={draft.description.length} of={LISTING_LIMITS.descriptionMax} />
      </Field>
    </div>
  );
}

function WhereStep({ draft, set }: StepProps) {
  const areas = useQuery({
    queryKey: ["localities", draft.city],
    queryFn: () => api.getLocalities(draft.city),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <div className="space-y-7">
      <Field label="City">
        <Chips>
          {CITIES.map((city) => (
            <Choice
              key={city}
              selected={draft.city === city}
              // Another city has other areas, so the old choice is dropped.
              onToggle={() => (draft.city === city ? null : set({ city, locality: "" }))}
            >
              {city}
            </Choice>
          ))}
        </Chips>
      </Field>

      <Field label="Area">
        {areas.data ? (
          <Chips>
            {areas.data.map((area) => (
              <Choice
                key={area}
                selected={draft.locality === area}
                onToggle={() => set({ locality: area })}
              >
                {area}
              </Choice>
            ))}
          </Chips>
        ) : (
          <p className="text-fg-3 text-sm">Loading areas…</p>
        )}
      </Field>

      <div className="surface space-y-5 rounded-3xl p-4">
        <p className="flex items-start gap-2.5 text-sm text-win leading-relaxed">
          <KeyIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Private. Only a tenant you say yes to gets these two lines, along with the key.
          </span>
        </p>
        <Field label="Building or society" htmlFor="flat-society">
          <input
            id="flat-society"
            value={draft.society}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => set({ society: event.target.value })}
            placeholder="Maple Court"
            className={INPUT}
          />
        </Field>
        <Field label="Flat number and street" htmlFor="flat-address">
          <input
            id="flat-address"
            value={draft.addressLine}
            maxLength={120}
            autoComplete="off"
            onChange={(event) => set({ addressLine: event.target.value })}
            placeholder="Flat 4B, 2nd Cross"
            className={INPUT}
          />
        </Field>
      </div>
    </div>
  );
}

function CostsStep({ draft, set }: StepProps) {
  const lines = [
    { label: "Rent", amount: draft.rent },
    { label: "Maintenance", amount: draft.maintenance },
    { label: "Electricity + wifi", amount: draft.utilitiesEstimate },
  ].filter((line) => line.amount > 0);

  return (
    <div className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-3">
        <Money id="flat-rent" label="Rent" value={draft.rent} onChange={(rent) => set({ rent })} />
        <Money
          id="flat-maintenance"
          label="Maintenance"
          value={draft.maintenance}
          onChange={(maintenance) => set({ maintenance })}
        />
        <Money
          id="flat-bills"
          label="Bills, roughly"
          value={draft.utilitiesEstimate}
          onChange={(utilitiesEstimate) => set({ utilitiesEstimate })}
        />
      </div>

      <Field label="Deposit">
        <Chips>
          {DEPOSIT_CHOICES.map((months) => (
            <Choice
              key={months}
              selected={draft.depositMonths === months}
              onToggle={() => set({ depositMonths: months })}
            >
              {months === 0 ? "None" : `${months} ${months === 1 ? "month" : "months"}`}
            </Choice>
          ))}
        </Chips>
      </Field>

      <div>
        <p className="mb-3 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">
          What a tenant is shown
        </p>
        {lines.length > 0 ? (
          <GuestCheck
            number="0001"
            lines={lines}
            upfront={
              draft.depositMonths > 0
                ? { label: "deposit, refundable", amount: draft.rent * draft.depositMonths }
                : undefined
            }
          />
        ) : (
          <p className="rounded-2xl border border-hairline border-dashed p-5 text-fg-3 text-sm">
            Enter the rent and the bill writes itself.
          </p>
        )}
      </div>
    </div>
  );
}

function PhotosStep({ draft, set }: StepProps) {
  const samples = useSamplePhotos();
  const chosen = draft.photos.map((photo) => photo.url);
  const full = chosen.length >= LISTING_LIMITS.photosMax;

  function pick(photo: ListingPhoto) {
    set((latest) => {
      const has = latest.photos.some((each) => each.url === photo.url);
      if (has) return { photos: latest.photos.filter((each) => each.url !== photo.url) };
      if (latest.photos.length >= LISTING_LIMITS.photosMax) return {};
      return { photos: [...latest.photos, photo] };
    });
  }

  if (!samples.data) return <p className="text-fg-3 text-sm">Loading photos…</p>;

  const rooms = [...new Set(samples.data.map((photo) => photo.roomTag))];

  return (
    <div className="space-y-7">
      <p className="text-sm" aria-live="polite">
        <span className="font-mono font-semibold text-lg tabular-nums">{chosen.length}</span>
        <span className="text-fg-2"> of {LISTING_LIMITS.photosMax} chosen</span>
      </p>

      {rooms.map((room) => (
        <section key={room}>
          <h2 className="mb-3 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">
            {ROOM_HEADINGS[room] ?? room}
          </h2>
          <ul className="grid grid-cols-3 gap-2">
            {samples.data
              .filter((photo) => photo.roomTag === room)
              .map((photo, position) => {
                const order = chosen.indexOf(photo.url) + 1;
                return (
                  <li key={photo.url}>
                    <button
                      type="button"
                      aria-pressed={order > 0}
                      aria-label={`${room} photo ${position + 1}${order === 1 ? ", the cover" : ""}`}
                      disabled={full && order === 0}
                      onClick={() => pick(photo)}
                      className={`relative block aspect-square w-full overflow-hidden rounded-2xl border-2 transition-opacity disabled:opacity-35 ${
                        order > 0 ? "border-brand-b" : "border-transparent"
                      }`}
                      style={{ backgroundColor: photo.dominantColor }}
                    >
                      <FadeImage
                        src={photo.url}
                        alt=""
                        use="tile"
                        sizes="(min-width: 640px) 180px, 30vw"
                        lazy
                      />
                      {order > 0 ? (
                        <span className="bubble-mine absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full font-semibold text-xs tabular-nums">
                          {order}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <p className="text-fg-3 text-xs leading-relaxed">
        These are sample photos for the demo. Uploading your own arrives with accounts.
      </p>
    </div>
  );
}

function HomeStep({ draft, set }: StepProps) {
  function rule(label: string, allowed: boolean) {
    set((latest) => {
      const others = latest.houseRules.filter((each) => each.label !== label);
      const same = latest.houseRules.some(
        (each) => each.label === label && each.allowed === allowed,
      );
      // Tapping the chosen answer again takes the rule off the listing.
      return { houseRules: same ? others : [...others, { label, allowed }] };
    });
  }

  return (
    <div className="space-y-8">
      <Field label="It comes with">
        <Chips>
          {AMENITIES.map((amenity) => (
            <Choice
              key={amenity}
              selected={draft.amenities.includes(amenity)}
              onToggle={() => set((latest) => ({ amenities: toggle(latest.amenities, amenity) }))}
            >
              {amenity}
            </Choice>
          ))}
        </Chips>
      </Field>

      <Field label="House rules">
        <ul className="surface divide-y divide-hairline rounded-2xl">
          {HOUSE_RULE_OPTIONS.map((label) => {
            const answer = draft.houseRules.find((each) => each.label === label)?.allowed;
            return (
              <li key={label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm">{label}</span>
                <span className="flex shrink-0 gap-2">
                  <RuleButton chosen={answer === true} tone="yes" onClick={() => rule(label, true)}>
                    Okay
                  </RuleButton>
                  <RuleButton
                    chosen={answer === false}
                    tone="no"
                    onClick={() => rule(label, false)}
                  >
                    Not okay
                  </RuleButton>
                </span>
              </li>
            );
          })}
        </ul>
      </Field>

      <Field label="The building">
        <Chips>
          {SOCIETY_RULE_OPTIONS.map((item) => (
            <Choice
              key={item}
              selected={draft.societyRules.includes(item)}
              onToggle={() =>
                set((latest) => ({ societyRules: toggle(latest.societyRules, item) }))
              }
            >
              {item}
            </Choice>
          ))}
        </Chips>
      </Field>

      <Field label="What you expect from a flatmate">
        <Chips>
          {EXPECTATION_OPTIONS.map((item) => (
            <Choice
              key={item}
              selected={draft.expectations.includes(item)}
              onToggle={() =>
                set((latest) => ({ expectations: toggle(latest.expectations, item) }))
              }
            >
              {item}
            </Choice>
          ))}
        </Chips>
      </Field>
    </div>
  );
}

function PreviewStep({
  draft,
  about,
  name,
  onName,
}: {
  draft: ListingDraft;
  about: string;
  name: string;
  onName: (name: string) => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const listing = draftAsListing(draft, { name, about });
  const total = draft.rent + draft.maintenance + draft.utilitiesEstimate;
  const facts: [string, string][] = [
    ["Every month, all in", formatRupees(total)],
    [
      "Deposit",
      draft.depositMonths === 0 ? "None" : formatRupees(draft.rent * draft.depositMonths),
    ],
    ["Comes with", draft.amenities.length > 0 ? draft.amenities.join(", ") : "Nothing listed"],
    [
      "Private address",
      [draft.society, draft.addressLine].filter(Boolean).join(", ") || "Not filled in",
    ],
  ];

  return (
    <div className="space-y-7">
      {draft.photos.length > 0 ? (
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => setPhotoIndex((photoIndex + 1) % draft.photos.length)}
          className="deck-halo relative mx-auto block aspect-[3/4] w-full max-w-[19rem] text-left"
        >
          <CardFace
            listing={listing}
            photoIndex={photoIndex}
            sizes="304px"
            showMatch={false}
            priority
          />
        </button>
      ) : null}

      <dl className="surface divide-y divide-hairline rounded-2xl">
        {facts.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-6 px-4 py-3.5">
            <dt className="shrink-0 text-fg-2 text-sm">{label}</dt>
            <dd className="text-right text-sm">{value}</dd>
          </div>
        ))}
      </dl>

      <Field label="Your first name" htmlFor="lister-name">
        <input
          id="lister-name"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="given-name"
          onChange={(event) => onName(event.target.value)}
          placeholder="So tenants know who they are writing to"
          className={INPUT}
        />
      </Field>
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-fg placeholder:text-fg-3";

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

function Count({ used, of }: { used: number; of: number }) {
  return (
    <p className="mt-1 text-right text-fg-3 text-xs tabular-nums">
      {used} / {of}
    </p>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
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

function RuleButton({
  chosen,
  tone,
  onClick,
  children,
}: {
  chosen: boolean;
  tone: "yes" | "no";
  onClick: () => void;
  children: ReactNode;
}) {
  const lit =
    tone === "yes" ? "border-win/60 bg-win/10 text-win" : "border-pass/60 bg-pass/10 text-pass";
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        chosen ? lit : "border-hairline text-fg-3 hover:text-fg-2"
      }`}
    >
      {chosen && tone === "yes" ? <CheckIcon className="size-3" /> : null}
      {children}
    </button>
  );
}

/** A box for an amount in whole rupees. */
function Money({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (amount: number) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-fg-3">
          ₹
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value === 0 ? "" : grouped.format(value)}
          maxLength={9}
          placeholder="0"
          onChange={(event) => onChange(rupees(event.target.value))}
          className={`${INPUT} pl-9 font-mono tabular-nums`}
        />
      </div>
    </Field>
  );
}
