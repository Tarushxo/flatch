import { describe, expect, it } from "vitest";
import { formatRent, formatRupees } from "./money";

describe("formatRupees", () => {
  it("uses Indian digit grouping", () => {
    expect(formatRupees(18500)).toBe("₹18,500");
    expect(formatRupees(125000)).toBe("₹1,25,000");
    expect(formatRupees(0)).toBe("₹0");
  });

  it("shortens large amounts to lakhs and crores when compact", () => {
    expect(formatRupees(120000, { compact: true })).toBe("₹1.2L");
    expect(formatRupees(200000, { compact: true })).toBe("₹2L");
    expect(formatRupees(15000000, { compact: true })).toBe("₹1.5Cr");
  });

  it("leaves amounts under a lakh alone when compact", () => {
    expect(formatRupees(55500, { compact: true })).toBe("₹55,500");
  });

  it("never rounds a compact amount up past what it is", () => {
    expect(formatRupees(199999, { compact: true })).toBe("₹1.9L");
  });

  it("handles negative amounts", () => {
    expect(formatRupees(-2500)).toBe("-₹2,500");
  });

  it("rejects fractional rupees", () => {
    expect(() => formatRupees(99.5)).toThrow(RangeError);
  });
});

describe("formatRent", () => {
  it("adds the per-month suffix", () => {
    expect(formatRent(18500)).toBe("₹18,500/mo");
  });
});
