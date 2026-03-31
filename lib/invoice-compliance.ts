import type { ClientDetails } from "@/types/invoice";

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
