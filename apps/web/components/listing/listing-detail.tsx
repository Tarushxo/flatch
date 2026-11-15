import { FURNISHING_LABELS, formatRupees, type Listing, ROOM_TYPE_LABELS } from "@repo/shared";
import type { ReactNode } from "react";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { AmenityPlaques } from "@/components/motifs/amenity-plaques";
import { GuestCheck } from "@/components/motifs/guest-check";
import { VacancySign } from "@/components/motifs/vacancy-sign";
import { CompatRing } from "./compat-ring";

/**
 * Everything about one flat, in the order a tenant asks about it: what it
 * costs, why it fits, what it comes with, the rules, and who lives there.
 * Used in the desktop side panel and the mobile bottom sheet.
 */
export function ListingDetail({ listing }: { listing: Listing }) {
  const { lister, compatibility } = listing;

  return (
    <article className="space-y-9">
      <header>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-balance font-display font-semibold text-2xl leading-tight tracking-tight">
            {listing.title}
          </h2>
          <VacancySign open={listing.isOpen} size="sm" />
        </div>
        <p className="mt-2 text-fg-2 text-sm">
          {listing.locality} · {ROOM_TYPE_LABELS[listing.roomType]} in a {listing.bhk}BHK ·{" "}
          {FURNISHING_LABELS[listing.furnishing]}
        </p>
        <p className="mt-4 text-fg-2 leading-relaxed">{listing.description}</p>
      </header>

      <Block title="What it costs">
        <GuestCheck
          number={listing.id.replace(/\D/g, "").padStart(4, "0")}
          lines={[
            { label: "Rent", amount: listing.rent },
            { label: "Maintenance", amount: listing.maintenance },
            { label: "Electricity + wifi", amount: listing.utilitiesEstimate },
          ].filter((line) => line.amount > 0)}
          upfront={{ label: "deposit, refundable", amount: listing.deposit }}
        />
      </Block>

      <Block title="Why this flat">
        <div className="flex items-center gap-5">
          <CompatRing percent={compatibility.percent} size="lg" />
          <ul className="space-y-2 text-sm">
            {compatibility.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-win" />
                {reason}
              </li>
            ))}
            {compatibility.caution ? (
              <li className="flex items-start gap-2 text-fg-2">
                <span
                  aria-hidden="true"
                  className="w-4 shrink-0 text-center font-semibold text-save"
                >
                  !
                </span>
                <span>
                  <span className="sr-only">Worth knowing: </span>
                  {compatibility.caution}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      </Block>

      <Block title="What it comes with">
        <AmenityPlaques items={listing.amenities} layout="row" />
      </Block>

      <Block title="House rules">
        <ul className="flex flex-wrap gap-2">
          {listing.houseRules.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                rule.allowed ? "border-like/30 text-fg" : "border-pass/30 text-fg-2"
              }`}
            >
              {rule.allowed ? (
                <CheckIcon className="size-4 text-like" />
              ) : (
                <CrossIcon className="size-4 text-pass" />
              )}
              <span className="sr-only">{rule.allowed ? "Allowed: " : "Not allowed: "}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Society rules">
        <BulletList items={listing.societyRules} />
      </Block>

      <Block title={`What ${lister.name} expects`}>
        <BulletList items={listing.expectations} />
      </Block>

      <Block title="Who you'd live with">
        <div className="surface flex items-start gap-4 rounded-2xl p-4">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-a to-brand-b font-display font-semibold text-lg text-white"
          >
            {lister.name.replace(/^(Mr|Mrs|Ms)\.?\s+/, "").charAt(0)}
          </span>
          <div>
            <p className="font-medium">
              {lister.name}
              <span className="ml-2 font-normal text-fg-3 text-sm">
                {lister.role === "owner" ? "Owner" : "Flatmate"}
              </span>
            </p>
            <p className="mt-1 text-fg-2 text-sm leading-relaxed">{lister.about}</p>
            <p className="mt-2 text-fg-3 text-xs">
              {lister.flatmateCount === 0
                ? "You would have the place to yourself"
                : `${lister.flatmateCount} ${lister.flatmateCount === 1 ? "person lives" : "people live"} here now`}
            </p>
          </div>
        </div>
      </Block>

      <p className="rounded-xl border border-hairline border-dashed px-4 py-3 text-fg-3 text-sm">
        Exact address shared after you match. Deposit is {formatRupees(listing.deposit)}; never pay
        anything before you have visited.
      </p>
    </article>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 font-medium text-fg-3 text-xs uppercase tracking-[0.18em]">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-fg-2 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-fg-3" />
          {item}
        </li>
      ))}
    </ul>
  );
}
