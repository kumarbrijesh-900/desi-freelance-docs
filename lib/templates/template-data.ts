/**
 * ─── Template Data Preparation ─────────────────────
 *
 * Transforms raw InvoiceFormData + computed totals into
 * the clean TemplateData shape that all templates consume.
 * All business logic lives HERE, not in templates.
 */

import type { InvoiceFormData } from "@/types/invoice";
import type { TemplateData, TemplateLineItem } from "./template-types";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { getGstStateCode } from "@/lib/gst-state-codes";
import { amountToWords } from "@/lib/amount-to-words";
import {
  getClientFacingTaxComplianceNote,
  getClientTaxIdLabel,
  getEffectiveExportTaxHandling,
  isAgencyGstRegistered,
  isDomesticSezClient,
  isInternationalClient,
  shouldShowAgencyGstin,
} from "@/lib/invoice-compliance";
import {
  convertInrToApproximateUsd,
  getInvoiceDisplayCurrency,
} from "@/lib/international-billing-options";
import { composeInternationalAddress } from "@/lib/invoice-address";
import { resolveLineItemSacCode } from "@/lib/invoice-sac";

/* ─── Formatting helpers ─────────────────────────── */

function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

function getUnitLabel(unit?: string): string {
  if (!unit) return "—";
  const map: Record<string, string> = {
    "per-deliverable": "Per deliverable",
    "per-item": "Per item",
    "per-screen": "Per screen",
    "per-hour": "Per hour",
    "per-day": "Per day",
    "per-revision": "Per revision",
    "per-concept": "Per concept",
    "per-post": "Per post",
    "per-video": "Per video",
    "per-image": "Per image",
  };
  return map[unit] ?? unit;
}

function getLicenseLabel(type?: string): string {
  const map: Record<string, string> = {
    "full-assignment": "Full assignment",
    "exclusive-license": "Exclusive license",
    "non-exclusive-license": "Non-exclusive license",
  };
  return type ? map[type] ?? type : "—";
}

function getTaxLineLabel(taxType: "CGST_SGST" | "IGST" | "NONE"): string {
  switch (taxType) {
    case "CGST_SGST": return "CGST + SGST (18%)";
    case "IGST": return "IGST (18%)";
    default: return "Tax (0%)";
  }
}

/* ─── Main transformer ───────────────────────────── */

