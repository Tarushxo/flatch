import { describe, expect, it } from "vitest";
import { photoSrcSet } from "../photo";
import { sameFilters } from "./early";
import { earlyStartScript, SRCSET_SOURCE } from "./early-script";

const inPage = new Function(`${SRCSET_SOURCE}; return srcset;`)() as (url: string) => string;

describe("the head-start script's photo sizing", () => {
  const photos = [
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365",
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0&crop=entropy",
    "https://res.cloudinary.com/demo/image/upload/v1731700000/flatch/abc123.jpg",
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1731700000/flatch/abc123.jpg",
    "https://res.cloudinary.com/demo/raw/v1/odd.jpg",
    "https://example.com/somewhere/else.jpg",
    "not an address at all",
  ];

  it.each(photos)("asks for exactly the photo the card will show: %s", (url) => {
    expect(inPage(url)).toBe(photoSrcSet(url, "card"));
  });
});

describe("the head-start script", () => {
  it("is valid script", () => {
    expect(() => new Function(earlyStartScript())).not.toThrow();
  });

  it("asks for the deck only on the deck's page, and passes its filters along", () => {
    const asked: string[] = [];
    const run = (pathname: string, search: string) => {
      const window = {} as { __flatchStart?: Promise<unknown> };
      const fetch = (url: string) => {
        asked.push(url);
        return Promise.resolve({ ok: false });
      };
      new Function("window", "location", "fetch", "document", earlyStartScript())(
        window,
        { pathname, search },
        fetch,
        {},
      );
      return window.__flatchStart;
    };
    expect(run("/discover", "")).toBeInstanceOf(Promise);
    run("/discover", "?max=20000&area=Domlur");
    run("/keys", "?max=20000");
    expect(asked).toEqual([
      "/api/v1/start?deck=1",
      "/api/v1/start?deck=1&max=20000&area=Domlur",
      "/api/v1/start",
    ]);
  });

  it("gives the app nothing, rather than an error, when the server says no", async () => {
    const window = {} as { __flatchStart?: Promise<unknown> };
    new Function("window", "location", "fetch", "document", earlyStartScript())(
      window,
      { pathname: "/discover", search: "" },
      () => Promise.reject(new Error("offline")),
      {},
    );
    await expect(window.__flatchStart).resolves.toBeNull();
  });
});

describe("matching an early deck to the filters in use", () => {
  const base = { city: "Pune" as const, budgetMax: 20000, localities: ["Baner"], roomTypes: [] };
  it("accepts the same filters and refuses different ones", () => {
    expect(sameFilters(base, { ...base, localities: ["Baner"] })).toBe(true);
    expect(sameFilters(base, { ...base, budgetMax: null })).toBe(false);
    expect(sameFilters(base, { ...base, city: "Mumbai" })).toBe(false);
    expect(sameFilters(base, { ...base, localities: [] })).toBe(false);
  });
});
