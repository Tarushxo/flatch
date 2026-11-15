import { CompatibilitySchema } from "@repo/shared/schemas";
import { describe, expect, it } from "vitest";
import {
  compatibility,
  fitOf,
  isRuledOut,
  matchPercent,
  rankScore,
  type ScoredFlat,
  type ScoredTenant,
} from "./compatibility";

const TODAY = new Date("2026-11-16T09:00:00Z");

const rule = (label: string, allowed: boolean) => ({ label, allowed });

const flat = (changes: Partial<ScoredFlat> = {}): ScoredFlat => ({
  monthlyCost: 20000,
  locality: "HSR Layout",
  availableFrom: "2026-11-20",
  houseRules: [rule("Non-veg cooking", false), rule("Smoking indoors", false), rule("Pets", true)],
  photoCount: 4,
  descriptionLength: 120,
  isVerified: true,
  publishedAt: new Date("2026-11-16T00:00:00Z"),
  ...changes,
});

const nobody: ScoredTenant = {
  budgetMax: null,
  localities: [],
  moveIn: null,
  lifestyle: {},
  dealbreakers: [],
};

const asha: ScoredTenant = {
  budgetMax: 22000,
  localities: ["HSR Layout", "Koramangala"],
  moveIn: "asap",
  lifestyle: { food: "veg", smoking: "no", pets: "have" },
  dealbreakers: [],
};

describe("the match percentage", () => {
  it("is 100 for a flat that fits in every way the tenant has asked for", () => {
    expect(
      matchPercent(fitOf({ ...asha, lifestyle: { food: "veg", pets: "have" } }, flat(), TODAY)),
    ).toBe(100);
  });

  it("is unknown, not invented, when the tenant has said nothing", () => {
    expect(matchPercent(fitOf(nobody, flat(), TODAY))).toBeNull();
    expect(compatibility(nobody, flat(), TODAY)).toEqual({ percent: 0, reasons: [] });
  });

  it("never writes a worked-out score as zero, which would read as no score at all", () => {
    const onlyFood = { ...nobody, lifestyle: { food: "non_veg" as const } };
    expect(matchPercent(fitOf(onlyFood, flat(), TODAY))).toBe(0);
    const result = compatibility(onlyFood, flat(), TODAY);
    expect(result.percent).toBe(1);
    expect(result.caution).toBeTruthy();
  });

  it("uses only what is known: a tenant who gave just a budget is scored on budget", () => {
    const onlyBudget = { ...nobody, budgetMax: 20000 };
    expect(matchPercent(fitOf(onlyBudget, flat(), TODAY))).toBe(100);
    expect(matchPercent(fitOf(onlyBudget, flat({ monthlyCost: 22000 }), TODAY))).toBe(50);
  });

  it("stays between 0 and 100 and satisfies the contract, whatever the inputs", () => {
    const tenants = [asha, nobody, { ...asha, budgetMax: 5000, moveIn: "quarter" as const }];
    const flats = [
      flat(),
      flat({ monthlyCost: 90000, locality: "Whitefield", availableFrom: "2027-06-01" }),
    ];
    for (const tenant of tenants) {
      for (const each of flats) {
        for (const reader of ["tenant", "lister"] as const) {
          const result = compatibility(tenant, each, TODAY, reader);
          expect(result.percent).toBeGreaterThanOrEqual(0);
          expect(result.percent).toBeLessThanOrEqual(100);
          expect(CompatibilitySchema.safeParse(result).error?.issues ?? []).toEqual([]);
        }
      }
    }
  });

  it("never scores a cheaper, otherwise identical flat lower", () => {
    let previous = 101;
    for (let cost = 12000; cost <= 32000; cost += 500) {
      const percent = matchPercent(fitOf(asha, flat({ monthlyCost: cost }), TODAY)) ?? 0;
      expect(percent, `at ₹${cost}`).toBeLessThanOrEqual(previous);
      previous = percent;
    }
  });

  it("is not moved by quality or newness: those change the order, never the number", () => {
    const plain = flat({
      photoCount: 1,
      descriptionLength: 0,
      isVerified: false,
      publishedAt: new Date("2026-08-01"),
    });
    expect(compatibility(asha, plain, TODAY).percent).toBe(
      compatibility(asha, flat(), TODAY).percent,
    );
    expect(rankScore(asha, plain, TODAY)).toBeLessThan(rankScore(asha, flat(), TODAY));
  });
});

