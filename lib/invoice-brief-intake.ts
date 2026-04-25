import type {
  AiBriefExtraction,
  AiBriefField,
  AiBriefTaxType,
} from "@/lib/ai-brief-extractor";
import {
  type InternationalCountryOption,
  type InternationalCurrencyCode,
} from "@/lib/international-billing-options";
import { buildBriefClarificationSuggestions } from "@/lib/invoice-clarifications";
import { inferCommercialTermsFromText } from "@/lib/commercial-terms-inference";
import { inferDeliverablesFromText } from "@/lib/deliverable-inference";
import {
  detectCurrencyFromText,
  parseFlexibleAmount,
} from "@/lib/amount-normalization";
import {
  classifyIdentifier,
  findBestIdentifier,
  type IdentifierClassification,
  type IdentifierKind,
} from "@/lib/identifier-classifier";
import { derivePanFromGstin, getStateFromGstin } from "@/lib/gstin-parser";
import { hydrateIndianAddressFields } from "@/lib/invoice-address";
import {
  hasForeignCityHint,
  inferLocationDetailsFromText,
  inferCountryFromText,
  inferLocationTypeFromText,
  inferStateFromText,
} from "@/lib/location-inference";
import {
  collectRoleContextFromText,
  inferNameRolesFromText,
  sanitizeEntityNameCandidate,
} from "@/lib/name-role-inference";
import {
  sanitizeHydrationString,
  sanitizeOwnedIdentifier,
} from "@/lib/invoice-field-ownership";
import { normalizeOcrText } from "@/lib/ocr-normalization";
import {
  type AgencyDetails,
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceLineItemType,
  type InvoiceRateUnit,
  type InvoiceStepperStep,
  type LicenseType,
} from "@/types/invoice";

export type BriefExtractionConfidence = "high" | "medium" | "low";

export type BriefExtractionSource =
  | "label"
  | "regex"
  | "pattern"
  | "inference"
  | "ai";

export type BriefExtractedField<T> = {
  value: T;
  confidence: BriefExtractionConfidence;
  source: BriefExtractionSource;
};

type Candidate<T> = BriefExtractedField<T>;
type NormalizedInvoiceTaxType = "CGST_SGST" | "IGST" | "ZERO_RATED";

export type InvoiceBriefLineItemExtraction = {
  type?: BriefExtractedField<InvoiceLineItemType>;
  description?: BriefExtractedField<string>;
  qty?: BriefExtractedField<number>;
  rate?: BriefExtractedField<number>;
  rateUnit?: BriefExtractedField<InvoiceRateUnit>;
};

export type InvoiceBriefExtractionSchema = {
  agencyName?: BriefExtractedField<string>;
  agencyAddress?: BriefExtractedField<string>;
  agencyAddressLine1?: BriefExtractedField<string>;
  agencyAddressLine2?: BriefExtractedField<string>;
  agencyCity?: BriefExtractedField<string>;
  agencyPinCode?: BriefExtractedField<string>;
  agencyState?: BriefExtractedField<InvoiceFormData["agency"]["agencyState"]>;
  agencyGstRegistrationStatus?: BriefExtractedField<
    AgencyDetails["gstRegistrationStatus"]
  >;
  agencyGstin?: BriefExtractedField<string>;
  agencyPan?: BriefExtractedField<string>;
  agencyLutAvailability?: BriefExtractedField<AgencyDetails["lutAvailability"]>;
  agencyLutNumber?: BriefExtractedField<string>;
  clientName?: BriefExtractedField<string>;
  clientAddress?: BriefExtractedField<string>;
  clientAddressLine1?: BriefExtractedField<string>;
  clientAddressLine2?: BriefExtractedField<string>;
  clientCity?: BriefExtractedField<string>;
  clientPinCode?: BriefExtractedField<string>;
  clientPostalCode?: BriefExtractedField<string>;
  clientState?: BriefExtractedField<InvoiceFormData["client"]["clientState"]>;
  clientCountry?: BriefExtractedField<
    InvoiceFormData["client"]["clientCountry"]
  >;
  clientLocation?: BriefExtractedField<
    InvoiceFormData["client"]["clientLocation"]
  >;
  clientCurrency?: BriefExtractedField<InternationalCurrencyCode>;
  clientGstin?: BriefExtractedField<string>;
  invoiceIsInternational?: BriefExtractedField<boolean>;
  invoiceCurrencyCode?: BriefExtractedField<string>;
  invoiceTotalAmount?: BriefExtractedField<number>;
  invoiceTaxType?: BriefExtractedField<NormalizedInvoiceTaxType>;
  lineItems?: InvoiceBriefLineItemExtraction[];
  deliverableType?: BriefExtractedField<InvoiceLineItemType>;
  deliverableDescription?: BriefExtractedField<string>;
  qty?: BriefExtractedField<number>;
  rate?: BriefExtractedField<number>;
  rateUnit?: BriefExtractedField<InvoiceRateUnit>;
  licenseType?: BriefExtractedField<LicenseType>;
  licenseDuration?: BriefExtractedField<string>;
  paymentTerms?: BriefExtractedField<string>;
  paymentMode?: BriefExtractedField<string>;
  paymentAccountName?: BriefExtractedField<string>;
  paymentBankName?: BriefExtractedField<string>;
  paymentBankAddress?: BriefExtractedField<string>;
  paymentAccountNumber?: BriefExtractedField<string>;
  paymentIfscCode?: BriefExtractedField<string>;
  paymentSwiftBicCode?: BriefExtractedField<string>;
  paymentIbanRoutingCode?: BriefExtractedField<string>;
  invoiceDate?: BriefExtractedField<string>;
  dueDate?: BriefExtractedField<string>;
  timeline?: BriefExtractedField<string>;
};

export type BriefAutofillFieldSummary = {
  label: string;
  step: InvoiceStepperStep;
  confidence: BriefExtractionConfidence;
  source: BriefExtractionSource;
  origin: "ai" | "parser";
};

export type BriefClarificationAction =
  | {
      kind: "set-client-location";
      value: InvoiceFormData["client"]["clientLocation"];
    }
  | {
      kind: "set-client-currency";
      value: InvoiceFormData["client"]["clientCurrency"];
    }
  | {
      kind: "set-agency-gst-registration";
      value: AgencyDetails["gstRegistrationStatus"];
    }
  | {
      kind: "set-agency-lut-availability";
      value: AgencyDetails["lutAvailability"];
    }
  | {
      kind: "set-payment-terms";
      value: string;
    }
  | {
      kind: "append-payment-note";
      value: string;
    }
  | {
      kind: "use-amount-as-total-project-fee";
      amount: number;
      description: string;
      type: InvoiceLineItemType;
    }
  | {
      kind: "use-amount-as-line-item-rate";
      amount: number;
      rateUnit: InvoiceRateUnit;
    }
  | {
      kind: "set-line-items";
      items: Array<{
        type: InvoiceLineItemType;
        description: string;
        qty: number;
        rate: number;
        rateUnit: InvoiceRateUnit;
      }>;
    }
  | {
      kind: "collapse-to-single-line-item";
      item: {
        type: InvoiceLineItemType;
        description: string;
        qty: number;
        rate: number;
        rateUnit: InvoiceRateUnit;
      };
    };

export type BriefClarificationOption = {
  id: string;
  label: string;
  helper?: string;
  action: BriefClarificationAction;
};

export type BriefClarificationSuggestion = {
  id: string;
  title: string;
  message: string;
  step: InvoiceStepperStep;
  priority: number;
  options: BriefClarificationOption[];
};

export type BriefAutofillMappingResult = {
  nextFormData: InvoiceFormData;
  filledFields: string[];
  aiFilledFields: string[];
  reviewFields: string[];
  lowConfidenceFields: string[];
  confidentFieldSummaries: BriefAutofillFieldSummary[];
  inferredFieldSummaries: BriefAutofillFieldSummary[];
  lowConfidenceFieldSummaries: BriefAutofillFieldSummary[];
};

export type BriefIntakeInput = {
  text: string;
  ocrText?: string;
  imageFiles?: File[];
  voiceTranscript?: string;
};

export type BriefAutofillResult = {
  normalizedText: string;
  extraction: InvoiceBriefExtractionSchema;
  nextFormData: InvoiceFormData;
  filledFields: string[];
  aiFilledFields: string[];
  reviewFields: string[];
  lowConfidenceFields: string[];
  confidentFieldSummaries: BriefAutofillFieldSummary[];
  inferredFieldSummaries: BriefAutofillFieldSummary[];
  lowConfidenceFieldSummaries: BriefAutofillFieldSummary[];
  clarificationSuggestions: BriefClarificationSuggestion[];
  hasImageAttachments: boolean;
  hasVoiceTranscript: boolean;
};

// Canonical extraction boundary:
// all extraction sources should be adapted into InvoiceBriefExtractionSchema
// before any mapping into InvoiceFormData happens.
export type InvoiceExtractionAdapterInput =
  | {
      source: "ai";
      extraction: AiBriefExtraction;
      rawText: string;
    }
  | {
      source: "heuristic" | "ocr" | "schema";
      extraction: InvoiceBriefExtractionSchema;
    };

export type NormalizedExtractionOutput =
  | {
      source: "ai";
      extraction: AiBriefExtraction;
      rawText: string;
    }
  | {
      source: "schema";
      extraction: InvoiceBriefExtractionSchema;
    };

const defaultLineItem = defaultInvoiceFormData.lineItems[0];

const lineItemTypeMatchers: Array<{
  type: InvoiceLineItemType;
  patterns: RegExp[];
}> = [
  {
    type: "Logo Design",
    patterns: [/\blogo\b/i, /\bwordmark\b/i, /\bbrand mark\b/i],
  },
  {
    type: "UI/UX",
    patterns: [
      /\bui\b/i,
      /\bux\b/i,
      /\bwireframes?\b/i,
      /\blanding page\b/i,
      /\bhomepage\b/i,
      /\bhome page\b/i,
      /\bpage design\b/i,
      /\bdesign system\b/i,
      /\bdashboard\b/i,
      /\bscreens?\b/i,
    ],
  },
  {
    type: "Illustration",
    patterns: [/\billustration\b/i, /\bcharacter art\b/i, /\beditorial art\b/i],
  },
  {
    type: "Photography",
    patterns: [/\bphotography\b/i, /\bphoto shoot\b/i, /\bphotos?\b/i],
  },
  {
    type: "Video Editing",
    patterns: [/\bvideo editing\b/i, /\breel\b/i, /\bvideo\b/i],
  },
  {
    type: "Social Media",
    patterns: [
      /\bsocial media\b/i,
      /\bbanners?\b/i,
      /\bcarousel\b/i,
      /\bstory set\b/i,
      /\bposts?\b/i,
    ],
  },
];

const rateUnitMatchers: Array<{
  unit: InvoiceRateUnit;
  patterns: RegExp[];
}> = [
  {
    unit: "per-deliverable",
    patterns: [/\bper\s+deliverable\b/i, /\beach\s+deliverable\b/i],
  },
  {
    unit: "per-item",
    patterns: [/\bper\s+item\b/i, /\beach\s+item\b/i],
  },
  {
    unit: "per-item",
    patterns: [/\bper\s+banner\b/i, /\beach\s+banner\b/i],
  },
  {
    unit: "per-screen",
    patterns: [/\bper\s+screen\b/i, /\beach\s+screen\b/i],
  },
  {
    unit: "per-hour",
    patterns: [/\bper\s+hour\b/i, /\bhourly\b/i],
  },
  {
    unit: "per-day",
    patterns: [/\bper\s+day\b/i, /\bdaily\b/i],
  },
  {
    unit: "per-revision",
    patterns: [/\bper\s+revision\b/i, /\beach\s+revision\b/i],
  },
  {
    unit: "per-concept",
    patterns: [/\bper\s+concept\b/i, /\beach\s+concept\b/i],
  },
  {
    unit: "per-post",
    patterns: [/\bper\s+post\b/i, /\beach\s+post\b/i],
  },
  {
    unit: "per-video",
    patterns: [/\bper\s+video\b/i, /\beach\s+video\b/i],
  },
  {
    unit: "per-image",
    patterns: [/\bper\s+image\b/i, /\beach\s+image\b/i],
  },
];

const quantityUnitHints: Array<{
  unit: InvoiceRateUnit;
  pattern: RegExp;
}> = [
  { unit: "per-screen", pattern: /\b(\d+)\s+screens?\b/i },
  { unit: "per-item", pattern: /\b(\d+)\s+banners?\b/i },
  { unit: "per-item", pattern: /\b(\d+)\s+illustrations?\b/i },
  { unit: "per-deliverable", pattern: /\b(\d+)\s+logos?\b/i },
  { unit: "per-post", pattern: /\b(\d+)\s+posts?\b/i },
  { unit: "per-video", pattern: /\b(\d+)\s+videos?\b/i },
  { unit: "per-image", pattern: /\b(\d+)\s+images?\b/i },
  { unit: "per-concept", pattern: /\b(\d+)\s+concepts?\b/i },
  { unit: "per-item", pattern: /\b(\d+)\s+items?\b/i },
  { unit: "per-day", pattern: /\b(\d+)\s+days?\b/i },
  { unit: "per-hour", pattern: /\b(\d+)\s+hours?\b/i },
  { unit: "per-revision", pattern: /\b(\d+)\s+revisions?\b/i },
];

const currencyMatchers: Array<{
  code: InternationalCurrencyCode;
  labelPatterns: RegExp[];
  fallbackPatterns: RegExp[];
}> = [
  {
    code: "USD",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:usd|us dollars?)\b/i],
    fallbackPatterns: [/\busd\b/i, /\bus dollars?\b/i],
  },
  {
    code: "EUR",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:eur|euro)\b/i],
    fallbackPatterns: [/\beur\b/i, /\beuro\b/i],
  },
  {
    code: "GBP",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:gbp|pound)\b/i],
    fallbackPatterns: [/\bgbp\b/i, /\bbritish pound\b/i, /\bpounds?\b/i],
  },
  {
    code: "AED",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:aed|dirham)\b/i],
    fallbackPatterns: [/\baed\b/i, /\bdirham\b/i],
  },
  {
    code: "AUD",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:aud|australian dollars?)\b/i],
    fallbackPatterns: [/\baud\b/i, /\baustralian dollars?\b/i],
  },
  {
    code: "CAD",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:cad|canadian dollars?)\b/i],
    fallbackPatterns: [/\bcad\b/i, /\bcanadian dollars?\b/i],
  },
  {
    code: "SGD",
    labelPatterns: [/\bcurrency\s*[:\-]\s*(?:sgd|singapore dollars?)\b/i],
    fallbackPatterns: [/\bsgd\b/i, /\bsingapore dollars?\b/i],
  },
];

const FLEXIBLE_AMOUNT_PATTERN = String.raw`(?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£|usd|eur|gbp|aed|aud|cad|sgd)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?`;

function makeCandidate<T>(
  value: T,
  confidence: BriefExtractionConfidence,
  source: BriefExtractionSource,
): Candidate<T> {
  return {
    value,
    confidence,
    source,
  };
}

