/**
 * ─── Template Data Preparation ─────────────────────
 *
 * Transforms raw InvoiceFormData + computed totals into
 * the clean TemplateData shape that all templates consume.
 * All business logic lives HERE, not in templates.
 */

import type { InvoiceFormData } from "@/types/invoice";
import type { TemplateData, TemplateLineItem, TemplateTaxRow } from "./template-types";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { computeInvoiceTax } from "@/lib/invoice-tax";
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

function buildTaxRows(
  taxInfo: ReturnType<typeof computeInvoiceTax>,
  currency: string,
): TemplateTaxRow[] {
  if (taxInfo.taxType === "cgst_sgst") {
    const half = `${taxInfo.rate / 2}%`;
    return [
      { label: `CGST ${half}`, amountFormatted: formatCurrency(taxInfo.cgst, currency) },
      { label: `SGST ${half}`, amountFormatted: formatCurrency(taxInfo.sgst, currency) },
    ];
  }
  if (taxInfo.taxType === "igst") {
    return [
      { label: `IGST ${taxInfo.rate}%`, amountFormatted: formatCurrency(taxInfo.igst, currency) },
    ];
  }
  // zero_rated / exempt — single descriptive row at zero
  return [
    { label: taxInfo.label, amountFormatted: formatCurrency(taxInfo.taxAmount, currency) },
  ];
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
  return type ? (map[type] ?? type) : "—";
}

function cleanText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function clientSafeSacCode(value?: string | null): string {
  const code = cleanText(value);
  if (!code) return "";
  const lower = code.toLowerCase();
  if (["pending", "tbd", "na", "n/a", "not set", "unknown"].includes(lower)) {
    return "";
  }
  return code;
}

