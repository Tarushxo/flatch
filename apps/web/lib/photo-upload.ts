import type { UploadTicket } from "@repo/shared";

/*
 * Getting a photo ready to upload, in the browser, before it goes anywhere.
 *
 * The photo is redrawn onto a canvas at a sensible size and saved as a fresh
 * JPEG. That makes it small enough to send quickly on a phone, and it drops
 * everything hidden inside the original file, including where it was taken.
 * So a lister's location never leaves their device inside a photo.
 */

/** The longest side of an uploaded photo, in pixels. Plenty for a full-screen card. */
const MAX_SIDE = 1600;
const QUALITY = 0.82;
/** Anything bigger than this is not a phone photo; refuse it before trying to read it. */
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

export type PreparedPhoto = { blob: Blob; dominantColor: string };

/** The photo's overall colour, as a hex string, for the space it fades into. */
function averageColour(source: CanvasImageSource): string {
  const tiny = document.createElement("canvas");
  tiny.width = 8;
  tiny.height = 8;
  const context = tiny.getContext("2d", { willReadFrequently: true });
  if (!context) return "#3a3050";
  context.drawImage(source, 0, 0, 8, 8);
  const { data } = context.getImageData(0, 0, 8, 8);
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let index = 0; index < data.length; index += 4) {
    red += data[index] ?? 0;
    green += data[index + 1] ?? 0;
    blue += data[index + 2] ?? 0;
  }
  const pixels = data.length / 4;
  const hex = (total: number) =>
    Math.round(total / pixels)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

/** Shrink and re-save a photo the person picked. Throws PhotoError with words for them. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) throw new PhotoError("That file is not a photo.");
  if (file.size > MAX_ORIGINAL_BYTES) throw new PhotoError("That photo is too large to use.");

  let image: ImageBitmap;
  try {
    // "from-image" turns the photo the right way up, as the camera recorded it.
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("That photo could not be read. Try a JPG or PNG.");
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoError("This browser could not prepare the photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob) throw new PhotoError("This browser could not prepare the photo.");
    return { blob, dominantColor: averageColour(canvas) };
  } finally {
    image.close();
  }
}

/** Send a prepared photo to the image store with its ticket. Returns the photo's address. */
export async function sendPhoto(ticket: UploadTicket, blob: Blob): Promise<string> {
  const form = new FormData();
  for (const [name, value] of Object.entries(ticket.fields)) form.set(name, value);
  form.set("file", blob, "photo.jpg");

  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, { method: "POST", body: form });
  } catch {
    throw new PhotoError("The photo did not upload. Check your connection and try again.");
  }
  const body = (await response.json().catch(() => null)) as { secure_url?: string } | null;
  if (!response.ok || !body?.secure_url) {
    throw new PhotoError("The photo did not upload. Try again in a moment.");
  }
  return body.secure_url;
}
