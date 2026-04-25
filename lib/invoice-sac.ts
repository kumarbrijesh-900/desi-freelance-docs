import type { InvoiceLineItem, InvoiceLineItemType } from "@/types/invoice";
import {
  getInvoiceLineItemCatalogEntry,
  normalizeInvoiceLineItemType,
} from "@/lib/invoice-line-item-catalog";

export const SAC_CODE_REGEX = /^\d{6}$/;

const knownSacTypes = [
  "Logo Design",
  "Branding & Identity",
  "Graphic Design",
  "Illustration",
  "UI/UX Design",
  "Animation",
  "Motion Graphics",
  "Photography",
  "Videography",
  "Video Editing",
  "Social Media Content",
  "Packaging Design",
  "Print Design",
  "Infographics & Presentation Design",
  "Other",
  "UI/UX",
  "Social Media",
] as const;

export const defaultSacCodeByType = Object.fromEntries(
  knownSacTypes.map((type) => [
    type,
    getInvoiceLineItemCatalogEntry(type)?.defaultSacCode ?? "",
  ]),
) as Record<InvoiceLineItemType, string>;

export function getDefaultSacCodeForType(type: InvoiceLineItemType) {
  const normalized = normalizeInvoiceLineItemType(type) ?? "Other";
  return defaultSacCodeByType[normalized] ?? "";
}

export function resolveLineItemSacCode(
  item: Pick<InvoiceLineItem, "type" | "sacCode">,
) {
  if (!isManualSacRequired(item.type)) {
    return getDefaultSacCodeForType(item.type);
  }

  const manualCode = item.sacCode?.trim() ?? "";

  if (manualCode) {
    return manualCode;
  }

  return getDefaultSacCodeForType(item.type);
}

export function isManualSacRequired(type: InvoiceLineItemType) {
  return (normalizeInvoiceLineItemType(type) ?? type) === "Other";
}

export function isValidSacCode(value?: string | null) {
  return SAC_CODE_REGEX.test((value ?? "").trim());
}
