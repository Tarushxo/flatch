import { describe, expect, it } from "vitest";
import {
  mayDecideInterest,
  mayLikeListing,
  mayManageListing,
  mayPostListing,
  mayReportListing,
  maySwitchListing,
  mayUploadPhotos,
  mayUseChat,
} from "./policies";

const member = { userId: "user-a", isGuest: false };
const guest = { userId: "guest-a", isGuest: true };
const mine = { listerId: "user-a", isOpen: true };
const theirs = { listerId: "user-b", isOpen: true };

describe("who may post a flat", () => {
  // The authorization matrix: who, in what situation, and the expected answer.
  const rows = [
    {
      who: "a signed-in person with no flats",
      actor: member,
      signInOffered: true,
      open: 0,
      code: null,
    },
    {
      who: "a signed-in person with one flat open",
      actor: member,
      signInOffered: true,
      open: 1,
      code: null,
    },
    {
      who: "a signed-in person at the limit",
      actor: member,
      signInOffered: true,
      open: 2,
      code: "listing_limit",
    },
    {
      who: "a guest, where sign-in is offered",
      actor: guest,
      signInOffered: true,
      open: 0,
      code: "sign_in_required",
    },
    {
      who: "a guest, where there is no sign-in",
      actor: guest,
      signInOffered: false,
      open: 0,
      code: null,
    },
    {
      who: "a guest at the limit, no sign-in",
      actor: guest,
      signInOffered: false,
      open: 2,
      code: "listing_limit",
    },
  ] as const;

  for (const row of rows) {
    it(`${row.who}: ${row.code ?? "allowed"}`, () => {
      const refusal = mayPostListing(row.actor, {
        signInOffered: row.signInOffered,
        openCount: row.open,
      });
      expect(refusal?.code ?? null).toBe(row.code);
    });
  }

  it("tells a guest to sign in before it mentions any limit", () => {
    expect(mayPostListing(guest, { signInOffered: true, openCount: 5 })?.code).toBe(
      "sign_in_required",
    );
  });
});

describe("who may change a flat", () => {
  it("lets the lister, and nobody else", () => {
    expect(mayManageListing(member, mine)).toBeNull();
    expect(mayManageListing(member, theirs)?.code).toBe("not_yours");
    expect(mayManageListing(guest, theirs)?.code).toBe("not_yours");
  });
});

describe("who may switch a flat's sign", () => {
  it("never lets someone switch another person's sign, on or off", () => {
    expect(maySwitchListing(member, theirs, { open: false, openCount: 0 })?.code).toBe("not_yours");
    expect(maySwitchListing(member, theirs, { open: true, openCount: 0 })?.code).toBe("not_yours");
  });

  it("always lets the lister switch off", () => {
    expect(maySwitchListing(member, mine, { open: false, openCount: 2 })).toBeNull();
  });

  it("stops the lister switching on a third flat", () => {
    const closed = { ...mine, isOpen: false };
    expect(maySwitchListing(member, closed, { open: true, openCount: 1 })).toBeNull();
    expect(maySwitchListing(member, closed, { open: true, openCount: 2 })?.code).toBe(
      "listing_limit",
    );
  });

  it("does not count a flat that is already open against itself", () => {
    expect(maySwitchListing(member, mine, { open: true, openCount: 2 })).toBeNull();
  });
});

describe("who may upload photos", () => {
  it("lets signed-in people, and guests only where there is no sign-in to offer", () => {
    expect(mayUploadPhotos(member, { signInOffered: true })).toBeNull();
    expect(mayUploadPhotos(guest, { signInOffered: true })?.code).toBe("sign_in_required");
    expect(mayUploadPhotos(guest, { signInOffered: false })).toBeNull();
  });
});