function cleanValue(value?: string | null) {
  return (value ?? "")
    .replace(/^[\s\-*•]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .trim();
}

function cleanSentenceValue(value?: string | null) {
  return cleanValue(value)
    .replace(/\s+(?:and|with)\s+(?:bank|payment|terms?)\b.*$/i, "")
    .replace(/\s+(?:net\s*\d+|due on receipt)\b.*$/i, "")
    .trim();
}

function normalizePaymentTermsValue(value?: string | null) {
  const cleaned = cleanValue(value ?? "")
    .replace(/\bnet[\s-]?(\d+)\b/i, "Net $1")
    .replace(/\bdue on receipt\b/i, "Due on receipt")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.replace(/^(\d+)%\s+/i, "$1% ");
}

function cleanAddressValue(value?: string | null) {
  return cleanValue(value)
    .replace(
      /\s+(?:\d+\s+(?:screens?|banners?|items?|illustrations?)|landing page|homepage|logo|illustration|ui\/?\s*ux|terms?|payment|bank|account|ifsc|swift)\b.*$/i,
      "",
    )
    .trim();
}

function cleanAddressBlockValue(value?: string | null) {
  return (value ?? "")
    .split(/\n+/)
    .map((line) => cleanValue(line))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function looksLikeFieldLabelLine(line: string) {
  return /^[a-z][a-z0-9/&.' -]{1,40}:/i.test(line.trim());
}

type ExtractLabeledValueOptions = {
  allowContinuationLines?: boolean;
  maxContinuationLines?: number;
  preserveLineBreaks?: boolean;
  strictShortLabels?: boolean;
  shouldIncludeContinuationLine?: (line: string) => boolean;
  normalizeContinuationLine?: (line: string) => string;
};

export function normalizeBriefText(text: string) {
  return normalizeOcrText(
    text.replace(/([A-Za-z0-9,.:])\s*\n\s*(?=[a-z0-9])/g, "$1 "),
  );
}

function findFirstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return "";
}

function extractLabeledValue(
  text: string,
  labels: string[],
  options: ExtractLabeledValueOptions = {},
) {
  const lines = text.split(/\n/);
  const orderedLabels = [...labels].sort(
    (left, right) => right.length - left.length,
  );

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    for (const label of orderedLabels) {
      const pattern =
        options.strictShortLabels && !label.includes(" ")
          ? new RegExp(
              `^\\s*${escapeRegExp(label)}(?:\\s*[:\\-]\\s*(.*))?\\s*$`,
              "i",
            )
          : new RegExp(
              `^\\s*${escapeRegExp(label)}(?:\\b|$)(?:\\s*(?:[:\\-])|\\s+is)?\\s*(.*)$`,
              "i",
            );
      const match = line.match(pattern);

      if (!match) {
        continue;
      }

      const inlineValue = cleanValue(match[1]);

      if (!options.allowContinuationLines) {
        if (inlineValue) {
          return inlineValue;
        }

        continue;
      }

      const collectedLines: string[] = inlineValue ? [inlineValue] : [];
      const maxContinuationLines = options.maxContinuationLines ?? 1;

      for (
        let nextIndex = index + 1;
        nextIndex < lines.length &&
        collectedLines.length < maxContinuationLines;
        nextIndex += 1
      ) {
        const nextLine = lines[nextIndex].trim();

        if (!nextLine) {
          if (collectedLines.length > 0) {
            break;
          }

          continue;
        }

        if (looksLikeFieldLabelLine(nextLine)) {
          break;
        }

        const normalizedContinuationLine = cleanValue(
          options.normalizeContinuationLine
            ? options.normalizeContinuationLine(nextLine)
            : nextLine,
        );

        if (!normalizedContinuationLine) {
          break;
        }

        if (
          options.shouldIncludeContinuationLine &&
          !options.shouldIncludeContinuationLine(normalizedContinuationLine)
        ) {
          break;
        }

        collectedLines.push(normalizedContinuationLine);
      }

      const combined = options.preserveLineBreaks
        ? collectedLines.join("\n")
        : collectedLines.join(" ");

      if (combined.trim()) {
        return combined.trim();
      }
    }
  }

  return "";
}

function looksLikeAddressContinuationLine(line: string) {
  const cleaned = cleanValue(line);

  if (!cleaned) {
    return false;
  }

  if (
    /\b(?:gst|gstin|pan|lut|client|agency|deliverable|qty|quantity|rate|payment|terms?|due date|currency|bank|ifsc|swift|iban|routing|account|invoice date|landing page|homepage|home page|logo|illustrations?|editorial|ui\/?\s*ux|screens?|banners?|posts?|videos?|retouched|editing|campaign|project fee)\b/i.test(
      cleaned,
    )
  ) {
    return false;
  }

  return true;
}

function normalizeAddressContinuationLine(line: string) {
  return cleanValue(line)
    .replace(
      /\s+(?:\d+\s+(?:screens?|banners?|items?|illustrations?|images?|posts?|videos?)|landing page|homepage|home page|logo|editorial illustrations?|ui\/?\s*ux|project fee|campaign launch|payment terms?)\b.*$/i,
      "",
    )
    .trim();
}

function cleanEntityLabelValue(value?: string | null) {
  return cleanValue(value)
    .replace(/^is\s+/i, "")
    .replace(/\s+(?:and they are|and they're|and is)\b.*$/i, "")
    .replace(/\s+(?:based|located)\s+in\b.*$/i, "")
    .replace(
      /\s+(?:invoice|project|work|rate|qty|quantity|currency|payment|bank)\b.*$/i,
      "",
    )
    .trim();
}

function parseAmount(value: string) {
  return parseFlexibleAmount(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeIdentifierCandidate(
  identifier: IdentifierClassification | undefined,
): Candidate<string> | undefined {
  if (!identifier) {
    return undefined;
  }

  return makeCandidate(
    identifier.normalizedValue,
    identifier.confidence,
    identifier.source === "label"
      ? "label"
      : identifier.source === "regex"
        ? "regex"
        : "inference",
  );
}

function extractPatternValue(text: string, patterns: RegExp[]) {
  return findFirstMatch(text, patterns);
}

function looksLikeEntityName(value: string) {
  const cleaned = cleanValue(value);

  if (!cleaned || cleaned.length < 3) {
    return false;
  }

  if (
    /\b(?:landing page|homepage|home page|ui\/?\s*ux|wireframes?|design system|campaign launch|project fee|deliverables?|illustrations?|images?|reels?|screens?|banners?|posts?|videos?|retouched|editing|payment terms?|net\s*\d+|due on receipt)\b/i.test(
      cleaned,
    ) &&
    !/\b(?:studio|agency|creative|media|labs|works?|co\.?|company|llc|inc\.?|ltd\.?|pvt\.?\s*ltd\.?|private limited|corp\.?|corporation|limited)\b/i.test(
      cleaned,
    )
  ) {
    return false;
  }

  if (
    /\bdesign\b/i.test(cleaned) &&
    /\b(?:studio|agency|creative|media|labs|works?|co\.?|company|llc|inc\.?|ltd\.?|pvt\.?\s*ltd\.?|private limited|corp\.?|corporation|limited)\b/i.test(
      cleaned,
    )
  ) {
    return true;
  }

  return !/\b(?:invoice|brief|work|project|rate|qty|quantity|terms|bank|amount|budget|ignore|old one|this one)\b/i.test(
    cleaned,
  );
}

type ParsedStructuredAgencyAddress = {
  line1: string;
  line2: string;
  city: string;
  pinCode: string;
};

type ParsedStructuredClientAddress = {
  line1: string;
  line2: string;
  city: string;
  pinCode: string;
  postalCode: string;
};

const INTERNATIONAL_POSTAL_CODE_PATTERNS = [
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,
  /\b\d{4,10}\b/,
];

function splitAddressSegments(address: string) {
  const normalized = cleanAddressBlockValue(address);

  if (!normalized) {
    return [];
  }

  const lineSegments = normalized
    .split(/\n+/)
    .map((segment) => cleanValue(segment))
    .filter(Boolean);

  if (lineSegments.length > 1) {
    return lineSegments;
  }

  return normalized
    .split(",")
    .map((segment) => cleanValue(segment))
    .filter(Boolean);
}

function stripLocationFragments(
  value: string,
  fragments: Array<string | undefined>,
) {
  let nextValue = cleanValue(value);

  for (const fragment of fragments) {
    const cleanedFragment = cleanValue(fragment);

    if (!cleanedFragment) {
      continue;
    }

    nextValue = nextValue.replace(
      new RegExp(`\\b${escapeRegExp(cleanedFragment)}\\b`, "ig"),
      "",
    );
  }

  return nextValue
    .replace(/\b[1-9][0-9]{5}\b/g, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/(^,|,$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractInternationalPostalCode(value: string) {
  const normalized = cleanAddressBlockValue(value).toUpperCase();

  for (const pattern of INTERNATIONAL_POSTAL_CODE_PATTERNS) {
    const match = normalized.match(pattern);

    if (match?.[0]) {
      return cleanValue(match[0]);
    }
  }

  return "";
}

function parseAgencyStructuredAddress(
  value?: string | null,
): ParsedStructuredAgencyAddress {
  const cleaned = cleanAddressBlockValue(value);

  if (!cleaned) {
    return {
      line1: "",
      line2: "",
      city: "",
      pinCode: "",
    };
  }

  const hydrated = hydrateIndianAddressFields({
    legacyAddress: cleaned,
  });
  const inferredLocation = inferLocationDetailsFromText(cleaned);
  const lineSegments = cleaned
    .split(/\n+/)
    .map((segment) => cleanValue(segment))
    .filter(Boolean);
  const trailingAddressLine = stripLocationFragments(
    lineSegments.at(-1) ?? "",
    [
      hydrated.city || inferredLocation.matchedIndianCity,
      inferredLocation.state,
      hydrated.pinCode,
    ],
  );

  return {
    line1:
      (lineSegments.length > 1 ? lineSegments[0] : "") || hydrated.addressLine1,
    line2:
      (lineSegments.length > 2
        ? lineSegments.slice(1, -1).join(", ")
        : lineSegments.length === 2
          ? trailingAddressLine
          : "") || hydrated.addressLine2,
    city: hydrated.city || inferredLocation.matchedIndianCity || "",
    pinCode: hydrated.pinCode,
  };
}

function parseClientStructuredAddress(params: {
  value?: string | null;
  location?: InvoiceFormData["client"]["clientLocation"] | "";
  country?: InternationalCountryOption | "";
}): ParsedStructuredClientAddress {
  const cleaned = cleanAddressBlockValue(params.value);

  if (!cleaned) {
    return {
      line1: "",
      line2: "",
      city: "",
      pinCode: "",
      postalCode: "",
    };
  }

  const inferredLocation = inferLocationDetailsFromText(cleaned);
  const shouldTreatAsInternational =
    params.location === "international" ||
    Boolean(params.country) ||
    inferredLocation.locationType === "international";

  if (!shouldTreatAsInternational) {
    const hydrated = hydrateIndianAddressFields({
      legacyAddress: cleaned,
    });
    const lineSegments = cleaned
      .split(/\n+/)
      .map((segment) => cleanValue(segment))
      .filter(Boolean);
    const trailingAddressLine = stripLocationFragments(
      lineSegments.at(-1) ?? "",
      [
        hydrated.city || inferredLocation.matchedIndianCity,
        inferredLocation.state,
        hydrated.pinCode,
      ],
    );

    return {
      line1:
        (lineSegments.length > 1 ? lineSegments[0] : "") ||
        hydrated.addressLine1,
      line2:
        (lineSegments.length > 2
          ? lineSegments.slice(1, -1).join(", ")
          : lineSegments.length === 2
            ? trailingAddressLine
            : "") || hydrated.addressLine2,
      city: hydrated.city || inferredLocation.matchedIndianCity || "",
      pinCode: hydrated.pinCode,
      postalCode: "",
    };
  }

  const segments = splitAddressSegments(cleaned);
  const city = inferredLocation.matchedForeignCity || "";
  const postalCode = extractInternationalPostalCode(cleaned);
  const country = params.country || inferredLocation.country || "";
  const line1 = segments[0] ?? cleaned;
  const remainingSegments = segments.slice(1).filter((segment) => {
    const normalizedSegment = segment.toLowerCase();

    if (country && normalizedSegment === country.toLowerCase()) {
      return false;
    }

    if (city && normalizedSegment === city.toLowerCase()) {
      return false;
    }

    if (postalCode && normalizedSegment === postalCode.toLowerCase()) {
      return false;
    }

    return true;
  });

  return {
    line1,
    line2: remainingSegments.join(", "),
    city,
    pinCode: "",
    postalCode,
  };
}

function makeStringCandidate(
  value: string,
  confidence: BriefExtractionConfidence,
  source: BriefExtractionSource,
) {
  const cleaned = cleanValue(value);
  return cleaned ? makeCandidate(cleaned, confidence, source) : undefined;
}

function sanitizeCandidate<T extends string>(
  candidate: Candidate<T> | undefined,
  kind: Parameters<typeof sanitizeHydrationString>[0]["kind"] = "general",
) {
  if (!candidate) {
    return undefined;
  }

  const sanitized = sanitizeHydrationString({
    value: candidate.value,
    kind,
  }) as T;

  return sanitized
    ? makeCandidate(sanitized, candidate.confidence, candidate.source)
    : undefined;
}

function getConfidenceScore(confidence: BriefExtractionConfidence) {
  switch (confidence) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function getFieldStepForLabel(label: string): InvoiceStepperStep {
  if (/agency|gst|lut|pan/i.test(label) && !/client/i.test(label)) {
    return "agency";
  }

  if (/client|country/i.test(label)) {
    return "client";
  }

  if (/currency/i.test(label)) {
    return "client";
  }

  if (/deliverable|quantity|rate/i.test(label)) {
    return "deliverables";
  }

  if (
    /payment terms|beneficiary|account|bank|ifsc|swift|iban|routing|license/i.test(
      label,
    )
  ) {
    return "payment";
  }

  if (/invoice|due date|timeline/i.test(label)) {
    return "meta";
  }

  return "totals";
}

function createFieldSummary(
  label: string,
  confidence: BriefExtractionConfidence,
  source: BriefExtractionSource,
): BriefAutofillFieldSummary {
  return {
    label,
    step: getFieldStepForLabel(label),
    confidence,
    source,
    origin: source === "ai" ? "ai" : "parser",
  };
}

function dedupeFieldSummaries(summaries: BriefAutofillFieldSummary[]) {
  const seen = new Set<string>();

  return summaries.filter((summary) => {
    const key = [
      summary.step,
      summary.label,
      summary.confidence,
      summary.source,
      summary.origin,
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createAiCandidate<T>(
  value: T | "" | undefined | null,
  confidence: BriefExtractionConfidence | undefined,
): Candidate<T> | undefined {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "number" && value === 0)
  ) {
    return undefined;
  }

  return makeCandidate(value as T, confidence ?? "low", "ai");
}

function createAiBooleanCandidate<T>(
  field: AiBriefField<boolean>,
  trueValue: T,
  falseValue: T,
): Candidate<T> | undefined {
  if (field.value === null) {
    return undefined;
  }

  return makeCandidate(
    field.value ? trueValue : falseValue,
    field.confidence,
    "ai",
  );
}

function createAiClassifiedCandidate(
  value: string | null | undefined,
  confidence: BriefExtractionConfidence | undefined,
  allowedKinds: IdentifierKind[],
  contextText: string,
): Candidate<string> | undefined {
  const cleaned = cleanValue(value ?? "");

  if (!cleaned) {
    return undefined;
  }

  const classified = classifyIdentifier(cleaned, contextText);

  if (!classified) {
    return allowedKinds.includes("unknown-alphanumeric-code")
      ? createAiCandidate(cleaned, confidence)
      : undefined;
  }

  if (!allowedKinds.includes(classified.kind)) {
    return undefined;
  }

  const resolvedConfidence =
    classified.confidence === "low"
      ? (confidence ?? classified.confidence)
      : classified.confidence;

  return makeCandidate(classified.normalizedValue, resolvedConfidence, "ai");
}

function normalizeLineItemTypeValue(
  value: string | null | undefined,
): InvoiceLineItemType | undefined {
  const normalized = cleanValue(value ?? "");

  if (!normalized) {
    return undefined;
  }

  if (/\blogos?\b/i.test(normalized)) return "Logo Design";
  if (
    /\b(ui|ux|landing page|homepage|screens?|wireframes?|dashboard)\b/i.test(
      normalized,
    )
  ) {
    return "UI/UX";
  }
  if (/\billustrations?\b/i.test(normalized)) return "Illustration";
  if (/\b(photo|photography|images?)\b/i.test(normalized)) return "Photography";
  if (/\b(video|reels?)\b/i.test(normalized)) return "Video Editing";
  if (/\b(social|banner|carousel|post|story)\b/i.test(normalized)) {
    return "Social Media";
  }

  return "Other";
}

function normalizeRateUnitValue(
  value: string | null | undefined,
  description?: string | null,
): InvoiceRateUnit | undefined {
  const normalized = `${value ?? ""} ${description ?? ""}`.trim();

  if (!normalized) {
    return undefined;
  }

  for (const matcher of rateUnitMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(normalized))) {
      return matcher.unit;
    }
  }

  for (const hint of quantityUnitHints) {
    if (hint.pattern.test(normalized)) {
      return hint.unit;
    }
  }

  if (/\breels?\b/i.test(normalized)) return "per-video";
  if (/\bbanners?\b/i.test(normalized)) return "per-item";
  if (/\bimages?\b/i.test(normalized)) return "per-image";
  if (/\blogos?\b/i.test(normalized)) return "per-deliverable";

  return undefined;
}

function normalizePaymentModeValue(value: string | null | undefined) {
  const normalized = cleanValue(value ?? "").toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("payoneer")) return "payoneer";
  if (normalized.includes("wise")) return "wise";
  if (normalized.includes("paypal")) return "paypal";
  if (normalized.includes("bank") || normalized.includes("wire")) return "bank";
  if (normalized.includes("upi")) return "upi";

  return normalized;
}

function formatDateCandidate(value: string | null | undefined) {
  const cleaned = cleanValue(value ?? "");

  if (!cleaned) {
    return "";
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function extractDateCandidate(
  text: string,
  labels: string[],
): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, labels);

  if (labeled) {
    const formatted = formatDateCandidate(labeled);

    if (formatted) {
      return makeCandidate(formatted, "high", "label");
    }
  }

  const matchedDate = text.match(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i,
  )?.[1];
  const formatted = formatDateCandidate(matchedDate);

  return formatted ? makeCandidate(formatted, "medium", "pattern") : undefined;
}

function deriveTaxTypeCandidate(params: {
  explicitTaxType?: Candidate<NormalizedInvoiceTaxType>;
  rawText: string;
  agencyState?: string;
  clientState?: string;
  clientLocation?: InvoiceFormData["client"]["clientLocation"];
  gstRegistrationStatus?: AgencyDetails["gstRegistrationStatus"];
  lutAvailability?: AgencyDetails["lutAvailability"];
}) {
  if (params.explicitTaxType) {
    return params.explicitTaxType;
  }

  if (/igst/i.test(params.rawText)) {
    return makeCandidate<NormalizedInvoiceTaxType>(
      "IGST",
      "medium",
      "inference",
    );
  }

  if (
    /export of services/i.test(params.rawText) ||
    params.lutAvailability === "yes"
  ) {
    return makeCandidate<NormalizedInvoiceTaxType>(
      "ZERO_RATED",
      "medium",
      "inference",
    );
  }

  if (
    params.gstRegistrationStatus === "registered" &&
    (params.clientLocation === "domestic" ||
      /\b(?:same state|same-state|inter state|inter-state|interstate|different state|out of state|cgst|sgst)\b/i.test(
        params.rawText,
      ))
  ) {
    if (
      /\b(?:same state|same-state|within state|cgst\s*(?:\+|and)\s*sgst)\b/i.test(
        params.rawText,
      )
    ) {
      return makeCandidate<NormalizedInvoiceTaxType>(
        "CGST_SGST",
        "high",
        "pattern",
      );
    }

    if (
      /\b(?:inter state|inter-state|interstate|different state|out of state)\b/i.test(
        params.rawText,
      )
    ) {
      return makeCandidate<NormalizedInvoiceTaxType>("IGST", "high", "pattern");
    }
  }

  if (
    params.gstRegistrationStatus === "registered" &&
    params.clientLocation === "domestic" &&
    params.agencyState &&
    params.clientState
  ) {
    return makeCandidate<NormalizedInvoiceTaxType>(
      params.agencyState === params.clientState ? "CGST_SGST" : "IGST",
      "medium",
      "inference",
    );
  }

  return undefined;
}

function deriveFallbackDeliverables(text: string) {
  const patterns: Array<{
    pattern: RegExp;
    type: InvoiceLineItemType;
    rateUnit: InvoiceRateUnit;
    description: string;
  }> = [
    {
      pattern: /\b(\d+)\s+images?\b/i,
      type: "Photography",
      rateUnit: "per-image",
      description: "Images",
    },
    {
      pattern: /\b(\d+)\s+reels?\b/i,
      type: "Video Editing",
      rateUnit: "per-video",
      description: "Reels",
    },
    {
      pattern: /\b(\d+)\s+screens?\b/i,
      type: "UI/UX",
      rateUnit: "per-screen",
      description: "Screens",
    },
    {
      pattern: /\b(\d+)\s+banners?\b/i,
      type: "Social Media",
      rateUnit: "per-item",
      description: "Banners",
    },
    {
      pattern: /\b(\d+)\s+shorts?\b/i,
      type: "Video Editing",
      rateUnit: "per-video",
      description: "Short videos",
    },
    {
      pattern: /\b(\d+)\s+videos?\b/i,
      type: "Video Editing",
      rateUnit: "per-video",
      description: "Videos",
    },
    {
      pattern: /\b(\d+)\s+shots?\b/i,
      type: "Photography",
      rateUnit: "per-image",
      description: "Shots",
    },
  ];

  const items: InvoiceBriefLineItemExtraction[] = [];

  for (const entry of patterns) {
    const match = text.match(entry.pattern);
    const quantity = Number(match?.[1]);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    items.push({
      type: makeCandidate(entry.type, "medium", "inference"),
      description: makeCandidate(entry.description, "medium", "inference"),
      qty: makeCandidate(quantity, "medium", "inference"),
      rate: undefined,
      rateUnit: makeCandidate(entry.rateUnit, "medium", "inference"),
    });
  }

  return items;
}

function normalizeAiDeliverables(
  extraction: AiBriefExtraction,
  rawText: string,
) {
  const data = extraction;
  const normalized = data.deliverables
    .map((item) => {
      const normalizedType = normalizeLineItemTypeValue(item.type.value);
      const normalizedRateUnit = normalizeRateUnitValue(
        item.unit.value,
        item.description.value ?? item.type.value,
      );

      return {
        type: normalizedType
          ? makeCandidate(normalizedType, item.type.confidence, "ai")
          : undefined,
        description: createAiCandidate(
          cleanSentenceValue(item.description.value ?? item.type.value ?? ""),
          item.description.confidence,
        ),
        qty: createAiCandidate(item.quantity.value, item.quantity.confidence),
        rate: createAiCandidate(item.rate.value, item.rate.confidence),
        rateUnit: normalizedRateUnit
          ? makeCandidate(normalizedRateUnit, item.unit.confidence, "ai")
          : undefined,
      } satisfies InvoiceBriefLineItemExtraction;
    })
    .filter(
      (item) =>
        item.type || item.description || item.qty || item.rate || item.rateUnit,
    );

  return normalized.length > 0
    ? normalized
    : deriveFallbackDeliverables(rawText);
}

function normalizeAiTaxType(
  field: AiBriefField<AiBriefTaxType>,
): Candidate<NormalizedInvoiceTaxType> | undefined {
  if (!field.value) {
    return undefined;
  }

  return makeCandidate(
    field.value === "ZERO" ? "ZERO_RATED" : field.value,
    field.confidence,
    "ai",
  );
}

function formatAiPaymentSchedule(extraction: AiBriefExtraction) {
  const data = extraction;
  const scheduleParts = data.paymentSchedule
    .map((item) => {
      const milestone = cleanValue(item.milestone.value ?? "");
      const percentage = item.percentage.value;
      const dueWhen = cleanValue(item.dueWhen.value ?? "");

      if (!milestone && !percentage && !dueWhen) {
        return "";
      }

      const pieces = [
        percentage ? `${percentage}%` : "",
        milestone,
        dueWhen ? `(${dueWhen})` : "",
      ].filter(Boolean);

      return pieces.join(" ").trim();
    })
    .filter(Boolean);

  return scheduleParts.join(", ");
}

export function normalizeExtractedData(
  extraction: AiBriefExtraction,
  rawText: string,
): InvoiceBriefExtractionSchema {
  const data = extraction;
  const roleInferences = inferNameRolesFromText(rawText);
  const agencyContext =
    roleInferences.agencyContext ||
    collectRoleContextFromText(rawText, "agency");
  const clientContext =
    roleInferences.clientContext ||
    collectRoleContextFromText(rawText, "client");
  const fallbackAgencyName =
    sanitizeEntityNameCandidate(data.agencyName.value) ||
    sanitizeEntityNameCandidate(roleInferences.agency?.value) ||
    sanitizeEntityNameCandidate(data.payment.accountName.value) ||
    "";
  const agencyAddressValue =
    data.agencyAddress.value ?? data.locations.agency.value ?? "";
  const clientAddressValue =
    data.clientAddress.value ?? data.locations.client.value ?? "";
  const agencyStateFromGstin = getStateFromGstin(data.gst.gstin.value);
  const clientStateFromGstin = getStateFromGstin(data.clientTaxId.value);
  const agencyPanFromGstin = derivePanFromGstin(data.gst.gstin.value);
  const agencyLocationDetails = inferLocationDetailsFromText(
    [data.agencyState.value ?? "", agencyAddressValue, agencyContext].join(" "),
  );
  const clientLocationDetails = inferLocationDetailsFromText(
    [
      data.clientState.value ?? "",
      data.clientCountry.value ?? "",
      clientAddressValue,
      clientContext,
    ].join(" "),
  );
  const agencyStateValue =
    agencyLocationDetails.state || agencyStateFromGstin || "";
  const clientStateValue =
    clientLocationDetails.state || clientStateFromGstin || "";
  const clientCountryValue = clientLocationDetails.country || "";
  const currencyCandidate =
    createAiCandidate(data.currency.value, data.currency.confidence) ??
    getCurrencyFromText(rawText);
  const explicitInternational =
    data.locations.inferredType.value === "international"
      ? true
      : data.locations.inferredType.value === "domestic"
        ? false
        : null;
  const paymentModeValue =
    normalizePaymentModeValue(data.paymentMode.value) ||
    normalizePaymentModeValue(
      /wise|payoneer|paypal|upi|bank|wire/i.exec(rawText)?.[0],
    );
  const inferredLocationType = inferLocationTypeFromText(
    [
      data.clientName.value ?? roleInferences.client?.value ?? "",
      clientAddressValue,
      clientCountryValue,
      clientStateValue,
      clientContext,
    ].join(" "),
  );
  const clientLocationCandidate =
    explicitInternational !== null
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          explicitInternational ? "international" : "domestic",
          data.locations.inferredType.confidence,
          "ai",
        )
      : inferredLocationType === "international"
        ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
            "international",
            "high",
            "inference",
          )
        : inferredLocationType === "domestic"
          ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
              "domestic",
              "high",
              "inference",
            )
          : clientCountryValue
            ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
                "international",
                clientLocationDetails.confidence || "medium",
                "inference",
              )
            : hasForeignCityHint(rawText) ||
                paymentModeValue === "wise" ||
                paymentModeValue === "payoneer"
              ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
                  "international",
                  "medium",
                  "inference",
                )
              : clientStateValue
                ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
                    "domestic",
                    clientLocationDetails.confidence || "medium",
                    "inference",
                  )
                : undefined;
  const agencyGstStatus =
    createAiBooleanCandidate(
      data.gst.isRegistered,
      "registered" as AgencyDetails["gstRegistrationStatus"],
      "not-registered" as AgencyDetails["gstRegistrationStatus"],
    ) ??
    (data.gst.lutAvailable.value === true
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "medium",
          "inference",
        )
      : undefined) ??
    ((data.gst.type.value === "CGST_SGST" || data.gst.type.value === "IGST") &&
    data.gst.rate.value &&
    data.gst.rate.value > 0
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "medium",
          "inference",
        )
      : undefined) ??
    (data.gst.gstin.value
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "high",
          "inference",
        )
      : undefined);
  const agencyLutAvailability =
    createAiBooleanCandidate(
      data.gst.lutAvailable,
      "yes" as AgencyDetails["lutAvailability"],
      "no" as AgencyDetails["lutAvailability"],
    ) ??
    (/export of services/i.test(rawText)
      ? makeCandidate<AgencyDetails["lutAvailability"]>(
          "yes",
          "high",
          "inference",
        )
      : undefined);
  const taxTypeCandidate = deriveTaxTypeCandidate({
    explicitTaxType: normalizeAiTaxType(data.gst.type),
    rawText,
    agencyState: agencyStateValue,
    clientState: clientStateValue,
    clientLocation: clientLocationCandidate?.value,
    gstRegistrationStatus: agencyGstStatus?.value,
    lutAvailability: agencyLutAvailability?.value,
  });
  const invoiceDateValue = formatDateCandidate(data.timeline.invoiceDate.value);
  const commercialTerms = inferCommercialTermsFromText(rawText, {
    invoiceDate: invoiceDateValue,
  });
  const paymentScheduleText = formatAiPaymentSchedule(data);
  const paymentTermsCandidate =
    createAiCandidate(
      normalizePaymentTermsValue(data.paymentTerms.value),
      data.paymentTerms.confidence,
    ) ??
    (paymentScheduleText
      ? makeCandidate(
          normalizePaymentTermsValue(paymentScheduleText),
          "medium",
          "ai",
        )
      : undefined) ??
    (commercialTerms.paymentTerms
      ? makeCandidate(
          normalizePaymentTermsValue(commercialTerms.paymentTerms),
          commercialTerms.confidence,
          "inference",
        )
      : undefined);
  const dueDateValue = formatDateCandidate(data.timeline.dueDate.value);
  const agencyAddressCandidate = createAiCandidate(
    cleanAddressBlockValue(agencyAddressValue),
    data.agencyAddress.value
      ? data.agencyAddress.confidence
      : data.locations.agency.confidence,
  );
  const clientAddressCandidate = createAiCandidate(
    cleanAddressBlockValue(clientAddressValue),
    data.clientAddress.value
      ? data.clientAddress.confidence
      : data.locations.client.confidence,
  );
  const parsedAgencyAddress = parseAgencyStructuredAddress(
    agencyAddressCandidate?.value,
  );
  const parsedClientAddress = parseClientStructuredAddress({
    value: clientAddressCandidate?.value,
    location: clientLocationCandidate?.value,
    country: clientCountryValue,
  });

  const normalized: InvoiceBriefExtractionSchema = {
    agencyName: fallbackAgencyName
      ? makeCandidate(
          fallbackAgencyName,
          data.agencyName.value
            ? data.agencyName.confidence
            : data.payment.accountName.value
              ? data.payment.accountName.confidence
              : "low",
          data.agencyName.value ? "ai" : "inference",
        )
      : undefined,
    agencyAddress: agencyAddressCandidate,
    agencyAddressLine1: agencyAddressCandidate
      ? makeStringCandidate(
          parsedAgencyAddress.line1,
          agencyAddressCandidate.confidence,
          agencyAddressCandidate.source,
        )
      : undefined,
    agencyAddressLine2: agencyAddressCandidate
      ? makeStringCandidate(
          parsedAgencyAddress.line2,
          agencyAddressCandidate.confidence,
          agencyAddressCandidate.source,
        )
      : undefined,
    agencyCity: agencyAddressCandidate
      ? makeStringCandidate(
          parsedAgencyAddress.city,
          agencyAddressCandidate.confidence,
          agencyAddressCandidate.source,
        )
      : undefined,
    agencyPinCode: agencyAddressCandidate
      ? makeStringCandidate(
          parsedAgencyAddress.pinCode,
          agencyAddressCandidate.confidence,
          agencyAddressCandidate.source,
        )
      : undefined,
    agencyState: agencyStateValue
      ? makeCandidate(
          agencyStateValue,
          data.agencyState.value
            ? data.agencyState.confidence
            : agencyLocationDetails.confidence || "medium",
          data.agencyState.value ? "ai" : "inference",
        )
      : undefined,
    agencyGstRegistrationStatus: agencyGstStatus,
    agencyGstin: createAiClassifiedCandidate(
      data.gst.gstin.value,
      data.gst.gstin.confidence,
      ["gstin"],
      "agency gstin",
    ),
    agencyPan: createAiClassifiedCandidate(
      data.gst.pan.value || agencyPanFromGstin,
      data.gst.pan.value
        ? data.gst.pan.confidence
        : agencyPanFromGstin
          ? "high"
          : data.gst.pan.confidence,
      ["pan"],
      "agency pan",
    ),
    agencyLutAvailability,
    agencyLutNumber: createAiCandidate(
      cleanValue(data.gst.lutNumber.value),
      data.gst.lutNumber.confidence,
    ),
    clientName: createAiCandidate(
      sanitizeEntityNameCandidate(
        data.clientName.value ?? roleInferences.client?.value ?? "",
      ),
      data.clientName.value
        ? data.clientName.confidence
        : roleInferences.client?.confidence,
    ),
    clientAddress: clientAddressCandidate,
    clientAddressLine1: clientAddressCandidate
      ? makeStringCandidate(
          parsedClientAddress.line1,
          clientAddressCandidate.confidence,
          clientAddressCandidate.source,
        )
      : undefined,
    clientAddressLine2: clientAddressCandidate
      ? makeStringCandidate(
          parsedClientAddress.line2,
          clientAddressCandidate.confidence,
          clientAddressCandidate.source,
        )
      : undefined,
    clientCity: clientAddressCandidate
      ? makeStringCandidate(
          parsedClientAddress.city,
          clientAddressCandidate.confidence,
          clientAddressCandidate.source,
        )
      : undefined,
    clientPinCode: clientAddressCandidate
      ? makeStringCandidate(
          parsedClientAddress.pinCode,
          clientAddressCandidate.confidence,
          clientAddressCandidate.source,
        )
      : undefined,
    clientPostalCode: clientAddressCandidate
      ? makeStringCandidate(
          parsedClientAddress.postalCode,
          clientAddressCandidate.confidence,
          clientAddressCandidate.source,
        )
      : undefined,
    clientState: clientStateValue
      ? makeCandidate(
          clientStateValue,
          data.clientState.value
            ? data.clientState.confidence
            : clientLocationDetails.confidence || "medium",
          data.clientState.value ? "ai" : "inference",
        )
      : undefined,
    clientCountry: clientCountryValue
      ? makeCandidate(
          clientCountryValue,
          data.clientCountry.value
            ? data.clientCountry.confidence
            : clientLocationDetails.confidence || "medium",
          data.clientCountry.value ? "ai" : "inference",
        )
      : undefined,
    clientLocation: clientLocationCandidate,
    clientGstin: createAiClassifiedCandidate(
      sanitizeOwnedIdentifier({
        value: data.clientTaxId.value,
        owner: "client",
        kind: "tax-id",
        agencyGstin: data.gst.gstin.value,
        agencyPan: data.gst.pan.value || agencyPanFromGstin,
        clientLocation: clientLocationCandidate?.value ?? null,
      }),
      data.clientTaxId.confidence,
      ["gstin", "unknown-alphanumeric-code"],
      "client tax id",
    ),
    clientCurrency:
      currencyCandidate?.value &&
      currencyCandidate.value !== "INR" &&
      ["USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD"].includes(
        currencyCandidate.value,
      )
        ? makeCandidate(
            currencyCandidate.value as InternationalCurrencyCode,
            currencyCandidate.confidence,
            currencyCandidate.source,
          )
        : undefined,
    invoiceIsInternational:
      clientLocationCandidate?.value === "international"
        ? makeCandidate(
            true,
            clientLocationCandidate.confidence,
            clientLocationCandidate.source,
          )
        : explicitInternational === false
          ? makeCandidate(false, data.locations.inferredType.confidence, "ai")
          : undefined,
    invoiceCurrencyCode: currencyCandidate,
    invoiceTotalAmount: createAiCandidate(
      data.totalAmount.value,
      data.totalAmount.confidence,
    ),
    invoiceTaxType: taxTypeCandidate,
    lineItems: normalizeAiDeliverables(extraction, rawText),
    deliverableType: undefined,
    deliverableDescription: undefined,
    qty: undefined,
    rate: undefined,
    rateUnit: undefined,
    paymentTerms: paymentTermsCandidate,
    paymentMode: paymentModeValue
      ? makeCandidate(
          paymentModeValue,
          extraction.paymentMode.value
            ? extraction.paymentMode.confidence
            : "medium",
          extraction.paymentMode.value ? "ai" : "inference",
        )
      : undefined,
    paymentAccountName: createAiCandidate(
      cleanValue(data.payment.accountName.value),
      data.payment.accountName.confidence,
    ),
    paymentBankName: createAiCandidate(
      cleanValue(data.payment.bankName.value),
      data.payment.bankName.confidence,
    ),
    paymentBankAddress: createAiCandidate(
      cleanAddressValue(data.payment.bankAddress.value),
      data.payment.bankAddress.confidence,
    ),
    paymentAccountNumber: createAiClassifiedCandidate(
      data.payment.accountNumber.value,
      data.payment.accountNumber.confidence,
      ["bank-account-number"],
      "bank account number",
    ),
    paymentIfscCode: createAiClassifiedCandidate(
      data.payment.ifscCode.value,
      data.payment.ifscCode.confidence,
      ["ifsc"],
      "ifsc code",
    ),
    paymentSwiftBicCode: createAiClassifiedCandidate(
      data.payment.swiftCode.value,
      data.payment.swiftCode.confidence,
      ["swift-bic"],
      "swift bic code",
    ),
    paymentIbanRoutingCode: createAiCandidate(
      cleanValue(data.payment.ibanOrRouting.value),
      data.payment.ibanOrRouting.confidence,
    ),
    invoiceDate: invoiceDateValue
      ? makeCandidate(
          invoiceDateValue,
          data.timeline.invoiceDate.confidence,
          "ai",
        )
      : undefined,
    dueDate:
      dueDateValue || commercialTerms.dueDate
        ? makeCandidate(
            dueDateValue || commercialTerms.dueDate,
            dueDateValue
              ? data.timeline.dueDate.confidence
              : commercialTerms.confidence,
            dueDateValue ? "ai" : "inference",
          )
        : undefined,
    timeline: createAiCandidate(
      cleanValue(data.timeline.deliveryTimeline.value),
      data.timeline.deliveryTimeline.confidence,
    ),
  } satisfies InvoiceBriefExtractionSchema;

  if (!normalized.deliverableType && normalized.lineItems?.[0]?.type) {
    normalized.deliverableType = normalized.lineItems[0].type;
  }

  if (
    !normalized.deliverableDescription &&
    normalized.lineItems?.[0]?.description
  ) {
    normalized.deliverableDescription = normalized.lineItems[0].description;
  }

  if (!normalized.qty && normalized.lineItems?.[0]?.qty) {
    normalized.qty = normalized.lineItems[0].qty;
  }

  if (!normalized.rate && normalized.lineItems?.[0]?.rate) {
    normalized.rate = normalized.lineItems[0].rate;
  }

  if (!normalized.rateUnit && normalized.lineItems?.[0]?.rateUnit) {
    normalized.rateUnit = normalized.lineItems[0].rateUnit;
  }

  console.log("[Brief Intake AI] Normalized output:", normalized);
  return normalized;
}

