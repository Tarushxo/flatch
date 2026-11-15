import { describe, expect, it } from "vitest";
import { freshness, locationFit, quality } from "./extras";
import { householdFrom, lifestyleFit, similarity } from "./lifestyle";
import { daysUntilFree, timingFit } from "./timing";

const TODAY = new Date("2026-11-16T09:00:00Z");
const rule = (label: string, allowed: boolean) => ({ label, allowed });

describe("a household, read from its house rules", () => {
  it("takes a vegetarian, non-smoking, quiet home from its rules", () => {
    expect(
      householdFrom([
        rule("Non-veg cooking", false),
        rule("Smoking", false),
        rule("Alcohol", false),
        rule("Overnight guests", false),
      ]),
    ).toEqual({ food: "veg", smoking: "no", drinking: "no", guests: "rarely" });
  });

  it("takes a sociable home from its rules", () => {
    expect(
      householdFrom([
        rule("Weekend get-togethers", true),
        rule("Smoking on the balcony", true),
        rule("Pets", true),
      ]),
    ).toEqual({ guests: "often", smoking: "outside", pets: "fine_with" });
  });

  it("says nothing about what the rules do not mention", () => {
    expect(householdFrom([])).toEqual({});
    expect(householdFrom([rule("Something else entirely", true)])).toEqual({});
  });
});

describe("how two answers sit together", () => {
  it("scores the same answer 1, a neighbour 0.6 and opposite ends 0", () => {
    expect(similarity("food", "veg", "veg")).toBe(1);
    expect(similarity("food", "veg", "eggetarian")).toBe(0.6);
    expect(similarity("food", "veg", "non_veg")).toBe(0);
  });

  it("only clashes on pets when the tenant has one and the home allows none", () => {
    expect(similarity("pets", "have", "none")).toBe(0);
    expect(similarity("pets", "have", "fine_with")).toBe(1);
    expect(similarity("pets", "none", "fine_with")).toBe(1);
  });

  it("is unknown when tenant and household share no answered question", () => {
    expect(lifestyleFit({ food: "veg" }, { smoking: "no" })).toBeNull();
  });

  it("weighs a dealbreaker question double", () => {
    const tenant = { food: "veg" as const, smoking: "no" as const };
    const home = { food: "non_veg" as const, smoking: "no" as const };
    expect(lifestyleFit(tenant, home)).toBeCloseTo(0.5);
    expect(lifestyleFit(tenant, home, ["food"])).toBeCloseTo(1 / 3);
  });
});

describe("timing", () => {
  it("counts whole days until a room is free, never negative", () => {
    expect(daysUntilFree("2026-11-16", TODAY)).toBe(0);
    expect(daysUntilFree("2026-11-26", TODAY)).toBe(10);
    expect(daysUntilFree("2026-01-01", TODAY)).toBe(0);
  });

  it("fits someone moving as soon as possible when the room is free soon, less so later", () => {
    expect(timingFit("2026-11-20", "asap", TODAY)).toBe(1);
    const later = timingFit("2026-12-10", "asap", TODAY) ?? 0;
    expect(later).toBeGreaterThan(0);
    expect(later).toBeLessThan(1);
    expect(timingFit("2027-03-01", "asap", TODAY)).toBe(0);
  });

  it("marks a room free today as a little early for someone moving in a couple of months", () => {
    expect(timingFit("2026-11-16", "quarter", TODAY)).toBeCloseTo(0.6);
    expect(timingFit("2027-01-05", "quarter", TODAY)).toBe(1);
  });

  it("is unknown for someone who has not said, or is only browsing", () => {
    expect(timingFit("2026-11-20", null, TODAY)).toBeNull();
    expect(timingFit("2026-11-20", "browsing", TODAY)).toBeNull();
  });
});

describe("the extras", () => {
  it("scores an area the tenant picked 1, another low, and no choice as unknown", () => {
    expect(locationFit("HSR Layout", ["HSR Layout"])).toBe(1);
    expect(locationFit("Whitefield", ["HSR Layout"])).toBeLessThan(0.5);
    expect(locationFit("Whitefield", [])).toBeNull();
  });

  it("rates a listing with photos, a description and a location check above a bare one", () => {
    const full = quality({ photoCount: 6, descriptionLength: 200, isVerified: true });
    const bare = quality({ photoCount: 1, descriptionLength: 0, isVerified: false });
    expect(full).toBe(1);
    expect(bare).toBeLessThan(0.2);
  });

  it("halves newness every fourteen days", () => {
    expect(freshness(new Date("2026-11-16T00:00:00Z"), TODAY)).toBe(1);
    expect(freshness(new Date("2026-11-02T00:00:00Z"), TODAY)).toBeCloseTo(0.5);
    expect(freshness(new Date("2026-10-19T00:00:00Z"), TODAY)).toBeCloseTo(0.25);
  });
});
