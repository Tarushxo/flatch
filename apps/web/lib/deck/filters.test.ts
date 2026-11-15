import { type FeedFilters, NO_FILTERS } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { filtersFromSearch, filtersToSearch } from "./filters";

describe("filters in the page address", () => {
  it("writes nothing when no filter is set", () => {
    expect(filtersToSearch(NO_FILTERS)).toBe("");
    expect(filtersFromSearch("", "Bangalore")).toEqual(NO_FILTERS);
  });

  it("survives a round trip", () => {
    const filters: FeedFilters = {
      city: "Gurgaon",
      budgetMax: 20000,
      localities: ["HSR Layout", "Domlur"],
      roomTypes: ["private_room", "whole_flat"],
    };
    expect(filtersFromSearch(filtersToSearch(filters), "Gurgaon")).toEqual(filters);
  });

  it("writes a readable address", () => {
    expect(
      filtersToSearch({
        city: "Bangalore",
        budgetMax: 20000,
        localities: ["Domlur"],
        roomTypes: ["private_room"],
      }),
    ).toBe("?max=20000&area=Domlur&room=private_room");
  });

  it("takes the city from the profile, never from the address", () => {
    expect(filtersToSearch({ ...NO_FILTERS, city: "Gurgaon" })).toBe("");
    expect(filtersFromSearch("?city=Bangalore&max=20000", "Gurgaon").city).toBe("Gurgaon");
  });

  it("ignores values it does not recognise", () => {
    expect(filtersFromSearch("?max=lots&room=castle&area=&utm_source=x", "Bangalore")).toEqual(
      NO_FILTERS,
    );
    expect(filtersFromSearch("?max=-5", "Bangalore")).toEqual(NO_FILTERS);
  });
});
