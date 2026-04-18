import type {
  InvoiceLineItem,
  InvoiceLineItemType,
} from "@/types/invoice";

export const SAC_CODE_REGEX = /^\d{6}$/;

export const defaultSacCodeByType: Record<InvoiceLineItemType, string> = {
  "Logo Design": "998391",
  "UI/UX": "998314",
  Illustration: "999632",
  Photography: "998387",
  "Video Editing": "999613",
  "Social Media": "998361",
  Other: "",
};

export function getDefaultSacCodeForType(type: InvoiceLineItemType) {
  return defaultSacCodeByType[type] ?? "";
}

export function resolveLineItemSacCode(
  item: Pick<InvoiceLineItem, "type" | "sacCode">
) {
  const manualCode = item.sacCode?.trim() ?? "";

  if (manualCode) {
    return manualCode;
  }

  return getDefaultSacCodeForType(item.type);
}

export function isManualSacRequired(type: InvoiceLineItemType) {
  return type === "Other";
}

export function isValidSacCode(value?: string | null) {
  return SAC_CODE_REGEX.test((value ?? "").trim());
}
