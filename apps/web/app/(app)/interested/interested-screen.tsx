"use client";

import {
  type Applicant,
  LIFESTYLE,
  LIFESTYLE_KEYS,
  LIFESTYLE_WORDING,
  type LifestyleKey,
  type MyListing,
  tenantLine,
} from "@repo/shared";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { CheckIcon, CrossIcon, InfoIcon, KeyIcon } from "@/components/icons";
import { CompatRing } from "@/components/listing/compat-ring";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { BellDrawing } from "@/components/motifs/neon-drawing";
import { SignLink } from "@/components/sign-link";
import { buzz } from "@/lib/haptics";
import { useApplicants, useDecideApplicant, useMyListings } from "@/lib/lister/use-lister";
import { initial } from "@/lib/names";

type Decision = "accept" | "decline";

/** How far, or how fast, a card must be dragged before it counts as an answer. */
const DRAG = { distance: 110, velocity: 600 } as const;

/** How each lifestyle answer is labelled when it describes someone else. */
const ABOUT_THEM: Record<LifestyleKey, string> = {
  food: "Eats",
  smoking: "Smokes",
  drinking: "Drinks",
  pets: "Pets",
  sleep: "Sleeps",
  cleanliness: "Tidiness",
  guests: "Friends over",
  workMode: "Works",
};

/**
 * The lister's Interested tab: the front desk. Tenants who liked a flat wait
 * here one at a time, and the lister hands over a key or turns them away.
 * Drag the card, use the buttons, or press the arrow keys.
 */
export function InterestedScreen() {
  const router = useRouter();
  const listings = useMyListings();
  const applicants = useApplicants();
  const decide = useDecideApplicant();
  // Which way the card on top should leave. Read by its exit animation.
  const leaving = useRef<Decision>("accept");

  const waiting = applicants.data ?? [];
  const current = waiting[0];

  function answer(applicant: Applicant, decision: Decision) {
    leaving.current = decision;
    buzz(decision === "accept" ? [12, 40, 12] : 8);
    decide.mutate(
      { applicant, decision },
      {
        onSuccess: ({ matchId }) => {
          if (!matchId) return;
          toast(`${applicant.name} has a key`, {
            description: "You can chat now, and they can see the address.",
            action: { label: "Say hi", onClick: () => router.push(`/keys/${matchId}`) },
          });
        },
        onError: () => toast.error("That didn't go through. Try again in a moment."),
      },
    );
  }

  // Arrow keys answer the tenant on top, unless a form field or a dialog has the keyboard.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-bound when the top card changes
  useEffect(() => {
    if (!current) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || !current) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, [role=dialog]")) return;
      if (event.key === "ArrowRight") answer(current, "accept");
      else if (event.key === "ArrowLeft") answer(current, "decline");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current?.id]);

  if (listings.isPending || applicants.isPending) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-4">
          <MarqueeBulbs total={8} chase />
          <p className="text-fg-2 text-sm">Checking the front desk…</p>
        </div>
      </div>
    );
  }

  // With something already on screen, a failed refresh is ignored: the next one will do.
  if ((listings.isError && !listings.data) || (applicants.isError && !applicants.data)) {
    return (
      <ScreenMessage
        art={<BellDrawing className="[--glow:var(--pass)]" />}
        title="Couldn't reach the front desk"
        body="The waiting list could not be loaded. Check your connection and try again."
      >
        <button
          type="button"
          onClick={() => {
            void listings.refetch();
            void applicants.refetch();
          }}
          className="rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
        >
          Try again
        </button>
      </ScreenMessage>
    );
  }

  if (!current) return <NobodyWaiting listings={listings.data} />;

  const flat = listings.data.find((listing) => listing.id === current.listingId);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-4 pt-3 pb-3 lg:py-8">
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <h1 className="font-display font-semibold text-2xl tracking-tight">Interested</h1>
        <p className="text-fg-2 text-sm" aria-live="polite">
          <span className="font-mono font-semibold text-fg tabular-nums">{waiting.length}</span>{" "}
          waiting
        </p>
      </div>

      <div className="relative mt-3 min-h-0 flex-1">
        <AnimatePresence initial={false} custom={leaving}>
          <ApplicantCard
            key={current.id}
            applicant={current}
            flatTitle={flat?.title}
            leaving={leaving}
            onAnswer={(decision) => answer(current, decision)}
          />
        </AnimatePresence>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-center gap-8">
        <button
          type="button"
          onClick={() => answer(current, "decline")}
          aria-label={`Turn ${current.name} away`}
          aria-keyshortcuts="ArrowLeft"
          className="grid size-16 place-items-center rounded-full border border-pass/50 bg-surface-1 text-pass transition-transform hover:bg-pass/10 active:scale-90"
        >
          <CrossIcon className="size-7" />
        </button>
        <button
          type="button"
          onClick={() => answer(current, "accept")}
          aria-label={`Give ${current.name} a key`}
          aria-keyshortcuts="ArrowRight"
          className="grid size-20 place-items-center rounded-full border border-win/60 bg-surface-1 text-win shadow-[0_0_26px_-6px_var(--win)] transition-transform hover:bg-win/10 active:scale-90"
        >
          <KeyIcon className="size-9" />
        </button>
      </div>
      <p className="mt-2 hidden shrink-0 text-center text-fg-3 text-xs lg:block">
        ← turn away · → give a key
      </p>
    </div>
  );
}

