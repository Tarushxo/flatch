import { describe, expect, it } from "vitest";
import { mayManageListing, mayPostListing, maySwitchListing, mayUploadPhotos } from "./policies";

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