export function prepareTemplateData(formData: InvoiceFormData): TemplateData {
  const international = isInternationalClient(formData.client);
  const gstRegistered = isAgencyGstRegistered(formData.agency);
  const exportTaxHandling = getEffectiveExportTaxHandling(formData.agency);

  const displayCurrency = getInvoiceDisplayCurrency({
    clientLocation: formData.client.clientLocation,
    clientCurrency: formData.client.clientCurrency,
  });

  const totals = calculateInvoiceTotals({
    lineItems: formData.lineItems,
    agencyState: formData.agency.agencyState,
    clientState: formData.client.clientState,
    isInternational: international,
    isClientSezUnit: isDomesticSezClient(formData.client),
    gstRegistered,
    lutAvailability: formData.agency.lutAvailability,
    noLutTaxHandling: exportTaxHandling,
  });

  const showGstin = shouldShowAgencyGstin(formData.agency);
  const clientTaxLabel = getClientTaxIdLabel(formData.client);

  const clientAddress = international
    ? composeInternationalAddress({
        fullAddress: formData.client.clientAddress,
        postalCode: formData.client.clientPostalCode,
        country: formData.client.clientCountry,
      }) || "—"
    : formData.client?.clientAddress || "—";

  const taxComplianceNote = getClientFacingTaxComplianceNote({
    agency: formData.agency,
    client: formData.client,
    taxType: totals.taxType,
  });

  const approximateUsd =
    international && !formData.client?.clientCurrency
      ? formatCurrency(convertInrToApproximateUsd(totals.grandTotal), "USD")
      : null;

  // Prepare line items
  const lineItems: TemplateLineItem[] = formData.lineItems.map((item) => ({
    id: item.id,
    type: item.type,
    description: item.description || item.type,
    qty: item.qty,
    rate: item.rate,
    rateFormatted: formatCurrency(item.rate, displayCurrency),
    unit: getUnitLabel(item.rateUnit),
    amount: item.qty * item.rate,
    amountFormatted: formatCurrency(item.qty * item.rate, displayCurrency),
    sacCode: resolveLineItemSacCode(item) || "pending",
  }));

  // Payment details
  const hasDomesticBank = Boolean(
    formData.payment?.bankName ||
    formData.payment?.accountName ||
    formData.payment?.accountNumber ||
    formData.payment?.ifscCode
  );
  const hasIntlBank = Boolean(
    formData.payment?.accountName ||
    formData.payment?.bankName ||
    formData.payment?.bankAddress ||
    formData.payment?.accountNumber ||
    formData.payment?.swiftBicCode ||
    formData.payment?.ibanRoutingCode
  );

  return {
    agencyName: formData.agency?.agencyName || "Your Agency Name",
    agencyAddress: formData.agency?.address || "—",
    agencyState: formData.agency?.agencyState || "",
    agencyGstin: formData.agency?.gstin || "",
    agencyPan: formData.agency?.pan || "",
    agencyLogoUrl: formData.agency?.logoUrl || "",
    showAgencyGstin: showGstin,

    clientName: formData.client?.clientName || "—",
    clientAddress: clientAddress,
    clientState: formData.client?.clientState || "",
    clientCountry: formData.client?.clientCountry || "",
    clientTaxId: formData.client?.clientGstin || "",
    clientTaxLabel: clientTaxLabel,
    isInternational: international,

    invoiceNumber: formData.meta?.invoiceNumber || "—",
    invoiceDate: formatDate(formData.meta?.invoiceDate),
    dueDate: formatDate(formData.meta?.dueDate),
    paymentTerms: formData.meta?.paymentTerms || "—",
    displayCurrency,

    lineItems,
    itemCount: lineItems.length,

    subtotalFormatted: formatCurrency(totals.subtotal, displayCurrency),
    taxLabel: getTaxLineLabel(totals.taxType),
    taxFormatted: formatCurrency(totals.taxAmount, displayCurrency),
    grandTotalFormatted: formatCurrency(totals.grandTotal, displayCurrency),
    grandTotalRaw: totals.grandTotal,
    approximateUsd,
    taxComplianceNote: taxComplianceNote || "",

    bankName: formData.payment?.bankName || "",
    accountName: formData.payment?.accountName || "",
    accountNumber: formData.payment?.accountNumber || "",
    ifscCode: formData.payment?.ifscCode || "",
    bankAddress: formData.payment?.bankAddress || "",
    swiftBicCode: formData.payment?.swiftBicCode || "",
    ibanRoutingCode: formData.payment?.ibanRoutingCode || "",
    qrCodeUrl: formData.payment?.qrCodeUrl || "",
    hasBankDetails: international ? hasIntlBank : hasDomesticBank,
    hasQrCode: !international && Boolean(formData.payment?.qrCodeUrl),

    notes: formData.payment?.notes || "",
    hasNotes: Boolean(formData.payment?.notes?.trim()),
    hasLicense: Boolean(formData.payment?.license?.isLicenseIncluded),
    licenseType: getLicenseLabel(formData.payment?.license?.licenseType),
    licenseDuration: formData.payment?.license?.licenseDuration || "",

    agencyStateCode: getGstStateCode(formData.agency?.agencyState || ""),
    clientStateCode: getGstStateCode(formData.client?.clientState || ""),
    amountInWords: amountToWords(totals.grandTotal, displayCurrency),
    reverseCharge: false,
    authorizedSignatory: formData.agency?.agencyName || "",
    signatureUrl: formData.agency?.signatureUrl || "",
  };
}
