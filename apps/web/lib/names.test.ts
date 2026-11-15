import { describe, expect, it } from "vitest";
import { initial } from "./names";

describe("initial", () => {
  it("gives the first letter, in capitals", () => {
    expect(initial("ananya")).toBe("A");
  });

  it("skips a title", () => {
    expect(initial("Mrs. Rao")).toBe("R");
    expect(initial("Mr Iyer")).toBe("I");
  });

  it("does not mistake a name that starts like a title", () => {
    expect(initial("Mrinal")).toBe("M");
    expect(initial("Drishti")).toBe("D");
  });
});