function chooseMergedCandidate<T>(
  fieldKey: string,
  aiCandidate?: Candidate<T>,
  heuristicCandidate?: Candidate<T>,
) {
  const strictFallbackFields = new Set([
    "agencyGstin",
    "agencyPan",
    "clientGstin",
    "clientCurrency",
    "qty",
    "rate",
    "rateUnit",
    "paymentIfscCode",
    "paymentSwiftBicCode",
  ]);

  if (!aiCandidate) return heuristicCandidate;
  if (!heuristicCandidate) return aiCandidate;

  if (strictFallbackFields.has(fieldKey)) {
    const aiScore = getConfidenceScore(aiCandidate.confidence);
    const heuristicScore = getConfidenceScore(heuristicCandidate.confidence);

    return heuristicScore > aiScore ? heuristicCandidate : aiCandidate;
  }

  const aiScore = getConfidenceScore(aiCandidate.confidence);
  const heuristicScore = getConfidenceScore(heuristicCandidate.confidence);

  if (aiScore > heuristicScore) return aiCandidate;
  if (heuristicScore > aiScore) return heuristicCandidate;

  return aiCandidate;
}

function mergeLineItemExtractions(
  aiLineItems: InvoiceBriefLineItemExtraction[] = [],
  heuristic: InvoiceBriefExtractionSchema,
) {
  const fallbackFirst: InvoiceBriefLineItemExtraction = {
    type: heuristic.deliverableType,
    description: heuristic.deliverableDescription,
    qty: heuristic.qty,
    rate: heuristic.rate,
    rateUnit: heuristic.rateUnit,
  };

  const fallbackItems =
    heuristic.lineItems && heuristic.lineItems.length > 0
      ? heuristic.lineItems
      : fallbackFirst.type ||
          fallbackFirst.description ||
          fallbackFirst.qty ||
          fallbackFirst.rate ||
          fallbackFirst.rateUnit
        ? [fallbackFirst]
        : [];

  const totalItems = Math.max(aiLineItems.length, fallbackItems.length);
  const mergedItems: InvoiceBriefLineItemExtraction[] = [];

  for (let index = 0; index < totalItems; index += 1) {
    const aiItem = aiLineItems[index];
    const fallbackItem = fallbackItems[index];

    const mergedItem: InvoiceBriefLineItemExtraction = {
      type: chooseMergedCandidate(
        `lineItems.${index}.type`,
        aiItem?.type,
        fallbackItem?.type,
      ),
      description: chooseMergedCandidate(
        `lineItems.${index}.description`,
        aiItem?.description,
        fallbackItem?.description,
      ),
      qty: chooseMergedCandidate(`qty`, aiItem?.qty, fallbackItem?.qty),
      rate: chooseMergedCandidate(`rate`, aiItem?.rate, fallbackItem?.rate),
      rateUnit: chooseMergedCandidate(
        `rateUnit`,
        aiItem?.rateUnit,
        fallbackItem?.rateUnit,
      ),
    };

    if (
      mergedItem.type ||
      mergedItem.description ||
      mergedItem.qty ||
      mergedItem.rate ||
      mergedItem.rateUnit
    ) {
      mergedItems.push(mergedItem);
    }
  }

  return mergedItems;
}

