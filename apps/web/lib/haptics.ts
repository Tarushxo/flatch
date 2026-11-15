/**
 * A short vibration, on phones that support it. Browsers only allow this after
 * the person has touched the page, so it is skipped quietly until then (and on
 * iPhones, which do not support it at all).
 */
export function buzz(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(pattern);
}
