import type {
  InvoiceLineItemType,
  InvoiceRateUnit,
} from "@/types/invoice";
import {
  getInvoiceLineItemCatalogEntry,
  invoiceCanonicalLineItemTypeOptions,
  normalizeInvoiceLineItemType,
} from "@/lib/invoice-line-item-catalog";

const fallbackType = "Other";

function resolveCatalogEntry(type: InvoiceLineItemType) {
  return (
    getInvoiceLineItemCatalogEntry(type) ??
    getInvoiceLineItemCatalogEntry(fallbackType)
  );
}

const knownTypes = [...invoiceCanonicalLineItemTypeOptions, "UI/UX", "Social Media"] as const;

type KnownInvoiceLineItemType = (typeof knownTypes)[number];

function asInvoiceLineItemTypeMap<T>(
  resolver: (type: KnownInvoiceLineItemType) => T
) {
  return Object.fromEntries(
    knownTypes.map((type) => [type, resolver(type)])
  ) as Record<InvoiceLineItemType, T>;
}

export const invoiceLineItemTypeOptions =
  invoiceCanonicalLineItemTypeOptions as InvoiceLineItemType[];

export const invoiceRateUnitLabels: Record<InvoiceRateUnit, string> = {
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

export const invoiceAllowedUnitsByType = asInvoiceLineItemTypeMap((type) => [
  ...resolveCatalogEntry(type)!.allowedUnits,
]) as Record<InvoiceLineItemType, InvoiceRateUnit[]>;

export const invoiceDefaultUnitByType = asInvoiceLineItemTypeMap(
  (type) => resolveCatalogEntry(type)!.defaultUnit
) as Record<InvoiceLineItemType, InvoiceRateUnit>;

export const invoiceDescriptionPlaceholderByType = asInvoiceLineItemTypeMap(
  (type) => resolveCatalogEntry(type)!.placeholder
) as Record<InvoiceLineItemType, string>;

export const invoiceDescriptionSuggestionsByType = asInvoiceLineItemTypeMap(
  (type) => [...resolveCatalogEntry(type)!.suggestions]
) as Record<InvoiceLineItemType, string[]>;

export function getInvoiceDescriptionSuggestions(
  type: InvoiceLineItemType,
  query = "",
  limit = 10
) {
  const resolvedType = normalizeInvoiceLineItemType(type) ?? fallbackType;
  const suggestions = invoiceDescriptionSuggestionsByType[resolvedType] ?? [];
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return suggestions.slice(0, limit);
  }

  return suggestions
    .filter((suggestion) =>
      suggestion.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}