describe("the reasons, in words", () => {
  it("tells a tenant why a flat fits, strongest first, at most three", () => {
    const { reasons, caution } = compatibility(asha, flat(), TODAY);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
    expect(reasons.join(" | ")).toMatch(/budget/);
    expect(reasons.join(" | ")).toMatch(/HSR Layout/);
    expect(caution).toBeUndefined();
  });

  it("gives the amount when a flat is over budget, as the one caution", () => {
    const { caution } = compatibility(asha, flat({ monthlyCost: 23500 }), TODAY);
    expect(caution).toBe("₹1,500 over your budget");
  });

  it("puts a dealbreaker that is met ahead of everything else", () => {
    const strict = { ...asha, dealbreakers: ["food" as const] };
    expect(compatibility(strict, flat(), TODAY).reasons[0]).toBe("Vegetarian household, like you");
  });

  it("writes the same facts from the lister's side", () => {
    const forLister = compatibility(asha, flat(), TODAY, "lister");
    expect(forLister.percent).toBe(compatibility(asha, flat(), TODAY).percent);
    expect(forLister.reasons.join(" | ")).not.toMatch(/your budget|you picked/);
    expect(forLister.reasons.join(" | ")).toMatch(/afford|area|Vegetarian|Non-smoker/);
  });

  it("warns a lister about a tenant whose budget falls short", () => {
    const { caution } = compatibility({ ...nobody, budgetMax: 18000 }, flat(), TODAY, "lister");
    expect(caution).toBe("Their budget is ₹2,000 short of the monthly cost");
  });
});

describe("dealbreakers", () => {
  const smoker = flat({ houseRules: [rule("Smoking indoors", true)] });
  const tenant = { ...nobody, lifestyle: { smoking: "no" as const } };

  it("rule a flat out only when the tenant said so and the clash is outright", () => {
    expect(isRuledOut({ ...tenant, dealbreakers: ["smoking"] }, smoker)).toBe(true);
    expect(isRuledOut(tenant, smoker)).toBe(false);
    expect(isRuledOut({ ...tenant, dealbreakers: ["smoking"] }, flat())).toBe(false);
  });

  it("never rule out a flat that says nothing on the matter", () => {
    expect(isRuledOut({ ...tenant, dealbreakers: ["smoking"] }, flat({ houseRules: [] }))).toBe(
      false,
    );
  });
});

describe("the order of the deck", () => {
  it("puts a flat that fits ahead of one that does not", () => {
    const far = flat({ locality: "Whitefield", monthlyCost: 30000 });
    expect(rankScore(asha, flat(), TODAY)).toBeGreaterThan(rankScore(asha, far, TODAY));
  });

  it("still orders flats for someone who answered nothing: better listings first", () => {
    const thin = flat({ photoCount: 1, descriptionLength: 0, isVerified: false });
    expect(rankScore(nobody, flat(), TODAY)).toBeGreaterThan(rankScore(nobody, thin, TODAY));
  });

  it("gives the same score at any time on the same day, so pages of the feed agree", () => {
    const morning = rankScore(asha, flat(), new Date("2026-11-16T01:00:00Z"));
    const evening = rankScore(asha, flat(), new Date("2026-11-16T22:00:00Z"));
    expect(morning).toBe(evening);
  });

  it("stays between 0 and 1", () => {
    for (const tenant of [asha, nobody]) {
      for (const each of [flat(), flat({ monthlyCost: 99999, availableFrom: "2028-01-01" })]) {
        const score = rankScore(tenant, each, TODAY);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });
});
