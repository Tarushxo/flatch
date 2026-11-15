import { describe, expect, it } from "vitest";
import { TenantProfileSchema } from "./schemas";
import {
  cleanPreferences,
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  hasCheckedIn,
  LIFESTYLE,
  LIFESTYLE_KEYS,
  LIFESTYLE_WORDING,
  lifestyleAnswered,
  preferencesToFilters,
  type TenantPreferences,
} from "./tenant";

const prefs = (changes: Partial<TenantPreferences>): TenantPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...changes,
});

describe("the lifestyle questions", () => {
  it("has eight, each with three answers and wording for all of them", () => {
    expect(LIFESTYLE_KEYS).toHaveLength(8);
    for (const key of LIFESTYLE_KEYS) {
      expect(LIFESTYLE[key]).toHaveLength(3);
      expect(LIFESTYLE_WORDING[key].answers).toHaveLength(3);
      expect(LIFESTYLE_WORDING[key].question.length).toBeGreaterThan(0);
    }
  });
});

describe("the default profile", () => {
  it("satisfies the contract", () => {
    expect(TenantProfileSchema.safeParse(DEFAULT_PROFILE).error?.issues ?? []).toEqual([]);
  });
});

describe("preferencesToFilters", () => {
  it("carries the city, budget, areas and room types across", () => {
    expect(
      preferencesToFilters(
        prefs({
          city: "Gurgaon",
          budgetMax: 25000,
          localities: ["Sector 56"],
          roomTypes: ["private_room"],
        }),
      ),
    ).toEqual({
      city: "Gurgaon",
      budgetMax: 25000,
      localities: ["Sector 56"],
      roomTypes: ["private_room"],
    });
  });
});

describe("lifestyleAnswered", () => {
  it("counts the questions that have an answer", () => {
    expect(lifestyleAnswered(DEFAULT_PREFERENCES)).toBe(0);
    expect(lifestyleAnswered(prefs({ lifestyle: { food: "veg", sleep: "early" } }))).toBe(2);
  });
});

describe("cleanPreferences", () => {
  it("drops a dealbreaker on a question with no answer", () => {
    const cleaned = cleanPreferences(
      prefs({ lifestyle: { food: "veg" }, dealbreakers: ["food", "smoking"] }),
    );
    expect(cleaned.dealbreakers).toEqual(["food"]);
  });

  it("forgets the chosen areas when the city changes", () => {
    const before = prefs({ city: "Bangalore", localities: ["HSR Layout"] });
    const after = prefs({ city: "Gurgaon", localities: ["HSR Layout"] });
    expect(cleanPreferences(after, before).localities).toEqual([]);
  });

  it("keeps the areas when the city stays the same", () => {
    const before = prefs({ localities: ["HSR Layout"] });
    const after = prefs({ localities: ["HSR Layout", "Domlur"] });
    expect(cleanPreferences(after, before).localities).toEqual(["HSR Layout", "Domlur"]);
  });
});

describe("the front desk", () => {
  const at = "2026-11-15T10:00:00.000Z";

  it("keeps a new tenant out until they have checked in", () => {
    expect(hasCheckedIn({ mode: "tenant", onboardedAt: null })).toBe(false);
    expect(hasCheckedIn({ mode: "tenant", onboardedAt: at })).toBe(true);
  });

  it("lets a lister in without the tenant's questions", () => {
    expect(hasCheckedIn({ mode: "lister", onboardedAt: null })).toBe(true);
  });

  it("still asks a lister to check in when they switch to looking for a flat", () => {
    const lister = { mode: "lister" as const, onboardedAt: null };
    expect(hasCheckedIn({ ...lister, mode: "tenant" })).toBe(false);
  });
});
