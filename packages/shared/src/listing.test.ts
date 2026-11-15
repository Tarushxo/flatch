import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  type FeedFilters,
  matchesFilters,
  monthlyCost,
  NO_FILTERS,
} from "./listing";

const flat = {
  rent: 18500,
  maintenance: 2000,
  utilitiesEstimate: 1400,
  locality: "HSR Layout",
  roomType: "private_room",
} as const;

const only = (filters: Partial<FeedFilters>): FeedFilters => ({ ...NO_FILTERS, ...filters });

describe("monthlyCost", () => {
  it("adds maintenance and utilities to the rent", () => {
    expect(monthlyCost(flat)).toBe(21900);
  });
});

describe("matchesFilters", () => {
  it("lets everything through when nothing is set", () => {
    expect(matchesFilters(flat, NO_FILTERS)).toBe(true);
  });

  it("checks the budget against the full monthly cost, not the rent alone", () => {
    expect(matchesFilters(flat, only({ budgetMax: 21900 }))).toBe(true);
    expect(matchesFilters(flat, only({ budgetMax: 21899 }))).toBe(false);
    // The rent alone (18,500) would have passed a 20,000 budget.
    expect(matchesFilters(flat, only({ budgetMax: 20000 }))).toBe(false);
  });

  it("matches any of the chosen areas", () => {
    expect(matchesFilters(flat, only({ localities: ["Indiranagar", "HSR Layout"] }))).toBe(true);
    expect(matchesFilters(flat, only({ localities: ["Indiranagar"] }))).toBe(false);
  });

  it("matches any of the chosen room types", () => {
    expect(matchesFilters(flat, only({ roomTypes: ["private_room"] }))).toBe(true);
    expect(matchesFilters(flat, only({ roomTypes: ["whole_flat", "shared_room"] }))).toBe(false);
  });

  it("needs every active filter to pass", () => {
    const filters = only({
      budgetMax: 25000,
      localities: ["HSR Layout"],
      roomTypes: ["whole_flat"],
    });
    expect(matchesFilters(flat, filters)).toBe(false);
  });
});

describe("countActiveFilters", () => {
  it("counts kinds of filter, not individual choices", () => {
    expect(countActiveFilters(NO_FILTERS)).toBe(0);
    expect(countActiveFilters(only({ budgetMax: 20000 }))).toBe(1);
    expect(countActiveFilters(only({ localities: ["HSR Layout", "Domlur"] }))).toBe(1);
    expect(
      countActiveFilters({ budgetMax: 20000, localities: ["Domlur"], roomTypes: ["whole_flat"] }),
    ).toBe(3);
  });
});
