import { APP_NAME, formatRent, formatRupees } from "@repo/shared";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Ambient } from "@/components/ambient";
import { BookmarkIcon, CrossIcon, HeartIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { AmenityPlaques } from "@/components/motifs/amenity-plaques";
import { GuestCheck } from "@/components/motifs/guest-check";
import { KeyTag } from "@/components/motifs/key-tag";
import { CoffeeCupDrawing } from "@/components/motifs/neon-drawing";
import { SignLink } from "@/components/sign-link";
import { SiteHeader } from "@/components/site-header";
import { BulbsDemo, TabBarDemo, VacancyDemo } from "./motif-demos";

export const metadata: Metadata = { title: "Style guide" };

const NEUTRALS = [
  { name: "bg", value: "#07070C", use: "App background" },
  { name: "surface-1", value: "#0F0F17", use: "Cards, sheets" },
  { name: "surface-2", value: "#171722", use: "Raised controls" },
];

const ACCENTS = [
  { name: "brand-a", value: "#8B5CFF", use: "Brand gradient start" },
  { name: "brand-b", value: "#FF3DA6", use: "Brand gradient end" },
  { name: "like", value: "#22E6FF", use: "Like, active, links" },
  { name: "pass", value: "#FF4D5E", use: "Pass, destructive" },
  { name: "save", value: "#FFC53D", use: "Save, superlike" },
  { name: "win", value: "#C8FF3D", use: "Match, good price" },
];

const ACTIONS = [
  { label: "Pass", token: "--pass", icon: CrossIcon },
  { label: "Save", token: "--save", icon: BookmarkIcon },
  { label: "Like", token: "--like", icon: HeartIcon },
];

export default function StyleguidePage() {
  return (
    <main className="relative isolate mx-auto w-full max-w-4xl px-5 pt-10 pb-24 sm:px-8">
      <Ambient />

      <SiteHeader />
      <h1 className="mt-12 font-display font-semibold text-4xl tracking-tight">After Hours</h1>
      <p className="mt-3 max-w-xl text-fg-2 leading-relaxed">
        The {APP_NAME} design tokens. Neon is light, not paint: most of the interface is quiet dark
        neutrals, and glow appears only where there is energy.
      </p>

      <Section title="Surfaces">
        <div className="grid gap-3 sm:grid-cols-3">
          {NEUTRALS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
      </Section>

      <Section title="Light">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACCENTS.map((c) => (
            <Swatch key={c.name} {...c} glow />
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="surface space-y-6 rounded-2xl p-6">
          <Specimen label="Display · Bricolage Grotesque">
            <p className="font-display font-semibold text-4xl tracking-tight">
              A room with a view of the metro
            </p>
          </Specimen>
          <Specimen label="Body · Geist">
            <p className="max-w-prose text-fg-2 leading-relaxed">
              Two flatmates, both working hybrid. Quiet on weeknights, friends over on Saturdays.
              Looking for someone tidy who is fine with a cat.
            </p>
          </Specimen>
          <Specimen label="Numbers · Geist Mono, tabular">
            <p className="font-mono font-semibold text-3xl tabular-nums tracking-tight">
              {formatRent(18500)}
              <span className="ml-4 font-normal text-base text-fg-3">
                Deposit {formatRupees(120000, { compact: true })}
              </span>
            </p>
          </Specimen>
          <Specimen label="Logo · Yellowtail, always through the Logo component so it flickers the same everywhere">
            <div className="py-2">
              <Logo size="lg" />
            </div>
          </Specimen>
          <Specimen label="Sign · Tilt Neon (swipe stamps and the match screen only)">
            <div className="flex flex-wrap gap-x-10 gap-y-4 py-2 font-sign text-4xl">
              <span className="sign [--glow:var(--like)]">MOVE IN</span>
              <span className="sign [--glow:var(--pass)]">PASS</span>
              <span className="sign [--glow:var(--save)]">MAYBE</span>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section title="Glow on interaction">
        <p className="mb-5 max-w-xl text-fg-2 text-sm">
          Controls sit quiet until they are hovered, focused or pressed. Try the mouse and the Tab
          key.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          {ACTIONS.map(({ label, token, icon: IconComponent }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              className="hover:glow focus-visible:glow grid size-16 place-items-center rounded-full border border-hairline bg-surface-1 transition-[box-shadow,transform] duration-200 hover:border-transparent active:scale-95"
              style={{ color: `var(${token})`, ["--glow" as string]: `var(${token})` }}
            >
              <IconComponent className="size-6" />
            </button>
          ))}
          <SignLink href="/discover">Start swiping</SignLink>
        </div>
      </Section>

      <Section title="Chips">
        <ul className="flex flex-wrap gap-2">
          {["Private room", "Furnished", "Veg household", "Cat friendly", "Night owls"].map(
            (chip) => (
              <li
                key={chip}
                className="rounded-full border border-hairline bg-fg/[0.06] px-3 py-1.5 text-sm"
              >
                {chip}
              </li>
            ),
          )}
          <li className="rounded-full border border-win/40 bg-win/10 px-3 py-1.5 text-sm text-win">
            {formatRupees(2500)} below area average
          </li>
        </ul>
      </Section>

      <Section title="Roadside motifs">
        <p className="mb-6 max-w-xl text-fg-2 text-sm">
          Samples of the motel and diner theme. Each one has a job in the app; none is decoration
          only. Try the buttons.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Motif
            name="VACANCY sign"
            where="Listing status. A lister opens a listing by switching the sign on."
          >
            <VacancyDemo />
          </Motif>
          <Motif
            name="Marquee bulbs"
            where="Onboarding progress and loaders. One bulb lights per finished step."
          >
            <BulbsDemo />
          </Motif>
          <Motif
            name="Lit and unlit tubes"
            where="The tab bar and toggles. The active tab lights up like the logo."
          >
            <TabBarDemo />
          </Motif>
          <Motif name="Amenity plaques" where="Listing details: what the flat comes with.">
            <AmenityPlaques
              items={["Wifi", "Air conditioned", "Parking", "Lift", "Power backup"]}
            />
          </Motif>
          <Motif name="Guest check" where="What a flat really costs each month.">
            <GuestCheck
              number="0427"
              lines={[
                { label: "Rent", amount: 18500 },
                { label: "Maintenance", amount: 2000 },
                { label: "Electricity + wifi", amount: 1400 },
              ]}
              upfront={{ label: "deposit, refundable", amount: 55500 }}
            />
          </Motif>
          <Motif name="Room key" where="What you are handed when you match.">
            <KeyTag locality="HSR Layout" detail="Private room · 2BHK" />
          </Motif>
          <div className="md:col-span-2">
            <Motif name="Neon line drawing" where="Empty and error screens.">
              <div className="flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:gap-8 sm:text-left">
                <CoffeeCupDrawing className="size-28 shrink-0 [--glow:var(--save)]" />
                <div>
                  <p className="font-display font-semibold text-2xl tracking-tight">
                    Kitchen's closed
                  </p>
                  <p className="mt-2 max-w-sm text-fg-2 text-sm leading-relaxed">
                    You have seen every flat that fits. Widen your budget or your area to see more.
                  </p>
                </div>
              </div>
            </Motif>
          </div>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="mb-5 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">{title}</h2>
      {children}
    </section>
  );
}

function Motif({ name, where, children }: { name: string; where: string; children: ReactNode }) {
  return (
    <div className="surface flex h-full min-w-0 flex-col rounded-2xl p-6">
      <p className="font-medium">{name}</p>
      <p className="mt-1 text-fg-2 text-sm">{where}</p>
      <div className="mt-6 flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-fg-3 text-xs">{label}</p>
      {children}
    </div>
  );
}

function Swatch({
  name,
  value,
  use,
  glow = false,
}: {
  name: string;
  value: string;
  use: string;
  glow?: boolean;
}) {
  return (
    <div className="surface rounded-2xl p-3">
      <div
        className={`h-16 rounded-xl border border-hairline ${glow ? "glow" : ""}`}
        style={{ backgroundColor: value, ["--glow" as string]: value }}
      />
      <p className="mt-3 font-mono text-sm">--{name}</p>
      <p className="font-mono text-fg-3 text-xs">{value}</p>
      <p className="mt-1 text-fg-2 text-xs">{use}</p>
    </div>
  );
}
