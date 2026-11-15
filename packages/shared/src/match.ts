import type { z } from "zod";
import type { AddressSchema, MatchSchema, MessageSchema, PendingLikeSchema } from "./schemas";

/*
 * Matches and chat: the types and the small pure helpers that work on them.
 * As in listing.ts, the types come from the schemas as types only.
 */

/** The longest a single chat message may be. */
export const MESSAGE_MAX_LENGTH = 1000;

export type Message = z.infer<typeof MessageSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type PendingLike = z.infer<typeof PendingLikeSchema>;

/** Unread messages across every match, for the badge on the Keys tab. */
export function totalUnread(matches: Pick<Match, "unreadCount">[]): number {
  return matches.reduce((sum, match) => sum + match.unreadCount, 0);
}

/**
 * Tidy what someone typed before it is sent: trim the ends and cut it to the
 * limit. Returns null when there is nothing left to send.
 */
export function cleanMessage(text: string): string | null {
  const trimmed = text.trim().slice(0, MESSAGE_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/** A web address that opens a place in a maps app. */
export function mapsLink(address: Address, locality: string): string {
  const place = `${address.society}, ${address.line}, ${locality}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
