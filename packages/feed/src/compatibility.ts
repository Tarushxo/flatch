import {
  type Compatibility,
  formatRupees,
  type LifestyleKey,
  type TenantPreferences,
} from "@repo/shared";
import { budgetFit } from "./features/budget-fit";
import { freshness, locationFit, quality } from "./features/extras";
import {
  breaksDealbreaker,
  householdFrom,
  type LifestyleMatch,
  lifestyleFit,
  lifestyleMatches,
} from "./features/lifestyle";
import { timingFit } from "./features/timing";

/** Bumped whenever scoring changes, so logged scores can be told apart. */
export const ALGO_VERSION = "v1";

/** What scoring needs to know about a flat. All of it is public information. */
export type ScoredFlat = {
  /** Rent plus the recurring extras, in rupees. */
  monthlyCost: number;
  locality: string;
  /** ISO date, e.g. "2026-12-01". */
  availableFrom: string;
  houseRules: { label: string; allowed: boolean }[];
  photoCount: number;
  descriptionLength: number;
  isVerified: boolean;
  publishedAt: Date;
};

/** What scoring needs to know about a tenant: what they said they want. */
export type ScoredTenant = Pick<
  TenantPreferences,
  "budgetMax" | "localities" | "moveIn" | "lifestyle" | "dealbreakers"
>;

/** Each part of the fit, from 0 to 1, or null where the tenant has given nothing to go on. */
export type Fit = {
  budget: number | null;
  location: number | null;
  timing: number | null;
  lifestyle: number | null;
};

export function fitOf(tenant: ScoredTenant, flat: ScoredFlat, today: Date): Fit {
  const household = householdFrom(flat.houseRules);
  return {
    budget: tenant.budgetMax === null ? null : budgetFit(flat.monthlyCost, tenant.budgetMax),
    location: locationFit(flat.locality, tenant.localities),
    timing: timingFit(flat.availableFrom, tenant.moveIn, today),
    lifestyle: lifestyleFit(tenant.lifestyle, household, tenant.dealbreakers),
  };
}

/** The share each part of the fit has in the percentage people see (SPEC 8.3). */
export const DISPLAY_WEIGHTS: Record<keyof Fit, number> = {
  budget: 0.25,
  location: 0.25,
  timing: 0.1,
  lifestyle: 0.4,
};

/** A weighted average over the parts that are known. Null when none are. */
function blend(fit: Fit, weights: Record<keyof Fit, number>): number | null {
  let total = 0;
  let weight = 0;
  for (const key of Object.keys(weights) as (keyof Fit)[]) {
    const value = fit[key];
    if (value === null) continue;
    total += value * weights[key];
    weight += weights[key];
  }
  return weight === 0 ? null : total / weight;
}

/**
 * The match percentage, built only from fit. Where the tenant has said
 * nothing about a part (no budget, any area), that part is left out and the
 * others share its weight. Null when there is nothing to go on at all: an
 * honest "we cannot say" is better than an invented number.
 */
export function matchPercent(fit: Fit): number | null {
  const value = blend(fit, DISPLAY_WEIGHTS);
  return value === null ? null : Math.round(value * 100);
}

/** What decides the order of the deck. The fit, plus a little for quality and newness. */
export const RANK_WEIGHTS = {
  budget: 0.22,
  location: 0.22,
  lifestyle: 0.25,
  timing: 0.08,
  quality: 0.08,
  freshness: 0.07,
} as const;

/**
 * A flat's place in a tenant's deck, from 0 to 1. Higher comes first. With
 * nothing known about the tenant it falls back to quality and newness, so a
 * visitor who skipped the questions still sees the better listings first.
 */
export function rankScore(tenant: ScoredTenant, flat: ScoredFlat, today: Date): number {
  const fit = fitOf(tenant, flat, today);
  const { quality: qualityWeight, freshness: freshnessWeight, ...fitWeights } = RANK_WEIGHTS;
  const fitShare =
    fitWeights.budget + fitWeights.location + fitWeights.lifestyle + fitWeights.timing;
  // An unknown fit counts as middling, so known good fits rise above it and known bad ones sink.
  const fitValue = blend(fit, fitWeights) ?? 0.5;
  const score =
    fitValue * fitShare +
    quality(flat) * qualityWeight +
    freshness(flat.publishedAt, today) * freshnessWeight;
  return Number((score / (fitShare + qualityWeight + freshnessWeight)).toFixed(4));
}

/** Whether a flat must be kept out of this tenant's deck altogether. */
export function isRuledOut(tenant: ScoredTenant, flat: ScoredFlat): boolean {
  return breaksDealbreaker(tenant.lifestyle, householdFrom(flat.houseRules), tenant.dealbreakers);
}

// ------------------------------------------------------------ in words

/** Who the sentences are written for: the tenant looking at a flat, or the lister looking at a tenant. */
export type Reader = "tenant" | "lister";

type Phrase = { good?: string; bad?: string };

