"use client";

import type { Listing } from "@repo/shared";
import { Drawer } from "vaul";
import { ListingDetail } from "./listing-detail";

/**
 * The flat's details as a bottom sheet, for phones. Drag it down or tap
 * outside to close. As it rises, the screen behind steps back and dims, so
 * the deck and its details read as two layers of one place.
 */
export function DetailSheet({
  listing,
  onClose,
}: {
  listing: Listing | null;
  onClose: () => void;
}) {
  return (
    <Drawer.Root
      open={listing !== null}
      onOpenChange={(open) => !open && onClose()}
      shouldScaleBackground
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/75" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[2rem] border border-hairline border-b-0 bg-surface-1 outline-none"
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-fg/25"
          />
          <Drawer.Title className="sr-only">{listing?.title ?? "Flat details"}</Drawer.Title>
          <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {listing ? <ListingDetail listing={listing} showGallery /> : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
