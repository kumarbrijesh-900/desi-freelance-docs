import { computeInvoiceMoney } from "@/lib/money/compute-invoice-money";
import { buildTaxContext } from "@/lib/money/tax-context";
import type { InvoiceMoney, TaxContext } from "@/lib/money/types";
import type {
  InvoiceComputedValues,
  InvoiceLineItem,
  InvoiceTaxType,
  Milestone,
} from "@/types/invoice";

export function flattenMilestonesToLineItems(
  milestones: Milestone[]
): InvoiceLineItem[] {
  return milestones.flatMap((m) => m.lineItems);
}

/**
 * Tax on an amount that is NOT the invoice's own line-item total - a single
 * milestone's value, say. `calculateInvoiceTotals` cannot express this: it
 * derives the taxable value from the line items.
 *
 * Both surfaces that needed this used to call `computeInvoiceTax` directly,
 * which is a SECOND implementation of the tax rules. That is how the invoice
 * document came to print correct CGST/SGST rows under a total that excluded
 * them - the rows came from one implementation and the total from the other,
 * and nothing could tell they disagreed. One source, or the two will drift.
 *
 * `tests/money/run-legacy-parity-tests.ts` sweeps 11,664 combinations and
 * asserts the engine matches `computeInvoiceTax` on every one, with a single
 * intended divergence: a LUT that lapsed on 31 March, which the engine catches
 * and the legacy misses. Callers get the correct answer there.
 */
export function computeTaxOnAmount(
  formData: any,
  taxableValue: number,
): InvoiceComputedValues {
  return calculateInvoiceTotals({
    ...formData,
    // One synthetic line carrying the amount. Everything else - registration,
    // place of supply, LUT, reverse charge, rate - still comes from formData.
    milestones: undefined,
    lineItems: [{ qty: 1, rate: Number(taxableValue) || 0 }],
  });
}

/**
 * The amount actually payable, tax inclusive, FOR THE LINE ITEMS THIS INVOICE
 * BILLS - milestone[0] on a master, the single milestone on a child. It is not
 * the project total, and on a five-milestone master it is roughly a third of
 * one. See `billableLineItems` below, which is where that invariant lives.
 *
 * That scope is stated here because its absence cost a wrong answer: a reader
 * took "the amount actually payable" at face value, concluded the ledger was
 * subtracting an all-milestones payable from a milestone[0] taxable value, and
 * reported a GST figure inflated 2.85x that was never wrong. Both sides of that
 * subtraction are milestone[0]. The arithmetic is correct.
 *
 * Derived from form_data via the same calculateInvoiceTotals the invoice
 * document uses, so a summary card can never disagree with the PDF it
 * summarises.
 *
 * The grand_total COLUMN is the pre-tax subtotal (see lib/supabase/invoices.ts
 * where it is written). It is kept only as a fallback for legacy rows whose
 * form_data cannot be resolved.
 *
 * Deliberately UNROUNDED. `computeInvoiceMoney` also returns `amountPayable`,
 * which is the whole-rupee figure under Sec 170, but moving the ledger onto it
 * is a separate decision from putting it onto the engine — so this returns
 * `grossBeforeRounding` and every surface keeps the figure it shows today.
 */
export function resolveInvoicePayable(invoice: any): number {
  try {
    const fd = invoice?.form_data;
    if (fd && (fd.milestones?.length || fd.lineItems?.length)) {
      const totals = calculateInvoiceTotals(fd);
      const payable = Number(totals?.grandTotal);
      // The guard is whether the engine RESOLVED, not whether it returned a
      // positive number. `payable > 0` treated a legitimately zero invoice -
      // which the engine models, money fixture 9 - as an unresolved form_data
      // and reached for a stale grand_total instead of returning 0.
      if (Number.isFinite(payable)) return payable;
    }
  } catch {
    // fall through to the stored subtotal
  }
  return Number(invoice?.grand_total || 0);
}

/** The engine's treatment vocabulary, narrowed to the four the document uses. */
function toTaxType(money: InvoiceMoney): InvoiceTaxType {
  switch (money.treatment) {
    case "intrastate":
      return "cgst_sgst";
    case "interstate":
    case "export_igst":
    case "sez_igst":
      return "igst";
    case "export_zero_rated":
    case "sez_zero_rated":
      return "zero_rated";
    default:
      return "exempt";
  }
}

/**
 * Which line items an invoice bills.
 *
 * A master carries the whole milestone array but bills only the first; a child
 * is generated with `milestones: [thatOne]`. So "milestones[0]" is the invariant,
 * not an accident, and it is preserved here exactly as it was.
 */
function billableLineItems(formData: any): any[] {
  const milestones = formData?.milestones || [];
  if (milestones.length > 0) return milestones[0]?.lineItems ?? [];
  return formData?.lineItems || [];
}

function contextFor(formData: any): TaxContext {
  return buildTaxContext({
    agency: formData?.agency ?? {},
    client: formData?.client ?? {},
    tax: formData?.tax ?? {},
    supplyDate: formData?.meta?.invoiceDate ?? "",
  });
}

/**
 * Adapter over `computeInvoiceMoney`, returning the shape this function has
 * always returned so that no caller changes.
 *
 * `tests/money/run-calculate-totals-parity-tests.ts` holds a frozen copy of the
 * implementation this replaced and asserts all thirteen fields match across the
 * full input matrix. When the last caller moves to the engine directly, delete
 * this function and that test together.
 */
export function calculateInvoiceTotals(formData: any): InvoiceComputedValues {
  const ctx = contextFor(formData);
  const money = computeInvoiceMoney(billableLineItems(formData), ctx);
  const taxType = toTaxType(money);
  const taxed = taxType === "cgst_sgst" || taxType === "igst";

  return {
    subtotal: money.taxableValue,
    grandTotal: money.grossBeforeRounding,
    isRcmEnabled: ctx.reverseCharge,
    registered: money.treatment !== "unregistered",
    taxType,
    rate: taxed ? ctx.defaultRate : 0,
    taxableValue: money.taxableValue,
    cgst: money.cgstTotal,
    sgst: money.sgstTotal,
    igst: money.igstTotal,
    taxAmount: money.taxTotal,
    warnings: money.warnings,
    totalPayable: money.grossBeforeRounding,
    label: money.label,
  };
}
