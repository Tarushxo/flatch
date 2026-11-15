import {
  type Applicant,
  ARRIVALS_MS,
  botTenantsFor,
  draftAsListing,
  type Match,
  type MyListing,
  type TenantProfile,
  tenantOpener,
  tenantReply,
} from "@repo/shared";
import type { StoredListing } from "./lister-store";
import { type StoredMessage, unreadCount, visibleMessages } from "./matchmaker";

/*
 * The bot tenants. When someone posts a flat in the mock, a handful of these
 * "like" it over the next minute, so the lister has people to accept or
 * decline, and each one chats back once accepted.
 *
 * As in matchmaker.ts, everything here is a plain function of its inputs (the
 * clock is passed in), so it can be tested without waiting. From M2 real
 * tenants take their place, and seed tenants follow the same rules on the server.
 */

/** A bot tenant's like, with the moment it reaches the lister. */
export type Arrival = { applicant: Applicant; arrivesAt: number };

/**
 * The tenants who will like a flat, in the order they arrive. Each flat gets
 * five of the eight, starting from a different one, so two flats do not see
 * the same queue. `opensAt` is when the flat started taking likes.
 */
export function arrivalsFor(listing: Pick<MyListing, "id">, opensAt: number): Arrival[] {
  return botTenantsFor(listing.id).map(({ bot, index, waitMs }) => {
    const arrivesAt = opensAt + waitMs;
    return {
      arrivesAt,
      applicant: {
        ...bot,
        id: `${listing.id}-t${index}`,
        listingId: listing.id,
        likedAt: new Date(arrivesAt).toISOString(),
      },
    };
  });
}

/** What a tenant says first once the lister has accepted them. */
export function applicantOpener(applicant: Applicant, listing: Pick<MyListing, "title">): string {
  return tenantOpener(applicant.name, listing.title);
}

export { ARRIVALS_MS, tenantReply as applicantReplyFor };

/** The tenants whose likes have reached the lister by now. A closed flat takes no new likes. */
export function arrivedBy(listing: StoredListing, now: number): Applicant[] {
  const until = listing.closedAt ?? now;
  return arrivalsFor(listing, listing.opensAt)
    .filter((arrival) => arrival.arrivesAt <= until)
    .map((arrival) => arrival.applicant);
}

/** The tenants still waiting for a yes or a no, in the order they arrived. */
export function waitingFor(listing: StoredListing, now: number): Applicant[] {
  return arrivedBy(listing, now).filter((applicant) => !listing.decisions[applicant.id]);
}

/** A tenant the lister said yes to, with the moment they said it. */
export type Accepted = { applicant: Applicant; acceptedAt: number };

export function acceptedFor(listing: StoredListing, now: number): Accepted[] {
  return arrivedBy(listing, now).flatMap((applicant) => {
    const decided = listing.decisions[applicant.id];
    return decided?.decision === "accept" ? [{ applicant, acceptedAt: decided.at }] : [];
  });
}

/** The id of the match between a lister and a tenant they accepted. */
export function listerMatchId(applicantId: string): string {
  return `match-${applicantId}`;
}

/** A flat as the lister's list shows it: the form's answers plus how it is doing. */
export function toMyListing(listing: StoredListing, now: number): MyListing {
  const { opensAt: _opensAt, closedAt: _closedAt, decisions: _decisions, ...rest } = listing;
  return {
    ...rest,
    isVerified: rest.isVerified ?? false,
    expiresAt: rest.expiresAt ?? null,
    underReview: rest.underReview ?? false,
    interestedCount: waitingFor(listing, now).length,
    matchCount: acceptedFor(listing, now).length,
  };
}

/** A match as the lister sees it: the other person is the tenant. */
export function toListerMatch(
  listing: StoredListing,
  { applicant, acceptedAt }: Accepted,
  lister: Pick<TenantProfile, "name" | "about">,
  thread: StoredMessage[],
  lastReadAt: number,
  now: number,
): Match {
  const messages = visibleMessages(thread, now);
  return {
    id: listerMatchId(applicant.id),
    side: "lister",
    person: { name: applicant.name, about: applicant.about },
    applicant,
    listing: draftAsListing(listing, lister, listing.id),
    address: { society: listing.society, line: listing.addressLine },
    matchedAt: new Date(acceptedAt).toISOString(),
    lastMessage: messages[messages.length - 1] ?? null,
    unreadCount: unreadCount(thread, lastReadAt, now),
  };
}