function ApplicantCard({
  applicant,
  flatTitle,
  leaving,
  onAnswer,
}: {
  applicant: Applicant;
  flatTitle: string | undefined;
  leaving: { current: Decision };
  onAnswer: (decision: Decision) => void;
}) {
  const still = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-9, 9]);
  const yes = useTransform(x, [20, 110], [0, 1]);
  const no = useTransform(x, [-110, -20], [1, 0]);
  const { compatibility, lifestyle } = applicant;

  function onDragEnd(_event: unknown, info: PanInfo) {
    const far = Math.abs(info.offset.x) > DRAG.distance;
    const fast = Math.abs(info.velocity.x) > DRAG.velocity;
    if (far || fast) onAnswer(info.offset.x > 0 ? "accept" : "decline");
  }

  const answers = LIFESTYLE_KEYS.flatMap((key) => {
    const value = lifestyle[key];
    if (value === undefined) return [];
    const position = (LIFESTYLE[key] as readonly string[]).indexOf(value);
    return [{ key, label: ABOUT_THEM[key], value: LIFESTYLE_WORDING[key].answers[position] ?? "" }];
  });

  return (
    <motion.article
      aria-label={
        compatibility.percent > 0
          ? `${applicant.name}, ${compatibility.percent} percent match`
          : applicant.name
      }
      className="surface absolute inset-0 flex touch-pan-y flex-col overflow-hidden rounded-[2rem]"
      style={{ x, rotate: still ? 0 : rotate }}
      drag={still ? false : "x"}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      // `custom` is the ref the screen sets just before the card is removed.
      custom={leaving}
      variants={{
        gone: (way: { current: Decision }) => ({
          x: still ? 0 : way.current === "accept" ? 420 : -420,
          opacity: 0,
          transition: { duration: 0.22 },
        }),
      }}
      exit="gone"
    >
      {/* Stamps that fade in as the card is dragged */}
      <motion.span
        aria-hidden="true"
        style={{ opacity: yes }}
        className="-rotate-6 absolute top-5 left-5 z-10 rounded-lg border-2 border-win px-2.5 py-1 font-sign text-lg text-win tracking-[0.18em]"
      >
        KEY
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: no }}
        className="absolute top-5 right-5 z-10 rotate-6 rounded-lg border-2 border-pass px-2.5 py-1 font-sign text-lg text-pass tracking-[0.18em]"
      >
        NO
      </motion.span>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-a to-brand-b font-display font-semibold text-2xl text-white"
          >
            {initial(applicant.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display font-semibold text-2xl tracking-tight">
              {applicant.name}
            </h2>
            <p className="text-fg-2 text-sm">{tenantLine(applicant)}</p>
          </div>
          {/* A tenant who has said nothing about what they want has no score, and no ring. */}
          {compatibility.percent > 0 ? (
            <CompatRing percent={compatibility.percent} size="lg" />
          ) : null}
        </div>

        <p className="mt-4 flex items-center gap-2 text-fg-3 text-xs">
          {applicant.isSeed ? (
            <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 font-medium text-[0.625rem] text-fg-2 uppercase tracking-[0.12em]">
              Demo
            </span>
          ) : null}
          {flatTitle ? (
            <span className="truncate">
              Liked <span className="text-fg-2">{flatTitle}</span>
            </span>
          ) : null}
        </p>

        {applicant.note ? (
          <blockquote className="bubble-mine mt-4 rounded-3xl rounded-bl-lg px-4 py-3 text-[0.9375rem] leading-relaxed">
            {applicant.note}
          </blockquote>
        ) : null}

        <p className="mt-4 text-fg leading-relaxed">{applicant.about}</p>

        <ul className="mt-5 space-y-2 text-sm">
          {compatibility.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2.5">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-win" />
              {reason}
            </li>
          ))}
          {compatibility.caution ? (
            <li className="flex items-start gap-2.5 text-save">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              {compatibility.caution}
            </li>
          ) : null}
        </ul>

        {answers.length > 0 ? (
          <dl className="mt-5 grid grid-cols-2 gap-2">
            {answers.map((item) => (
              <div key={item.key} className="rounded-xl border border-hairline px-3 py-2">
                <dt className="text-[0.6875rem] text-fg-3 uppercase tracking-[0.12em]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </motion.article>
  );
}

function NobodyWaiting({ listings }: { listings: MyListing[] }) {
  if (listings.length === 0) {
    return (
      <ScreenMessage
        art={<BellDrawing className="[--glow:var(--like)]" />}
        title="Nobody at the desk yet"
        body="Post a flat first. Tenants who like it line up here, and you decide who gets a key."
      >
        <SignLink href="/listings/new" size="sm">
          Post a flat
        </SignLink>
      </ScreenMessage>
    );
  }

  const anyOpen = listings.some((listing) => listing.isOpen);
  return (
    <ScreenMessage
      art={<BellDrawing className="[--glow:var(--win)]" />}
      title={anyOpen ? "The desk is quiet" : "Your signs are off"}
      body={
        anyOpen
          ? "No one is waiting right now. In this demo a couple of demo tenants turn up in the first minute or so after you post."
          : "A flat with its sign off takes no new likes. Switch one on to hear from tenants again."
      }
    >
      <SignLink href="/listings" size="sm">
        Your flats
      </SignLink>
    </ScreenMessage>
  );
}
