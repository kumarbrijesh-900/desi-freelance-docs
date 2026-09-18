/**
 * Indian-format rupee amount.
 *
 * Lived in components/dashboard/ActiveDrilldown.tsx until that component was
 * deleted (unmounted, 335 lines). Six files import this three-line function,
 * and importing it from a "use client" component dragged lib/supabase/client
 * into every one of them.
 *
 * NOT interchangeable with formatCurrency(amount, "INR") in
 * lib/invoice-editor-utils.ts, which is a different function despite looking
 * like the same one. Measured across eleven values, they agree on nine and
 * differ on two:
 *
 *   -500  ->  this gives  Rs-500     formatCurrency gives  -Rs500
 *   0.5   ->  this gives  Rs0.5      formatCurrency gives  Rs0.50
 *
 * Negatives and paise are both reachable, so swapping one for the other
 * changes what is on screen. If they should be unified, that is a deliberate
 * display decision, not a tidy-up.
 *
 * The rupee sign is written as an escape so this file stays ASCII and survives
 * transfer byte-exact. \u20B9 is the rupee sign; behaviour is identical.
 */
export function formatInr(amount: number | string): string {
  return `\u20B9${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}
