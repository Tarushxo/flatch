import { describe, expect, it } from "vitest";
import { homeDate, homeDatePlus } from "./constants";

describe("the date in India", () => {
  it("is the same as the server's date for most of the day", () => {
    expect(homeDate(new Date("2026-11-16T09:00:00Z"))).toBe("2026-11-16");
  });

  it("is already tomorrow in the hours after midnight in India, while the server says today", () => {
    // 01:30 on the 17th in India is 20:00 on the 16th in UTC.
    expect(homeDate(new Date("2026-11-16T20:00:00Z"))).toBe("2026-11-17");
    // The date turns over at 18:30 UTC.
    expect(homeDate(new Date("2026-11-16T18:29:00Z"))).toBe("2026-11-16");
    expect(homeDate(new Date("2026-11-16T18:30:00Z"))).toBe("2026-11-17");
  });

  it("counts days on from it, across a month and a year end", () => {
    expect(homeDatePlus(new Date("2026-11-16T09:00:00Z"), 0)).toBe("2026-11-16");
    expect(homeDatePlus(new Date("2026-11-16T20:00:00Z"), 5)).toBe("2026-11-22");
    expect(homeDatePlus(new Date("2026-11-28T09:00:00Z"), 5)).toBe("2026-12-03");
    expect(homeDatePlus(new Date("2026-12-30T09:00:00Z"), 3)).toBe("2027-01-02");
  });
});