export function mergeBriefExtractions(params: {
  aiExtraction?: InvoiceBriefExtractionSchema | null;
  heuristicExtraction: InvoiceBriefExtractionSchema;
}): InvoiceBriefExtractionSchema {
  const { aiExtraction, heuristicExtraction } = params;

  if (!aiExtraction) {
    return heuristicExtraction;
  }

  return {
    agencyName: chooseMergedCandidate(
      "agencyName",
      aiExtraction.agencyName,
      heuristicExtraction.agencyName,
    ),
    agencyAddress: chooseMergedCandidate(
      "agencyAddress",
      aiExtraction.agencyAddress,
      heuristicExtraction.agencyAddress,
    ),
    agencyAddressLine1: chooseMergedCandidate(
      "agencyAddressLine1",
      aiExtraction.agencyAddressLine1,
      heuristicExtraction.agencyAddressLine1,
    ),
    agencyAddressLine2: chooseMergedCandidate(
      "agencyAddressLine2",
      aiExtraction.agencyAddressLine2,
      heuristicExtraction.agencyAddressLine2,
    ),
    agencyCity: chooseMergedCandidate(
      "agencyCity",
      aiExtraction.agencyCity,
      heuristicExtraction.agencyCity,
    ),
    agencyPinCode: chooseMergedCandidate(
      "agencyPinCode",
      aiExtraction.agencyPinCode,
      heuristicExtraction.agencyPinCode,
    ),
    agencyState: chooseMergedCandidate(
      "agencyState",
      aiExtraction.agencyState,
      heuristicExtraction.agencyState,
    ),
    agencyGstRegistrationStatus: chooseMergedCandidate(
      "agencyGstRegistrationStatus",
      aiExtraction.agencyGstRegistrationStatus,
      heuristicExtraction.agencyGstRegistrationStatus,
    ),
    agencyGstin: chooseMergedCandidate(
      "agencyGstin",
      aiExtraction.agencyGstin,
      heuristicExtraction.agencyGstin,
    ),
    agencyPan: chooseMergedCandidate(
      "agencyPan",
      aiExtraction.agencyPan,
      heuristicExtraction.agencyPan,
    ),
    agencyLutAvailability: chooseMergedCandidate(
      "agencyLutAvailability",
      aiExtraction.agencyLutAvailability,
      heuristicExtraction.agencyLutAvailability,
    ),
    agencyLutNumber: chooseMergedCandidate(
      "agencyLutNumber",
      aiExtraction.agencyLutNumber,
      heuristicExtraction.agencyLutNumber,
    ),
    clientName: chooseMergedCandidate(
      "clientName",
      aiExtraction.clientName,
      heuristicExtraction.clientName,
    ),
    clientAddress: chooseMergedCandidate(
      "clientAddress",
      aiExtraction.clientAddress,
      heuristicExtraction.clientAddress,
    ),
    clientAddressLine1: chooseMergedCandidate(
      "clientAddressLine1",
      aiExtraction.clientAddressLine1,
      heuristicExtraction.clientAddressLine1,
    ),
    clientAddressLine2: chooseMergedCandidate(
      "clientAddressLine2",
      aiExtraction.clientAddressLine2,
      heuristicExtraction.clientAddressLine2,
    ),
    clientCity: chooseMergedCandidate(
      "clientCity",
      aiExtraction.clientCity,
      heuristicExtraction.clientCity,
    ),
    clientPinCode: chooseMergedCandidate(
      "clientPinCode",
      aiExtraction.clientPinCode,
      heuristicExtraction.clientPinCode,
    ),
    clientPostalCode: chooseMergedCandidate(
      "clientPostalCode",
      aiExtraction.clientPostalCode,
      heuristicExtraction.clientPostalCode,
    ),
    clientState: chooseMergedCandidate(
      "clientState",
      aiExtraction.clientState,
      heuristicExtraction.clientState,
    ),
    clientCountry: chooseMergedCandidate(
      "clientCountry",
      aiExtraction.clientCountry,
      heuristicExtraction.clientCountry,
    ),
    clientLocation: chooseMergedCandidate(
      "clientLocation",
      aiExtraction.clientLocation,
      heuristicExtraction.clientLocation,
    ),
    invoiceIsInternational: chooseMergedCandidate(
      "invoiceIsInternational",
      aiExtraction.invoiceIsInternational,
      heuristicExtraction.invoiceIsInternational,
    ),
    invoiceCurrencyCode: chooseMergedCandidate(
      "invoiceCurrencyCode",
      aiExtraction.invoiceCurrencyCode,
      heuristicExtraction.invoiceCurrencyCode,
    ),
    invoiceTotalAmount: chooseMergedCandidate(
      "invoiceTotalAmount",
      aiExtraction.invoiceTotalAmount,
      heuristicExtraction.invoiceTotalAmount,
    ),
    invoiceTaxType: chooseMergedCandidate(
      "invoiceTaxType",
      aiExtraction.invoiceTaxType,
      heuristicExtraction.invoiceTaxType,
    ),
    clientCurrency: chooseMergedCandidate(
      "clientCurrency",
      aiExtraction.clientCurrency,
      heuristicExtraction.clientCurrency,
    ),
    clientGstin: chooseMergedCandidate(
      "clientGstin",
      aiExtraction.clientGstin,
      heuristicExtraction.clientGstin,
    ),
    lineItems: mergeLineItemExtractions(
      aiExtraction.lineItems,
      heuristicExtraction,
    ),
    deliverableType: chooseMergedCandidate(
      "deliverableType",
      aiExtraction.deliverableType,
      heuristicExtraction.deliverableType,
    ),
    deliverableDescription: chooseMergedCandidate(
      "deliverableDescription",
      aiExtraction.deliverableDescription,
      heuristicExtraction.deliverableDescription,
    ),
    qty: chooseMergedCandidate(
      "qty",
      aiExtraction.qty,
      heuristicExtraction.qty,
    ),
    rate: chooseMergedCandidate(
      "rate",
      aiExtraction.rate,
      heuristicExtraction.rate,
    ),
    rateUnit: chooseMergedCandidate(
      "rateUnit",
      aiExtraction.rateUnit,
      heuristicExtraction.rateUnit,
    ),
    licenseType: chooseMergedCandidate(
      "licenseType",
      aiExtraction.licenseType,
      heuristicExtraction.licenseType,
    ),
    licenseDuration: chooseMergedCandidate(
      "licenseDuration",
      aiExtraction.licenseDuration,
      heuristicExtraction.licenseDuration,
    ),
    paymentTerms: chooseMergedCandidate(
      "paymentTerms",
      aiExtraction.paymentTerms,
      heuristicExtraction.paymentTerms,
    ),
    paymentMode: chooseMergedCandidate(
      "paymentMode",
      aiExtraction.paymentMode,
      heuristicExtraction.paymentMode,
    ),
    paymentAccountName: chooseMergedCandidate(
      "paymentAccountName",
      aiExtraction.paymentAccountName,
      heuristicExtraction.paymentAccountName,
    ),
    paymentBankName: chooseMergedCandidate(
      "paymentBankName",
      aiExtraction.paymentBankName,
      heuristicExtraction.paymentBankName,
    ),
    paymentBankAddress: chooseMergedCandidate(
      "paymentBankAddress",
      aiExtraction.paymentBankAddress,
      heuristicExtraction.paymentBankAddress,
    ),
    paymentAccountNumber: chooseMergedCandidate(
      "paymentAccountNumber",
      aiExtraction.paymentAccountNumber,
      heuristicExtraction.paymentAccountNumber,
    ),
    paymentIfscCode: chooseMergedCandidate(
      "paymentIfscCode",
      aiExtraction.paymentIfscCode,
      heuristicExtraction.paymentIfscCode,
    ),
    paymentSwiftBicCode: chooseMergedCandidate(
      "paymentSwiftBicCode",
      aiExtraction.paymentSwiftBicCode,
      heuristicExtraction.paymentSwiftBicCode,
    ),
    paymentIbanRoutingCode: chooseMergedCandidate(
      "paymentIbanRoutingCode",
      aiExtraction.paymentIbanRoutingCode,
      heuristicExtraction.paymentIbanRoutingCode,
    ),
    invoiceDate: chooseMergedCandidate(
      "invoiceDate",
      aiExtraction.invoiceDate,
      heuristicExtraction.invoiceDate,
    ),
    dueDate: chooseMergedCandidate(
      "dueDate",
      aiExtraction.dueDate,
      heuristicExtraction.dueDate,
    ),
    timeline: chooseMergedCandidate(
      "timeline",
      aiExtraction.timeline,
      heuristicExtraction.timeline,
    ),
  };
}

