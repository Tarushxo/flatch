import { describe, expect, it } from "vitest";
import { ownedPublicId, signParams, uploadTicket } from "./cloudinary";

const config = { cloudName: "demo-cloud", apiKey: "123456", apiSecret: "shh" };
const ME = "3f2b8a1e-0c4d-4e6f-8a9b-0c1d2e3f4a5b";
const OTHER = "9a9a9a9a-0c4d-4e6f-8a9b-0c1d2e3f4a5b";
const PHOTO = "11111111-2222-4333-8444-555555555555";

describe("request signatures", () => {
  it("match the example in Cloudinary's own documentation", () => {
    const signature = signParams(
      {
        timestamp: "1315060510",
        public_id: "sample_image",
        eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
      },
      "abcd",
    );
    expect(signature).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("do not depend on the order the parameters are given in", () => {
    expect(signParams({ b: "2", a: "1" }, "s")).toBe(signParams({ a: "1", b: "2" }, "s"));
  });
});

describe("an upload ticket", () => {
  const ticket = uploadTicket(config, ME, new Date("2026-11-16T10:00:00Z"));

  it("stores the photo in the person's own folder, under a fresh name", () => {
    expect(ticket.fields.public_id).toMatch(new RegExp(`^flatch/u/${ME}/[0-9a-f-]{36}$`));
    expect(uploadTicket(config, ME).fields.public_id).not.toBe(ticket.fields.public_id);
  });

  it("allows image files only, and never replaces an existing photo", () => {
    expect(ticket.fields.allowed_formats).toBe("jpg,png,webp");
    expect(ticket.fields.overwrite).toBe("false");
  });

  it("is signed over everything except the key and the signature itself", () => {
    const { api_key: _key, signature, ...signed } = ticket.fields;
    expect(signature).toBe(signParams(signed, config.apiSecret));
  });

  it("never contains the secret", () => {
    expect(JSON.stringify(ticket)).not.toContain(config.apiSecret);
  });
});

describe("whose photo an address is", () => {
  const mine = `https://res.cloudinary.com/demo-cloud/image/upload/v1794760000/flatch/u/${ME}/${PHOTO}.jpg`;

  it("recognises the person's own upload", () => {
    expect(ownedPublicId(mine, config, ME)).toBe(`flatch/u/${ME}/${PHOTO}`);
  });

  it("refuses someone else's upload, another account's storage, and other websites", () => {
    const refused = [
      mine.replace(ME, OTHER),
      mine.replace("demo-cloud", "someone-else"),
      mine.replace("res.cloudinary.com", "res.cloudinary.com.evil.example"),
      `https://evil.example/?u=${mine}`,
      mine.replace(".jpg", ".svg"),
      `${mine}?x=1`,
      mine.replace(`/${PHOTO}`, `/../${OTHER}/${PHOTO}`),
      "not a url",
    ];
    for (const url of refused) expect(ownedPublicId(url, config, ME), url).toBeNull();
  });
});
