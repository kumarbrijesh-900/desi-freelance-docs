import { calculateTax } from "@/lib/invoice-tax";
import type { IndiaStateOption } from "@/lib/india-state-options";
import type {
  InvoiceComputedValues,
  InvoiceLineItem,
  Milestone,
} from "@/types/invoice";

type CalculateInvoiceTotalsInput = {
  lineItems: InvoiceLineItem[];
  milestones?: Milestone[];
  agencyState: IndiaStateOption | "";
  clientState: IndiaStateOption | "";
  isInternational: boolean;
  isClientSezUnit: boolean;
  gstRegistered: boolean;
  lutAvailability: "" | "yes" | "no";
  noLutTaxHandling: "" | "add-igst" | "keep-zero-tax";
  taxRate?: number;
  isRcmEnabled?: boolean;
};

/**
 * Flatten milestones into a single array of line items for calculation.
 * Used when the invoice uses the v1.5 milestone tree shape.
 */
export function flattenMilestonesToLineItems(
  milestones: Milestone[]
): InvoiceLineItem[] {
  return milestones.flatMap((m) => m.lineItems);
}

export function calculateInvoiceTotals({
  lineItems,
  milestones,
  agencyState,
  clientState,
  isInternational,
  isClientSezUnit,
  gstRegistered,
  lutAvailability,
  noLutTaxHandling,
  taxRate,
  isRcmEnabled = false,
}: CalculateInvoiceTotalsInput): InvoiceComputedValues {
  // Use milestones if provided and non-empty, otherwise fall back to lineItems
  const effectiveItems =
    milestones && milestones.length > 0
      ? flattenMilestonesToLineItems(milestones)
      : lineItems;

  const subtotal = effectiveItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);

  const taxBreakdown = calculateTax({
    subtotal,
    agencyState,
    clientState,
    isInternational,
    isClientSezUnit,
    gstRegistered,
    lutAvailability,
    noLutTaxHandling,
    taxRate,
  });

  return {
    subtotal,
    taxAmount: taxBreakdown.totalTax,
    grandTotal: subtotal + (isRcmEnabled ? 0 : taxBreakdown.totalTax),
    isRcmEnabled,
    ...taxBreakdown,
  };
}
