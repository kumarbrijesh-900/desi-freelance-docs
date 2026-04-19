import type {
  BriefParserConfidence,
  BriefParserResponse,
  NormalizedBriefLineItem,
} from "@/lib/brief-parser-gateway";
import { INDIA_STATE_OPTIONS, type IndiaStateOption } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  INTERNATIONAL_CURRENCY_OPTIONS,
  type InternationalCountryOption,
  type InternationalCurrencyCode,
} from "@/lib/international-billing-options";
import {
  invoiceDefaultUnitByType,
  invoiceLineItemTypeOptions,
} from "@/lib/invoice-deliverables";
import { normalizeInvoiceLineItemType } from "@/lib/invoice-line-item-catalog";
import {
  isManualSacRequired,
  isValidSacCode,
  resolveLineItemSacCode,
} from "@/lib/invoice-sac";
import {
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceLineItem,
  type InvoiceLineItemType,
  type InvoiceRateUnit,
} from "@/types/invoice";

type HydrationField = {
  path: string;
  label: string;
  confidence: BriefParserConfidence;
};

export type ParsedInvoiceHydrationResult = {
  nextFormData: InvoiceFormData;
  hydratedFields: HydrationField[];
  preservedFields: HydrationField[];
  unresolvedFields: string[];
  clarificationQuestions: string[];
  missingFields: string[];
};

type HydrationContext = {
  originalFormData: InvoiceFormData;
  nextFormData: InvoiceFormData;
  parserResponse: BriefParserResponse;
  hydratedFields: HydrationField[];
  preservedFields: HydrationField[];
  unresolvedFields: string[];
};

function isBlank(value?: string | null) {
  return !value || !value.trim();
}

function normalizeString(value?: string | null) {
  return value?.trim() ?? "";
}

function isDefaultOrBlank<T>(currentValue: T, defaultValue: T) {
  if (typeof currentValue === "string") {
    return isBlank(currentValue) || currentValue === defaultValue;
  }

  return currentValue === defaultValue;
}

function isUnsetToggle(currentValue: string, defaultValue: string) {
  return !currentValue || currentValue === defaultValue;
}

function getConfidence(
  parserResponse: BriefParserResponse,
  path: string
): BriefParserConfidence {
  return parserResponse.confidence.fields[path] ?? parserResponse.confidence.overall;
}

function shouldHydrate(confidence: BriefParserConfidence) {
  return confidence !== "low";
}

function recordHydration(
  collection: HydrationField[],
  path: string,
  label: string,
  confidence: BriefParserConfidence
) {
  collection.push({ path, label, confidence });
}

function applyStringField(params: {
  ctx: HydrationContext;
  path: string;
  label: string;
  incoming?: string | null;
  currentValue: string;
  originalValue: string;
  defaultValue: string;
  assign: (value: string) => void;
}) {
  const incoming = normalizeString(params.incoming);
  if (!incoming) return;

  const confidence = getConfidence(params.ctx.parserResponse, params.path);
  if (!shouldHydrate(confidence)) {
    params.ctx.unresolvedFields.push(params.path);
    return;
  }

  if (
    isDefaultOrBlank(params.originalValue, params.defaultValue) ||
    isDefaultOrBlank(params.currentValue, params.defaultValue)
  ) {
    if (params.currentValue !== incoming) {
      params.assign(incoming);
      recordHydration(
        params.ctx.hydratedFields,
        params.path,
        params.label,
        confidence
      );
    }
    return;
  }

  recordHydration(
    params.ctx.preservedFields,
    params.path,
    params.label,
    confidence
  );
}

function applyToggleField<T extends string>(params: {
  ctx: HydrationContext;
  path: string;
  label: string;
  incoming?: T | null;
  currentValue: T;
  originalValue: T;
  defaultValue: T;
  assign: (value: T) => void;
  allowDefaultOverride?: boolean;
}) {
  if (!params.incoming) return;

  const confidence = getConfidence(params.ctx.parserResponse, params.path);
  if (!shouldHydrate(confidence)) {
    params.ctx.unresolvedFields.push(params.path);
    return;
  }

  const canHydrate =
    isUnsetToggle(params.originalValue, params.defaultValue) ||
    isUnsetToggle(params.currentValue, params.defaultValue) ||
    params.allowDefaultOverride === true;

  if (canHydrate && params.currentValue !== params.incoming) {
    params.assign(params.incoming);
    recordHydration(
      params.ctx.hydratedFields,
      params.path,
      params.label,
      confidence
    );
    return;
  }

  if (!canHydrate && params.currentValue !== params.incoming) {
    recordHydration(
      params.ctx.preservedFields,
      params.path,
      params.label,
      confidence
    );
  }
}

