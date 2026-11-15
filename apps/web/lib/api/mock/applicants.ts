import {
  type Applicant,
  draftAsListing,
  type Match,
  type MyListing,
  type TenantProfile,
} from "@repo/shared";
import type { StoredListing } from "./lister-store";
import { type StoredMessage, unreadCount, visibleMessages } from "./matchmaker";

/*
 * The bot tenants. When someone posts a flat in the mock, a handful of these
 * "like" it over the next minute, so the lister has people to accept or
 * decline, and each one chats back once accepted.
 *
 * As in matchmaker.ts, everything here is a plain function of its inputs (the
 * clock is passed in), so it can be tested without waiting. From M2 real
 * tenants take their place, and seed tenants follow the same rules on the server.
 */

type BotTenant = Omit<Applicant, "id" | "listingId" | "likedAt">;

const POOL: BotTenant[] = [
  {
    name: "Sana",
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

/** How many bot tenants like each flat, and when, in milliseconds after it opens. */
export const ARRIVALS_MS = [2500, 7000, 16000, 30000, 50000] as const;

function seedFrom(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash;
}

/** A bot tenant's like, with the moment it reaches the lister. */
export type Arrival = { applicant: Applicant; arrivesAt: number };

/**
 * The tenants who will like a flat, in the order they arrive. Each flat gets
 * five of the eight, starting from a different one, so two flats do not see
 * the same queue. `opensAt` is when the flat started taking likes.
 */
export function arrivalsFor(listing: Pick<MyListing, "id">, opensAt: number): Arrival[] {
  const start = seedFrom(listing.id) % POOL.length;
  return ARRIVALS_MS.flatMap((wait, position) => {
    const bot = POOL[(start + position) % POOL.length];
    if (!bot) return [];
    const arrivesAt = opensAt + wait;
    return [
      {
        arrivesAt,
        applicant: {
          ...bot,
          id: `${listing.id}-t${(start + position) % POOL.length}`,
          listingId: listing.id,
          likedAt: new Date(arrivesAt).toISOString(),
        },
      },
    ];
  });
}

/** What a tenant says first once the lister has accepted them. */
export function applicantOpener(applicant: Applicant, listing: Pick<MyListing, "title">): string {
  return `Hi, ${applicant.name} here. Thanks for accepting! I'd love to see "${listing.title}". When would suit you for a visit?`;
}

const REPLIES = [
  "Any evening this week works for me, or Saturday morning. Should I bring anything, like ID?",
  "Happy to tell you more when we meet. I have shared flats before and can pass on a reference.",
  "Perfect, thank you. See you then!",
  "Looking forward to it.",
];

/** What the tenant says back to the lister's nth message (counting from 1). */
export function applicantReplyFor(messageNumber: number): string {
  return REPLIES[Math.min(messageNumber, REPLIES.length) - 1] ?? REPLIES[0] ?? "";
}

/** The tenants whose likes have reached the lister by now. A closed flat takes no new likes. */
export function arrivedBy(listing: StoredListing, now: number): Applicant[] {
  const until = listing.closedAt ?? now;
  return arrivalsFor(listing, listing.opensAt)
    .filter((arrival) => arrival.arrivesAt <= until)
    .map((arrival) => arrival.applicant);
}

/** The tenants still waiting for a yes or a no, in the order they arrived. */
export function waitingFor(listing: StoredListing, now: number): Applicant[] {
  return arrivedBy(listing, now).filter((applicant) => !listing.decisions[applicant.id]);
}

/** A tenant the lister said yes to, with the moment they said it. */
export type Accepted = { applicant: Applicant; acceptedAt: number };

export function acceptedFor(listing: StoredListing, now: number): Accepted[] {
  return arrivedBy(listing, now).flatMap((applicant) => {
    const decided = listing.decisions[applicant.id];
    return decided?.decision === "accept" ? [{ applicant, acceptedAt: decided.at }] : [];
  });
}

/** The id of the match between a lister and a tenant they accepted. */
export function listerMatchId(applicantId: string): string {
  return `match-${applicantId}`;
}

/** A flat as the lister's list shows it: the form's answers plus how it is doing. */
export function toMyListing(listing: StoredListing, now: number): MyListing {
  const { opensAt: _opensAt, closedAt: _closedAt, decisions: _decisions, ...rest } = listing;
  return {
    ...rest,
    isVerified: rest.isVerified ?? false,
    expiresAt: rest.expiresAt ?? null,
    underReview: rest.underReview ?? false,
    interestedCount: waitingFor(listing, now).length,
    matchCount: acceptedFor(listing, now).length,
  };
}

/** A match as the lister sees it: the other person is the tenant. */
export function toListerMatch(
  listing: StoredListing,
  { applicant, acceptedAt }: Accepted,
  lister: Pick<TenantProfile, "name" | "about">,
  thread: StoredMessage[],
  lastReadAt: number,
  now: number,
): Match {
  const messages = visibleMessages(thread, now);
  return {
    id: listerMatchId(applicant.id),
    side: "lister",
    person: { name: applicant.name, about: applicant.about },
    applicant,
    listing: draftAsListing(listing, lister, listing.id),
    address: { society: listing.society, line: listing.addressLine },
    matchedAt: new Date(acceptedAt).toISOString(),
    lastMessage: messages[messages.length - 1] ?? null,
    unreadCount: unreadCount(thread, lastReadAt, now),
  };
}
