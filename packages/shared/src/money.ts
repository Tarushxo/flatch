const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

const LAKH = 100_000;
const CRORE = 10_000_000;

/**
 * Format whole rupees the way Indian listings write them.
 * Money is always an integer number of rupees in this codebase.
 *
 *   formatRupees(18500)                    -> "₹18,500"
 *   formatRupees(120000, { compact: true }) -> "₹1.2L"
 */
export function formatRupees(amount: number, options: { compact?: boolean } = {}): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`Rupee amounts must be whole numbers, got ${amount}`);
  }
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  if (options.compact) {
    if (abs >= CRORE) return `${sign}₹${inUnits(abs, CRORE)}Cr`;
    if (abs >= LAKH) return `${sign}₹${inUnits(abs, LAKH)}L`;
  }
  return `${sign}₹${inr.format(abs)}`;
}

/** Monthly rent as shown on a card: "₹18,500/mo". */
export function formatRent(amount: number): string {
  return `${formatRupees(amount)}/mo`;
}

/**
 * An amount in lakhs or crores to one decimal place, without a trailing ".0".
 * Truncates (so ₹1,99,999 never shows as ₹2L) and counts whole tenths of the
 * unit, which keeps the arithmetic exact.
 */
function inUnits(amount: number, unit: number): string {
  const tenths = Math.floor(amount / (unit / 10));
  return tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
}
