import { describe, expect, it } from "vitest";
import { ACCEPT_DELAY, botAcceptDelay, botAccepts } from "./bots";

// Ids shaped like the real ones, enough of them to see the whole spread.
const ids = Array.from(
  { length: 4000 },
  (_, n) =>
    `${(n * 2654435761).toString(16).padStart(8, "0").slice(-8)}-1f37-4c5d-9b2e-${n.toString(16).padStart(12, "0")}`,
);

describe("how long a bot lister takes to say yes", () => {
  const delays = ids.map(botAcceptDelay);

  it("always falls inside the window", () => {
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(ACCEPT_DELAY.min);
    expect(Math.max(...delays)).toBeLessThan(ACCEPT_DELAY.max);
  });

  it("uses the whole window, so several likes do not all match together", () => {
    const width = ACCEPT_DELAY.max - ACCEPT_DELAY.min;
    expect(Math.min(...delays)).toBeLessThan(ACCEPT_DELAY.min + width * 0.1);
    expect(Math.max(...delays)).toBeGreaterThan(ACCEPT_DELAY.max - width * 0.1);
    const lateHalf = delays.filter((delay) => delay > ACCEPT_DELAY.min + width / 2).length;
    expect(lateHalf / delays.length).toBeGreaterThan(0.4);
    expect(lateHalf / delays.length).toBeLessThan(0.6);
  });

  it("is the same every time for the same flat", () => {
    expect(ids.slice(0, 50).map(botAcceptDelay)).toEqual(delays.slice(0, 50));
  });
});

describe("whether a bot lister answers at all", () => {
  it("is yes for about two in three", () => {
    const share = ids.filter(botAccepts).length / ids.length;
    expect(share).toBeGreaterThan(0.6);
    expect(share).toBeLessThan(0.73);
  });
});
