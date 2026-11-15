import { APP_NAME, formatRent, formatRupees } from "@repo/shared";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Ambient } from "@/components/ambient";
import { BookmarkIcon, CrossIcon, HeartIcon } from "@/components/icons";

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

      <Link href="/" className="font-medium text-like text-sm">
        ← Back
      </Link>
      <h1 className="mt-6 font-display font-semibold text-4xl tracking-tight">After Hours</h1>
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
          <Specimen label="Sign · Tilt Neon (logo, stamps and the match screen only)">
            <div className="flex flex-wrap gap-x-10 gap-y-4 py-2 text-4xl">
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
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-brand-a to-brand-b px-6 py-3 font-semibold text-sm text-white shadow-[0_8px_32px_-8px_var(--brand-b)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            Try the demo
          </button>
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
