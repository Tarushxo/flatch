import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNext } from "./next-path";

describe("where to go after the front desk", () => {
  it("goes to the deck when nothing was asked for", () => {
    expect(safeNext(null)).toBe(DEFAULT_NEXT);
    expect(safeNext("")).toBe(DEFAULT_NEXT);
  });

  it("goes back to the page the person was heading for", () => {
    expect(safeNext("/keys")).toBe("/keys");
    expect(safeNext("/discover?max=20000")).toBe("/discover?max=20000");
  });

  it("never leaves this site", () => {
    for (const elsewhere of ["https://evil.example", "//evil.example", "/\\evil.example", "evil"]) {
      expect(safeNext(elsewhere), elsewhere).toBe(DEFAULT_NEXT);
    }
  });

  it("never loops back to the sign-in screen or lands on the API", () => {
    expect(safeNext("/sign-in?next=/sign-in")).toBe(DEFAULT_NEXT);
    expect(safeNext("/api/v1/me")).toBe(DEFAULT_NEXT);
  });
});
