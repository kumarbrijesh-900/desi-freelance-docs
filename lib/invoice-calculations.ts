import type {
    InvoiceComputedValues,
    InvoiceLineItem,
    TaxConfig,
  } from "@/types/invoice";
  
  export function calculateInvoiceTotals(
    lineItems: InvoiceLineItem[],
    tax: TaxConfig
  ): InvoiceComputedValues {
    const subtotal = lineItems.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      return sum + qty * rate;
    }, 0);
  
    const taxRate = Number(tax.taxRate) || 0;
    const taxAmount =
      tax.taxMode === "none" ? 0 : (subtotal * taxRate) / 100;
  
    const grandTotal = subtotal + taxAmount;
  
    return {
      subtotal,
      taxAmount,
      grandTotal,
    };
  }