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

/** The time zone the product lives in. Every city it covers is in India. */
export const HOME_TIME_ZONE = "Asia/Kolkata";

const homeDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: HOME_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The calendar date in India at this instant, as "2026-12-01". The servers keep
 * time in UTC, where the date changes at 5:30 in the morning Indian time; going
 * by that, "available from" dates and move-in timing were a day behind for the
 * first hours of every day.
 */
export function homeDate(at: Date): string {
  return homeDay.format(at);
}

/** That date, a number of days on. */
export function homeDatePlus(at: Date, days: number): string {
  const [year, month, day] = homeDate(at).split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
