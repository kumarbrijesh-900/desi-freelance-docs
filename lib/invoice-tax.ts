import type { IndiaStateOption } from "@/lib/india-state-options";
import type { InvoiceTaxBreakdown } from "@/types/invoice";

type CalculateTaxInput = {
  subtotal: number;
  agencyState: IndiaStateOption | "";
  clientState: IndiaStateOption | "";
  isInternational: boolean;
  gstRegistered: boolean;
};

export function calculateTax({
  subtotal,
  agencyState,
  clientState,
  isInternational,
  gstRegistered,
}: CalculateTaxInput): InvoiceTaxBreakdown {
  if (isInternational || !gstRegistered) {
    return {
      totalTax: 0,
      taxType: "NONE",
    };
  }

  if (!agencyState || !clientState) {
    return {
      totalTax: 0,
      taxType: "NONE",
    };
  }

  if (agencyState === clientState) {
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;

    return {
      cgst,
      sgst,
      totalTax: cgst + sgst,
      taxType: "CGST_SGST",
    };
  }

  const igst = subtotal * 0.18;

  return {
    igst,
    totalTax: igst,
    taxType: "IGST",
  };
}
