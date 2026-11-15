const clock = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

/** A time of day as people write it, e.g. "2:41 pm". */
export function clockTime(iso: string): string {
  return clock.format(new Date(iso));
}
