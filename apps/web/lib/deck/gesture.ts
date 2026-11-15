/*
 * The rules of the swipe gesture, as pure functions (docs/SPEC.md section 3.3).
 * Keeping the numbers and decisions here, away from React and the animation
 * library, means they can be unit-tested and tuned in one place.
 */

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type DeckAction = "like" | "pass" | "save";
/** Everything a drag can mean. "details" opens the flat's details; the card stays in the deck. */
export type DeckGesture = DeckAction | "details";

export const SWIPE = {
  /** Drag past this share of the card's width to like or pass. */
  distanceRatio: 0.35,
  /** Or flick faster than this, in pixels per second. */
  flickVelocity: 600,
  /** Drag up past this share of the card's height to save. */
  saveRatio: 0.3,
  /** Pull down past this share of the card's height to open the details. */
  detailsRatio: 0.15,
  /** Degrees of tilt when the card has been dragged one full width. */
  maxRotation: 12,
  /** How much of an upward / downward drag the card visibly follows. */
  upwardFollow: 0.85,
  downwardFollow: 0.5,
} as const;

/** What a released drag means: a gesture, or null to spring back. */
export function decideSwipe(offset: Point, velocity: Point, size: Size): DeckGesture | null {
  const mostlyVertical = Math.abs(offset.y) > Math.abs(offset.x);

  if (mostlyVertical) {
    if (offset.y < 0) {
      return -offset.y > size.height * SWIPE.saveRatio ? "save" : null;
    }
    // A pull down, or a quick downward flick, asks for the details.
    const pulledFarEnough = offset.y > size.height * SWIPE.detailsRatio;
    const flickedDown = velocity.y > SWIPE.flickVelocity && offset.y > 16;
    return pulledFarEnough || flickedDown ? "details" : null;
  }

  // A fast flick wins, in the direction it is moving, even after a short drag.
  if (Math.abs(velocity.x) > SWIPE.flickVelocity) {
    return velocity.x > 0 ? "like" : "pass";
  }
  if (Math.abs(offset.x) > size.width * SWIPE.distanceRatio) {
    return offset.x > 0 ? "like" : "pass";
  }
  return null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** How lit each stamp is, 0 to 1. At most one is non-zero. */
export function stampOpacity(offset: Point, size: Size): Record<DeckGesture, number> {
  const mostlyVertical = Math.abs(offset.y) > Math.abs(offset.x);
  if (mostlyVertical) {
    return {
      like: 0,
      pass: 0,
      save: offset.y < 0 ? clamp01(-offset.y / (size.height * SWIPE.saveRatio)) : 0,
      details: offset.y > 0 ? clamp01(offset.y / (size.height * SWIPE.detailsRatio)) : 0,
    };
  }
  const strength = clamp01(Math.abs(offset.x) / (size.width * SWIPE.distanceRatio));
  return {
    like: offset.x > 0 ? strength : 0,
    pass: offset.x < 0 ? strength : 0,
    save: 0,
    details: 0,
  };
}

/**
 * How close the drag is to sending the card away, 0 to 1. Drives the card
 * behind and the haptic tick. A pull down for details does not count: the
 * card is staying, so the one behind should not move.
 */
export function dragProgress(offset: Point, size: Size): number {
  const stamps = stampOpacity(offset, size);
  return Math.max(stamps.like, stamps.pass, stamps.save);
}

/**
 * Tilt in degrees for a horizontal drag. A card grabbed by its bottom half
 * pivots the other way, the way a physical card would.
 */
export function rotationFor(x: number, width: number, grabbedBottomHalf: boolean): number {
  if (width <= 0) return 0;
  const degrees = (x / width) * SWIPE.maxRotation;
  return grabbedBottomHalf ? -degrees : degrees;
}

/** How far the card visibly moves for a vertical drag. It resists a pull down, because it is not leaving. */
export function followY(y: number): number {
  return y < 0 ? y * SWIPE.upwardFollow : y * SWIPE.downwardFollow;
}

/**
 * Where a committed card flies to and how long it takes. It leaves along the
 * direction it was already travelling, between 250 and 350 ms.
 */
export function flyOutTarget(
  action: DeckAction,
  offset: Point,
  velocity: Point,
  viewport: Size,
): Point & { duration: number } {
  const speed = Math.hypot(velocity.x, velocity.y);
  const duration = speed > 1500 ? 0.25 : speed > SWIPE.flickVelocity ? 0.3 : 0.35;

  if (action === "save") {
    return { x: offset.x, y: -viewport.height * 1.3, duration };
  }

  const direction = action === "like" ? 1 : -1;
  const x = direction * viewport.width * 1.4;
  // Keep the card's current slope so it continues in a straight line.
  const slope = Math.abs(offset.x) > 24 ? offset.y / Math.abs(offset.x) : 0;
  const y = Math.max(-viewport.height, Math.min(viewport.height, slope * Math.abs(x)));
  return { x, y, duration };
}
