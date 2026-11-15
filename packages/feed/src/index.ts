/**
 * The ranking engine. Everything in this package is a pure function:
 * no database, no network, no framework imports. That is what lets the API,
 * the ranking lab and the simulation all share one implementation.
 *
 * The real features arrive in milestone M5 (see docs/SPEC.md section 8).
 */
export { budgetFit } from "./features/budget-fit";
