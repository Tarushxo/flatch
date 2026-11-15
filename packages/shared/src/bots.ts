import type { Applicant } from "./lister";
import type { Listing } from "./listing";

/*
 * The demo bots: what they decide and what they say. Every demo flat is listed
 * by a bot, and a handful of bot tenants like any flat a person posts, so that
 * one visitor can go from a like to a match to a chat without a second real
 * person. Bot listings and bot tenants are always marked "Demo".
 *
 * Everything here is a plain function of its inputs, so the server (which
 * runs the bots) and the in-browser mock (which stands in for the server when
 * there is no database) behave the same way, and both can be tested without
 * waiting.
 */

/**
 * How long a bot lister takes to say yes, in milliseconds. Long and spread out
 * on purpose: someone who likes several flats in a row should get their
 * matches one at a time over the next half minute or so, not all at once.
 * (It was 2.5 to 5 seconds, which felt like being bombarded.)
 */
export const ACCEPT_DELAY = { min: 15_000, max: 40_000 } as const;
/** How long a bot takes to reply to a message. */
export const REPLY_DELAY = { min: 2200, max: 4200 } as const;
/** How long a bot takes to say hello once there is a match. */
export const HELLO_DELAY_MS = 2500;
/**
 * When bot tenants like a newly posted flat, in milliseconds after it opens.
 * Two of them, well apart: enough to show the lister's side working, without
 * the lister feeling crowded. (It was five in the first fifty seconds.)
 */
export const ARRIVALS_MS = [8000, 60000] as const;

/** A small, stable number from an id, so each flat always meets the same behaviour. */
export function botSeed(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash;
}

/**
 * Whether a bot lister ever answers a like. Two in three do; the rest leave
 * the like waiting, so the "Likes sent" list has something to show.
 */
export function botAccepts(listingId: string): boolean {
  return botSeed(listingId) % 3 !== 0;
}

/** How long after a like this bot lister says yes, in milliseconds. */
export function botAcceptDelay(listingId: string): number {
  return ACCEPT_DELAY.min + (botSeed(listingId) % (ACCEPT_DELAY.max - ACCEPT_DELAY.min));
}

/** A bot lister's first message, sent shortly after they accept. */
export function listerOpener(listing: Pick<Listing, "locality" | "lister">): string {
  const who = listing.lister.role === "owner" ? "the owner" : "one of the flatmates";
  return `Hi, ${listing.lister.name} here, ${who}. Thanks for the like! The room in ${listing.locality} is still free. Want to come and see it?`;
}

const LISTER_REPLIES = [
  "Sure. Weekends work best for a visit. How about Saturday around 11 am?",
  "It is free from the date on the listing, and we are flexible by a few days.",
  "Sounds good. The address is at the top of this chat. Message me when you are on your way.",
  "Happy to answer anything else when you visit. See you then!",
];

/** What a bot lister says back to the tenant's nth message (counting from 1). */
export function listerReply(messageNumber: number): string {
  return (
    LISTER_REPLIES[Math.min(messageNumber, LISTER_REPLIES.length) - 1] ?? LISTER_REPLIES[0] ?? ""
  );
}

/** What a bot tenant says first once the lister has accepted them. */
export function tenantOpener(name: string, flatTitle: string): string {
  return `Hi, ${name} here. Thanks for accepting! I'd love to see "${flatTitle}". When would suit you for a visit?`;
}

const TENANT_REPLIES = [
  "Any evening this week works for me, or Saturday morning. Should I bring anything, like ID?",
  "Happy to tell you more when we meet. I have shared flats before and can pass on a reference.",
  "Perfect, thank you. See you then!",
  "Looking forward to it.",
];

/** What a bot tenant says back to the lister's nth message (counting from 1). */
export function tenantReply(messageNumber: number): string {
  return (
    TENANT_REPLIES[Math.min(messageNumber, TENANT_REPLIES.length) - 1] ?? TENANT_REPLIES[0] ?? ""
  );
}

/** A bot tenant: who they are, and the hand-written match score they are shown with. */
export type BotTenant = Omit<Applicant, "id" | "listingId" | "likedAt"> & {
  ageRange: NonNullable<Applicant["ageRange"]>;
  occupation: NonNullable<Applicant["occupation"]>;
};

