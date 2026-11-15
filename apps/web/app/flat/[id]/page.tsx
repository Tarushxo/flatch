import { getPublicListing } from "@repo/api";
import { getDb, hasDatabase } from "@repo/db";
import { SEED_FLATS } from "@repo/db/seed-data";
import { APP_NAME, formatRent, type Listing, monthlyCost, ROOM_TYPE_LABELS } from "@repo/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Ambient } from "@/components/ambient";
import { ListingDetail } from "@/components/listing/listing-detail";
import { SignLink } from "@/components/sign-link";
import { SiteHeader } from "@/components/site-header";
import { photoPreviewUrl } from "@/lib/photo";

/*
 * The public page for one flat: what you get when someone sends you its link.
 * Anyone can open it, signed in or not, so it shows only what any tenant may
 * see: no address, no building, and no personal match score.
 */

// Drawn fresh on every visit, so a flat that is taken down, runs out of time or is reported
// stops showing the moment that happens.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The flat, if it exists and is on the board. Asked for once per page, however often it is used. */
const loadFlat = cache(async (id: string): Promise<Listing | null> => {
  if (!hasDatabase()) return SEED_FLATS.find((flat) => flat.id === id) ?? null;
  if (!UUID.test(id)) return null;
  try {
    return await getPublicListing(getDb(), id);
  } catch (error) {
    // The visitor gets "not found", but the cause must not vanish with it.
    console.error(`Could not load flat ${id}`, error);
    return null;
  }
});

function summary(flat: Listing): string {
  return `${ROOM_TYPE_LABELS[flat.roomType]} in a ${flat.bhk}BHK in ${flat.locality}, ${flat.city}. ${formatRent(monthlyCost(flat))} all in.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const flat = await loadFlat((await params).id);
  if (!flat) return { title: "Flat not found" };

  const title = `${flat.title} · ${formatRent(flat.rent)}`;
  const cover = flat.photos[0];
  return {
    title,
    description: summary(flat),
    openGraph: {
      title: `${title} · ${APP_NAME}`,
      description: summary(flat),
      type: "article",
      images: cover ? [{ url: photoPreviewUrl(cover.url), width: 1200, height: 630 }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function FlatPage({ params }: { params: Promise<{ id: string }> }) {
  const flat = await loadFlat((await params).id);
  if (!flat) notFound();

  return (
    <div className="relative isolate min-h-dvh">
      <Ambient />
      <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-16 sm:px-8">
        <SiteHeader />

        <main className="mt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <p className="font-mono font-semibold text-4xl tabular-nums tracking-tight">
              {formatRent(flat.rent)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {flat.isSeed ? <Tag>Demo flat</Tag> : null}
              {flat.isVerified ? <Tag tone="like">Posted on site</Tag> : null}
            </div>
          </div>

          <ListingDetail listing={flat} showGallery forSharing />

          <div className="mt-12 flex flex-col items-center gap-4 border-hairline border-t pt-10 text-center">
            <p className="max-w-sm text-fg-2">
              Like the look of it? Open the deck to swipe on this flat and others like it.
            </p>
            <SignLink href="/discover">Start swiping</SignLink>
          </div>
        </main>
      </div>
    </div>
  );
}

function Tag({ children, tone = "plain" }: { children: string; tone?: "plain" | "like" }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-medium text-[0.6875rem] uppercase tracking-[0.12em] ${
        tone === "like" ? "border-like/40 text-like" : "border-hairline text-fg-2"
      }`}
    >
      {children}
    </span>
  );
}
