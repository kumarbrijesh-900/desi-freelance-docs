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
