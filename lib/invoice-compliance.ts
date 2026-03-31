import type { ClientDetails, PaymentDetails, TaxConfig } from "@/types/invoice";

export function isInternationalClient(client: ClientDetails) {
  return client.clientLocation === "international";
}

export function getClientTaxIdLabel(client: ClientDetails) {
  return isInternationalClient(client)
    ? "Client Tax ID / VAT No. (Optional)"
    : "Client GSTIN";
}

export function getClientTaxIdPlaceholder(client: ClientDetails) {
  return isInternationalClient(client)
    ? "Client tax ID or VAT number"
    : "Client GSTIN";
}

export function getResolvedTaxConfig(
  client: ClientDetails,
  fallbackTax: TaxConfig
): TaxConfig {
  if (!isInternationalClient(client)) {
    return fallbackTax;
  }

  if (client.gstRegistrationStatus === "not-registered") {
    return {
      taxMode: "none",
      taxRate: 0,
    };
  }

  if (client.gstRegistrationStatus === "registered") {
    if (client.hasValidLut === "yes") {
      return {
        taxMode: "none",
        taxRate: 0,
      };
    }

    if (client.hasValidLut === "no") {
      if (client.exportTaxHandling === "add-igst") {
        return {
          taxMode: "igst",
          taxRate: 18,
        };
      }

      return {
        taxMode: "none",
        taxRate: 0,
      };
    }
  }

  return {
    taxMode: "none",
    taxRate: 0,
  };
}

export function getTaxComplianceMessage(client: ClientDetails) {
  if (!isInternationalClient(client)) {
    return "";
  }

  if (client.gstRegistrationStatus === "not-registered") {
    return "International billing is keeping this invoice at 0% tax because you selected Not registered under GST.";
  }

  if (client.gstRegistrationStatus === "registered") {
    if (client.hasValidLut === "yes") {
      return "International billing is keeping this invoice at 0% tax under LUT for export of services.";
    }

    if (client.hasValidLut === "no") {
      if (client.exportTaxHandling === "add-igst") {
        return "International billing is applying 18% IGST because you chose to add IGST to the client invoice.";
      }

      if (client.exportTaxHandling === "handle-separately") {
        return "International billing is keeping the client-facing invoice at 0% tax. Your compliance choice is stored for internal reference.";
      }

      return "International billing is holding tax at 0% until you choose whether to add 18% IGST or handle it separately.";
    }

    return "International billing is holding tax at 0% until you complete the GST and LUT decision flow.";
  }

  return "International billing is holding tax at 0% until you confirm the client's GST registration status.";
}

export function getEffectiveInvoiceCurrency(
  client: ClientDetails,
  currency: PaymentDetails["currency"]
) {
  return isInternationalClient(client) ? currency : "INR";
}

function getFinancialYearLabel(invoiceDate?: string) {
  const date = invoiceDate ? new Date(invoiceDate) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${String(endYear).slice(-2)}`;
}

export function getLutDeclarationText(
  client: ClientDetails,
  invoiceDate?: string
) {
  if (
    !isInternationalClient(client) ||
    client.gstRegistrationStatus !== "registered" ||
    client.hasValidLut !== "yes"
  ) {
    return "";
  }

  const fyLabel = getFinancialYearLabel(invoiceDate);
  const lutReference = client.lutNumber.trim();

  if (lutReference) {
    return `Export of services under LUT for FY ${fyLabel} without payment of integrated tax. LUT Number / ARN: ${lutReference}.`;
  }

  return `Export of services under LUT for FY ${fyLabel} without payment of integrated tax.`;
}

export function getTaxSummaryLabel(tax: TaxConfig) {
  if (tax.taxMode === "igst") {
    return `IGST (${tax.taxRate}%)`;
  }

  if (tax.taxMode === "gst") {
    return `GST (${tax.taxRate}%)`;
  }

  return "Tax (0%)";
}
