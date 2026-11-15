import { describe, expect, it } from "vitest";
import { metresBetween, publicLocation } from "./location";

const HSR = { lat: 12.9116, lng: 77.6474 };
const GURGAON = { lat: 28.4595, lng: 77.0266 };

describe("the location shown to the public", () => {
  it("is always the same for the same flat", () => {
    expect(publicLocation(HSR, "flat-1")).toEqual(publicLocation(HSR, "flat-1"));
  });

  it("does not move when the flat moves within its grid square", () => {
    const here = publicLocation({ lat: 12.9116, lng: 77.6474 }, "flat-1");
    const nextDoor = publicLocation({ lat: 12.9118, lng: 77.6476 }, "flat-1");
    expect(nextDoor).toEqual(here);
  });

  it("is never the exact point, and never far from it", () => {
    for (const exact of [HSR, GURGAON]) {
      for (let flat = 0; flat < 200; flat += 1) {
        const point = {
          lat: exact.lat + ((flat * 37) % 100) / 10_000,
          lng: exact.lng + ((flat * 53) % 100) / 10_000,
        };
        const shown = publicLocation(point, `flat-${flat}`);
        const off = metresBetween(point, shown);
        expect(shown).not.toEqual(point);
        expect(off, `flat-${flat}`).toBeLessThan(450);
      }
    }
  });

  it("gives two flats in the same building different public points", () => {
    expect(publicLocation(HSR, "flat-1")).not.toEqual(publicLocation(HSR, "flat-2"));
  });
});
