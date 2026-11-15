/**
 * The letter shown in a round avatar when there is no photo. A title is
 * skipped, so "Mrs. Rao" gives "R".
 */
export function initial(name: string): string {
  return name
    .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/, "")
    .charAt(0)
    .toUpperCase();
}
