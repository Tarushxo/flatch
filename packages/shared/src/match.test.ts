import { describe, expect, it } from "vitest";
import { cleanMessage, MESSAGE_MAX_LENGTH, mapsLink, totalUnread } from "./match";

describe("totalUnread", () => {
  it("adds up unread messages across matches", () => {
    expect(totalUnread([])).toBe(0);
    expect(totalUnread([{ unreadCount: 2 }, { unreadCount: 0 }, { unreadCount: 3 }])).toBe(5);
  });
});

describe("cleanMessage", () => {
  it("trims the ends", () => {
    expect(cleanMessage("  hello there \n")).toBe("hello there");
  });

  it("refuses a message with nothing in it", () => {
    expect(cleanMessage("")).toBeNull();
    expect(cleanMessage("   \n\t ")).toBeNull();
  });

  it("cuts a message that is too long", () => {
    expect(cleanMessage("a".repeat(MESSAGE_MAX_LENGTH + 50))).toHaveLength(MESSAGE_MAX_LENGTH);
  });
});

describe("mapsLink", () => {
  it("builds a maps search for the full address", () => {
    const link = mapsLink(
      { society: "Sunrise Residency", line: "Flat 3B, 4th Cross" },
      "HSR Layout",
    );
    const query = new URL(link).searchParams.get("query");
    expect(query).toBe("Sunrise Residency, Flat 3B, 4th Cross, HSR Layout");
  });
});