function normalizeState(value?: string | null): IndiaStateOption | "" {
  if (!value) return "";
  const normalized = INDIA_STATE_OPTIONS.find(
    (state) => state.toLowerCase() === value.trim().toLowerCase()
  );
  return normalized ?? "";
}

function normalizeCountry(value?: string | null): InternationalCountryOption | "" {
  if (!value) return "";
  const normalized = INTERNATIONAL_COUNTRY_OPTIONS.find(
    (country) => country.toLowerCase() === value.trim().toLowerCase()
  );
  return normalized ?? "";
}

function normalizeCurrency(value?: string | null): InternationalCurrencyCode | "" {
  if (!value) return "";
  const upperValue = value.trim().toUpperCase();
  const normalized = INTERNATIONAL_CURRENCY_OPTIONS.find(
    (currency) => currency.code === upperValue
  );
  return normalized?.code ?? "";
}

function normalizeRateUnit(value?: string | null): InvoiceRateUnit | "" {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "";

  const compact = normalized.replace(/[_\s]+/g, "-");
  const candidates: Record<string, InvoiceRateUnit> = {
    "per-deliverable": "per-deliverable",
    deliverable: "per-deliverable",
    "per-item": "per-item",
    item: "per-item",
    each: "per-item",
    "per-screen": "per-screen",
    screen: "per-screen",
    "per-hour": "per-hour",
    hour: "per-hour",
    hourly: "per-hour",
    "per-day": "per-day",
    day: "per-day",
    daily: "per-day",
    "per-revision": "per-revision",
    revision: "per-revision",
    "per-concept": "per-concept",
    concept: "per-concept",
    "per-post": "per-post",
    post: "per-post",
    "per-video": "per-video",
    video: "per-video",
    "per-image": "per-image",
    image: "per-image",
  };

  return candidates[compact] ?? "";
}

function normalizeLineItemType(value?: string | null): InvoiceLineItemType {
  const normalized = normalizeInvoiceLineItemType(value);
  return normalized ?? "Other";
}

function hasMeaningfulLineItems(lineItems: InvoiceLineItem[]) {
  const defaultLineItem = defaultInvoiceFormData.lineItems[0];
  return lineItems.some((item) =>
    Boolean(
      item.description.trim() ||
        item.qty !== defaultLineItem.qty ||
        item.rate !== defaultLineItem.rate ||
        item.type !== defaultLineItem.type ||
        item.rateUnit !== defaultLineItem.rateUnit ||
        item.sacCode !== defaultLineItem.sacCode
    )
  );
}

function hasLineItemSignal(item: NormalizedBriefLineItem) {
  return Boolean(item.type || item.description || item.quantity || item.rate || item.unit || item.sacCode);
}

