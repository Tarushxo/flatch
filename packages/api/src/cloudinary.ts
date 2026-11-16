import { createHash } from "node:crypto";
import type { UploadTicket } from "@repo/shared";

/*
 * Photo storage (Cloudinary). The browser sends each photo straight to
 * Cloudinary; this server never handles the image itself. What it does is
 * hand out a signed "ticket" per photo, which fixes where the photo will be
 * stored and what kind of file it may be, so a ticket cannot be used for
 * anything else.
 *
 * Optional: without the three CLOUDINARY_ settings, uploads are simply not
 * offered and the sample photos remain.
 */

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Cloudinary's request signature: the parameters in name order, then the secret, hashed. */
export function signParams(params: Record<string, string>, apiSecret: string): string {
  const joined = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createHash("sha1").update(`${joined}${apiSecret}`).digest("hex");
}

const FORMATS = ["jpg", "png", "webp"] as const;

/** Each person's photos are kept under their own folder, which is how ownership is checked later. */
function folderFor(userId: string): string {
  return `flatch/u/${userId}`;
}

/**
 * A ticket to upload one photo. It names the exact place the photo will be
 * stored (inside the person's own folder), allows image files only, and has
 * Cloudinary shrink anything larger than 1600 pixels on arrival.
 */
export function uploadTicket(
  config: CloudinaryConfig,
  userId: string,
  now = new Date(),
): UploadTicket {
  const params = {
    allowed_formats: FORMATS.join(","),
    overwrite: "false",
    public_id: `${folderFor(userId)}/${crypto.randomUUID()}`,
    timestamp: String(Math.floor(now.getTime() / 1000)),
    transformation: "c_limit,h_1600,w_1600",
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    fields: {
      ...params,
      api_key: config.apiKey,
      signature: signParams(params, config.apiSecret),
    },
  };
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * The stored name of a photo, if this address is one of this person's own
 * uploads to this site's storage. Null for anything else, so a listing cannot
 * point at someone else's photo or at another website.
 */
export function ownedPublicId(
  url: string,
  config: CloudinaryConfig,
  userId: string,
): string | null {
  const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^https://res\\.cloudinary\\.com/${literal(config.cloudName)}/image/upload/v\\d+/(${literal(folderFor(userId))}/${UUID})\\.(?:${FORMATS.join("|")})$`,
  );
  return pattern.exec(url)?.[1] ?? null;
}

/** Remove photos from storage. Best effort: a failure is logged and otherwise ignored. */
export async function destroyPhotos(config: CloudinaryConfig, publicIds: string[]): Promise<void> {
  await Promise.all(
    publicIds.map(async (publicId) => {
      const params = {
        // Without this the photo is deleted but copies already handed out by the image
        // store's delivery network keep being served, for up to a month.
        invalidate: "true",
        public_id: publicId,
        timestamp: String(Math.floor(Date.now() / 1000)),
      };
      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
          {
            method: "POST",
            body: new URLSearchParams({
              ...params,
              api_key: config.apiKey,
              signature: signParams(params, config.apiSecret),
            }),
          },
        );
        // A refusal used to pass silently, leaving the photo where it was.
        if (!response.ok) {
          console.error(`The image store refused to remove a photo (${response.status})`);
        }
      } catch (error) {
        console.error("Could not remove a photo from storage", error);
      }
    }),
  );
}
