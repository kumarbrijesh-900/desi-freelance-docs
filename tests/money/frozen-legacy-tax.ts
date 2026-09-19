/**
 * FROZEN. Do not edit, do not fix, do not import from lib/ or app/.
 *
 * This was lib/invoice-tax.ts - a second implementation of the GST rules that
 * ran alongside the money engine. Two callers passing it a flattened object is
 * how an invoice came to print correct CGST/SGST rows above a TOTAL DUE that
 * excluded them: the rows came from one implementation, the total from the
 * other, and nothing could tell they disagreed.
 *
 * It has no production callers and no longer ships. It lives here as the oracle
 * for three regression suites that assert the engine still agrees with the
 * implementation it replaced, across 59,616 combinations, with one documented
 * divergence (a LUT lapsing on 31 March, which the engine catches and this does
 * not). Editing it would destroy that guarantee: its value is that it is fixed.
 */
import type { InvoiceTaxBreakdown } from "@/types/invoice";

export function computeInvoiceTax(formData: any, taxableValue: number = 0): InvoiceTaxBreakdown {
  const gstin = formData?.agency?.gstin || "";
  // Check either agency.gstRegistrationStatus === 'registered' or gstin.length === 15
  const isRegistered = formData?.agency?.gstRegistrationStatus === "registered" || gstin.length === 15;
  const rate = formData?.tax?.taxRate ?? 18;
  const clientLocation = formData?.client?.clientLocation;
  const lutAvailability = formData?.agency?.lutAvailability;
  const agencyState = formData?.agency?.agencyState;
  const clientState = formData?.client?.clientState;

  if (!isRegistered) {
    return {
      registered: false,
      taxType: 'exempt',
      rate: 0,
      taxableValue,
      cgst: 0, sgst: 0, igst: 0, taxAmount: 0,
      totalPayable: taxableValue,
      label: "GST not applicable",
    };
  }

  if (formData?.tax?.isRcmEnabled) {
    return {
      registered: true,
      taxType: 'exempt',
      rate: 0,
      taxableValue,
      cgst: 0, sgst: 0, igst: 0, taxAmount: 0,
      totalPayable: taxableValue,
      label: "Reverse charge \u2014 GST payable by recipient",
    };
  }

  if (clientLocation === "international") {
    if (lutAvailability === "no" || formData?.agency?.noLutTaxHandling === "add-igst") {
      const igst = Number((taxableValue * (rate / 100)).toFixed(2));
      return {
        registered: true,
        taxType: 'igst',
        rate,
        taxableValue,
        cgst: 0, sgst: 0, igst, taxAmount: igst,
        totalPayable: taxableValue + igst,
        label: `IGST ${rate}%`,
      };
    }
    return {
      registered: true,
      taxType: 'zero_rated',
      rate: 0,
      taxableValue,
      cgst: 0, sgst: 0, igst: 0, taxAmount: 0,
      totalPayable: taxableValue,
      label: "Export of services \u2014 zero-rated under LUT",
    };
  }

  // Domestic SEZ is technically zero-rated with LUT
  const clientIsSez = formData?.client?.isClientSezUnit === "yes";
  if (clientIsSez) {
    if (lutAvailability === "yes") {
      return {
        registered: true,
        taxType: 'zero_rated',
        rate: 0,
        taxableValue,
        cgst: 0, sgst: 0, igst: 0, taxAmount: 0,
        totalPayable: taxableValue,
        label: "SEZ Supply \u2014 zero-rated under LUT",
      };
    }
    const igst = Number((taxableValue * (rate / 100)).toFixed(2));
    return {
      registered: true,
      taxType: 'igst',
      rate,
      taxableValue,
      cgst: 0, sgst: 0, igst, taxAmount: igst,
      totalPayable: taxableValue + igst,
      label: `IGST ${rate}%`,
    };
  }

  if (!agencyState || !clientState) {
    return {
      registered: true,
      taxType: 'exempt', // fallback
      rate: 0,
      taxableValue,
      cgst: 0, sgst: 0, igst: 0, taxAmount: 0,
      totalPayable: taxableValue,
      label: "GST not applicable",
    };
  }

  if (agencyState === clientState) {
    const taxAmount = Number((taxableValue * (rate / 100)).toFixed(2));
    const half = Number((taxAmount / 2).toFixed(2));
    const remainder = Number((taxAmount - half).toFixed(2));
    return {
      registered: true,
      taxType: 'cgst_sgst',
      rate,
      taxableValue,
      cgst: half,
      sgst: remainder,
      igst: 0,
      taxAmount,
      totalPayable: taxableValue + taxAmount,
      label: `CGST ${rate/2}% + SGST ${rate/2}%`,
    };
  }

  const igst = Number((taxableValue * (rate / 100)).toFixed(2));
  return {
    registered: true,
    taxType: 'igst',
    rate,
    taxableValue,
    cgst: 0, sgst: 0, igst, taxAmount: igst,
    totalPayable: taxableValue + igst,
    label: `IGST ${rate}%`,
  };
}