describe("a flat that was reported off the board", () => {
  const reported = { ...mine, isOpen: false, underReview: true };

  it("cannot be switched back on by its lister", () => {
    expect(maySwitchListing(member, reported, { open: true, openCount: 0 })?.code).toBe(
      "under_review",
    );
  });

  it("can still be switched off", () => {
    expect(
      maySwitchListing(member, { ...reported, isOpen: true }, { open: false, openCount: 1 }),
    ).toBeNull();
  });
});

describe("who may report a flat", () => {
  const real = { listerId: "user-b", isSeed: false };
  const rows = [
    {
      who: "a signed-in person, someone else's flat",
      actor: member,
      listing: real,
      signIn: true,
      code: null,
    },
    {
      who: "a guest, where sign-in is offered",
      actor: guest,
      listing: real,
      signIn: true,
      code: "sign_in_required",
    },
    {
      who: "a guest, where there is no sign-in",
      actor: guest,
      listing: real,
      signIn: false,
      code: null,
    },
    {
      who: "anyone, a demo flat",
      actor: member,
      listing: { ...real, isSeed: true },
      signIn: true,
      code: "demo_flat",
    },
    {
      who: "a lister, their own flat",
      actor: member,
      listing: { ...real, listerId: "user-a" },
      signIn: true,
      code: "own_flat",
    },
  ] as const;

  for (const row of rows) {
    it(`${row.who}: ${row.code ?? "allowed"}`, () => {
      const refusal = mayReportListing(row.actor, row.listing, { signInOffered: row.signIn });
      expect(refusal?.code ?? null).toBe(row.code);
    });
  }
});

describe("who may like a flat", () => {
  const demo = { listerId: "bot-1", isSeed: true };
  const real = { listerId: "user-b", isSeed: false };
  const rows = [
    { who: "a guest, a demo flat", actor: guest, listing: demo, code: null },
    { who: "a guest, a real person's flat", actor: guest, listing: real, code: "guests_demo_only" },
    { who: "a signed-in person, a demo flat", actor: member, listing: demo, code: null },
    { who: "a signed-in person, a real person's flat", actor: member, listing: real, code: null },
    {
      who: "a lister, their own flat",
      actor: member,
      listing: { ...real, listerId: "user-a" },
      code: "own_flat",
    },
  ] as const;

  for (const row of rows) {
    it(`${row.who}: ${row.code ?? "allowed"}`, () => {
      expect(mayLikeListing(row.actor, row.listing)?.code ?? null).toBe(row.code);
    });
  }
});

describe("who may answer a tenant's like", () => {
  it("is the flat's lister, and nobody else", () => {
    expect(mayDecideInterest(member, { listerId: "user-a" })).toBeNull();
    expect(mayDecideInterest(member, { listerId: "user-b" })?.code).toBe("not_yours");
    expect(mayDecideInterest(guest, { listerId: "user-b" })?.code).toBe("not_yours");
  });
});

describe("who may use a chat, and see the address it unlocks", () => {
  const chat = { tenantId: "user-a", listerId: "user-b", endedAt: null };
  const stranger = { userId: "user-c", isGuest: false };
  const rows = [
    { who: "the tenant in it", actor: member, chat, allowed: true },
    { who: "the lister in it", actor: { userId: "user-b", isGuest: false }, chat, allowed: true },
    { who: "someone else who is signed in", actor: stranger, chat, allowed: false },
    { who: "a guest who is not in it", actor: guest, chat, allowed: false },
    {
      who: "the tenant, after it was ended",
      actor: member,
      chat: { ...chat, endedAt: new Date() },
      allowed: false,
    },
    {
      who: "the lister, after it was ended",
      actor: { userId: "user-b", isGuest: false },
      chat: { ...chat, endedAt: new Date() },
      allowed: false,
    },
  ] as const;

  for (const row of rows) {
    it(`${row.who}: ${row.allowed ? "allowed" : "refused"}`, () => {
      expect(mayUseChat(row.actor, row.chat) === null).toBe(row.allowed);
    });
  }
});
