import type { DevicePosition } from "@repo/shared";

/** Thrown when the device's position cannot be had. The message is written for the person. */
export class PositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PositionError";
  }
}

/**
 * Ask the device where it is, once. The browser asks the person's permission
 * first. Nothing is stored or sent here; the caller decides what to do with it.
 */
export function whereAmI(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new PositionError("This browser cannot share its location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        }),
      (error) =>
        reject(
          new PositionError(
            error.code === error.PERMISSION_DENIED
              ? "Location is switched off for this site. Allow it in your browser to confirm."
              : error.code === error.TIMEOUT
                ? "Finding your location took too long. Try again, outdoors if you can."
                : "Your device could not find its location just now.",
          ),
        ),
      // A fresh, precise fix: an old or rough one would defeat the point.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
