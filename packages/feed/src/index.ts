/**
 * The ranking engine. Everything in this package is a pure function:
 * no database, no network, no framework imports. That is what lets the API,
 * the ranking lab and the simulation all share one implementation.
 *
 * See docs/SPEC.md section 8.
 */
export {
  ALGO_VERSION,
  compatibility,
  DISPLAY_WEIGHTS,
  type Fit,
  fitOf,
  isRuledOut,
  matchPercent,
  RANK_WEIGHTS,
  type Reader,
  rankScore,
  type ScoredFlat,
  type ScoredTenant,
} from "./compatibility";
export { budgetFit } from "./features/budget-fit";
export { freshness, locationFit, quality } from "./features/extras";
export {
  breaksDealbreaker,
  householdFrom,
  type Lifestyle,
  lifestyleFit,
  lifestyleMatches,
  similarity,
} from "./features/lifestyle";
export { daysUntilFree, timingFit } from "./features/timing";
