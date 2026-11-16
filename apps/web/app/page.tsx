import { SEED_FLATS } from "@repo/db/seed-data";
import Link from "next/link";
import type { ReactNode } from "react";
import { Ambient } from "@/components/ambient";
import {
  ArrowRightIcon,
  CheckIcon,
  GithubIcon,
  HeartIcon,
  KeyIcon,
  SwipeIcon,
} from "@/components/icons";
import { RoadsideHero } from "@/components/landing/roadside-hero";
import { CompatRing } from "@/components/listing/compat-ring";
import { SignLink } from "@/components/sign-link";

// The six flats the landing page's self-swiping deck shows. Chosen here, on the server,
// so the browser is sent six flats and not the whole demo data set.
// Their hand-written "min to work" lines are left off, as they are in the app: there is no
// work address to measure from yet.
const SHOWCASE = SEED_FLATS.slice(0, 6).map((flat) => ({ ...flat, commuteMinutes: null }));

const STEPS = [
  {
    icon: SwipeIcon,
    title: "Swipe",
    body: "Flats that fit your budget, your areas and how you live, one card at a time. Right to like, left to pass, down for the details.",
  },
  {
    icon: HeartIcon,
    title: "Match",
    body: "The lister sees your profile. If they like you back, it is a match and you can chat.",
  },
  {
    icon: KeyIcon,
    title: "Move in",
    body: "Only then is the exact address shared. Visit, meet the flatmates, pick up the key.",
  },
];

export default function HomePage() {
  return (
    <div className="relative isolate overflow-x-clip">
      {/* Still: the hero has its own motion, and two drifting screen-sized layers under it
          are work a phone can do without. */}
      <Ambient still />

      <main>
        {/* Hero: a roadside at night. The sign on the left, the deck on a billboard on the
            right. The billboard is a moving picture of the product and one link into it. */}
        <RoadsideHero cards={SHOWCASE}>
          <h1 className="text-balance font-display font-semibold text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.02] tracking-tight">
            Swipe right on your next flat.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-pretty text-fg-2 text-lg leading-relaxed lg:mx-0">
            Flats on one side, flatmates on the other. Swipe through homes that fit, and match with
            the people who live there.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 lg:justify-start">
            <SignLink href="/discover">Start swiping</SignLink>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 font-medium text-like text-sm"
            >
              How it works
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </RoadsideHero>

        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <section id="how-it-works" className="scroll-mt-10 py-20">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 max-w-xl text-balance font-display font-semibold text-3xl tracking-tight sm:text-4xl">
              Three steps from the sign to the key.
            </h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: StepIcon, title, body }, position) => (
                <li key={title} className="surface rounded-3xl p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-sign text-4xl text-fg-3">{position + 1}</span>
                    <StepIcon className="size-7 text-like" />
                  </div>
                  <h3 className="mt-6 font-display font-semibold text-xl tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-2 text-fg-2 text-sm leading-relaxed">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid items-center gap-10 py-20 lg:grid-cols-2">
            <div>
              <Eyebrow>The feed</Eyebrow>
              <h2 className="mt-3 max-w-md text-balance font-display font-semibold text-3xl tracking-tight sm:text-4xl">
                Ranked for both sides, not just by price.
              </h2>
              <p className="mt-5 max-w-md text-fg-2 leading-relaxed">
                Every flat gets a score for how well you and the household would fit: budget, area,
                timing and how you each live. The card shows the score, and the details show the
                reasons.
              </p>
            </div>
            <div className="surface rounded-3xl p-7">
              <p className="text-fg-3 text-xs uppercase tracking-[0.18em]">Example</p>
              <div className="mt-5 flex items-center gap-6">
                <CompatRing percent={92} size="lg" />
                <ul className="space-y-2.5 text-sm">
                  {[
                    "₹2,500 under your budget",
                    "In an area you picked",
                    "Vegetarian household, like you",
                  ].map((reason) => (
                    <li key={reason} className="flex items-start gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-win" />
                      {reason}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-fg-2">
                    <span
                      aria-hidden="true"
                      className="w-4 shrink-0 text-center font-semibold text-save"
                    >
                      !
                    </span>
                    No overnight guests
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-hairline border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-fg-3 text-sm sm:px-8">
          <p>A portfolio project. Listings marked Demo are sample data.</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-fg">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-fg">
              Terms
            </Link>
            <Link href="/styleguide" className="transition-colors hover:text-fg">
              Design tokens
            </Link>
            <a
              href="https://github.com/Tarushxo/flatch"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
            >
              <GithubIcon className="size-4" />
              Source
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">{children}</p>;
}
