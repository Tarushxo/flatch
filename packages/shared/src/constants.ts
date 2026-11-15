/** The only place the product name lives. Rename here and nowhere else. */
export const APP_NAME = "Flatch";

export const APP_TAGLINE = "Swipe right on your next flat.";

/** The cities the app covers. The first is shown until someone picks their own. */
export const CITIES = ["Bangalore", "Gurgaon"] as const;
export type City = (typeof CITIES)[number];
export const DEFAULT_CITY: City = CITIES[0];