function hydrateLineItems(ctx: HydrationContext) {
  const extractedItems =
    ctx.parserResponse.normalizedExtraction.deliverables.filter(hasLineItemSignal);

  if (extractedItems.length === 0) {
    return;
  }

  const originalHadMeaningfulItems = hasMeaningfulLineItems(
    ctx.originalFormData.lineItems
  );

  if (!originalHadMeaningfulItems) {
    ctx.nextFormData.lineItems = extractedItems.map((item, index) => {
      const type = normalizeLineItemType(item.type);
      const unit =
        normalizeRateUnit(item.unit) ||
        invoiceDefaultUnitByType[type] ||
        defaultInvoiceFormData.lineItems[0].rateUnit;
      const manualSac = normalizeString(item.sacCode);
      const sacCode =
        manualSac && isValidSacCode(manualSac)
          ? manualSac
          : resolveLineItemSacCode({ type, sacCode: "" });

      return {
        ...defaultInvoiceFormData.lineItems[0],
        id: `parsed-line-${index + 1}`,
        type: invoiceLineItemTypeOptions.includes(type) ? type : "Other",
        description: normalizeString(item.description),
        qty: item.quantity && item.quantity > 0 ? item.quantity : 1,
        rate: item.rate && item.rate > 0 ? item.rate : 0,
        rateUnit: unit,
        sacCode,
      };
    });

    extractedItems.forEach((item, index) => {
      const confidence = getConfidence(
        ctx.parserResponse,
        `deliverables.${index}.description`
      );
      recordHydration(
        ctx.hydratedFields,
        `deliverables.${index}`,
        `Line item ${index + 1}`,
        confidence
      );

      if (isManualSacRequired(ctx.nextFormData.lineItems[index]?.type ?? "Other")) {
        ctx.unresolvedFields.push(`deliverables.${index}.sacCode`);
      }
    });
    return;
  }

  extractedItems.forEach((item, index) => {
    const currentItem = ctx.nextFormData.lineItems[index];
    const originalItem = ctx.originalFormData.lineItems[index];
    if (!currentItem || !originalItem) return;

    const type = normalizeLineItemType(item.type);
    const typeConfidence = getConfidence(ctx.parserResponse, `deliverables.${index}.type`);
    if (
      shouldHydrate(typeConfidence) &&
      isDefaultOrBlank(originalItem.type, defaultInvoiceFormData.lineItems[0].type)
    ) {
      currentItem.type = type;
    }

    applyStringField({
      ctx,
      path: `deliverables.${index}.description`,
      label: `Line item ${index + 1} description`,
      incoming: item.description,
      currentValue: currentItem.description,
      originalValue: originalItem.description,
      defaultValue: defaultInvoiceFormData.lineItems[0].description,
      assign: (value) => {
        currentItem.description = value;
      },
    });

    const qtyConfidence = getConfidence(ctx.parserResponse, `deliverables.${index}.quantity`);
    if (
      item.quantity &&
      item.quantity > 0 &&
      shouldHydrate(qtyConfidence) &&
      originalItem.qty === defaultInvoiceFormData.lineItems[0].qty
    ) {
      currentItem.qty = item.quantity;
      recordHydration(ctx.hydratedFields, `deliverables.${index}.quantity`, `Line item ${index + 1} quantity`, qtyConfidence);
    }

    const rateConfidence = getConfidence(ctx.parserResponse, `deliverables.${index}.rate`);
    if (
      item.rate &&
      item.rate > 0 &&
      shouldHydrate(rateConfidence) &&
      originalItem.rate === defaultInvoiceFormData.lineItems[0].rate
    ) {
      currentItem.rate = item.rate;
      recordHydration(ctx.hydratedFields, `deliverables.${index}.rate`, `Line item ${index + 1} rate`, rateConfidence);
    }

    const rateUnit = normalizeRateUnit(item.unit);
    const unitConfidence = getConfidence(ctx.parserResponse, `deliverables.${index}.unit`);
    if (
      rateUnit &&
      shouldHydrate(unitConfidence) &&
      originalItem.rateUnit === defaultInvoiceFormData.lineItems[0].rateUnit
    ) {
      currentItem.rateUnit = rateUnit;
      recordHydration(ctx.hydratedFields, `deliverables.${index}.unit`, `Line item ${index + 1} rate unit`, unitConfidence);
    }

    const manualSac = normalizeString(item.sacCode);
    if (!currentItem.sacCode && manualSac && isValidSacCode(manualSac)) {
      currentItem.sacCode = manualSac;
    } else if (!currentItem.sacCode) {
      currentItem.sacCode = resolveLineItemSacCode(currentItem);
    }

    if (isManualSacRequired(currentItem.type) && !currentItem.sacCode) {
      ctx.unresolvedFields.push(`deliverables.${index}.sacCode`);
    }
  });
}

function mapPaymentSettlementType(mode?: string | null) {
  const normalized = mode?.trim().toLowerCase() ?? "";
  if (!normalized) return "";

  if (/\b(wise|payoneer|paypal|wire|swift|forex|foreign)\b/.test(normalized)) {
    return "forex" as const;
  }

  if (/\b(inr|upi|neft|rtgs|imps|domestic)\b/.test(normalized)) {
    return "inr" as const;
  }

  return "unknown" as const;
}

