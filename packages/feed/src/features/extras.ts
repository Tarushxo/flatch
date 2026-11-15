/*
 * Features that affect the order of the deck but never the match percentage
 * shown to people (SPEC 8.1: the percentage is fit only).
 */

/**
 * How well a tenant's chosen areas cover a flat's area. Null when the tenant
 * chose none, meaning anywhere in the city. Until commute times exist, a flat
 * outside the chosen areas simply scores low.
 */
export function locationFit(locality: string, chosen: readonly string[]): number | null {
  if (chosen.length === 0) return null;
  return chosen.includes(locality) ? 1 : 0.3;
}

/** How complete and trustworthy a listing looks, from 0 to 1. */
export function quality(flat: {
  photoCount: number;
  descriptionLength: number;
  isVerified: boolean;
}): number {
  const photos = Math.min(flat.photoCount, 6) / 6;
  const words = Math.min(flat.descriptionLength, 160) / 160;
  return 0.5 * photos + 0.25 * words + (flat.isVerified ? 0.25 : 0);
}

const HALF_LIFE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How new a listing is: 1 on the day it is published, halving every 14 days.
 * Counted in whole days, so a flat's place in the deck does not shift between
 * one page of the feed and the next.
 */
export function freshness(publishedAt: Date, today: Date): number {
  const days = Math.max(0, Math.floor((today.getTime() - publishedAt.getTime()) / DAY_MS));
  return 0.5 ** (days / HALF_LIFE_DAYS);
}
