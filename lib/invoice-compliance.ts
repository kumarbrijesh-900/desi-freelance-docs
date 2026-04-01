import type {
  AgencyDetails,
  ClientDetails,
  PaymentDetails,
  InvoiceTaxType,
} from "@/types/invoice";

export function isInternationalClient(client: ClientDetails) {
  return client.clientLocation === "international";
}

export function isAgencyGstRegistered(agency: AgencyDetails) {
  return agency.gstRegistrationStatus === "registered";
}

export function isDomesticSezClient(client: ClientDetails) {
  return (
    client.clientLocation === "domestic" && client.isClientSezUnit === "yes"
  );
}

export function shouldShowAgencyGstin(agency: AgencyDetails) {
  return isAgencyGstRegistered(agency) && Boolean(agency.gstin.trim());
}

export function requiresExplicitExportTaxChoice(
  agency: AgencyDetails,
  client: ClientDetails
) {
  return (
    isInternationalClient(client) &&
    isAgencyGstRegistered(agency) &&
    agency.lutAvailability !== "yes"
  );
}

export function hasExplicitExportTaxChoice(agency: AgencyDetails) {
  return (
    agency.noLutTaxHandling === "add-igst" ||
    agency.noLutTaxHandling === "keep-zero-tax"
  );
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

export function getEffectiveExportTaxHandling(agency: AgencyDetails) {
  return hasExplicitExportTaxChoice(agency) ? agency.noLutTaxHandling : "";
}

export function getLutDeclarationText(agency: AgencyDetails) {
  if (agency.lutAvailability !== "yes") return "";

  const lutNumber = agency.lutNumber.trim();

  return lutNumber
    ? `Export of services under LUT ${lutNumber} without payment of IGST.`
    : "Export of services under LUT without payment of IGST.";
}

export function getSettlementComplianceWarning(params: {
  client: ClientDetails;
  payment: PaymentDetails;
}) {
  const { client, payment } = params;

  if (!isInternationalClient(client)) {
    return "";
  }

  if (payment.paymentSettlementType === "forex") {
    return "";
  }

  if (payment.paymentSettlementType === "inr") {
    return "Settlement is marked in INR. Review FEMA and export-document requirements before sending this invoice.";
  }

  return "Settlement type is still unknown. Confirm whether this export invoice will settle in foreign currency or INR.";
}

export function getClientFacingTaxComplianceNote(params: {
  agency: AgencyDetails;
  client: ClientDetails;
  taxType: InvoiceTaxType;
}) {
  const { agency, client, taxType } = params;

  if (isInternationalClient(client) && isAgencyGstRegistered(agency)) {
    if (agency.lutAvailability === "yes") {
      return getLutDeclarationText(agency);
    }

    if (agency.noLutTaxHandling === "add-igst") {
      return "IGST 18% has been added to this international invoice.";
    }

    return "";
  }

  if (isDomesticSezClient(client) && isAgencyGstRegistered(agency)) {
    if (agency.lutAvailability === "yes") {
      return agency.lutNumber.trim()
        ? `Supply to SEZ under LUT ${agency.lutNumber.trim()} without payment of IGST.`
        : "Supply to SEZ under LUT without payment of IGST.";
    }

    if (taxType === "IGST") {
      return "Supply to SEZ unit: IGST 18% applied on this invoice.";
    }

    return "Supply to SEZ unit: review IGST handling for this invoice.";
  }

  if (isInternationalClient(client) && !isAgencyGstRegistered(agency)) {
    return "No GST applied because agency is marked as not registered under GST.";
  }

  if (taxType === "CGST_SGST") {
    return "Domestic same-state billing: CGST 9% and SGST 9% applied.";
  }

  if (taxType === "IGST") {
    return "Domestic interstate billing: IGST 18% applied.";
  }

  return "";
}