export function normalizeExtractionOutput(
  rawExtraction: InvoiceExtractionAdapterInput,
): NormalizedExtractionOutput {
  if (rawExtraction.source === "ai") {
    return {
      source: "ai",
      extraction: rawExtraction.extraction,
      rawText: rawExtraction.rawText,
    };
  }

  return {
    source: "schema",
    extraction: rawExtraction.extraction,
  };
}

export function toInvoiceExtractionSchema(
  normalizedData: NormalizedExtractionOutput,
): InvoiceBriefExtractionSchema {
  if (normalizedData.source === "ai") {
    return normalizeExtractedData(
      normalizedData.extraction,
      normalizedData.rawText,
    );
  }

  return normalizedData.extraction;
}

function getStateFromText(
  text: string,
): InvoiceFormData["agency"]["agencyState"] {
  return inferStateFromText(text);
}

function getCountryFromText(
  text: string,
): InvoiceFormData["client"]["clientCountry"] {
  return inferCountryFromText(text);
}

function getCurrencyFromText(
  text: string,
): Candidate<InternationalCurrencyCode> | undefined {
  const stronglyDetectedCurrency = detectCurrencyFromText(text);

  if (
    stronglyDetectedCurrency &&
    stronglyDetectedCurrency !== "INR" &&
    ["USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD"].includes(
      stronglyDetectedCurrency,
    )
  ) {
    return makeCandidate(
      stronglyDetectedCurrency as InternationalCurrencyCode,
      "high",
      "regex",
    );
  }

  const labelMatches = currencyMatchers.filter((matcher) =>
    matcher.labelPatterns.some((pattern) => pattern.test(text)),
  );

  if (labelMatches.length === 1) {
    return makeCandidate(labelMatches[0].code, "high", "label");
  }

  const fallbackMatches = currencyMatchers.filter((matcher) =>
    matcher.fallbackPatterns.some((pattern) => pattern.test(text)),
  );

  if (fallbackMatches.length === 1) {
    return makeCandidate(fallbackMatches[0].code, "medium", "pattern");
  }

  if (/US\$/i.test(text)) {
    return makeCandidate("USD", "medium", "regex");
  }

  if (/A\$/i.test(text)) {
    return makeCandidate("AUD", "medium", "regex");
  }

  if (/C\$/i.test(text)) {
    return makeCandidate("CAD", "medium", "regex");
  }

  if (/S\$/i.test(text)) {
    return makeCandidate("SGD", "medium", "regex");
  }

  if (/\$(?=\s*\d)/.test(text)) {
    return makeCandidate("USD", "medium", "regex");
  }

  if (/€/.test(text)) {
    return makeCandidate("EUR", "medium", "regex");
  }

  if (/£/.test(text)) {
    return makeCandidate("GBP", "medium", "regex");
  }

  return undefined;
}

function extractAgencyName(text: string): Candidate<string> | undefined {
  const roleInference = inferNameRolesFromText(text).agency;

  if (roleInference) {
    return makeCandidate(
      roleInference.value,
      roleInference.confidence,
      roleInference.confidence === "high" ? "label" : "inference",
    );
  }

  const value = extractLabeledValue(
    text,
    [
      "agency",
      "agency name",
      "business",
      "business name",
      "freelancer name",
      "freelancer",
      "studio",
      "studio name",
      "from",
    ],
    {
      allowContinuationLines: true,
      maxContinuationLines: 1,
      strictShortLabels: true,
    },
  );

  if (value) {
    return makeCandidate(cleanEntityLabelValue(value), "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\bwe(?:'re| are)\s+([a-z0-9&.' -]{3,80}?)(?=,|\.|\n|\s+(?:based\b|from\b|at\b|client\b|need\b|invoice\b|did\b|made\b)|$)/i,
    /\bwe\s+at\s+([a-z0-9&.' -]{3,80}?)(?=,|\.|\n|\s+(?:based\b|from\b|at\b|client\b|need\b|invoice\b|did\b|made\b)|$)/i,
    /\bour (?:studio|agency)(?: is)?\s+([a-z0-9&.' -]{3,80}?)(?=,|\.|\n|\s+(?:based\b|from\b|at\b|client\b)|$)/i,
    /\bhum\s+([a-z0-9&.' -]{3,80}?)(?=,|\.|\n|\s+se\b|\s+(?:based\b|from\b|at\b|client\b|invoice\b|kiye\b|did\b|made\b)|$)/i,
    /\b(?:i(?:'m| am)|this is)\s+([a-z][a-z0-9&.' -]{2,60}?)(?=,|\.|\n|\s+(?:from\b|at\b|based\b|invoice\b|project\b)|$)/i,
    /\bfrom\s+([a-z0-9&.' -]{3,80}?(?:studio|design|creative|agency|media|labs|works?|collective|co\.?|llc|pvt\.?\s*ltd\.?|private limited))(?=,|\.|\n|$)/i,
    /(?:^|\n)\s*(?:regards|thanks|best),?\s*\n\s*([a-z0-9&.' -]{3,80}?(?:studio|design|creative|agency|media|labs|works?|collective|co\.?|llc|pvt\.?\s*ltd\.?|private limited))(?=,|\.|\n|$)/i,
  ]);

  return inferred && looksLikeEntityName(inferred)
    ? makeCandidate(inferred, "medium", "inference")
    : undefined;
}

function extractAgencyAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(
    text,
    ["agency address", "business address", "from address"],
    {
      allowContinuationLines: true,
      maxContinuationLines: 3,
      preserveLineBreaks: true,
      shouldIncludeContinuationLine: looksLikeAddressContinuationLine,
      normalizeContinuationLine: normalizeAddressContinuationLine,
    },
  );

  if (value) {
    return makeCandidate(cleanAddressBlockValue(value), "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\b(?:based in|from)\s+([a-z0-9,.' -]{8,120}?(?:india|road|street|nagar|layout|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|kolkata|pune))(?=,|\.|\n|$)/i,
    /\bwe(?:'re| are)\s+[a-z0-9&.' -]{3,80},\s*([a-z0-9,.' -]{8,120}?(?:india|road|street|nagar|layout|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|kolkata|pune))(?=,|\.|\n|$)/i,
  ]);

  return inferred
    ? makeCandidate(cleanAddressValue(inferred), "medium", "inference")
    : undefined;
}

function extractAgencyGstin(text: string): Candidate<string> | undefined {
  return makeIdentifierCandidate(
    findBestIdentifier(text, ["gstin"], {
      labels: [
        "agency gstin",
        "business gstin",
        "freelancer gstin",
        "our gstin",
        "my gstin",
        "gstin",
      ],
      preferredContext: [
        /\b(?:agency|business|freelancer|our|my|issued by|from)\b/i,
      ],
      rejectContext: [/\b(?:client|customer|billing|bill to|recipient)\b/i],
    }),
  );
}

function extractAgencyPan(text: string): Candidate<string> | undefined {
  return makeIdentifierCandidate(
    findBestIdentifier(text, ["pan"], {
      labels: ["pan", "agency pan", "business pan", "my pan"],
      preferredContext: [
        /\b(?:agency|business|freelancer|our|my|issued by|from)\b/i,
      ],
      rejectContext: [/\b(?:client|customer|billing|bill to|recipient)\b/i],
    }),
  );
}

function extractClientName(text: string): Candidate<string> | undefined {
  const roleInference = inferNameRolesFromText(text).client;

  if (roleInference) {
    return makeCandidate(
      roleInference.value,
      roleInference.confidence,
      roleInference.confidence === "high" ? "label" : "inference",
    );
  }

  const value = extractLabeledValue(
    text,
    ["client", "client name", "bill to", "customer name"],
    {
      allowContinuationLines: true,
      maxContinuationLines: 1,
      strictShortLabels: true,
    },
  );

  if (value) {
    return makeCandidate(cleanEntityLabelValue(value), "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\binvoice\s+(?:for|to)\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:project\b|work\b|landing\b|homepage\b|logo\b|illustration\b|screens?\b|banners?\b|rate\b|qty\b|quantity\b|currency\b|payment\b)|$)/i,
    /\binvoice\b[^.\n]{0,40}\bfor\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:project\b|work\b|landing\b|homepage\b|logo\b|illustration\b|screens?\b|banners?\b|rate\b|qty\b|quantity\b|currency\b|payment\b)|$)/i,
    /\bbill to\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|at\b|in\b|invoice\b|project\b|work\b|rate\b|qty\b|quantity\b|net\b|currency\b|bank\b)|$)/i,
    /\bbrand\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|at\b|in\b|usa\b|uk\b|london\b|dubai\b|singapore\b|invoice\b|project\b|work\b|rate\b|qty\b|quantity\b|net\b|currency\b)|$)/i,
    /\b([a-z0-9&.' -]{2,80}?)\s+client\b/i,
  ]);

  return inferred && looksLikeEntityName(inferred)
    ? makeCandidate(inferred, "medium", "inference")
    : undefined;
}

function extractClientAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(
    text,
    [
      "client address",
      "billing address",
      "bill to address",
      "customer address",
    ],
    {
      allowContinuationLines: true,
      maxContinuationLines: 4,
      preserveLineBreaks: true,
      shouldIncludeContinuationLine: looksLikeAddressContinuationLine,
      normalizeContinuationLine: normalizeAddressContinuationLine,
    },
  );

  return value
    ? makeCandidate(cleanAddressBlockValue(value), "high", "label")
    : undefined;
}

function extractClientTaxId(text: string): Candidate<string> | undefined {
  const explicitLabels = [
    "client gstin",
    "customer gstin",
    "billing gstin",
    "client tax id",
    "tax id",
    "vat no",
    "vat number",
  ];
  const strictIdentifier = findBestIdentifier(text, ["gstin", "pan"], {
    labels: explicitLabels,
    preferredContext: [
      /\b(?:client|customer|billing|bill to|recipient|tax|vat)\b/i,
    ],
    rejectContext: [/\b(?:agency|business|freelancer|our|my)\b/i],
  });

  if (strictIdentifier) {
    return makeIdentifierCandidate(strictIdentifier);
  }

  const labeledValue = extractLabeledValue(text, explicitLabels);

  if (!labeledValue) {
    return undefined;
  }

  const genericIdentifier = classifyIdentifier(
    labeledValue,
    `client tax id: ${labeledValue}`,
  );

  if (
    genericIdentifier &&
    ["gstin", "pan", "unknown-alphanumeric-code"].includes(
      genericIdentifier.kind,
    )
  ) {
    return makeIdentifierCandidate(genericIdentifier);
  }

  const cleaned = cleanValue(labeledValue);
  return cleaned ? makeCandidate(cleaned, "high", "label") : undefined;
}

function extractPaymentAccountNumber(
  text: string,
): Candidate<string> | undefined {
  return makeIdentifierCandidate(
    findBestIdentifier(text, ["bank-account-number"], {
      labels: [
        "account number",
        "bank account",
        "bank account number",
        "account no",
        "a/c",
        "acct",
      ],
      preferredContext: [/\b(?:account|a\/c|acct|bank account)\b/i],
      rejectContext: [/\b(?:phone|mobile|contact|pin|pincode|zip)\b/i],
    }),
  );
}

function extractPaymentIfscCode(text: string): Candidate<string> | undefined {
  return makeIdentifierCandidate(
    findBestIdentifier(text, ["ifsc"], {
      labels: ["ifsc", "ifsc code"],
      preferredContext: [/\bifsc\b/i],
    }),
  );
}

function extractPaymentSwiftBicCode(
  text: string,
): Candidate<string> | undefined {
  const classified = findBestIdentifier(text, ["swift-bic"], {
    labels: ["swift", "swift / bic code", "bic", "swift code"],
    preferredContext: [/\bswift\b/i, /\bbic\b/i],
  });

  if (!classified) {
    return undefined;
  }

  return /\b(?:swift|bic)\b/i.test(classified.contextText)
    ? makeIdentifierCandidate(classified)
    : undefined;
}

function extractLineItemType(
  text: string,
): Candidate<InvoiceLineItemType> | undefined {
  const explicitType = extractLabeledValue(text, [
    "deliverable type",
    "project type",
    "task type",
    "service type",
  ]);

  const source = explicitType || text;

  for (const matcher of lineItemTypeMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(source))) {
      return makeCandidate(
        matcher.type,
        explicitType ? "high" : "medium",
        explicitType ? "label" : "pattern",
      );
    }
  }

  return undefined;
}

function extractAgencyGstRegistrationStatus(
  text: string,
): Candidate<AgencyDetails["gstRegistrationStatus"]> | undefined {
  const labeled = extractLabeledValue(text, [
    "gst registration",
    "gst registration status",
    "registered under gst",
    "gst status",
  ]);

  if (labeled) {
    if (/not\s+registered|unregistered|not gst registered/i.test(labeled)) {
      return makeCandidate("not-registered", "high", "label");
    }

    if (/registered/i.test(labeled)) {
      return makeCandidate("registered", "high", "label");
    }
  }

  if (
    /\b(?:not gst registered|not registered under gst|unregistered under gst|gst unregistered)\b/i.test(
      text,
    )
  ) {
    return makeCandidate("not-registered", "high", "pattern");
  }

  if (
    /\b(?:gst registered|registered under gst|registered for gst)\b/i.test(text)
  ) {
    return makeCandidate("registered", "high", "pattern");
  }

  return undefined;
}

function extractAgencyLutAvailability(
  text: string,
): Candidate<AgencyDetails["lutAvailability"]> | undefined {
  const labeled = extractLabeledValue(text, [
    "valid lut for current financial year",
    "lut availability",
    "lut available",
    "lut",
  ]);

  if (labeled) {
    if (/\b(?:yes|available|valid)\b/i.test(labeled)) {
      return makeCandidate("yes", "high", "label");
    }

    if (/\b(?:no|not available|without)\b/i.test(labeled)) {
      return makeCandidate("no", "high", "label");
    }
  }

  if (/\b(?:lut yes|valid lut|lut available)\b/i.test(text)) {
    return makeCandidate("yes", "medium", "pattern");
  }

  if (/\b(?:no lut|without lut|lut not available)\b/i.test(text)) {
    return makeCandidate("no", "medium", "pattern");
  }

  return undefined;
}

function extractAgencyLutNumber(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, [
    "lut number / arn",
    "lut number",
    "lut arn",
    "arn",
  ]);

  return labeled ? makeCandidate(labeled, "high", "label") : undefined;
}

function extractDeliverableDescription(
  text: string,
): Candidate<string> | undefined {
  const labeled = extractLabeledValue(
    text,
    [
      "deliverable description",
      "deliverable",
      "task description",
      "scope",
      "work description",
    ],
    {
      allowContinuationLines: true,
      maxContinuationLines: 1,
      strictShortLabels: true,
    },
  );

  if (labeled) {
    return makeCandidate(labeled, "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\b(?:did|made|created|worked on)\s+(.+?)(?=,|\.\s|(?:\s+(?:at|@|for\b|net\b|bank\b|terms\b))|$)/i,
    /\b((?:landing page|homepage design|home page design|dashboard(?: design)?|logo(?: design)?|editorial illustration(?: set)?|illustration(?: set)?|ui\/?\s*ux(?: design)?|banner design|banners?|brand film|short videos?|videos?|shots?))\b/i,
  ]);

  if (inferred) {
    return makeCandidate(cleanSentenceValue(inferred), "medium", "inference");
  }

  return undefined;
}

function extractQuantity(text: string): Candidate<number> | undefined {
  const explicit = extractLabeledValue(text, ["qty", "quantity", "units"]);
  if (explicit) {
    const qty = Number(explicit.replace(/[^0-9]/g, ""));

    if (Number.isFinite(qty) && qty > 0) {
      return makeCandidate(qty, "high", "label");
    }
  }

  for (const hint of quantityUnitHints) {
    const match = text.match(hint.pattern);
    const qty = Number(match?.[1]);

    if (Number.isFinite(qty) && qty > 0) {
      return makeCandidate(qty, "medium", "pattern");
    }
  }

  return undefined;
}

function extractStandaloneRateAmount(
  text: string,
): Candidate<number> | undefined {
  const patterns = [
    new RegExp(
      String.raw`\b(${FLEXIBLE_AMOUNT_PATTERN})\s+per\s+(?:screen|item|image|reel|video|banner|post|deliverable|day|hour|revision|concept)\b`,
      "i",
    ),
    new RegExp(String.raw`\bcharge\s+(${FLEXIBLE_AMOUNT_PATTERN})\b`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const parsed = parseAmount(match[1]);

    if (parsed > 0) {
      return makeCandidate(parsed, "medium", "regex");
    }
  }

  return undefined;
}

function extractRate(text: string): Candidate<number> | undefined {
  const labeled = extractLabeledValue(text, [
    "rate",
    "rate per deliverable",
    "rate per item",
    "fee",
    "budget",
    "amount",
  ]);

  if (labeled) {
    const rate = parseAmount(labeled);
    if (rate > 0) {
      return makeCandidate(rate, "high", "label");
    }
  }

  const fallbackPatterns = [
    new RegExp(
      String.raw`\b(?:project fee|fixed budget|budget fixed(?: hua tha)?|fixed fee|total project fee)\s*(?:is|was|of|:)?\s*(${FLEXIBLE_AMOUNT_PATTERN})`,
      "i",
    ),
    new RegExp(
      String.raw`\b(?:rate|fee|budget|quote(?:d)?|charge(?:d|s|ing)?|cost)\s*(?:is|was|of|:)?\s*(${FLEXIBLE_AMOUNT_PATTERN})`,
      "i",
    ),
    new RegExp(String.raw`\b(?:at|@)\s*(${FLEXIBLE_AMOUNT_PATTERN})`, "i"),
    /(?:^|[\s(])((?:US\$|A\$|C\$|S\$|\$|€|£)\s*\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m)?|\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)\b|\d[\d,.]*(?:\.\d{1,2})?\s*(?:usd|eur|gbp|aed|aud|cad|sgd|inr|rupees?)\b)/i,
  ];

  for (const pattern of fallbackPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const rate = parseAmount(match[1]);
    if (rate > 0) {
      return makeCandidate(rate, "medium", "regex");
    }
  }

  return extractStandaloneRateAmount(text);
}

function extractRateUnit(text: string): Candidate<InvoiceRateUnit> | undefined {
  for (const matcher of rateUnitMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(text))) {
      return makeCandidate(matcher.unit, "high", "pattern");
    }
  }

  for (const hint of quantityUnitHints) {
    if (hint.pattern.test(text)) {
      return makeCandidate(hint.unit, "medium", "pattern");
    }
  }

  return undefined;
}

function extractLicenseType(text: string): Candidate<LicenseType> | undefined {
  if (/full assignment/i.test(text)) {
    return makeCandidate("full-assignment", "high", "pattern");
  }

  if (/exclusive license/i.test(text)) {
    return makeCandidate("exclusive-license", "high", "pattern");
  }

  if (/non[-\s]?exclusive license/i.test(text)) {
    return makeCandidate("non-exclusive-license", "high", "pattern");
  }

  return undefined;
}

function extractPaymentTerms(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, ["payment terms", "terms"], {
    allowContinuationLines: true,
    maxContinuationLines: 1,
    strictShortLabels: true,
  });
  if (labeled) {
    return makeCandidate(normalizePaymentTermsValue(labeled), "high", "label");
  }

  const netMatch = text.match(/\bnet[\s-]?\d+\b/i);
  if (netMatch?.[0]) {
    return makeCandidate(
      normalizePaymentTermsValue(netMatch[0]),
      "high",
      "regex",
    );
  }

  if (/due on receipt/i.test(text)) {
    return makeCandidate("Due on receipt", "high", "pattern");
  }

  const scheduleSnippet = text.match(
    /\b(?:\d{1,3}%\s+(?:advance|upfront|booking|booking retainer|retainer)[^.\n]*|\d{1,3}%\s+(?:on|upon)\s+(?:delivery|completion)[^.\n]*|balance\s+(?:on|upon)\s+(?:delivery|completion)[^.\n]*)/i,
  )?.[0];

  if (scheduleSnippet) {
    return makeCandidate(
      normalizePaymentTermsValue(scheduleSnippet),
      "high",
      "pattern",
    );
  }

  return undefined;
}

