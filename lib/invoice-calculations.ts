import { calculateTax } from "@/lib/invoice-tax";
import type { IndiaStateOption } from "@/lib/india-state-options";
import type {
  InvoiceComputedValues,
  InvoiceLineItem,
} from "@/types/invoice";

type CalculateInvoiceTotalsInput = {
  lineItems: InvoiceLineItem[];
  agencyState: IndiaStateOption | "";
  clientState: IndiaStateOption | "";
  isInternational: boolean;
  gstRegistered: boolean;
};

export function calculateInvoiceTotals({
  lineItems,
  agencyState,
  clientState,
  isInternational,
  gstRegistered,
}: CalculateInvoiceTotalsInput): InvoiceComputedValues {
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);

  const taxBreakdown = calculateTax({
    subtotal,
    agencyState,
    clientState,
    isInternational,
    gstRegistered,
  });

  return {
    subtotal,
    taxAmount: taxBreakdown.totalTax,
    grandTotal: subtotal + taxBreakdown.totalTax,
    ...taxBreakdown,
  };
}
