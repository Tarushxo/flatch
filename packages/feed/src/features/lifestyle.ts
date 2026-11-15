import { LIFESTYLE, LIFESTYLE_KEYS, type LifestyleKey, type TenantPreferences } from "@repo/shared";

/** One answer per lifestyle question, for a tenant or for a household. */
export type Lifestyle = TenantPreferences["lifestyle"];

type Rule = { label: string; allowed: boolean };

/**
 * How a household lives, read from its house rules. A flat does not answer
 * the eight lifestyle questions itself; its rules say the same things from the
 * other side ("Non-veg cooking: not okay" is a vegetarian household). Only
 * what the rules actually say is filled in.
 */
export function householdFrom(houseRules: Rule[]): Lifestyle {
  const household: Lifestyle = {};
  const said = (label: string) => houseRules.find((rule) => rule.label === label)?.allowed;

  const nonVeg = said("Non-veg cooking");
  if (nonVeg !== undefined) household.food = nonVeg ? "non_veg" : "veg";

  // The strictest thing said about smoking wins.
  if (said("Smoking") === false) household.smoking = "no";
  else if (said("Smoking indoors") === true) household.smoking = "yes";
  else if (said("Smoking indoors") === false || said("Smoking on the balcony") === true) {
    household.smoking = "outside";
  }

  const alcohol = said("Alcohol");
  if (alcohol !== undefined) household.drinking = alcohol ? "social" : "no";

  const pets = said("Pets");
  if (pets !== undefined) household.pets = pets ? "fine_with" : "none";

  if (said("Parties") === true || said("Weekend get-togethers") === true)
    household.guests = "often";
  else if (said("Overnight guests") === false) household.guests = "rarely";
  else if (said("Overnight guests") === true || said("Guests until 10 pm") === true) {
    household.guests = "sometimes";
  } else if (said("Parties") === false) household.guests = "rarely";

  return household;
}

/**
 * How well one answer sits with another, from 0 to 1. The answers to each
 * question run from one end to the other, so the same answer scores 1, a
 * neighbouring one 0.6 and opposite ends 0. Pets are the exception: the only
 * clash is a tenant with a pet and a home that does not allow them.
 */
export function similarity(key: LifestyleKey, tenant: string, household: string): number {
  if (key === "pets") return tenant === "have" && household === "none" ? 0 : 1;
  const scale = LIFESTYLE[key] as readonly string[];
  const apart = Math.abs(scale.indexOf(tenant) - scale.indexOf(household));
  return apart === 0 ? 1 : apart === 1 ? 0.6 : 0;
}

export type LifestyleMatch = {
  key: LifestyleKey;
  tenant: string;
  household: string;
  score: number;
};

/** Each question both sides have an answer to, with how well the answers sit together. */
export function lifestyleMatches(tenant: Lifestyle, household: Lifestyle): LifestyleMatch[] {
  return LIFESTYLE_KEYS.flatMap((key) => {
    const mine = tenant[key];
    const theirs = household[key];
    if (mine === undefined || theirs === undefined) return [];
    return [{ key, tenant: mine, household: theirs, score: similarity(key, mine, theirs) }];
  });
}

/** A question the tenant called a dealbreaker counts double. */
const DEALBREAKER_WEIGHT = 2;

/**
 * How well a tenant's way of living fits a household's, from 0 to 1, over the
 * questions both have answered. Null when they have none in common, which
 * means "unknown", not "bad".
 */
export function lifestyleFit(
  tenant: Lifestyle,
  household: Lifestyle,
  dealbreakers: readonly LifestyleKey[] = [],
): number | null {
  const matches = lifestyleMatches(tenant, household);
  if (matches.length === 0) return null;
  let total = 0;
  let weight = 0;
  for (const match of matches) {
    const w = dealbreakers.includes(match.key) ? DEALBREAKER_WEIGHT : 1;
    total += match.score * w;
    weight += w;
  }
  return total / weight;
}

/** Whether the household clashes outright with something the tenant will not live with. */
export function breaksDealbreaker(
  tenant: Lifestyle,
  household: Lifestyle,
  dealbreakers: readonly LifestyleKey[],
): boolean {
  return lifestyleMatches(tenant, household).some(
    (match) => dealbreakers.includes(match.key) && match.score === 0,
  );
}
