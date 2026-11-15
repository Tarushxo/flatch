import { FURNISHING_LABELS, formatRent, type Listing, ROOM_TYPE_LABELS } from "@repo/shared";
import { CompatRing } from "@/components/listing/compat-ring";

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function availableLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.getTime() <= Date.now() ? "Available now" : `From ${dayMonth.format(date)}`;
}

/**
 * What a flat looks like on a card: the photo, and the few facts a tenant
 * decides on. Purely visual; gestures and buttons live in DeckCard.
 */
export function CardFace({ listing, photoIndex }: { listing: Listing; photoIndex: number }) {
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
        <img
          key={photo.url}
          src={photo.url}
          alt={`${photo.roomTag} of ${listing.title}`}
          draggable={false}
          className="absolute inset-0 size-full object-cover"
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
          {listing.isVerified ? <Tag tone="like">Verified</Tag> : null}
          {listing.stretchLabel ? <Tag tone="save">{listing.stretchLabel}</Tag> : null}
        </div>
        <CompatRing percent={listing.compatibility.percent} />
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
              className="rounded-full border border-hairline bg-ink/55 px-2.5 py-1 text-fg text-xs backdrop-blur-md"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const TONES = {
  plain: "border-hairline text-fg-2",
  like: "border-like/40 text-like",
  save: "border-save/40 text-save",
} as const;

function Tag({ children, tone = "plain" }: { children: string; tone?: keyof typeof TONES }) {
  return (
    <span
      className={`rounded-full border bg-ink/60 px-2.5 py-1 font-medium text-[0.6875rem] uppercase tracking-[0.12em] backdrop-blur-md ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
