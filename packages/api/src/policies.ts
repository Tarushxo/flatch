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
    | "own_flat"
    | "guests_demo_only"
    | "not_in_chat";
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

/**
 * May this person like this flat? Not their own. And a guest may only like
 * demo flats: a guest costs nothing to make, so a real lister should never
 * hear from one.
 */
export function mayLikeListing(
  actor: Actor,
  listing: { listerId: string; isSeed: boolean },
): Refusal | null {
  if (listing.listerId === actor.userId) {
    return { code: "own_flat", message: "You cannot like your own flat." };
  }
  if (actor.isGuest && !listing.isSeed) {
    return { code: "guests_demo_only", message: "Sign in with Google to like this flat." };
  }
  return null;
}

/** May this person say yes or no to a tenant who liked this flat? Only the flat's lister. */
export function mayDecideInterest(actor: Actor, listing: { listerId: string }): Refusal | null {
  return mayManageListing(actor, listing);
}

/** The two people in a match, and whether it has been ended. */
export type Chat = { tenantId: string; listerId: string; endedAt: Date | null };

/**
 * May this person read or write in this chat, and see what it unlocks (the
 * address)? Only the tenant and the lister in it, and only until either of
 * them ends it. Nobody else, ever.
 */
export function mayUseChat(actor: Actor, chat: Chat): Refusal | null {
  const inIt = chat.tenantId === actor.userId || chat.listerId === actor.userId;
  if (!inIt || chat.endedAt !== null) {
    return { code: "not_in_chat", message: "This match is no longer open." };
  }
  return null;
}