function extractPaymentField(
  text: string,
  labels: string[],
): Candidate<string> | undefined {
  const value = extractLabeledValue(text, labels);

  return value ? makeCandidate(value, "high", "label") : undefined;
}

function extractInvoiceTotalAmount(
  text: string,
): Candidate<number> | undefined {
  const labeled = extractLabeledValue(text, [
    "total amount",
    "invoice total",
    "project total",
    "overall total",
    "grand total",
    "total fee",
  ]);

  if (labeled) {
    const amount = parseAmount(labeled);
    if (amount > 0) {
      return makeCandidate(amount, "high", "label");
    }
  }

  const fallbackPatterns = [
    new RegExp(
      String.raw`\b(?:budget fixed(?: hua tha)?|project fee|fixed budget|fixed fee)\s*(?:is|was|of|:)?\s*(${FLEXIBLE_AMOUNT_PATTERN})`,
      "i",
    ),
    new RegExp(
      String.raw`\b(?:total project fee|(?:logo|homepage|landing page|dashboard)\s+design fee)\s*(?:is|was|of|:)?\s*(${FLEXIBLE_AMOUNT_PATTERN})`,
      "i",
    ),
    new RegExp(
      String.raw`\b(?:total|overall total|project total|invoice total|grand total)\s*(?:amount|fee|budget|cost)?\s*(?:is|was|of|:)?\s*(${FLEXIBLE_AMOUNT_PATTERN})`,
      "i",
    ),
  ];

  for (const pattern of fallbackPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const amount = parseAmount(match[1]);
    if (amount > 0) {
      return makeCandidate(amount, "medium", "regex");
    }
  }

  return undefined;
}

function extractInvoiceTaxType(
  text: string,
): Candidate<NormalizedInvoiceTaxType> | undefined {
  if (/\bcgst\b.*\bsgst\b|\bsgst\b.*\bcgst\b/i.test(text)) {
    return makeCandidate("CGST_SGST", "high", "pattern");
  }

  if (/\bigst\b/i.test(text)) {
    return makeCandidate("IGST", "high", "pattern");
  }

  if (/\bsame state\b/i.test(text)) {
    return makeCandidate("CGST_SGST", "medium", "inference");
  }

  if (/\binter[-\s]?state\b/i.test(text)) {
    return makeCandidate("IGST", "medium", "inference");
  }

  if (
    /\bexport of services\b/i.test(text) ||
    /\bwithout payment of igst\b/i.test(text) ||
    /\b0% gst\b/i.test(text) ||
    /\bunder lut\b/i.test(text)
  ) {
    return makeCandidate("ZERO_RATED", "medium", "inference");
  }

  return undefined;
}

function extractInvoiceIsInternational(
  text: string,
  clientCountry?: Candidate<InvoiceFormData["client"]["clientCountry"]>,
  clientState?: Candidate<InvoiceFormData["client"]["clientState"]>,
  clientCurrency?: Candidate<InternationalCurrencyCode>,
): Candidate<boolean> | undefined {
  const inferredLocationType = inferLocationTypeFromText(text);

  if (inferredLocationType === "international") {
    return makeCandidate(true, "high", "inference");
  }

  if (inferredLocationType === "domestic") {
    return makeCandidate(false, "medium", "inference");
  }

  if (
    /\binternational\b|\bforeign client\b|\boverseas\b|\bexport of services\b/i.test(
      text,
    )
  ) {
    return makeCandidate(true, "high", "pattern");
  }

  if (clientCountry?.value) {
    return makeCandidate(true, clientCountry.confidence, clientCountry.source);
  }

  if (clientCurrency?.value) {
    return makeCandidate(true, "medium", clientCurrency.source);
  }

  if (hasForeignCityHint(text)) {
    return makeCandidate(true, "medium", "inference");
  }

  if (clientState?.value) {
    return makeCandidate(false, "medium", "inference");
  }

  return undefined;
}

function extractPaymentMode(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, [
    "payment mode",
    "payment method",
    "payment via",
    "paid via",
  ]);
  const normalizedLabeled = normalizePaymentModeValue(labeled);

  if (normalizedLabeled) {
    return makeCandidate(normalizedLabeled, "high", "label");
  }

  const inferred = normalizePaymentModeValue(
    /\b(?:wise|payoneer|paypal|bank transfer|wire transfer|bank|upi)\b/i.exec(
      text,
    )?.[0],
  );

  return inferred ? makeCandidate(inferred, "medium", "pattern") : undefined;
}

function extractTimeline(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, [
    "timeline",
    "delivery timeline",
    "delivery by",
    "deadline",
    "eta",
  ]);

  if (labeled) {
    return makeCandidate(cleanValue(labeled), "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\b(?:delivery|timeline|turnaround)\s+(?:is\s+)?(.+?)(?=,|\.|\n|$)/i,
    /\bby\s+([a-z0-9, /-]{4,40})(?=,|\.|\n|$)/i,
  ]);

  return inferred
    ? makeCandidate(cleanValue(inferred), "medium", "pattern")
    : undefined;
}

function buildLineItemDescriptionFromContext(
  text: string,
  matchIndex: number,
  fallback: string,
) {
  const localContext = text.slice(
    Math.max(0, matchIndex - 32),
    Math.min(text.length, matchIndex + 48),
  );

  if (/landing page/i.test(localContext)) {
    return "Landing page design";
  }

  if (/homepage|home page/i.test(localContext)) {
    return "Homepage design";
  }

  if (/ui\/?\s*ux/i.test(localContext)) {
    return "UI/UX design";
  }

  if (/editorial illustration/i.test(localContext)) {
    return "Editorial illustration";
  }

  if (/brand film/i.test(localContext)) {
    return "Brand film";
  }

  if (/shorts?/i.test(localContext)) {
    return "Short videos";
  }

  if (/shots?/i.test(localContext)) {
    return "Shots";
  }

  return fallback;
}

function mergeLineItemsWithScalarFallback(
  items: InvoiceBriefLineItemExtraction[],
  scalarFallback?: InvoiceBriefLineItemExtraction,
) {
  if (!scalarFallback) {
    return items;
  }

  if (items.length === 0) {
    return [scalarFallback];
  }

  const [firstItem, ...rest] = items;

  return [
    {
      type: firstItem.type ?? scalarFallback.type,
      description: firstItem.description ?? scalarFallback.description,
      qty: firstItem.qty ?? scalarFallback.qty,
      rate: firstItem.rate ?? scalarFallback.rate,
      rateUnit: firstItem.rateUnit ?? scalarFallback.rateUnit,
    },
    ...rest,
  ];
}

function buildScalarLineItemFallback(params: {
  deliverableType?: Candidate<InvoiceLineItemType>;
  deliverableDescription?: Candidate<string>;
  qty?: Candidate<number>;
  rate?: Candidate<number>;
  rateUnit?: Candidate<InvoiceRateUnit>;
}) {
  if (
    !params.deliverableType &&
    !params.deliverableDescription &&
    !params.qty &&
    !params.rate &&
    !params.rateUnit
  ) {
    return undefined;
  }

  return {
    type: params.deliverableType,
    description: params.deliverableDescription,
    qty:
      params.qty ??
      (params.deliverableType || params.deliverableDescription
        ? makeCandidate(1, "medium", "inference")
        : undefined),
    rate: params.rate,
    rateUnit: params.rateUnit,
  } satisfies InvoiceBriefLineItemExtraction;
}

