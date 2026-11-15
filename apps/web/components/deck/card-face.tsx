import { FURNISHING_LABELS, formatRent, type Listing, ROOM_TYPE_LABELS } from "@repo/shared";
import { memo } from "react";
import { CompatRing } from "@/components/listing/compat-ring";
import { FadeImage } from "@/components/listing/fade-image";
import { PHOTO_SIZES } from "@/lib/photo";

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function availableLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.getTime() <= Date.now() ? "Available now" : `From ${dayMonth.format(date)}`;
}

/**
 * What a flat looks like on a card: the photo, and the few facts a tenant
 * decides on. Purely visual; gestures and buttons live in DeckCard.
 *
 * Remembered between renders: after a swipe the deck re-renders, but a card
 * whose flat and photo have not changed is not drawn again.
 */
export const CardFace = memo(function CardFace({
  listing,
  photoIndex,
  sizes = PHOTO_SIZES.deckCard,
  priority = false,
  showMatch = true,
}: {
  listing: Listing;
  photoIndex: number;
  /** How wide the card is drawn, so the browser fetches the right photo size. */
  sizes?: string;
  /** True for the card on top of the deck: its photo is fetched first. */
  priority?: boolean;
  /** False for a lister previewing their own flat, where a match score means nothing. */
  showMatch?: boolean;
}) {
  const photo = listing.photos[photoIndex] ?? listing.photos[0];
  const place =
    listing.commuteMinutes === null
      ? listing.locality
      : `${listing.locality} · ${listing.commuteMinutes} min to work`;

  return (
    <div
      className="surface relative size-full overflow-hidden rounded-[2rem]"
      style={{ backgroundColor: photo?.dominantColor }}
    >
      {photo ? (
        <FadeImage
          key={photo.url}
          src={photo.url}
          alt={`${photo.roomTag} of ${listing.title}`}
          use="card"
          sizes={sizes}
          priority={priority}
        />
      ) : null}

      {/* Scrims so the text stays readable over any photo */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink via-ink/80 to-transparent" />

      {/* Photo index, stories style */}
      <div className="absolute inset-x-4 top-4 flex gap-1.5" aria-hidden="true">
        {listing.photos.map((item, position) => (
          <span
            key={item.url}
            className={`h-[3px] flex-1 rounded-full ${position === photoIndex ? "bg-fg" : "bg-fg/30"}`}
          />
        ))}
      </div>

      <div className="absolute inset-x-4 top-9 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {listing.isSeed ? <Tag>Demo</Tag> : null}
          {listing.isVerified ? <Tag tone="like">Posted on site</Tag> : null}
          {listing.stretchLabel ? <Tag tone="save">{listing.stretchLabel}</Tag> : null}
        </div>
        {showMatch ? <CompatRing percent={listing.compatibility.percent} /> : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <p className="font-mono font-semibold text-[1.75rem] text-fg leading-none tracking-tight tabular-nums">
          {formatRent(listing.rent)}
        </p>
        <p className="mt-2 line-clamp-1 font-medium text-fg">{listing.title}</p>
        <p className="mt-0.5 text-fg-2 text-sm">{place}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {[
            ROOM_TYPE_LABELS[listing.roomType],
            FURNISHING_LABELS[listing.furnishing],
            availableLabel(listing.availableFrom),
          ].map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-hairline bg-ink/75 px-2.5 py-1 text-fg text-xs"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

const TONES = {
  plain: "border-hairline text-fg-2",
  like: "border-like/40 text-like",
  save: "border-save/40 text-save",
} as const;

function Tag({ children, tone = "plain" }: { children: string; tone?: keyof typeof TONES }) {
  return (
    <span
      className={`rounded-full border bg-ink/75 px-2.5 py-1 font-medium text-[0.6875rem] uppercase tracking-[0.12em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
