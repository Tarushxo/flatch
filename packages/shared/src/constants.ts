/** The only place the product name lives. Rename here and nowhere else. */
export const APP_NAME = "Flatch";

export const APP_TAGLINE = "Swipe right on your next flat.";

/**
 * The cities the app covers: India's big metros and IT hubs. The first is
 * shown until someone picks their own.
 */
export const CITIES = [
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Gurgaon",
  "Noida",
  "Kolkata",
  "Ahmedabad",
] as const;
export type City = (typeof CITIES)[number];
export const DEFAULT_CITY: City = CITIES[0];