export const BOT_TENANTS: BotTenant[] = [
  {
    name: "Sana",
    isSeed: true,
    ageRange: "25-29",
    occupation: "working",
    about:
      "UX researcher, hybrid. I cook most evenings and keep the kitchen cleaner than I found it.",
    lifestyle: {
      food: "veg",
      smoking: "no",
      sleep: "early",
      cleanliness: "spotless",
      guests: "rarely",
    },
    compatibility: {
      percent: 94,
      reasons: ["Tidy, like your household", "Non-smoker", "Wants to stay a year or more"],
    },
    note: "Your flat is ten minutes from my office. I can visit any evening this week.",
  },
  {
    name: "Arnav",
    isSeed: true,
    ageRange: "25-29",
    occupation: "working",
    about:
      "Backend engineer. Quiet on weekdays, football on Sundays. I have lived in shared flats for five years.",
    lifestyle: {
      food: "non_veg",
      smoking: "no",
      drinking: "social",
      sleep: "flexible",
      workMode: "office",
    },
    compatibility: {
      percent: 88,
      reasons: [
        "Within the rent you asked",
        "Out at the office all day",
        "Has shared a flat before",
      ],
    },
  },
  {
    name: "Meher",
    isSeed: true,
    ageRange: "18-24",
    occupation: "student",
    about:
      "Final-year design student. I study late and keep to myself, and I am very good with plants.",
    lifestyle: {
      food: "eggetarian",
      smoking: "no",
      sleep: "night_owl",
      cleanliness: "tidy",
      pets: "fine_with",
    },
    compatibility: {
      percent: 81,
      reasons: ["Non-smoker", "Fine with pets", "Tidy"],
      caution: "A night owl",
    },
  },
  {
    name: "Rohit",
    isSeed: true,
    ageRange: "30-39",
    occupation: "working",
    about:
      "Sales lead, travelling two weeks a month. Easy to live with and rarely home before nine.",
    lifestyle: { food: "non_veg", drinking: "social", guests: "sometimes", workMode: "office" },
    compatibility: {
      percent: 77,
      reasons: ["Often away for work", "Steady job", "Can move in this month"],
      caution: "Has friends over sometimes",
    },
  },
  {
    name: "Priyanka",
    isSeed: true,
    ageRange: "25-29",
    occupation: "working",
    about: "Doctor doing shift work. I sleep at odd hours, so I am very quiet when I am in.",
    lifestyle: {
      food: "veg",
      smoking: "no",
      drinking: "no",
      cleanliness: "spotless",
      guests: "rarely",
    },
    compatibility: {
      percent: 90,
      reasons: ["Vegetarian", "Non-smoker", "Very tidy"],
      caution: "Works shifts, so comes and goes at odd hours",
    },
    note: "Happy to pay the deposit the day I see the place, if it suits us both.",
  },
  {
    name: "Kabir",
    isSeed: true,
    ageRange: "18-24",
    occupation: "working",
    about: "First job, just moved to the city. I play guitar, but only with headphones on.",
    lifestyle: { smoking: "outside", drinking: "social", sleep: "night_owl", guests: "often" },
    compatibility: {
      percent: 64,
      reasons: ["Can move in right away", "Within the rent you asked"],
      caution: "Smokes outside, and has friends over often",
    },
  },
  {
    name: "Aditi",
    isSeed: true,
    ageRange: "30-39",
    occupation: "working",
    about:
      "Architect who works from home three days a week. I have a small, calm cat called Biscuit.",
    lifestyle: {
      food: "eggetarian",
      pets: "have",
      workMode: "hybrid",
      cleanliness: "tidy",
      sleep: "early",
    },
    compatibility: {
      percent: 72,
      reasons: ["Tidy", "Early riser", "Wants to stay a year or more"],
      caution: "Has a cat",
    },
  },
  {
    name: "Nikhil",
    isSeed: true,
    ageRange: "25-29",
    occupation: "other",
    about: "Freelance photographer. My hours are odd but I am tidy and I pay on time.",
    lifestyle: { food: "non_veg", smoking: "no", workMode: "home", guests: "sometimes" },
    compatibility: {
      percent: 69,
      reasons: ["Non-smoker", "Tidy"],
      caution: "Freelance income, and home most of the day",
    },
  },
];

/**
 * Which bot tenants like a flat, in the order they arrive: one for each time
 * in ARRIVALS_MS, starting from a different one of the eight for each flat, so
 * two flats do not meet the same people.
 */
export function botTenantsFor(
  listingId: string,
): { bot: BotTenant; index: number; waitMs: number }[] {
  const start = botSeed(listingId) % BOT_TENANTS.length;
  return ARRIVALS_MS.flatMap((waitMs, position) => {
    const index = (start + position) % BOT_TENANTS.length;
    const bot = BOT_TENANTS[index];
    return bot ? [{ bot, index, waitMs }] : [];
  });
}