export function hydrateInvoiceFormFromParsedExtraction(params: {
  currentFormData: InvoiceFormData;
  baseFormData?: InvoiceFormData;
  parserResponse: BriefParserResponse;
}): ParsedInvoiceHydrationResult {
  const nextFormData = mergeInvoiceFormData(params.baseFormData ?? params.currentFormData);
  const ctx: HydrationContext = {
    originalFormData: mergeInvoiceFormData(params.currentFormData),
    nextFormData,
    parserResponse: params.parserResponse,
    hydratedFields: [],
    preservedFields: [],
    unresolvedFields: [...params.parserResponse.missingFields],
  };
  const { normalizedExtraction } = params.parserResponse;
  const { agency, client, payment, meta, taxHints } = normalizedExtraction;

  applyToggleField({
    ctx,
    path: "agency.gstRegistered",
    label: "GST registration status",
    incoming:
      agency.gstRegistered === true
        ? "registered"
        : agency.gstRegistered === false
        ? "not-registered"
        : null,
    currentValue: nextFormData.agency.gstRegistrationStatus,
    originalValue: ctx.originalFormData.agency.gstRegistrationStatus,
    defaultValue: defaultInvoiceFormData.agency.gstRegistrationStatus,
    assign: (value) => {
      nextFormData.agency.gstRegistrationStatus = value;
    },
    allowDefaultOverride: agency.gstRegistered === true,
  });

  applyStringField({
    ctx,
    path: "agency.businessName",
    label: "Agency name",
    incoming: agency.businessName,
    currentValue: nextFormData.agency.agencyName,
    originalValue: ctx.originalFormData.agency.agencyName,
    defaultValue: defaultInvoiceFormData.agency.agencyName,
    assign: (value) => {
      nextFormData.agency.agencyName = value;
    },
  });

  applyStringField({
    ctx,
    path: "agency.gstin",
    label: "Agency GSTIN",
    incoming: agency.gstin,
    currentValue: nextFormData.agency.gstin,
    originalValue: ctx.originalFormData.agency.gstin,
    defaultValue: defaultInvoiceFormData.agency.gstin,
    assign: (value) => {
      nextFormData.agency.gstin = value.toUpperCase();
    },
  });

  applyStringField({
    ctx,
    path: "agency.pan",
    label: "Agency PAN",
    incoming: agency.pan,
    currentValue: nextFormData.agency.pan,
    originalValue: ctx.originalFormData.agency.pan,
    defaultValue: defaultInvoiceFormData.agency.pan,
    assign: (value) => {
      nextFormData.agency.pan = value.toUpperCase();
    },
  });

  applyToggleField({
    ctx,
    path: "agency.lutEnabled",
    label: "LUT availability",
    incoming:
      agency.lutEnabled === true
        ? "yes"
        : agency.lutEnabled === false
        ? "no"
        : taxHints.lutMentioned === true
        ? "yes"
        : null,
    currentValue: nextFormData.agency.lutAvailability,
    originalValue: ctx.originalFormData.agency.lutAvailability,
    defaultValue: defaultInvoiceFormData.agency.lutAvailability,
    assign: (value) => {
      nextFormData.agency.lutAvailability = value;
    },
  });

  applyStringField({
    ctx,
    path: "agency.lutNumber",
    label: "LUT number",
    incoming: agency.lutNumber,
    currentValue: nextFormData.agency.lutNumber,
    originalValue: ctx.originalFormData.agency.lutNumber,
    defaultValue: defaultInvoiceFormData.agency.lutNumber,
    assign: (value) => {
      nextFormData.agency.lutNumber = value;
    },
  });

  const agencyState = normalizeState(agency.state);
  applyStringField({
    ctx,
    path: "agency.addressLine1",
    label: "Agency address line 1",
    incoming: agency.addressLine1,
    currentValue: nextFormData.agency.addressLine1,
    originalValue: ctx.originalFormData.agency.addressLine1,
    defaultValue: defaultInvoiceFormData.agency.addressLine1,
    assign: (value) => {
      nextFormData.agency.addressLine1 = value;
    },
  });
  applyStringField({
    ctx,
    path: "agency.addressLine2",
    label: "Agency address line 2",
    incoming: agency.addressLine2,
    currentValue: nextFormData.agency.addressLine2,
    originalValue: ctx.originalFormData.agency.addressLine2,
    defaultValue: defaultInvoiceFormData.agency.addressLine2,
    assign: (value) => {
      nextFormData.agency.addressLine2 = value;
    },
  });
  applyStringField({
    ctx,
    path: "agency.city",
    label: "Agency city",
    incoming: agency.city,
    currentValue: nextFormData.agency.city,
    originalValue: ctx.originalFormData.agency.city,
    defaultValue: defaultInvoiceFormData.agency.city,
    assign: (value) => {
      nextFormData.agency.city = value;
    },
  });
  applyStringField({
    ctx,
    path: "agency.pinCode",
    label: "Agency PIN code",
    incoming: agency.pinCode,
    currentValue: nextFormData.agency.pinCode,
    originalValue: ctx.originalFormData.agency.pinCode,
    defaultValue: defaultInvoiceFormData.agency.pinCode,
    assign: (value) => {
      nextFormData.agency.pinCode = value;
    },
  });
  applyToggleField({
    ctx,
    path: "agency.state",
    label: "Agency state",
    incoming: agencyState || null,
    currentValue: nextFormData.agency.agencyState,
    originalValue: ctx.originalFormData.agency.agencyState,
    defaultValue: defaultInvoiceFormData.agency.agencyState,
    assign: (value) => {
      nextFormData.agency.agencyState = value;
    },
  });

  applyToggleField({
    ctx,
    path: "client.location",
    label: "Client location",
    incoming: client.location ?? taxHints.domesticOrInternational ?? null,
    currentValue: nextFormData.client.clientLocation,
    originalValue: ctx.originalFormData.client.clientLocation,
    defaultValue: defaultInvoiceFormData.client.clientLocation,
    assign: (value) => {
      nextFormData.client.clientLocation = value;
    },
    allowDefaultOverride:
      client.location === "international" ||
      taxHints.domesticOrInternational === "international",
  });

  applyStringField({
    ctx,
    path: "client.name",
    label: "Client name",
    incoming: client.name,
    currentValue: nextFormData.client.clientName,
    originalValue: ctx.originalFormData.client.clientName,
    defaultValue: defaultInvoiceFormData.client.clientName,
    assign: (value) => {
      nextFormData.client.clientName = value;
    },
  });

  applyStringField({
    ctx,
    path: "client.email",
    label: "Client email",
    incoming: client.email,
    currentValue: nextFormData.client.clientEmail,
    originalValue: ctx.originalFormData.client.clientEmail,
    defaultValue: defaultInvoiceFormData.client.clientEmail,
    assign: (value) => {
      nextFormData.client.clientEmail = value;
    },
  });

  applyStringField({
    ctx,
    path: "client.gstinOrTaxId",
    label: "Client GSTIN / Tax ID",
    incoming: client.gstinOrTaxId,
    currentValue: nextFormData.client.clientGstin,
    originalValue: ctx.originalFormData.client.clientGstin,
    defaultValue: defaultInvoiceFormData.client.clientGstin,
    assign: (value) => {
      nextFormData.client.clientGstin = value.toUpperCase();
    },
  });

  const sezValue =
    client.isSezUnit === true
      ? "yes"
      : client.isSezUnit === false
      ? "no"
      : taxHints.sezMentioned === true
      ? "not-sure"
      : null;
  applyToggleField({
    ctx,
    path: "client.isSezUnit",
    label: "Client SEZ status",
    incoming: sezValue,
    currentValue: nextFormData.client.isClientSezUnit,
    originalValue: ctx.originalFormData.client.isClientSezUnit,
    defaultValue: defaultInvoiceFormData.client.isClientSezUnit,
    assign: (value) => {
      nextFormData.client.isClientSezUnit = value;
    },
  });

  const clientState = normalizeState(client.state);
  const clientCountry = normalizeCountry(client.country);
  applyStringField({
    ctx,
    path: "client.addressLine1",
    label: "Client address line 1",
    incoming: client.addressLine1,
    currentValue: nextFormData.client.clientAddressLine1,
    originalValue: ctx.originalFormData.client.clientAddressLine1,
    defaultValue: defaultInvoiceFormData.client.clientAddressLine1,
    assign: (value) => {
      nextFormData.client.clientAddressLine1 = value;
    },
  });
  applyStringField({
    ctx,
    path: "client.addressLine2",
    label: "Client address line 2",
    incoming: client.addressLine2,
    currentValue: nextFormData.client.clientAddressLine2,
    originalValue: ctx.originalFormData.client.clientAddressLine2,
    defaultValue: defaultInvoiceFormData.client.clientAddressLine2,
    assign: (value) => {
      nextFormData.client.clientAddressLine2 = value;
    },
  });
  applyStringField({
    ctx,
    path: "client.city",
    label: "Client city",
    incoming: client.city,
    currentValue: nextFormData.client.clientCity,
    originalValue: ctx.originalFormData.client.clientCity,
    defaultValue: defaultInvoiceFormData.client.clientCity,
    assign: (value) => {
      nextFormData.client.clientCity = value;
    },
  });
  applyStringField({
    ctx,
    path: "client.pinCode",
    label: "Client PIN code",
    incoming: client.pinCode,
    currentValue: nextFormData.client.clientPinCode,
    originalValue: ctx.originalFormData.client.clientPinCode,
    defaultValue: defaultInvoiceFormData.client.clientPinCode,
    assign: (value) => {
      nextFormData.client.clientPinCode = value;
    },
  });
  applyStringField({
    ctx,
    path: "client.postalCode",
    label: "Client postal code",
    incoming: client.postalCode,
    currentValue: nextFormData.client.clientPostalCode,
    originalValue: ctx.originalFormData.client.clientPostalCode,
    defaultValue: defaultInvoiceFormData.client.clientPostalCode,
    assign: (value) => {
      nextFormData.client.clientPostalCode = value;
    },
  });
  applyToggleField({
    ctx,
    path: "client.state",
    label: "Client state",
    incoming: clientState || null,
    currentValue: nextFormData.client.clientState,
    originalValue: ctx.originalFormData.client.clientState,
    defaultValue: defaultInvoiceFormData.client.clientState,
    assign: (value) => {
      nextFormData.client.clientState = value;
    },
  });
  applyToggleField({
    ctx,
    path: "client.country",
    label: "Client country",
    incoming: clientCountry || null,
    currentValue: nextFormData.client.clientCountry,
    originalValue: ctx.originalFormData.client.clientCountry,
    defaultValue: defaultInvoiceFormData.client.clientCountry,
    assign: (value) => {
      nextFormData.client.clientCountry = value;
    },
  });

  const currency = normalizeCurrency(meta.currency);
  applyToggleField({
    ctx,
    path: "meta.currency",
    label: "Invoice currency",
    incoming: currency || null,
    currentValue: nextFormData.client.clientCurrency,
    originalValue: ctx.originalFormData.client.clientCurrency,
    defaultValue: defaultInvoiceFormData.client.clientCurrency,
    assign: (value) => {
      nextFormData.client.clientCurrency = value;
    },
  });

  hydrateLineItems(ctx);

  applyStringField({
    ctx,
    path: "payment.terms",
    label: "Payment terms",
    incoming: payment.terms,
    currentValue: nextFormData.meta.paymentTerms,
    originalValue: ctx.originalFormData.meta.paymentTerms,
    defaultValue: defaultInvoiceFormData.meta.paymentTerms,
    assign: (value) => {
      nextFormData.meta.paymentTerms = value;
    },
  });
  applyStringField({
    ctx,
    path: "payment.accountName",
    label: "Beneficiary / account name",
    incoming: payment.accountName,
    currentValue: nextFormData.payment.accountName,
    originalValue: ctx.originalFormData.payment.accountName,
    defaultValue: defaultInvoiceFormData.payment.accountName,
    assign: (value) => {
      nextFormData.payment.accountName = value;
    },
  });
  applyStringField({
    ctx,
    path: "payment.bankName",
    label: "Bank name",
    incoming: payment.bankName,
    currentValue: nextFormData.payment.bankName,
    originalValue: ctx.originalFormData.payment.bankName,
    defaultValue: defaultInvoiceFormData.payment.bankName,
    assign: (value) => {
      nextFormData.payment.bankName = value;
    },
  });
  applyStringField({
    ctx,
    path: "payment.bankAddress",
    label: "Bank address",
    incoming: payment.bankAddress,
    currentValue: nextFormData.payment.bankAddress,
    originalValue: ctx.originalFormData.payment.bankAddress,
    defaultValue: defaultInvoiceFormData.payment.bankAddress,
    assign: (value) => {
      nextFormData.payment.bankAddress = value;
    },
  });
  applyStringField({
    ctx,
    path: "payment.accountNumber",
    label: "Account number",
    incoming: payment.accountNumber,
    currentValue: nextFormData.payment.accountNumber,
    originalValue: ctx.originalFormData.payment.accountNumber,
    defaultValue: defaultInvoiceFormData.payment.accountNumber,
    assign: (value) => {
      nextFormData.payment.accountNumber = value;
    },
  });
  applyStringField({
    ctx,
    path: "payment.ifscCode",
    label: "IFSC code",
    incoming: payment.ifscCode,
    currentValue: nextFormData.payment.ifscCode,
    originalValue: ctx.originalFormData.payment.ifscCode,
    defaultValue: defaultInvoiceFormData.payment.ifscCode,
    assign: (value) => {
      nextFormData.payment.ifscCode = value.toUpperCase();
    },
  });
  applyStringField({
    ctx,
    path: "payment.swiftCode",
    label: "SWIFT / BIC code",
    incoming: payment.swiftCode,
    currentValue: nextFormData.payment.swiftBicCode,
    originalValue: ctx.originalFormData.payment.swiftBicCode,
    defaultValue: defaultInvoiceFormData.payment.swiftBicCode,
    assign: (value) => {
      nextFormData.payment.swiftBicCode = value.toUpperCase();
    },
  });
  applyStringField({
    ctx,
    path: "payment.ibanOrRouting",
    label: "IBAN / routing code",
    incoming: payment.ibanOrRouting,
    currentValue: nextFormData.payment.ibanRoutingCode,
    originalValue: ctx.originalFormData.payment.ibanRoutingCode,
    defaultValue: defaultInvoiceFormData.payment.ibanRoutingCode,
    assign: (value) => {
      nextFormData.payment.ibanRoutingCode = value;
    },
  });

  const settlementType = mapPaymentSettlementType(payment.mode);
  applyToggleField({
    ctx,
    path: "payment.mode",
    label: "Payment settlement type",
    incoming: settlementType || null,
    currentValue: nextFormData.payment.paymentSettlementType,
    originalValue: ctx.originalFormData.payment.paymentSettlementType,
    defaultValue: defaultInvoiceFormData.payment.paymentSettlementType,
    assign: (value) => {
      nextFormData.payment.paymentSettlementType = value;
    },
  });

  applyStringField({
    ctx,
    path: "meta.invoiceNumber",
    label: "Invoice number",
    incoming: meta.invoiceNumber,
    currentValue: nextFormData.meta.invoiceNumber,
    originalValue: ctx.originalFormData.meta.invoiceNumber,
    defaultValue: defaultInvoiceFormData.meta.invoiceNumber,
    assign: (value) => {
      nextFormData.meta.invoiceNumber = value;
    },
  });
  applyStringField({
    ctx,
    path: "meta.invoiceDate",
    label: "Invoice date",
    incoming: meta.invoiceDate,
    currentValue: nextFormData.meta.invoiceDate,
    originalValue: ctx.originalFormData.meta.invoiceDate,
    defaultValue: defaultInvoiceFormData.meta.invoiceDate,
    assign: (value) => {
      nextFormData.meta.invoiceDate = value;
    },
  });
  applyStringField({
    ctx,
    path: "meta.dueDate",
    label: "Due date",
    incoming: meta.dueDate,
    currentValue: nextFormData.meta.dueDate,
    originalValue: ctx.originalFormData.meta.dueDate,
    defaultValue: defaultInvoiceFormData.meta.dueDate,
    assign: (value) => {
      nextFormData.meta.dueDate = value;
    },
  });

  if (taxHints.ambiguity) {
    ctx.unresolvedFields.push("taxHints.ambiguity");
  }

  return {
    nextFormData: mergeInvoiceFormData(nextFormData),
    hydratedFields: ctx.hydratedFields,
    preservedFields: ctx.preservedFields,
    unresolvedFields: [...new Set(ctx.unresolvedFields)],
    clarificationQuestions: [...new Set(params.parserResponse.clarificationQuestions)],
    missingFields: [...new Set(params.parserResponse.missingFields)],
  };
}