function extractHeuristicLineItems(text: string) {
  const inferredItems = inferDeliverablesFromText(text).map((item) => ({
    type: makeCandidate(item.type, item.confidence, "inference"),
    description: makeCandidate(item.description, item.confidence, "inference"),
    qty: item.quantity
      ? makeCandidate(item.quantity, item.confidence, "inference")
      : undefined,
    rate:
      item.rate && item.rate > 0
        ? makeCandidate(item.rate, item.confidence, "inference")
        : undefined,
    rateUnit: makeCandidate(item.unit, item.confidence, "inference"),
  }));

  if (inferredItems.length > 0) {
    return inferredItems;
  }

  const matchers: Array<{
    pattern: RegExp;
    type: InvoiceLineItemType;
    rateUnit: InvoiceRateUnit;
    fallbackDescription: string;
  }> = [
    {
      pattern: /\b(\d+)\s+((?:landing page\s+)?screens?)\b/gi,
      type: "UI/UX",
      rateUnit: "per-screen",
      fallbackDescription: "Screens",
    },
    {
      pattern: /\b(\d+)\s+((?:retouched\s+)?images?)\b/gi,
      type: "Photography",
      rateUnit: "per-image",
      fallbackDescription: "Images",
    },
    {
      pattern: /\b(\d+)\s+(reels?)\b/gi,
      type: "Video Editing",
      rateUnit: "per-video",
      fallbackDescription: "Reels",
    },
    {
      pattern: /\b(\d+)\s+(banners?)\b/gi,
      type: "Social Media",
      rateUnit: "per-item",
      fallbackDescription: "Banners",
    },
    {
      pattern: /\b(\d+)\s+((?:editorial\s+)?illustrations?)\b/gi,
      type: "Illustration",
      rateUnit: "per-item",
      fallbackDescription: "Illustrations",
    },
    {
      pattern: /\b(\d+)\s+(logos?)\b/gi,
      type: "Logo Design",
      rateUnit: "per-deliverable",
      fallbackDescription: "Logo design",
    },
    {
      pattern: /\b(\d+)\s+(posts?)\b/gi,
      type: "Social Media",
      rateUnit: "per-post",
      fallbackDescription: "Posts",
    },
    {
      pattern: /\b(\d+)\s+(shorts?)\b/gi,
      type: "Video Editing",
      rateUnit: "per-video",
      fallbackDescription: "Short videos",
    },
    {
      pattern: /\b(\d+)\s+(videos?)\b/gi,
      type: "Video Editing",
      rateUnit: "per-video",
      fallbackDescription: "Videos",
    },
    {
      pattern: /\b(\d+)\s+(shots?)\b/gi,
      type: "Photography",
      rateUnit: "per-image",
      fallbackDescription: "Shots",
    },
    {
      pattern: /\b(\d+)\s+(brand films?)\b/gi,
      type: "Video Editing",
      rateUnit: "per-video",
      fallbackDescription: "Brand film",
    },
  ];

  const items: InvoiceBriefLineItemExtraction[] = [];

  for (const matcher of matchers) {
    const matches = Array.from(text.matchAll(matcher.pattern));

    for (const match of matches) {
      const quantity = Number(match[1]);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      const matchedDescription = cleanSentenceValue(match[2] ?? "");
      const description =
        matchedDescription ||
        buildLineItemDescriptionFromContext(
          text,
          match.index ?? 0,
          matcher.fallbackDescription,
        );

      const localContext = text.slice(
        match.index ?? 0,
        Math.min(text.length, (match.index ?? 0) + 96),
      );
      const rateText =
        localContext.match(
          /\b(?:at|@|each|for)\s*((?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?)/i,
        )?.[1] ??
        localContext.match(
          /\b((?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?)\s+per\s+(?:screen|item|image|reel|video|banner|post)\b/i,
        )?.[1];

      items.push({
        type: makeCandidate(matcher.type, "medium", "pattern"),
        description: makeCandidate(description, "medium", "inference"),
        qty: makeCandidate(quantity, "medium", "pattern"),
        rate:
          rateText && parseAmount(rateText) > 0
            ? makeCandidate(parseAmount(rateText), "medium", "regex")
            : undefined,
        rateUnit: makeCandidate(matcher.rateUnit, "medium", "pattern"),
      });
    }
  }

  const dedupedItems: InvoiceBriefLineItemExtraction[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = [
      item.type?.value ?? "",
      item.description?.value ?? "",
      item.qty?.value ?? "",
    ].join(":");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    dedupedItems.push(item);
  }

  return dedupedItems;
}

export function extractInvoiceBriefSchema(
  text: string,
): InvoiceBriefExtractionSchema {
  const roleInferences = inferNameRolesFromText(text);
  const agencyContext =
    roleInferences.agencyContext || collectRoleContextFromText(text, "agency");
  const clientContext =
    roleInferences.clientContext || collectRoleContextFromText(text, "client");
  const paymentAccountName = extractPaymentField(text, [
    "beneficiary",
    "beneficiary name",
    "account name",
    "name on account",
  ]);
  const agencyName =
    extractAgencyName(text) ??
    (paymentAccountName?.value && looksLikeEntityName(paymentAccountName.value)
      ? makeCandidate(paymentAccountName.value, "medium", "inference")
      : undefined);
  const agencyAddress = extractAgencyAddress(text);
  const clientName = extractClientName(text);
  const clientAddress = extractClientAddress(text);
  const clientCurrency = getCurrencyFromText(text);
  const agencyGstin = extractAgencyGstin(text);
  const agencyPan = extractAgencyPan(text);
  const rawClientGstin = extractClientTaxId(text);
  const clientGstin = rawClientGstin
    ? makeIdentifierCandidate(
        classifyIdentifier(
          sanitizeOwnedIdentifier({
            value: rawClientGstin.value,
            owner: "client",
            kind: "tax-id",
            agencyGstin: agencyGstin?.value,
            agencyPan: agencyPan?.value,
          }),
          "client tax id",
        ),
      )
    : undefined;
  const explicitAgencyGstStatus = extractAgencyGstRegistrationStatus(text);
  const explicitLutAvailability = extractAgencyLutAvailability(text);
  const invoiceDate = extractDateCandidate(text, [
    "invoice date",
    "dated",
    "date",
  ]);
  const commercialTerms = inferCommercialTermsFromText(text, {
    invoiceDate: invoiceDate?.value,
  });
  const rawDueDate = extractDateCandidate(text, [
    "due date",
    "payment due",
    "due by",
  ]);
  const dueDate =
    rawDueDate &&
    !(
      rawDueDate.source === "pattern" && rawDueDate.value === invoiceDate?.value
    )
      ? rawDueDate
      : commercialTerms.dueDate
        ? makeCandidate(
            commercialTerms.dueDate,
            commercialTerms.confidence,
            "inference",
          )
        : undefined;
  const explicitClientCountry = extractPaymentField(text, [
    "client country",
    "country",
  ]);
  const agencyLocationDetails = inferLocationDetailsFromText(
    [agencyAddress?.value ?? "", agencyName?.value ?? "", agencyContext].join(
      " ",
    ),
  );
  const clientLocationDetails = inferLocationDetailsFromText(
    [
      explicitClientCountry?.value ?? "",
      clientName?.value ?? roleInferences.client?.value ?? "",
      clientAddress?.value ?? "",
      clientContext,
    ].join(" "),
  );
  const derivedClientCountry = explicitClientCountry?.value
    ? inferLocationDetailsFromText(explicitClientCountry.value).country ||
      getCountryFromText(explicitClientCountry.value)
    : clientLocationDetails.country ||
      getCountryFromText(
        [
          clientName?.value ?? "",
          clientAddress?.value ?? "",
          clientContext,
        ].join(" "),
      );

  const clientCountry =
    explicitClientCountry?.value && derivedClientCountry
      ? makeCandidate(derivedClientCountry, "high", "label")
      : derivedClientCountry
        ? makeCandidate(
            derivedClientCountry,
            clientLocationDetails.country
              ? clientLocationDetails.confidence || "medium"
              : "medium",
            "inference",
          )
        : undefined;

  const agencyState =
    agencyLocationDetails.state ||
    getStateFromText(
      [agencyAddress?.value ?? "", agencyName?.value ?? "", agencyContext].join(
        " ",
      ),
    )
      ? makeCandidate(
          agencyLocationDetails.state ||
            getStateFromText(
              [
                agencyAddress?.value ?? "",
                agencyName?.value ?? "",
                agencyContext,
              ].join(" "),
            ),
          agencyLocationDetails.state
            ? agencyLocationDetails.confidence || "medium"
            : "medium",
          "inference",
        )
      : undefined;

  const explicitClientState = extractPaymentField(text, ["client state"]);
  const clientState =
    explicitClientState?.value &&
    (inferLocationDetailsFromText(explicitClientState.value).state ||
      getStateFromText(explicitClientState.value))
      ? makeCandidate(
          inferLocationDetailsFromText(explicitClientState.value).state ||
            getStateFromText(explicitClientState.value),
          "high",
          "label",
        )
      : clientLocationDetails.state ||
          getStateFromText(
            [
              clientName?.value ?? "",
              clientAddress?.value ?? "",
              clientContext,
            ].join(" "),
          )
        ? makeCandidate(
            clientLocationDetails.state ||
              getStateFromText(
                [
                  clientName?.value ?? "",
                  clientAddress?.value ?? "",
                  clientContext,
                ].join(" "),
              ),
            clientLocationDetails.state
              ? clientLocationDetails.confidence || "medium"
              : "medium",
            "inference",
          )
        : undefined;

  const explicitLocation = extractPaymentField(text, [
    "client location",
    "location",
  ]);
  const inferredLocationType =
    clientLocationDetails.locationType ||
    inferLocationTypeFromText(
      [clientName?.value ?? "", clientAddress?.value ?? "", clientContext].join(
        " ",
      ),
    );
  const clientLocation: InvoiceBriefExtractionSchema["clientLocation"] =
    explicitLocation?.value &&
    /international|foreign|overseas/i.test(explicitLocation.value)
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "international",
          "high",
          "label",
        )
      : explicitLocation?.value &&
          /domestic|india/i.test(explicitLocation.value)
        ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
            "domestic",
            "high",
            "label",
          )
        : inferredLocationType === "international" ||
            clientCountry ||
            clientCurrency ||
            /international client|foreign client|overseas client/i.test(text)
          ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
              "international",
              inferredLocationType === "international"
                ? clientLocationDetails.confidence || "high"
                : "medium",
              "inference",
            )
          : inferredLocationType === "domestic" || clientState
            ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
                "domestic",
                inferredLocationType === "domestic"
                  ? clientLocationDetails.confidence || "high"
                  : "medium",
                "inference",
              )
            : undefined;
  const parsedAgencyAddress = parseAgencyStructuredAddress(
    agencyAddress?.value,
  );
  const parsedClientAddress = parseClientStructuredAddress({
    value: clientAddress?.value,
    location: clientLocation?.value,
    country: clientCountry?.value,
  });
  const heuristicLineItems = extractHeuristicLineItems(text);
  const extractedRate = extractRate(text);
  const extractedRateUnit = extractRateUnit(text);
  const invoiceIsInternational = extractInvoiceIsInternational(
    clientContext || text,
    clientCountry,
    clientState,
    clientCurrency,
  );
  const invoiceTotalAmount =
    extractInvoiceTotalAmount(text) ??
    (extractedRate &&
    !extractedRateUnit &&
    !/\bper\s+(?:screen|item|image|reel|video|banner|post|deliverable|day|hour|revision|concept)\b/i.test(
      text,
    )
      ? makeCandidate(
          extractedRate.value,
          extractedRate.confidence,
          extractedRate.source,
        )
      : undefined);
  const derivedGstRegistrationStatus =
    (explicitAgencyGstStatus?.value === "registered" && agencyGstin
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "high",
          "inference",
        )
      : explicitAgencyGstStatus) ??
    (agencyGstin
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "high",
          "inference",
        )
      : undefined);
  const derivedLutAvailability =
    explicitLutAvailability ??
    (extractAgencyLutNumber(text)
      ? makeCandidate("yes", "high", "inference")
      : undefined) ??
    (/\b(?:export of services|under lut|0% gst|without payment of igst)\b/i.test(
      text,
    )
      ? makeCandidate("yes", "medium", "inference")
      : undefined);
  const explicitInvoiceTaxType = extractInvoiceTaxType(text);
  const invoiceTaxType =
    explicitInvoiceTaxType ??
    (derivedGstRegistrationStatus?.value === "registered" &&
    clientLocation?.value === "domestic" &&
    agencyState?.value &&
    clientState?.value
      ? makeCandidate<NormalizedInvoiceTaxType>(
          agencyState.value === clientState.value ? "CGST_SGST" : "IGST",
          "medium",
          "inference",
        )
      : invoiceIsInternational?.value === true &&
          derivedLutAvailability?.value === "yes"
        ? makeCandidate<NormalizedInvoiceTaxType>(
            "ZERO_RATED",
            "medium",
            "inference",
          )
        : undefined);
  const paymentMode = extractPaymentMode(text);
  const timeline = extractTimeline(text);
  const primaryHeuristicLineItem = heuristicLineItems[0];
  const scalarRateCandidate =
    heuristicLineItems.length > 1 &&
    invoiceTotalAmount?.value &&
    extractedRate?.value === invoiceTotalAmount.value
      ? undefined
      : (primaryHeuristicLineItem?.rate ?? extractedRate);
  const scalarLineItemFallback = buildScalarLineItemFallback({
    deliverableType:
      primaryHeuristicLineItem?.type ?? extractLineItemType(text),
    deliverableDescription:
      primaryHeuristicLineItem?.description ??
      extractDeliverableDescription(text),
    qty: primaryHeuristicLineItem?.qty ?? extractQuantity(text),
    rate: scalarRateCandidate,
    rateUnit: primaryHeuristicLineItem?.rateUnit ?? extractedRateUnit,
  });
  const combinedLineItems = mergeLineItemsWithScalarFallback(
    heuristicLineItems,
    scalarLineItemFallback,
  );
  const primaryLineItem = combinedLineItems[0];

  return {
    agencyName: sanitizeCandidate(agencyName, "name"),
    agencyAddress,
    agencyAddressLine1: agencyAddress
      ? makeStringCandidate(
          parsedAgencyAddress.line1,
          agencyAddress.confidence,
          agencyAddress.source,
        )
      : undefined,
    agencyAddressLine2: agencyAddress
      ? makeStringCandidate(
          parsedAgencyAddress.line2,
          agencyAddress.confidence,
          agencyAddress.source,
        )
      : undefined,
    agencyCity: agencyAddress
      ? makeStringCandidate(
          parsedAgencyAddress.city,
          agencyAddress.confidence,
          agencyAddress.source,
        )
      : undefined,
    agencyPinCode: agencyAddress
      ? makeStringCandidate(
          parsedAgencyAddress.pinCode,
          agencyAddress.confidence,
          agencyAddress.source,
        )
      : undefined,
    agencyState,
    agencyGstRegistrationStatus: derivedGstRegistrationStatus,
    agencyGstin,
    agencyPan,
    agencyLutAvailability: derivedLutAvailability,
    agencyLutNumber: extractAgencyLutNumber(text),
    clientName: sanitizeCandidate(clientName, "name"),
    clientAddress,
    clientAddressLine1: clientAddress
      ? makeStringCandidate(
          parsedClientAddress.line1,
          clientAddress.confidence,
          clientAddress.source,
        )
      : undefined,
    clientAddressLine2: clientAddress
      ? makeStringCandidate(
          parsedClientAddress.line2,
          clientAddress.confidence,
          clientAddress.source,
        )
      : undefined,
    clientCity: clientAddress
      ? makeStringCandidate(
          parsedClientAddress.city,
          clientAddress.confidence,
          clientAddress.source,
        )
      : undefined,
    clientPinCode: clientAddress
      ? makeStringCandidate(
          parsedClientAddress.pinCode,
          clientAddress.confidence,
          clientAddress.source,
        )
      : undefined,
    clientPostalCode: clientAddress
      ? makeStringCandidate(
          parsedClientAddress.postalCode,
          clientAddress.confidence,
          clientAddress.source,
        )
      : undefined,
    clientState,
    clientCountry,
    clientLocation,
    clientCurrency,
    clientGstin: sanitizeCandidate(clientGstin, "tax-id"),
    invoiceIsInternational,
    invoiceCurrencyCode: clientCurrency,
    invoiceTotalAmount,
    invoiceTaxType,
    lineItems: combinedLineItems,
    deliverableType: primaryLineItem?.type ?? extractLineItemType(text),
    deliverableDescription:
      primaryLineItem?.description ?? extractDeliverableDescription(text),
    qty: primaryLineItem?.qty ?? extractQuantity(text),
    rate: primaryLineItem?.rate ?? extractedRate,
    rateUnit: primaryLineItem?.rateUnit ?? extractedRateUnit,
    licenseType: extractLicenseType(text),
    paymentTerms:
      extractPaymentTerms(text) ??
      (commercialTerms.paymentTerms
        ? makeCandidate(
            normalizePaymentTermsValue(commercialTerms.paymentTerms),
            commercialTerms.confidence,
            "inference",
          )
        : undefined),
    paymentMode,
    paymentAccountName,
    paymentBankName: extractPaymentField(text, ["bank name"]),
    paymentBankAddress: extractPaymentField(text, [
      "bank address",
      "bank full address",
    ]),
    paymentAccountNumber: extractPaymentAccountNumber(text),
    paymentIfscCode: extractPaymentIfscCode(text),
    paymentSwiftBicCode: extractPaymentSwiftBicCode(text),
    paymentIbanRoutingCode: extractPaymentField(text, [
      "iban",
      "routing code",
      "routing number",
      "sort code",
    ]),
    invoiceDate,
    dueDate,
    timeline,
  };
}

function isEffectivelyEmptyValue<T>(currentValue: T, defaultValue: T) {
  if (typeof currentValue === "string") {
    return !currentValue.trim() || currentValue === defaultValue;
  }

  return currentValue === defaultValue;
}

// Autofill is allowed to fill only empty or untouched-default fields.
// Once the user has meaningful data, we preserve it even when extraction
// comes back with high confidence.
function safeAssign<T>(currentValue: T, defaultValue: T, incomingValue: T) {
  return isEffectivelyEmptyValue(currentValue, defaultValue)
    ? incomingValue
    : currentValue;
}

function shouldApplyCandidate<T>(
  currentValue: T,
  defaultValue: T,
  candidate?: Candidate<T>,
) {
  if (!candidate) return false;
  if (candidate.confidence === "low") return false;

  return isEffectivelyEmptyValue(currentValue, defaultValue);
}

function recordField(
  label: string,
  confidence: BriefExtractionConfidence,
  source: BriefExtractionSource,
  filledFields: string[],
  aiFilledFields: string[],
  reviewFields: string[],
  confidentFieldSummaries: BriefAutofillFieldSummary[],
  inferredFieldSummaries: BriefAutofillFieldSummary[],
) {
  filledFields.push(label);
  if (source === "ai") {
    aiFilledFields.push(label);
  }

  const summary = createFieldSummary(label, confidence, source);

  if (confidence === "medium" || source === "inference") {
    reviewFields.push(label);
    inferredFieldSummaries.push(summary);
  } else {
    confidentFieldSummaries.push(summary);
  }
}

type ApplyCandidateArgs<T> = {
  label: string;
  currentValue: T;
  defaultValue: T;
  candidate?: Candidate<T>;
  assign: (value: T) => void;
  filledFields: string[];
  aiFilledFields: string[];
  reviewFields: string[];
  lowConfidenceFields: string[];
  confidentFieldSummaries: BriefAutofillFieldSummary[];
  inferredFieldSummaries: BriefAutofillFieldSummary[];
  lowConfidenceFieldSummaries: BriefAutofillFieldSummary[];
};

type MappingApplyCandidateArgs<T> = Omit<
  ApplyCandidateArgs<T>,
  | "confidentFieldSummaries"
  | "inferredFieldSummaries"
  | "lowConfidenceFieldSummaries"
>;

