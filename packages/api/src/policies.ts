import { LISTING_LIMITS } from "@repo/shared";

/*
 * Who may do what. Every rule about one person touching a flat is answered
 * here, as a plain function, so the rules can be read and tested in one place.
 * A function returns null when the action is allowed, or the reason it is not.
 */

export type Actor = { userId: string; isGuest: boolean };

export type Refusal = {
  code:
    | "sign_in_required"
    | "not_yours"
    | "listing_limit"
    | "under_review"
    | "demo_flat"
    | "own_flat";
  /** Shown to the person, so it says what to do next. */
  message: string;
};

const SIGN_IN: Refusal = {
  code: "sign_in_required",
  message: "Sign in with Google to post a flat, so every listing has a real person behind it.",
};

const NOT_YOURS: Refusal = { code: "not_yours", message: "That flat is not yours to change." };

const LIMIT: Refusal = {
  code: "listing_limit",
  message: `You can have ${LISTING_LIMITS.openMax} flats open at once. Switch one off first.`,
};

const UNDER_REVIEW: Refusal = {
  code: "under_review",
  message:
    "This flat was taken off the board after several reports, and cannot be switched back on.",
};

/**
 * May this person post a flat? A guest may not, wherever signing in is on
 * offer: a listing has to be traceable to a real account. (A server with no
 * sign-in to offer lets guests post, or nobody could.) Nobody may have more
 * than the limit open at once.
 */
export function mayPostListing(
  actor: Actor,
  context: { signInOffered: boolean; openCount: number },
): Refusal | null {
  if (actor.isGuest && context.signInOffered) return SIGN_IN;
  if (context.openCount >= LISTING_LIMITS.openMax) return LIMIT;
  return null;
}

/**
 * May this person upload photos? The same people who may post: a guest may
 * not wherever signing in is on offer.
 */
export function mayUploadPhotos(actor: Actor, context: { signInOffered: boolean }): Refusal | null {
  return actor.isGuest && context.signInOffered ? SIGN_IN : null;
}

/** May this person change or take down this flat? Only its lister. */
export function mayManageListing(actor: Actor, listing: { listerId: string }): Refusal | null {
  return listing.listerId === actor.userId ? null : NOT_YOURS;
}

/**
 * May this person switch this flat's sign? Only its lister, and switching it
 * on must not take them over the limit. Switching off is always allowed.
 */
export function maySwitchListing(
  actor: Actor,
  listing: { listerId: string; isOpen: boolean; underReview?: boolean },
  change: { open: boolean; openCount: number },
): Refusal | null {
  const refused = mayManageListing(actor, listing);
  if (refused) return refused;
  // A flat that people reported stays off the board whatever its lister does.
  if (change.open && listing.underReview) return UNDER_REVIEW;
  const opening = change.open && !listing.isOpen;
  if (opening && change.openCount >= LISTING_LIMITS.openMax) return LIMIT;
  return null;
}

/**
 * May this person report this flat? Only someone signed in, wherever signing
 * in is on offer: a guest costs nothing to make, so guests' reports would let
 * one person take any flat down. Demo flats and one's own flat cannot be reported.
 */
export function mayReportListing(
  actor: Actor,
  listing: { listerId: string; isSeed: boolean },
  context: { signInOffered: boolean },
): Refusal | null {
  if (actor.isGuest && context.signInOffered) {
    return { code: "sign_in_required", message: "Sign in with Google to report a flat." };
  }
  if (listing.isSeed) {
    return { code: "demo_flat", message: "This is a demo flat, so there is nothing to report." };
  }
  if (listing.listerId === actor.userId) {
    return { code: "own_flat", message: "You cannot report your own flat. Take it down instead." };
  }
  return null;
}
