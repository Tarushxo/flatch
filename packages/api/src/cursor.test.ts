import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

const ID = "3f2b8a1e-0c4d-5e6f-8a9b-0c1d2e3f4a5b";

describe("feed cursors", () => {
  it("come back as they went in", () => {
    expect(decodeCursor(encodeCursor({ score: 87.5, id: ID }))).toEqual({ score: 87.5, id: ID });
  });

  it("are safe to put in an address", () => {
    expect(encodeCursor({ score: 92, id: ID })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("treat anything that is not one of ours as no cursor", () => {
    const fake = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    for (const text of [null, undefined, "", "10", "not a cursor", fake([92]), fake(["a", ID])]) {
      expect(decodeCursor(text), String(text)).toBeNull();
    }
    expect(decodeCursor(fake([92, "1; drop table listings"]))).toBeNull();
  });
});
