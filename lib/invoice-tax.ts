import type { IndiaStateOption } from "@/lib/india-state-options";
import type { InvoiceTaxBreakdown } from "@/types/invoice";

type CalculateTaxInput = {
  subtotal: number;
  agencyState: IndiaStateOption | "";
  clientState: IndiaStateOption | "";
  isInternational: boolean;
  isClientSezUnit: boolean;
  gstRegistered: boolean;
  lutAvailability: "" | "yes" | "no";
  noLutTaxHandling: "" | "add-igst" | "keep-zero-tax";
  taxRate?: number;
};

export function calculateTax({
  subtotal,
  agencyState,
  clientState,
  isInternational,
  isClientSezUnit,
  gstRegistered,
  lutAvailability,
  noLutTaxHandling,
  taxRate = 18,
}: CalculateTaxInput): InvoiceTaxBreakdown {
  const rate = taxRate / 100;

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
      const igst = subtotal * rate;

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

  if (isClientSezUnit) {
    if (lutAvailability === "yes") {
      return {
        totalTax: 0,
        taxType: "NONE",
      };
    }

    const igst = subtotal * rate;

    return {
      igst,
      totalTax: igst,
      taxType: "IGST",
    };
  }

  if (!agencyState || !clientState) {
    return {
      totalTax: 0,
      taxType: "NONE",
    };
  }

  if (agencyState === clientState) {
    const cgst = subtotal * (rate / 2);
    const sgst = subtotal * (rate / 2);

    return {
      cgst,
      sgst,
      totalTax: cgst + sgst,
      taxType: "CGST_SGST",
    };
  }

  const igst = subtotal * rate;

  return {
    igst,
    totalTax: igst,
    taxType: "IGST",
  };
}
