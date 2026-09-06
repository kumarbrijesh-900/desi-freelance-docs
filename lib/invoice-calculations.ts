import { computeInvoiceTax } from "@/lib/invoice-tax";
import type {
  InvoiceComputedValues,
  InvoiceLineItem,
  Milestone,
} from "@/types/invoice";

export function flattenMilestonesToLineItems(
  milestones: Milestone[]
): InvoiceLineItem[] {
  return milestones.flatMap((m) => m.lineItems);
}

/**
 * The amount actually payable, tax inclusive. Derived from form_data via the
 * same calculateInvoiceTotals the invoice document uses, so a summary card can
 * never disagree with the PDF it summarises.
 *
 * The grand_total COLUMN is the pre-tax subtotal (see lib/supabase/invoices.ts
 * where it is written). It is kept only as a fallback for legacy rows whose
 * form_data cannot be resolved.
 */
/**
 * Ratio between an invoice's payable and its pre-tax subtotal — i.e. its
 * effective tax multiplier, derived rather than hardcoded so it stays correct
 * at any GST rate, under RCM, and for exports. Used to put pre-tax
 * invoice_milestones.amount figures on the same basis as the money shown
 * everywhere else. Returns 1 when there is nothing to divide by.
 */
export function invoiceTaxFactor(invoice: any): number {
  const taxable = Number(invoice?.grand_total || 0);
  if (taxable <= 0) return 1;
  const payable = resolveInvoicePayable(invoice);
  return payable > 0 ? payable / taxable : 1;
}

export function resolveInvoicePayable(invoice: any): number {
  try {
    const fd = invoice?.form_data;
    if (fd && (fd.milestones?.length || fd.lineItems?.length)) {
      const totals = calculateInvoiceTotals(fd);
      const payable = Number(totals?.grandTotal || 0);
      if (payable > 0) return payable;
    }
  } catch {
    // fall through to the stored subtotal
  }
  return Number(invoice?.grand_total || 0);
}

export function calculateInvoiceTotals(formData: any): InvoiceComputedValues {
  const lineItems = formData?.lineItems || [];
  const milestones = formData?.milestones || [];
  const isRcmEnabled = formData?.tax?.isRcmEnabled || false;

  // Use milestones if provided and non-empty, otherwise fall back to lineItems
  const effectiveItems =
    milestones && milestones.length > 0
      ? (milestones[0]?.lineItems ?? [])
      : lineItems;

  const subtotal = effectiveItems.reduce((sum: number, item: any) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);

  const taxBreakdown = computeInvoiceTax(formData, subtotal);

  return {
    subtotal,
    grandTotal: subtotal + (isRcmEnabled ? 0 : taxBreakdown.taxAmount),
    isRcmEnabled,
    ...taxBreakdown,
  };
}
