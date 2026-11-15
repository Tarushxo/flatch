import { describe, expect, it } from "vitest";
import { budgetFit } from "./budget-fit";

describe("budgetFit", () => {
  it("is a perfect fit at or under budget", () => {
    expect(budgetFit(15000, 20000)).toBe(1);
    expect(budgetFit(20000, 20000)).toBe(1);
  });

  it("falls to zero at 20% over budget and beyond", () => {
    expect(budgetFit(24000, 20000)).toBe(0);
    expect(budgetFit(40000, 20000)).toBe(0);
  });

  it("is halfway at 10% over budget", () => {
    expect(budgetFit(22000, 20000)).toBeCloseTo(0.5);
  });

  it("never ranks a cheaper flat below a pricier one", () => {
    const budget = 20000;
    let previous = 1;
    for (let cost = 10000; cost <= 30000; cost += 250) {
      const score = budgetFit(cost, budget);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(previous);
      previous = score;
    }
  });

  it("scores zero for nonsense input", () => {
    expect(budgetFit(15000, 0)).toBe(0);
    expect(budgetFit(-1, 20000)).toBe(0);
  });
});
