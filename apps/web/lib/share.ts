import { APP_NAME, formatRent } from "@repo/shared";

/** The public address of one flat's page. */
export function flatLink(listingId: string, origin: string): string {
  return `${origin}/flat/${listingId}`;
}

/** What happened when a flat was shared, so the caller can say the right thing. */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Share a flat's link: through the phone's own share sheet where there is one
 * (WhatsApp, Messages and so on), otherwise by copying the link.
 */
export async function shareFlat(flat: {
  id: string;
  title: string;
  rent: number;
  locality: string;
}): Promise<ShareOutcome> {
  const url = flatLink(flat.id, window.location.origin);
  const text = `${flat.title} · ${formatRent(flat.rent)} · ${flat.locality}`;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `${flat.title} on ${APP_NAME}`, text, url });
      return "shared";
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
