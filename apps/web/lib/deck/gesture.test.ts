import { describe, expect, it } from "vitest";
import {
  decideSwipe,
  dragProgress,
  flyOutTarget,
  followY,
  rotationFor,
  stampOpacity,
} from "./gesture";

const card = { width: 400, height: 600 };
const still = { x: 0, y: 0 };
const viewport = { width: 400, height: 800 };

describe("decideSwipe", () => {
  it("springs back from a small drag", () => {
    expect(decideSwipe({ x: 100, y: 10 }, still, card)).toBeNull();
    expect(decideSwipe({ x: -139, y: 0 }, still, card)).toBeNull();
  });

  it("likes or passes past 35% of the card's width", () => {
    expect(decideSwipe({ x: 141, y: 0 }, still, card)).toBe("like");
    expect(decideSwipe({ x: -141, y: 20 }, still, card)).toBe("pass");
  });

  it("commits on a fast flick even after a short drag", () => {
    expect(decideSwipe({ x: 30, y: 0 }, { x: 700, y: 0 }, card)).toBe("like");
    expect(decideSwipe({ x: -30, y: 0 }, { x: -700, y: 0 }, card)).toBe("pass");
  });

  it("follows the flick's direction when the user reverses at the last moment", () => {
    expect(decideSwipe({ x: 160, y: 0 }, { x: -900, y: 0 }, card)).toBe("pass");
  });

  it("ignores a slow drag that does not reach the threshold", () => {
    expect(decideSwipe({ x: 120, y: 0 }, { x: 599, y: 0 }, card)).toBeNull();
  });

  it("saves on a mostly-vertical drag up past 30% of the height", () => {
    expect(decideSwipe({ x: 20, y: -181 }, still, card)).toBe("save");
    expect(decideSwipe({ x: 20, y: -179 }, still, card)).toBeNull();
  });

  it("opens the details on a pull down past 15% of the height", () => {
    expect(decideSwipe({ x: 0, y: 91 }, still, card)).toBe("details");
    expect(decideSwipe({ x: 10, y: 400 }, still, card)).toBe("details");
  });

  it("springs back from a short pull down", () => {
    expect(decideSwipe({ x: 0, y: 89 }, still, card)).toBeNull();
  });

  it("opens the details on a quick downward flick", () => {
    expect(decideSwipe({ x: 0, y: 30 }, { x: 0, y: 700 }, card)).toBe("details");
    expect(decideSwipe({ x: 0, y: 10 }, { x: 0, y: 700 }, card)).toBeNull();
  });

  it("does not treat a mostly-sideways drag that drifts down as details", () => {
    expect(decideSwipe({ x: 120, y: 100 }, still, card)).toBeNull();
  });

  it("treats a diagonal drag by its larger direction", () => {
    expect(decideSwipe({ x: 200, y: -190 }, still, card)).toBe("like");
    expect(decideSwipe({ x: 180, y: -200 }, still, card)).toBe("save");
  });
});

describe("stampOpacity and dragProgress", () => {
  it("lights one stamp at a time, in proportion to the drag", () => {
    const none = { like: 0, pass: 0, save: 0, details: 0 };
    expect(stampOpacity({ x: 70, y: 0 }, card)).toEqual({ ...none, like: 0.5 });
    expect(stampOpacity({ x: -70, y: 0 }, card)).toEqual({ ...none, pass: 0.5 });
    expect(stampOpacity({ x: 0, y: -90 }, card)).toEqual({ ...none, save: 0.5 });
    expect(stampOpacity({ x: 0, y: 45 }, card)).toEqual({ ...none, details: 0.5 });
  });

  it("is fully lit exactly where a release would commit", () => {
    expect(dragProgress({ x: 140, y: 0 }, card)).toBe(1);
    expect(dragProgress({ x: 500, y: 0 }, card)).toBe(1);
    expect(dragProgress({ x: 0, y: -180 }, card)).toBe(1);
  });

  it("does not move the card behind for a pull down, because the top card is staying", () => {
    expect(dragProgress({ x: 0, y: 300 }, card)).toBe(0);
    expect(dragProgress(still, card)).toBe(0);
  });
});

describe("rotationFor", () => {
  it("tilts 12 degrees per card width, towards the drag", () => {
    expect(rotationFor(400, 400, false)).toBe(12);
    expect(rotationFor(-200, 400, false)).toBe(-6);
  });

  it("pivots the other way when grabbed by the bottom half", () => {
    expect(rotationFor(200, 400, true)).toBe(-6);
  });

  it("is safe before the card has been measured", () => {
    expect(rotationFor(100, 0, false)).toBe(0);
  });
});

describe("followY", () => {
  it("follows an upward drag closely and resists a downward one", () => {
    expect(followY(-100)).toBe(-85);
    expect(followY(100)).toBe(50);
  });
});

describe("flyOutTarget", () => {
  it("sends likes off to the right and passes off to the left", () => {
    expect(flyOutTarget("like", { x: 150, y: 0 }, still, viewport).x).toBeGreaterThan(400);
    expect(flyOutTarget("pass", { x: -150, y: 0 }, still, viewport).x).toBeLessThan(-400);
  });

  it("sends saves off the top", () => {
    expect(flyOutTarget("save", { x: 10, y: -200 }, still, viewport).y).toBeLessThan(-800);
  });

  it("keeps travelling along the drag's slope", () => {
    const target = flyOutTarget("like", { x: 100, y: -50 }, still, viewport);
    expect(target.y / target.x).toBeCloseTo(-0.5);
  });

  it("takes between 250 and 350 ms, faster for faster flicks", () => {
    const slow = flyOutTarget("like", { x: 150, y: 0 }, still, viewport).duration;
    const fast = flyOutTarget("like", { x: 150, y: 0 }, { x: 2000, y: 0 }, viewport).duration;
    expect(slow).toBe(0.35);
    expect(fast).toBe(0.25);
  });
});
