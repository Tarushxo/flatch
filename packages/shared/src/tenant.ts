import type { z } from "zod";
import { DEFAULT_CITY } from "./constants";
import type { FeedFilters } from "./listing";
import type { TenantPreferencesSchema, TenantProfileSchema } from "./schemas";

/*
 * The tenant: who they are and what they are looking for. The fixed lists of
 * choices live here with their wording, so the onboarding screens, the profile
 * and (later) the ranking engine all read from one place.
 */

/** The eight lifestyle questions. Each has three answers, in order from one end to the other. */
export const LIFESTYLE = {
  food: ["veg", "eggetarian", "non_veg"],
  smoking: ["no", "outside", "yes"],
  drinking: ["no", "social", "regular"],
  pets: ["none", "fine_with", "have"],
  sleep: ["early", "flexible", "night_owl"],
  cleanliness: ["relaxed", "tidy", "spotless"],
  guests: ["rarely", "sometimes", "often"],
  workMode: ["office", "hybrid", "home"],
} as const;

export type LifestyleKey = keyof typeof LIFESTYLE;
/** The questions in the order they are asked. */
export const LIFESTYLE_KEYS = [
  "food",
  "smoking",
  "drinking",
  "pets",
  "sleep",
  "cleanliness",
  "guests",
  "workMode",
] as const satisfies readonly LifestyleKey[];

/** How each lifestyle question and its answers are worded. */
export const LIFESTYLE_WORDING: Record<LifestyleKey, { question: string; answers: string[] }> = {
  food: { question: "What do you eat?", answers: ["Vegetarian", "Eggs too", "Everything"] },
  smoking: { question: "Do you smoke?", answers: ["No", "Only outside", "Yes"] },
  drinking: { question: "Do you drink?", answers: ["No", "Socially", "Regularly"] },
  pets: { question: "Pets?", answers: ["Not for me", "Fine with them", "I have one"] },
  sleep: { question: "When do you sleep?", answers: ["Early", "It varies", "Late"] },
  cleanliness: { question: "How tidy are you?", answers: ["Relaxed", "Tidy", "Spotless"] },
  guests: { question: "Friends over?", answers: ["Rarely", "Sometimes", "Often"] },
  workMode: { question: "Where do you work?", answers: ["Office", "Hybrid", "From home"] },
};

export const MOVE_IN = ["asap", "month", "quarter", "browsing"] as const;
export const MOVE_IN_LABELS: Record<(typeof MOVE_IN)[number], string> = {
  asap: "As soon as possible",
  month: "Within a month",
  quarter: "In one to three months",
  browsing: "Just looking for now",
};

export const STAY = ["short", "medium", "long"] as const;
export const STAY_LABELS: Record<(typeof STAY)[number], string> = {
  short: "A few months",
  medium: "Six months to a year",
  long: "A year or more",
};

export const AGE_RANGES = ["18-24", "25-29", "30-39", "40+"] as const;

export const OCCUPATIONS = ["student", "working", "other"] as const;
export const OCCUPATION_LABELS: Record<(typeof OCCUPATIONS)[number], string> = {
  student: "Student",
  working: "Working",
  other: "Something else",
};

/** The two sides of the app. One person can use both, one at a time. */
export const MODES = ["tenant", "lister"] as const;
export type Mode = (typeof MODES)[number];

export const NAME_MAX_LENGTH = 40;
export const ABOUT_MAX_LENGTH = 280;

export type TenantPreferences = z.infer<typeof TenantPreferencesSchema>;
export type TenantProfile = z.infer<typeof TenantProfileSchema>;

/** What a brand-new visitor starts with: the default city and no other limits. */
export const DEFAULT_PREFERENCES: TenantPreferences = {
  city: DEFAULT_CITY,
  budgetMax: null,
  localities: [],
  moveIn: null,
  stay: null,
  roomTypes: [],
  lifestyle: {},
  dealbreakers: [],
};

export const DEFAULT_PROFILE: TenantProfile = {
  name: "",
  ageRange: null,
  occupation: null,
  about: "",
  preferences: DEFAULT_PREFERENCES,
  mode: "tenant",
  onboardedAt: null,
};

/** The deck filters a tenant's saved preferences amount to. */
export function preferencesToFilters(preferences: TenantPreferences): FeedFilters {
  return {
    city: preferences.city,
    budgetMax: preferences.budgetMax,
    localities: preferences.localities,
    roomTypes: preferences.roomTypes,
  };
}

/** How many of the eight lifestyle questions have an answer. */
export function lifestyleAnswered(preferences: TenantPreferences): number {
  return LIFESTYLE_KEYS.filter((key) => preferences.lifestyle[key] !== undefined).length;
}

/**
 * Tidy preferences before they are saved: a dealbreaker only makes sense on a
 * question that has an answer, and a change of city makes the old areas wrong.
 */
export function cleanPreferences(
  next: TenantPreferences,
  previous?: TenantPreferences,
): TenantPreferences {
  const cityChanged = previous !== undefined && previous.city !== next.city;
  return {
    ...next,
    localities: cityChanged ? [] : next.localities,
    dealbreakers: next.dealbreakers.filter((key) => next.lifestyle[key] !== undefined),
  };
}