function applyCandidateToForm<T>({
  label,
  currentValue,
  defaultValue,
  candidate,
  assign,
  filledFields,
  aiFilledFields,
  reviewFields,
  lowConfidenceFields,
  confidentFieldSummaries,
  inferredFieldSummaries,
  lowConfidenceFieldSummaries,
}: ApplyCandidateArgs<T>) {
  if (!candidate) {
    return;
  }

  if (candidate.confidence === "low") {
    lowConfidenceFields.push(label);
    lowConfidenceFieldSummaries.push(
      createFieldSummary(label, candidate.confidence, candidate.source),
    );
    return;
  }

  if (!shouldApplyCandidate(currentValue, defaultValue, candidate)) {
    return;
  }

  const nextValue = safeAssign(currentValue, defaultValue, candidate.value);

  if (nextValue === currentValue) {
    return;
  }

  assign(nextValue);
  recordField(
    label,
    candidate.confidence,
    candidate.source,
    filledFields,
    aiFilledFields,
    reviewFields,
    confidentFieldSummaries,
    inferredFieldSummaries,
  );
}

export function normalizeBriefIntake(input: BriefIntakeInput) {
  return normalizeBriefText(
    [
      input.text.trim(),
      input.ocrText?.trim() ?? "",
      input.voiceTranscript?.trim() ?? "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

export function mapBriefExtractionToInvoiceForm(params: {
  currentFormData: InvoiceFormData;
  extraction: InvoiceBriefExtractionSchema;
}): BriefAutofillMappingResult {
  const nextFormData = mergeInvoiceFormData(params.currentFormData);
  const filledFields: string[] = [];
  const aiFilledFields: string[] = [];
  const reviewFields: string[] = [];
  const lowConfidenceFields: string[] = [];
  const confidentFieldSummaries: BriefAutofillFieldSummary[] = [];
  const inferredFieldSummaries: BriefAutofillFieldSummary[] = [];
  const lowConfidenceFieldSummaries: BriefAutofillFieldSummary[] = [];
  const { extraction } = params;
  const applyCandidate = <T>(args: MappingApplyCandidateArgs<T>) =>
    applyCandidateToForm({
      ...args,
      filledFields,
      aiFilledFields,
      reviewFields,
      lowConfidenceFields,
      confidentFieldSummaries,
      inferredFieldSummaries,
      lowConfidenceFieldSummaries,
    });
  const hasMeaningfulLineItems = nextFormData.lineItems.some((item) => {
    return Boolean(
      item.description.trim() ||
      item.qty !== defaultLineItem.qty ||
      item.rate !== defaultLineItem.rate ||
      item.type !== defaultLineItem.type ||
      item.rateUnit !== defaultLineItem.rateUnit,
    );
  });

  applyCandidate({
    label: "Agency name",
    currentValue: nextFormData.agency.agencyName,
    defaultValue: defaultInvoiceFormData.agency.agencyName,
    candidate: extraction.agencyName,
    assign: (value) => {
      nextFormData.agency.agencyName = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency address",
    currentValue: nextFormData.agency.address,
    defaultValue: defaultInvoiceFormData.agency.address,
    candidate: extraction.agencyAddress,
    assign: (value) => {
      nextFormData.agency.address = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency address line 1",
    currentValue: nextFormData.agency.addressLine1,
    defaultValue: defaultInvoiceFormData.agency.addressLine1,
    candidate: extraction.agencyAddressLine1,
    assign: (value) => {
      nextFormData.agency.addressLine1 = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency address line 2",
    currentValue: nextFormData.agency.addressLine2,
    defaultValue: defaultInvoiceFormData.agency.addressLine2,
    candidate: extraction.agencyAddressLine2,
    assign: (value) => {
      nextFormData.agency.addressLine2 = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency city",
    currentValue: nextFormData.agency.city,
    defaultValue: defaultInvoiceFormData.agency.city,
    candidate: extraction.agencyCity,
    assign: (value) => {
      nextFormData.agency.city = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency PIN code",
    currentValue: nextFormData.agency.pinCode,
    defaultValue: defaultInvoiceFormData.agency.pinCode,
    candidate: extraction.agencyPinCode,
    assign: (value) => {
      nextFormData.agency.pinCode = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency state",
    currentValue: nextFormData.agency.agencyState,
    defaultValue: defaultInvoiceFormData.agency.agencyState,
    candidate: extraction.agencyState,
    assign: (value) => {
      nextFormData.agency.agencyState = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "GST registration status",
    currentValue: nextFormData.agency.gstRegistrationStatus,
    defaultValue: defaultInvoiceFormData.agency.gstRegistrationStatus,
    candidate: extraction.agencyGstRegistrationStatus,
    assign: (value) => {
      nextFormData.agency.gstRegistrationStatus = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency GSTIN",
    currentValue: nextFormData.agency.gstin,
    defaultValue: defaultInvoiceFormData.agency.gstin,
    candidate: extraction.agencyGstin,
    assign: (value) => {
      nextFormData.agency.gstin = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Agency PAN",
    currentValue: nextFormData.agency.pan,
    defaultValue: defaultInvoiceFormData.agency.pan,
    candidate: extraction.agencyPan,
    assign: (value) => {
      nextFormData.agency.pan = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "LUT availability",
    currentValue: nextFormData.agency.lutAvailability,
    defaultValue: defaultInvoiceFormData.agency.lutAvailability,
    candidate: extraction.agencyLutAvailability,
    assign: (value) => {
      nextFormData.agency.lutAvailability = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "LUT number",
    currentValue: nextFormData.agency.lutNumber,
    defaultValue: defaultInvoiceFormData.agency.lutNumber,
    candidate: extraction.agencyLutNumber,
    assign: (value) => {
      nextFormData.agency.lutNumber = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client name",
    currentValue: nextFormData.client.clientName,
    defaultValue: defaultInvoiceFormData.client.clientName,
    candidate: extraction.clientName,
    assign: (value) => {
      nextFormData.client.clientName = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client address",
    currentValue: nextFormData.client.clientAddress,
    defaultValue: defaultInvoiceFormData.client.clientAddress,
    candidate: extraction.clientAddress,
    assign: (value) => {
      nextFormData.client.clientAddress = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client address line 1",
    currentValue: nextFormData.client.clientAddressLine1,
    defaultValue: defaultInvoiceFormData.client.clientAddressLine1,
    candidate: extraction.clientAddressLine1,
    assign: (value) => {
      nextFormData.client.clientAddressLine1 = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client address line 2",
    currentValue: nextFormData.client.clientAddressLine2,
    defaultValue: defaultInvoiceFormData.client.clientAddressLine2,
    candidate: extraction.clientAddressLine2,
    assign: (value) => {
      nextFormData.client.clientAddressLine2 = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client city",
    currentValue: nextFormData.client.clientCity,
    defaultValue: defaultInvoiceFormData.client.clientCity,
    candidate: extraction.clientCity,
    assign: (value) => {
      nextFormData.client.clientCity = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client PIN code",
    currentValue: nextFormData.client.clientPinCode,
    defaultValue: defaultInvoiceFormData.client.clientPinCode,
    candidate: extraction.clientPinCode,
    assign: (value) => {
      nextFormData.client.clientPinCode = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client postal code",
    currentValue: nextFormData.client.clientPostalCode,
    defaultValue: defaultInvoiceFormData.client.clientPostalCode,
    candidate: extraction.clientPostalCode,
    assign: (value) => {
      nextFormData.client.clientPostalCode = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client location",
    currentValue: nextFormData.client.clientLocation,
    defaultValue: defaultInvoiceFormData.client.clientLocation,
    candidate: extraction.clientLocation,
    assign: (value) => {
      nextFormData.client.clientLocation = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client state",
    currentValue: nextFormData.client.clientState,
    defaultValue: defaultInvoiceFormData.client.clientState,
    candidate: extraction.clientState,
    assign: (value) => {
      nextFormData.client.clientState = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client country",
    currentValue: nextFormData.client.clientCountry,
    defaultValue: defaultInvoiceFormData.client.clientCountry,
    candidate: extraction.clientCountry,
    assign: (value) => {
      nextFormData.client.clientCountry = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Invoice currency",
    currentValue: nextFormData.client.clientCurrency,
    defaultValue: defaultInvoiceFormData.client.clientCurrency,
    candidate: extraction.clientCurrency,
    assign: (value) => {
      nextFormData.client.clientCurrency = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Client GSTIN / Tax ID",
    currentValue: nextFormData.client.clientGstin,
    defaultValue: defaultInvoiceFormData.client.clientGstin,
    candidate: extraction.clientGstin,
    assign: (value) => {
      nextFormData.client.clientGstin = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  const extractedLineItems =
    extraction.lineItems && extraction.lineItems.length > 0
      ? extraction.lineItems
      : [
          {
            type: extraction.deliverableType,
            description: extraction.deliverableDescription,
            qty: extraction.qty,
            rate: extraction.rate,
            rateUnit: extraction.rateUnit,
          },
        ].filter(
          (item) =>
            item.type ||
            item.description ||
            item.qty ||
            item.rate ||
            item.rateUnit,
        );

  if (extractedLineItems.length > 0 && !hasMeaningfulLineItems) {
    const mergedLineItems = extractedLineItems.map((candidateItem, index) => {
      const nextItem = {
        ...defaultLineItem,
        id: `brief-line-${index + 1}`,
      };

      applyCandidate({
        label:
          index === 0 ? "Deliverable type" : `Deliverable ${index + 1} type`,
        currentValue: nextItem.type,
        defaultValue: defaultLineItem.type,
        candidate: candidateItem.type,
        assign: (value) => {
          nextItem.type = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label:
          index === 0
            ? "Deliverable description"
            : `Deliverable ${index + 1} description`,
        currentValue: nextItem.description,
        defaultValue: defaultLineItem.description,
        candidate: candidateItem.description,
        assign: (value) => {
          nextItem.description = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label: index === 0 ? "Quantity" : `Deliverable ${index + 1} quantity`,
        currentValue: nextItem.qty,
        defaultValue: defaultLineItem.qty,
        candidate: candidateItem.qty,
        assign: (value) => {
          nextItem.qty = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label: index === 0 ? "Rate" : `Deliverable ${index + 1} rate`,
        currentValue: nextItem.rate,
        defaultValue: defaultLineItem.rate,
        candidate: candidateItem.rate,
        assign: (value) => {
          nextItem.rate = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label: index === 0 ? "Rate unit" : `Deliverable ${index + 1} rate unit`,
        currentValue: nextItem.rateUnit,
        defaultValue: defaultLineItem.rateUnit,
        candidate: candidateItem.rateUnit,
        assign: (value) => {
          nextItem.rateUnit = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      return nextItem;
    });

    nextFormData.lineItems = mergedLineItems;
  }

  applyCandidate({
    label: "License type",
    currentValue: nextFormData.payment.license.licenseType,
    defaultValue: defaultInvoiceFormData.payment.license.licenseType,
    candidate: extraction.licenseType,
    assign: (value) => {
      nextFormData.payment.license.isLicenseIncluded = true;
      nextFormData.payment.license.licenseType = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "License duration",
    currentValue: nextFormData.payment.license.licenseDuration,
    defaultValue: defaultInvoiceFormData.payment.license.licenseDuration,
    candidate: extraction.licenseDuration,
    assign: (value) => {
      nextFormData.payment.license.licenseDuration = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Payment terms",
    currentValue: nextFormData.meta.paymentTerms,
    defaultValue: defaultInvoiceFormData.meta.paymentTerms,
    candidate: extraction.paymentTerms,
    assign: (value) => {
      nextFormData.meta.paymentTerms = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Invoice date",
    currentValue: nextFormData.meta.invoiceDate,
    defaultValue: defaultInvoiceFormData.meta.invoiceDate,
    candidate: extraction.invoiceDate,
    assign: (value) => {
      nextFormData.meta.invoiceDate = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Due date",
    currentValue: nextFormData.meta.dueDate,
    defaultValue: defaultInvoiceFormData.meta.dueDate,
    candidate: extraction.dueDate,
    assign: (value) => {
      nextFormData.meta.dueDate = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Beneficiary / account name",
    currentValue: nextFormData.payment.accountName,
    defaultValue: defaultInvoiceFormData.payment.accountName,
    candidate: extraction.paymentAccountName,
    assign: (value) => {
      nextFormData.payment.accountName = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Bank name",
    currentValue: nextFormData.payment.bankName,
    defaultValue: defaultInvoiceFormData.payment.bankName,
    candidate: extraction.paymentBankName,
    assign: (value) => {
      nextFormData.payment.bankName = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Bank address",
    currentValue: nextFormData.payment.bankAddress,
    defaultValue: defaultInvoiceFormData.payment.bankAddress,
    candidate: extraction.paymentBankAddress,
    assign: (value) => {
      nextFormData.payment.bankAddress = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Account number",
    currentValue: nextFormData.payment.accountNumber,
    defaultValue: defaultInvoiceFormData.payment.accountNumber,
    candidate: extraction.paymentAccountNumber,
    assign: (value) => {
      nextFormData.payment.accountNumber = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "IFSC code",
    currentValue: nextFormData.payment.ifscCode,
    defaultValue: defaultInvoiceFormData.payment.ifscCode,
    candidate: extraction.paymentIfscCode,
    assign: (value) => {
      nextFormData.payment.ifscCode = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "SWIFT / BIC code",
    currentValue: nextFormData.payment.swiftBicCode,
    defaultValue: defaultInvoiceFormData.payment.swiftBicCode,
    candidate: extraction.paymentSwiftBicCode,
    assign: (value) => {
      nextFormData.payment.swiftBicCode = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "IBAN / routing code",
    currentValue: nextFormData.payment.ibanRoutingCode,
    defaultValue: defaultInvoiceFormData.payment.ibanRoutingCode,
    candidate: extraction.paymentIbanRoutingCode,
    assign: (value) => {
      nextFormData.payment.ibanRoutingCode = value;
    },
    filledFields,
    aiFilledFields,
    reviewFields,
    lowConfidenceFields,
  });

  return {
    nextFormData,
    filledFields: [...new Set(filledFields)],
    aiFilledFields: [...new Set(aiFilledFields)],
    reviewFields: [...new Set(reviewFields)],
    lowConfidenceFields: [...new Set(lowConfidenceFields)],
    confidentFieldSummaries: dedupeFieldSummaries(confidentFieldSummaries),
    inferredFieldSummaries: dedupeFieldSummaries(inferredFieldSummaries),
    lowConfidenceFieldSummaries: dedupeFieldSummaries(
      lowConfidenceFieldSummaries,
    ),
  };
}

export function runBriefAutofill(params: {
  currentFormData: InvoiceFormData;
  input: BriefIntakeInput;
  aiExtraction?: AiBriefExtraction | null;
}): BriefAutofillResult {
  const normalizedText = normalizeBriefIntake(params.input);
  const rawHeuristicExtraction = extractInvoiceBriefSchema(normalizedText);
  const heuristicExtraction = toInvoiceExtractionSchema(
    normalizeExtractionOutput({
      source: "heuristic",
      extraction: rawHeuristicExtraction,
    }),
  );
  const aiExtraction = params.aiExtraction
    ? toInvoiceExtractionSchema(
        normalizeExtractionOutput({
          source: "ai",
          extraction: params.aiExtraction,
          rawText: normalizedText,
        }),
      )
    : null;
  const extraction = mergeBriefExtractions({
    aiExtraction,
    heuristicExtraction,
  });

  if (process.env.NODE_ENV === "development") {
    console.debug("[invoice-brief-intake] extraction-adapter", {
      rawExtraction: {
        ai: params.aiExtraction ?? null,
        heuristic: rawHeuristicExtraction,
      },
      adaptedExtraction: {
        ai: aiExtraction,
        heuristic: heuristicExtraction,
        merged: extraction,
      },
    });
  }

  const mapping = mapBriefExtractionToInvoiceForm({
    currentFormData: params.currentFormData,
    extraction,
  });
  const clarificationSuggestions = buildBriefClarificationSuggestions({
    normalizedText,
    extraction,
    currentFormData: mapping.nextFormData,
  });

  return {
    normalizedText,
    extraction,
    nextFormData: mapping.nextFormData,
    filledFields: mapping.filledFields,
    aiFilledFields: mapping.aiFilledFields,
    reviewFields: mapping.reviewFields,
    lowConfidenceFields: mapping.lowConfidenceFields,
    confidentFieldSummaries: mapping.confidentFieldSummaries,
    inferredFieldSummaries: mapping.inferredFieldSummaries,
    lowConfidenceFieldSummaries: mapping.lowConfidenceFieldSummaries,
    clarificationSuggestions,
    hasImageAttachments: Boolean(params.input.imageFiles?.length),
    hasVoiceTranscript: Boolean(params.input.voiceTranscript?.trim()),
  };
}
