import { createHash } from "node:crypto";

/**
 * A UUID worked out from a name, so the same seed record gets the same id on
 * every run and on every database. Re-seeding then updates rows in place, and
 * swipes that point at them survive.
 */
export function stableId(name: string): string {
  const hex = createHash("sha1").update(`flatch-seed:${name}`).digest("hex");
  // Shaped like a version 5 UUID.
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}