/** One lifestyle question's match, in words for each reader. */
function lifestylePhrase(match: LifestyleMatch, reader: Reader): Phrase {
  const { key, tenant, household, score } = match;
  const forTenant: Partial<Record<LifestyleKey, Phrase>> = {
    food:
      household === "veg"
        ? {
            good: "Vegetarian household, like you",
            bad: "Vegetarian household: no non-veg cooking",
          }
        : { good: "Non-veg cooking is fine here", bad: "Non-veg is cooked here" },
    smoking:
      household === "yes"
        ? { good: "Smoking indoors is okay", bad: "Smoking indoors is allowed" }
        : { good: "No smoking indoors", bad: "No smoking indoors" },
    drinking:
      household === "no"
        ? { good: "No alcohol at home, like you", bad: "No alcohol at home" }
        : { good: "Relaxed about a drink at home", bad: "Alcohol is fine here" },
    pets: { good: tenant === "have" ? "Pets are welcome" : undefined, bad: "No pets allowed" },
    guests:
      household === "rarely"
        ? { good: "Quiet about guests, like you", bad: "No overnight guests" }
        : household === "often"
          ? { good: "Friends over is fine", bad: "A sociable household: friends over often" }
          : { good: "Guests are fine now and then", bad: "Guests only now and then" },
  };
  const forLister: Partial<Record<LifestyleKey, Phrase>> = {
    food: {
      good: tenant === "veg" ? "Vegetarian" : "Fine with your kitchen rules",
      bad: tenant === "veg" ? "Vegetarian, and non-veg is cooked here" : "Eats non-veg",
    },
    smoking: {
      good: tenant === "no" ? "Non-smoker" : "Smoking fits your rules",
      bad: tenant === "no" ? "Non-smoker, and smoking is allowed indoors" : "Smokes",
    },
    drinking: {
      good: tenant === "no" ? "Does not drink" : "Drinking fits your rules",
      bad: tenant === "no" ? "Does not drink" : "Drinks",
    },
    pets: { good: tenant === "have" ? "Has a pet, which you allow" : undefined, bad: "Has a pet" },
    guests: {
      good: tenant === "rarely" ? "Rarely has friends over" : "Guests fit your rules",
      bad: tenant === "often" ? "Has friends over often" : "Rarely has friends over",
    },
  };
  const phrase = (reader === "tenant" ? forTenant : forLister)[key] ?? {};
  return score === 1 ? { good: phrase.good } : score === 0 ? { bad: phrase.bad } : {};
}

/**
 * The fit in sentences: up to three reasons it is a good match, strongest
 * first, and the one thing most worth a second thought, if there is one.
 */
function inWords(
  tenant: ScoredTenant,
  flat: ScoredFlat,
  fit: Fit,
  reader: Reader,
): Pick<Compatibility, "reasons" | "caution"> {
  const good: { text: string; weight: number }[] = [];
  const bad: { text: string; severity: number }[] = [];
  const say = (text: string | undefined, weight: number) => {
    if (text) good.push({ text, weight });
  };
  const warn = (text: string | undefined, severity: number) => {
    if (text) bad.push({ text, severity });
  };

  if (fit.budget !== null && tenant.budgetMax !== null) {
    const spare = tenant.budgetMax - flat.monthlyCost;
    if (spare >= 0) {
      const roomy = spare >= tenant.budgetMax * 0.1;
      say(
        reader === "tenant"
          ? roomy
            ? `${formatRupees(spare)} under your budget`
            : "Within your budget"
          : "Can afford the full monthly cost",
        DISPLAY_WEIGHTS.budget + (roomy ? 0.01 : 0),
      );
    } else {
      warn(
        reader === "tenant"
          ? `${formatRupees(-spare)} over your budget`
          : `Their budget is ${formatRupees(-spare)} short of the monthly cost`,
        (1 - fit.budget) * DISPLAY_WEIGHTS.budget,
      );
    }
  }

  if (fit.location !== null) {
    if (fit.location === 1) {
      say(
        reader === "tenant" ? `In ${flat.locality}, an area you picked` : "Looking in your area",
        DISPLAY_WEIGHTS.location,
      );
    } else {
      warn(
        reader === "tenant" ? "Not in the areas you picked" : "Was looking in other areas",
        (1 - fit.location) * DISPLAY_WEIGHTS.location,
      );
    }
  }

  if (fit.timing !== null) {
    if (fit.timing === 1) {
      say(
        reader === "tenant" ? "Free when you want to move" : "Wants to move when the room is free",
        DISPLAY_WEIGHTS.timing,
      );
    } else if (fit.timing < 0.7) {
      warn(
        reader === "tenant" ? "The dates do not line up well" : "Wants to move at a different time",
        (1 - fit.timing) * DISPLAY_WEIGHTS.timing,
      );
    }
  }

  const matches = lifestyleMatches(tenant.lifestyle, householdFrom(flat.houseRules));
  const each = DISPLAY_WEIGHTS.lifestyle / Math.max(1, matches.length);
  for (const match of matches) {
    const phrase = lifestylePhrase(match, reader);
    const dealbreaker = tenant.dealbreakers.includes(match.key);
    // Something the tenant called a dealbreaker is worth saying before anything else.
    say(phrase.good, dealbreaker ? 0.5 : each);
    warn(phrase.bad, dealbreaker ? 1 : each);
  }

  good.sort((a, b) => b.weight - a.weight);
  bad.sort((a, b) => b.severity - a.severity);
  return {
    reasons: good.slice(0, 3).map((item) => item.text),
    ...(bad[0] ? { caution: bad[0].text } : {}),
  };
}

/**
 * How well a tenant and a flat fit, as people are shown it: a percentage, the
 * reasons, and a caution. The percentage is 0 with no reasons when the tenant
 * has given nothing to go on, which the app shows as "no score yet".
 */
export function compatibility(
  tenant: ScoredTenant,
  flat: ScoredFlat,
  today: Date,
  reader: Reader = "tenant",
): Compatibility {
  const fit = fitOf(tenant, flat, today);
  const percent = matchPercent(fit);
  if (percent === null) return { percent: 0, reasons: [] };
  // Zero is how "no score" is written, so a worked-out score never goes below 1:
  // a flat that clashes on everything still shows its ring and its warning.
  return { percent: Math.max(percent, 1), ...inWords(tenant, flat, fit, reader) };
}
