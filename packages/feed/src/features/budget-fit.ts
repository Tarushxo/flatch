/** How far over budget a flat can be before it scores zero (20%). */
const STRETCH_LIMIT = 0.2;

/**
 * Score how well a flat's total monthly cost fits a tenant's budget.
 *
 * Returns 1 when the cost is at or under the budget, then falls in a straight
 * line to 0 at 20% over. Always within [0, 1].
 */
export function budgetFit(monthlyCost: number, budgetMax: number): number {
  if (budgetMax <= 0 || monthlyCost < 0) return 0;
  if (monthlyCost <= budgetMax) return 1;

  const overBy = (monthlyCost - budgetMax) / budgetMax;
  if (overBy >= STRETCH_LIMIT) return 0;

  return 1 - overBy / STRETCH_LIMIT;
}