function clientSafeNotes(value?: string | null): string {
  const notes = cleanText(value);
  if (!notes) return "";

  const defaultPlaceholderNotes = [
    "1.5% monthly late fee applies. Final files delivered after full payment.",
  ];

  if (defaultPlaceholderNotes.some((placeholder) => notes.toLowerCase() === placeholder.toLowerCase())) {
    return "";
  }

  return notes;
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
    milestones: formData.milestones?.length > 0 ? formData.milestones : undefined,
    agencyState: formData.agency.agencyState,
    clientState: formData.client.clientState,
    isInternational: international,
    isClientSezUnit: isDomesticSezClient(formData.client),
    gstRegistered,
    lutAvailability: formData.agency.lutAvailability,
    noLutTaxHandling: exportTaxHandling,
    taxRate: formData.tax?.taxRate,
  });

  const showGstin = shouldShowAgencyGstin(formData.agency);
  const clientTaxLabel = getClientTaxIdLabel(formData.client, formData.agency);

  const clientAddress = international
    ? composeInternationalAddress({
        fullAddress: formData.client.clientAddress,
        postalCode: formData.client.clientPostalCode,
        country: formData.client.clientCountry,
      }) || ""
    : formData.client?.clientAddress || "";

  const taxComplianceNote = getClientFacingTaxComplianceNote({
    agency: formData.agency,
    client: formData.client,
    taxType: totals.taxType,
  });

  const approximateUsd =
    international && !formData.client?.clientCurrency
      ? formatCurrency(convertInrToApproximateUsd(totals.grandTotal), "USD")
      : null;

  const taxInfo = computeInvoiceTax(formData, totals.subtotal);
  const taxRows = buildTaxRows(taxInfo, displayCurrency);

  // Prepare line items — v1.5: flatten milestones into template line items
  const lineItems: TemplateLineItem[] = [];

  const useMilestones = formData.milestones && formData.milestones.length > 0;

  if (useMilestones) {
    for (const milestone of formData.milestones.slice(0, 1)) {
      const milestoneSubtotal = milestone.lineItems.reduce(
        (sum, li) => sum + Number(li.qty ?? 0) * Number(li.rate ?? 0),
        0
      );

      // Milestone header row
      lineItems.push({
        id: milestone.id,
        type: "Other",
        description: milestone.title || "Milestone",
        qty: 1,
        rate: 0,
        rateFormatted: "",
        unit: "",
        amount: milestoneSubtotal,
        amountFormatted: "",
        sacCode: "",
        isMilestoneHeader: true,
        groupSubtotalFormatted: formatCurrency(milestoneSubtotal, displayCurrency),
      });

      // Line items within this milestone
      for (const item of milestone.lineItems) {
        lineItems.push({
          id: item.id,
          type: item.type,
          description: item.description || item.type,
          qty: item.qty,
          rate: item.rate,
          rateFormatted: formatCurrency(Number(item.rate || 0), displayCurrency),
          unit: getUnitLabel(item.rateUnit),
          amount: Number(item.qty || 0) * Number(item.rate || 0),
          amountFormatted: formatCurrency(Number(item.qty || 0) * Number(item.rate || 0), displayCurrency),
          sacCode: clientSafeSacCode(resolveLineItemSacCode(item)),
          isMilestoneHeader: false,
          groupSubtotalFormatted: "",
        });
      }
    }
  } else {
    // Backward compat: use flat lineItems array
    for (let index = 0; index < formData.lineItems.length; index++) {
      const item = formData.lineItems[index];
      let groupSubtotalFormatted = "";
      if (item.is_milestone_header) {
        let groupSubtotal = 0;
        for (let i = index + 1; i < formData.lineItems.length; i++) {
          if (formData.lineItems[i].is_milestone_header) break;
          groupSubtotal += Number(formData.lineItems[i].qty ?? 0) * Number(formData.lineItems[i].rate ?? 0);
        }
        groupSubtotalFormatted = formatCurrency(groupSubtotal, displayCurrency);
      }
      lineItems.push({
        id: item.id,
        type: item.type,
        description: item.description || item.type,
        qty: item.qty,
        rate: item.rate,
        rateFormatted: formatCurrency(Number(item.rate || 0), displayCurrency),
        unit: getUnitLabel(item.rateUnit),
        amount: Number(item.qty || 0) * Number(item.rate || 0),
        amountFormatted: formatCurrency(Number(item.qty || 0) * Number(item.rate || 0), displayCurrency),
        sacCode: clientSafeSacCode(resolveLineItemSacCode(item)),
        isMilestoneHeader: item.is_milestone_header,
        groupSubtotalFormatted,
      });
    }
  }

  // Payment details
  const hasDomesticBank = Boolean(
    formData.payment?.bankName ||
    formData.payment?.accountName ||
    formData.payment?.accountNumber ||
    formData.payment?.ifscCode,
  );
  const hasIntlBank = Boolean(
    formData.payment?.accountName ||
    formData.payment?.bankName ||
    formData.payment?.bankAddress ||
    formData.payment?.accountNumber ||
    formData.payment?.swiftBicCode ||
    formData.payment?.ibanRoutingCode,
  );

  // Milestone billing summary
  const isMilestoneInvoice = formData.milestones && formData.milestones.length > 1;
  const milestoneCount = formData.milestones?.length ?? 1;
  const milestoneAmounts = (formData.milestones ?? []).map((m) =>
    m.lineItems.reduce((sum, li) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0)
  );
  const currentMilestoneAmount = milestoneAmounts[0] ?? 0;
  const totalProjectAmount = milestoneAmounts.reduce((s, a) => s + a, 0);
  const remainingAmount = totalProjectAmount - currentMilestoneAmount;

  return {
    isMilestoneInvoice: !!isMilestoneInvoice,
    milestoneCount,
    currentMilestoneLabel: `Milestone 1 of ${milestoneCount}`,
    currentMilestoneFormatted: formatCurrency(currentMilestoneAmount, displayCurrency),
    remainingMilestonesFormatted: formatCurrency(remainingAmount, displayCurrency),
    totalProjectFormatted: formatCurrency(totalProjectAmount, displayCurrency),

    agencyName: cleanText(formData.agency?.agencyName) || "Service provider",
    agencyAddress: cleanText(formData.agency?.address),
    agencyState: formData.agency?.agencyState || "",
    agencyGstin: formData.agency?.gstin || "",
    agencyPan: formData.agency?.pan || "",
    agencyLogoUrl: formData.agency?.logoUrl || "",
    showAgencyGstin: showGstin,

    clientName: cleanText(formData.client?.clientName) || "Client",
    clientAddress: clientAddress,
    clientState: formData.client?.clientState || "",
    clientCountry: formData.client?.clientCountry || "",
    clientTaxId: formData.client?.clientGstin || "",
    clientTaxLabel: clientTaxLabel,
    isInternational: international,

    invoiceNumber: cleanText(formData.meta?.invoiceNumber) || "Invoice",
    poNumber: formData.meta?.poNumber || "",
    invoiceDate: formatDate(formData.meta?.invoiceDate),
    dueDate: formatDate(formData.meta?.dueDate),
    paymentTerms: formData.meta?.paymentTerms === 0 ? "Due on Receipt" : `Net ${formData.meta?.paymentTerms || 15} Days`,
    displayCurrency,

    lineItems,
    itemCount: lineItems.length,

    subtotalFormatted: formatCurrency(totals.subtotal, displayCurrency),
    taxLabel: taxInfo.label,
    taxFormatted: formatCurrency(totals.taxAmount, displayCurrency),
    taxRows,
    grandTotalFormatted: formatCurrency(totals.grandTotal, displayCurrency),
    grandTotalRaw: totals.grandTotal,
    approximateUsd,
    taxComplianceNote: taxComplianceNote || "",
    taxInfo,

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

    notes: clientSafeNotes(formData.payment?.notes),
    hasNotes: Boolean(clientSafeNotes(formData.payment?.notes)),
    hasLicense: Boolean(formData.payment?.license?.isLicenseIncluded),
    licenseType: getLicenseLabel(formData.payment?.license?.licenseType),
    licenseDuration: formData.payment?.license?.licenseDuration || "",

    agencyStateCode: getGstStateCode(formData.agency?.agencyState || ""),
    clientStateCode: getGstStateCode(formData.client?.clientState || ""),
    amountInWords: amountToWords(totals.grandTotal, displayCurrency),
    reverseCharge: Boolean(formData.tax?.isRcmEnabled),
    authorizedSignatory: formData.agency?.agencyName || "",
    signatureUrl: formData.agency?.signatureUrl || "",

    isDraft: false,
    isOffline: Boolean(formData.isOffline),
    projectName: (useMilestones
      ? formData.milestones[0]?.lineItems[0]?.description
      : formData.lineItems[0]?.description) || "",
  };
}
