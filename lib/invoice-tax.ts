import type { IndiaStateOption } from "@/lib/india-state-options";
import type { InvoiceTaxBreakdown } from "@/types/invoice";

type CalculateTaxInput = {
  subtotal: number;
  agencyState: IndiaStateOption | "";
  clientState: IndiaStateOption | "";
  isInternational: boolean;
  gstRegistered: boolean;
  lutAvailability: "" | "yes" | "no";
  noLutTaxHandling: "" | "add-igst" | "keep-zero-tax";
};

export function calculateTax({
  subtotal,
  agencyState,
  clientState,
  isInternational,
  gstRegistered,
  lutAvailability,
  noLutTaxHandling,
}: CalculateTaxInput): InvoiceTaxBreakdown {
  if (!gstRegistered) {
    return {
      totalTax: 0,
      taxType: "NONE",
    };
  }

  if (isInternational) {
    if (lutAvailability === "yes") {
      return {
        totalTax: 0,
        taxType: "NONE",
      };
    }

    if (noLutTaxHandling === "add-igst") {
      const igst = subtotal * 0.18;

      return {
        igst,
        totalTax: igst,
        taxType: "IGST",
      };
    }

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
