import type { AgencyDetails, ClientDetails } from "@/types/invoice";

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

export function getEffectiveExportTaxHandling(agency: AgencyDetails) {
  return agency.noLutTaxHandling;
}

export function getLutDeclarationText(agency: AgencyDetails) {
  if (agency.lutAvailability !== "yes") return "";

  const lutNumber = agency.lutNumber.trim();

  return lutNumber
    ? `Export of services under LUT ${lutNumber} without payment of IGST.`
    : "Export of services under LUT without payment of IGST.";
}
