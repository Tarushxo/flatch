import { EMPTY_DRAFT } from "@repo/shared";
import { ApplicantSchema, MatchSchema, MyListingSchema } from "@repo/shared/schemas";
import { describe, expect, it } from "vitest";
import {
  ARRIVALS_MS,
  acceptedFor,
  applicantOpener,
  applicantReplyFor,
  arrivalsFor,
  arrivedBy,
  toListerMatch,
  toMyListing,
  waitingFor,
} from "./applicants";
import type { StoredListing } from "./lister-store";

const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
/** When the first and the last bot tenant arrive, after a flat opens. */
const FIRST = ARRIVALS_MS[0];
const LAST = ARRIVALS_MS[ARRIVALS_MS.length - 1] ?? FIRST;

describe("the tenants who like a flat", () => {
  const arrivals = arrivalsFor({ id: "mine-abc" }, T0);

  it("are different people, all satisfying the contract", () => {
    expect(arrivals).toHaveLength(ARRIVALS_MS.length);
    expect(new Set(arrivals.map((arrival) => arrival.applicant.name)).size).toBe(
      ARRIVALS_MS.length,
    );
    for (const { applicant } of arrivals) {
      expect(ApplicantSchema.safeParse(applicant).error?.issues ?? [], applicant.name).toEqual([]);
    }
  });

  it("arrive one after another, never before the flat opens", () => {
    const times = arrivals.map((arrival) => arrival.arrivesAt);
    expect(times[0]).toBeGreaterThan(T0);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("are the same people every time for the same flat", () => {
    expect(arrivalsFor({ id: "mine-abc" }, T0)).toEqual(arrivals);
  });

  it("differ from flat to flat", () => {
    const other = arrivalsFor({ id: "mine-xyz1" }, T0).map((arrival) => arrival.applicant.name);
    expect(other).not.toEqual(arrivals.map((arrival) => arrival.applicant.name));
  });

  it("carry ids that name the flat, so two flats never share an applicant id", () => {
    for (const { applicant } of arrivals) {
      expect(applicant.id.startsWith("mine-abc-t")).toBe(true);
      expect(applicant.listingId).toBe("mine-abc");
    }
  });
});

describe("what a tenant says", () => {
  const [first] = arrivalsFor({ id: "mine-abc" }, T0);
  if (!first) throw new Error("no arrivals");

  it("opens with their name and the flat's title", () => {
    const opener = applicantOpener(first.applicant, { title: "Sunny room near the park" });
    expect(opener).toContain(first.applicant.name);
    expect(opener).toContain("Sunny room near the park");
  });

  it("gives a different reply to each of the first messages, then repeats the last", () => {
    expect(new Set([1, 2, 3, 4].map(applicantReplyFor)).size).toBe(4);
    expect(applicantReplyFor(12)).toBe(applicantReplyFor(4));
  });
});

const PHOTO = {
  url: "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fit=crop",
  roomTag: "bedroom" as const,
  dominantColor: "#9ba474",
};

function flat(overrides: Partial<StoredListing> = {}): StoredListing {
  return {
    ...EMPTY_DRAFT,
    title: "Sunny room near the park",
    locality: "Indiranagar",
    society: "Maple Court",
    addressLine: "Flat 4B, 2nd Cross",
    availableFrom: "2026-12-01",
    rent: 22000,
    photos: [PHOTO, PHOTO, PHOTO],
    id: "mine-abc",
    isOpen: true,
    createdAt: new Date(T0).toISOString(),
    opensAt: T0,
    closedAt: null,
    decisions: {},
    ...overrides,
  };
}

describe("a posted flat over time", () => {
  it("has nobody at first, then one, then everyone", () => {
    expect(arrivedBy(flat(), T0)).toHaveLength(0);
    expect(arrivedBy(flat(), T0 + FIRST + 500)).toHaveLength(1);
    expect(arrivedBy(flat(), T0 + LAST)).toHaveLength(ARRIVALS_MS.length);
  });

  it("takes no new likes once the vacancy sign is off", () => {
    const closed = flat({ isOpen: false, closedAt: T0 + FIRST + 500 });
    expect(arrivedBy(closed, T0 + LAST + 60_000)).toHaveLength(1);
  });

  it("moves a tenant out of the waiting list once the lister decides", () => {
    const [first, second] = arrivedBy(flat(), T0 + LAST);
    if (!first || !second) throw new Error("no arrivals");
    const decided = flat({
      decisions: {
        [first.id]: { decision: "accept", at: T0 + 20_000 },
        [second.id]: { decision: "decline", at: T0 + 21_000 },
      },
    });
    expect(waitingFor(decided, T0 + LAST)).toHaveLength(ARRIVALS_MS.length - 2);
    expect(acceptedFor(decided, T0 + LAST).map((each) => each.applicant.id)).toEqual([first.id]);

    const mine = toMyListing(decided, T0 + LAST);
    expect(mine.interestedCount).toBe(ARRIVALS_MS.length - 2);
    expect(mine.matchCount).toBe(1);
    expect(MyListingSchema.safeParse(mine).error?.issues ?? []).toEqual([]);
    expect(mine).not.toHaveProperty("decisions");
  });

  it("turns an accepted tenant into a match seen from the lister's side", () => {
    const [first] = arrivedBy(flat(), T0 + LAST);
    if (!first) throw new Error("no arrivals");
    const match = toListerMatch(
      flat(),
      { applicant: first, acceptedAt: T0 + 20_000 },
      { name: "Tara", about: "" },
      [],
      0,
      T0 + 60_000,
    );
    expect(MatchSchema.safeParse(match).error?.issues ?? []).toEqual([]);
    expect(match.side).toBe("lister");
    expect(match.person.name).toBe(first.name);
    expect(match.address).toEqual({ society: "Maple Court", line: "Flat 4B, 2nd Cross" });
  });
});
