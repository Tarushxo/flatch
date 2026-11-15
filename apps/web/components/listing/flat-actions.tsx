"use client";

import {
  type Listing,
  REPORT_NOTE_MAX,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
} from "@repo/shared";
import { useState } from "react";
import { toast } from "sonner";
import { FlagIcon, ShareIcon } from "@/components/icons";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { useDeckStore } from "@/lib/deck/store";
import { useAccount } from "@/lib/profile/use-profile";
import { shareFlat } from "@/lib/share";

/** Share a flat, telling the person what happened. Used here and on "Your flats". */
export async function shareAndTell(flat: Pick<Listing, "id" | "title" | "rent" | "locality">) {
  const outcome = await shareFlat(flat);
  if (outcome === "copied") toast("Link copied");
  if (outcome === "failed") toast.error("Couldn't share or copy the link from this browser.");
}

/**
 * What a tenant can do about a flat besides swiping: send its link to someone,
 * or report it. Reporting is for flats real people posted, and for people who
 * are signed in; a demo flat has nothing to report.
 */
export function FlatActions({
  listing,
  onReported,
}: {
  listing: Listing;
  /** Runs after a report is sent, e.g. to close the sheet the flat was shown in. */
  onReported?: () => void;
}) {
  const account = useAccount();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const canReport = !listing.isSeed && account.data !== undefined && !account.data.isGuest;

  async function send() {
    if (!reason) return;
    setSending(true);
    try {
      await api.reportListing(listing.id, { reason, note: note.trim() || undefined });
      // A reported flat leaves the deck: nobody wants to keep seeing it.
      useDeckStore.getState().commit(listing.id, "pass");
      toast("Thanks. The flat is off your deck", {
        description: "If enough people report it, it comes off the board for everyone.",
      });
      setReporting(false);
      onReported?.();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That didn't send. Try again in a moment.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label="Share or report" className="border-hairline border-t pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void shareAndTell(listing)}
          className="flex items-center gap-2 rounded-full border border-like/40 px-4 py-2 font-medium text-like text-sm transition-colors hover:bg-like/10"
        >
          <ShareIcon className="size-4" />
          Share this flat
        </button>
        {canReport && !reporting ? (
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-fg-3 text-sm transition-colors hover:text-pass"
          >
            <FlagIcon className="size-4" />
            Report
          </button>
        ) : null}
      </div>

      {reporting ? (
        <form
          className="surface mt-4 space-y-4 rounded-2xl p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <p className="font-medium text-sm">What is wrong with this flat?</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={reason === option}
                onClick={() => setReason(option)}
                className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  reason === option
                    ? "border-pass bg-pass/15 text-fg"
                    : "border-hairline bg-surface-2 text-fg-2 hover:text-fg"
                }`}
              >
                {REPORT_REASON_LABELS[option]}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-2 block text-fg-2 text-sm">Anything to add? (optional)</span>
            <textarea
              value={note}
              maxLength={REPORT_NOTE_MAX}
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              className="w-full resize-none rounded-xl border border-hairline bg-surface-2 px-3.5 py-2.5 text-fg text-sm leading-relaxed placeholder:text-fg-3"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="rounded-full px-4 py-2 font-medium text-fg-2 text-sm hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reason === null || sending}
              className="rounded-full border border-pass/50 px-4 py-2 font-medium text-pass text-sm transition-colors hover:bg-pass/10 disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
