import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import type {
  AiBriefExtraction,
  AiBriefField,
  AiBriefTaxType,
} from "@/lib/ai-brief-extractor";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  type InternationalCurrencyCode,
} from "@/lib/international-billing-options";
import { buildBriefClarificationSuggestions } from "@/lib/invoice-clarifications";
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
  agencyState?: BriefExtractedField<InvoiceFormData["agency"]["agencyState"]>;
  agencyGstRegistrationStatus?: BriefExtractedField<AgencyDetails["gstRegistrationStatus"]>;
  agencyGstin?: BriefExtractedField<string>;
  agencyPan?: BriefExtractedField<string>;
  agencyLutAvailability?: BriefExtractedField<AgencyDetails["lutAvailability"]>;
  agencyLutNumber?: BriefExtractedField<string>;
  clientName?: BriefExtractedField<string>;
  clientAddress?: BriefExtractedField<string>;
  clientState?: BriefExtractedField<InvoiceFormData["client"]["clientState"]>;
  clientCountry?: BriefExtractedField<InvoiceFormData["client"]["clientCountry"]>;
  clientLocation?: BriefExtractedField<InvoiceFormData["client"]["clientLocation"]>;
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

const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i;
const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]\b/i;

const INDIA_STATE_ALIASES: Array<{
  state: InvoiceFormData["agency"]["agencyState"];
  patterns: RegExp[];
}> = [
  { state: "Karnataka", patterns: [/\bbengaluru\b/i, /\bbangalore\b/i] },
  { state: "Maharashtra", patterns: [/\bmumbai\b/i, /\bpune\b/i] },
  { state: "Delhi", patterns: [/\bnew delhi\b/i, /\bdelhi\b/i] },
  { state: "Telangana", patterns: [/\bhyderabad\b/i] },
  { state: "Tamil Nadu", patterns: [/\bchennai\b/i] },
  { state: "West Bengal", patterns: [/\bkolkata\b/i, /\bcalcutta\b/i] },
  { state: "Gujarat", patterns: [/\bahmedabad\b/i] },
  { state: "Kerala", patterns: [/\bkochi\b/i, /\bcochin\b/i] },
  { state: "Haryana", patterns: [/\bgurugram\b/i, /\bgurgaon\b/i] },
  { state: "Uttar Pradesh", patterns: [/\bnoida\b/i] },
];

const INTERNATIONAL_COUNTRY_ALIASES: Array<{
  country: InvoiceFormData["client"]["clientCountry"];
  patterns: RegExp[];
}> = [
  { country: "United States", patterns: [/\busa\b/i, /\bu\.s\.a\b/i, /\bus client\b/i] },
  { country: "United Kingdom", patterns: [/\buk\b/i, /\bu\.k\b/i, /\blondon\b/i] },
  {
    country: "United Arab Emirates",
    patterns: [/\buae\b/i, /\bdubai\b/i, /\bab[uú] dhabi\b/i],
  },
];

function makeCandidate<T>(
  value: T,
  confidence: BriefExtractionConfidence,
  source: BriefExtractionSource
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

function cleanAddressValue(value?: string | null) {
  return cleanValue(value)
    .replace(
      /\s+(?:\d+\s+(?:screens?|banners?|items?|illustrations?)|landing page|homepage|logo|illustration|ui\/?\s*ux|terms?|payment|bank|account|ifsc|swift)\b.*$/i,
      ""
    )
    .trim();
}

function normalizeCommonOcrLabels(text: string) {
  return text
    .replace(/\baddre55\b/gi, "address")
    .replace(/\bn4me\b/gi, "name")
    .replace(/\bbill t0\b/gi, "bill to")
    .replace(/\bclient n4me\b/gi, "client name")
    .replace(/\bagency n4me\b/gi, "agency name")
    .replace(/\breg15tered\b/gi, "registered")
    .replace(/\bterm5\b/gi, "terms");
}

function normalizeWordLevelOcrNoise(text: string) {
  return text.replace(/\b[a-zA-Z][a-zA-Z0-9]{2,}\b/g, (token) => {
    const digitCount = (token.match(/[0-9]/g) ?? []).length;

    if (
      !/[A-Za-z]/.test(token) ||
      !/[05]/.test(token) ||
      digitCount > 1 ||
      token === token.toUpperCase()
    ) {
      return token;
    }

    return token.replace(/0/g, "o").replace(/5/g, "s");
  });
}

export function normalizeBriefText(text: string) {
  return normalizeWordLevelOcrNoise(
    normalizeCommonOcrLabels(
      text
      .replace(/\r\n?/g, "\n")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2")
      .replace(/([A-Za-z0-9,.:])\s*\n\s*(?=[a-z0-9])/g, "$1 ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ ]+\n/g, "\n")
      .replace(/\n[ ]+/g, "\n")
      .trim()
    )
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

function extractLabeledValue(text: string, labels: string[]) {
  const patterns = labels.map(
    (label) => new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*(.+)$`, "im")
  );

  return findFirstMatch(text, patterns);
}

function parseAmount(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, " ").trim();
  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(k|m|lakh|lac)?\b/i);

  if (!amountMatch) {
    return 0;
  }

  const parsed = Number(amountMatch[1]);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  switch ((amountMatch[2] ?? "").toLowerCase()) {
    case "k":
      return parsed * 1_000;
    case "m":
      return parsed * 1_000_000;
    case "lakh":
    case "lac":
      return parsed * 100_000;
    default:
      return parsed;
  }
}

function findUniquePatternMatch(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  const matches = Array.from(text.matchAll(globalPattern)).map((match) =>
    match[0].toUpperCase()
  );
  const uniqueMatches = Array.from(new Set(matches));

  return uniqueMatches.length === 1 ? uniqueMatches[0] : "";
}

function extractPatternValue(text: string, patterns: RegExp[]) {
  return findFirstMatch(text, patterns);
}

function looksLikeEntityName(value: string) {
  const cleaned = cleanValue(value);

  if (!cleaned || cleaned.length < 3) {
    return false;
  }

  return !/\b(?:invoice|brief|work|project|design|rate|qty|quantity|terms|bank|amount|budget|ignore|old one|this one)\b/i.test(
    cleaned
  );
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
  if (
    /agency|gst|lut|pan/i.test(label) &&
    !/client/i.test(label)
  ) {
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
      label
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
  source: BriefExtractionSource
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
  confidence: BriefExtractionConfidence | undefined
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
  falseValue: T
): Candidate<T> | undefined {
  if (field.value === null) {
    return undefined;
  }

  return makeCandidate(field.value ? trueValue : falseValue, field.confidence, "ai");
}

function normalizeLineItemTypeValue(
  value: string | null | undefined
): InvoiceLineItemType | undefined {
  const normalized = cleanValue(value ?? "");

  if (!normalized) {
    return undefined;
  }

  if (/\blogos?\b/i.test(normalized)) return "Logo Design";
  if (
    /\b(ui|ux|landing page|homepage|screens?|wireframes?|dashboard)\b/i.test(
      normalized
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
  description?: string | null
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

function getForeignCityHint(text: string) {
  return /\b(london|new york|san francisco|toronto|vancouver|dubai|singapore|paris|berlin|sydney)\b/i.test(
    text
  );
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
      "inference"
    );
  }

  if (
    /export of services/i.test(params.rawText) ||
    params.lutAvailability === "yes"
  ) {
    return makeCandidate<NormalizedInvoiceTaxType>(
      "ZERO_RATED",
      "medium",
      "inference"
    );
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
      "inference"
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
  rawText: string
) {
  const normalized = extraction.deliverables
    .map((item) => {
      const normalizedType = normalizeLineItemTypeValue(item.type.value);
      const normalizedRateUnit = normalizeRateUnitValue(
        item.unit.value,
        item.description.value ?? item.type.value
      );

      return {
        type: normalizedType
          ? makeCandidate(normalizedType, item.type.confidence, "ai")
          : undefined,
        description: createAiCandidate(
          cleanSentenceValue(item.description.value ?? item.type.value ?? ""),
          item.description.confidence
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
        item.type ||
        item.description ||
        item.qty ||
        item.rate ||
        item.rateUnit
    );

  return normalized.length > 0 ? normalized : deriveFallbackDeliverables(rawText);
}

function normalizeAiTaxType(
  field: AiBriefField<AiBriefTaxType>
): Candidate<NormalizedInvoiceTaxType> | undefined {
  if (!field.value) {
    return undefined;
  }

  return makeCandidate(
    field.value === "ZERO" ? "ZERO_RATED" : field.value,
    field.confidence,
    "ai"
  );
}

function formatAiPaymentSchedule(extraction: AiBriefExtraction) {
  const scheduleParts = extraction.paymentSchedule
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
  rawText: string
): InvoiceBriefExtractionSchema {
  const agencyAddressValue =
    extraction.agencyAddress.value ?? extraction.locations.agency.value ?? "";
  const clientAddressValue =
    extraction.clientAddress.value ?? extraction.locations.client.value ?? "";
  const agencyStateValue =
    getStateFromText(extraction.agencyState.value ?? agencyAddressValue) || "";
  const clientStateValue =
    getStateFromText(extraction.clientState.value ?? clientAddressValue) || "";
  const clientCountryValue =
    getCountryFromText(extraction.clientCountry.value || clientAddressValue || rawText) ||
    "";
  const currencyCandidate =
    createAiCandidate(extraction.currency.value, extraction.currency.confidence) ??
    getCurrencyFromText(rawText);
  const explicitInternational =
    extraction.locations.inferredType.value === "international"
      ? true
      : extraction.locations.inferredType.value === "domestic"
      ? false
      : null;
  const paymentModeValue =
    normalizePaymentModeValue(extraction.paymentMode.value) ||
    normalizePaymentModeValue(
      /wise|payoneer|paypal|upi|bank|wire/i.exec(rawText)?.[0]
    );
  const clientLocationCandidate =
    explicitInternational !== null
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          explicitInternational ? "international" : "domestic",
          extraction.locations.inferredType.confidence,
          "ai"
        )
      : clientCountryValue
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "international",
          "medium",
          "inference"
        )
      : getForeignCityHint(rawText) || paymentModeValue === "wise" || paymentModeValue === "payoneer"
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "international",
          "medium",
          "inference"
        )
      : clientStateValue
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "domestic",
          "medium",
          "inference"
        )
      : undefined;
  const agencyGstStatus =
    createAiBooleanCandidate(
      extraction.gst.isRegistered,
      "registered" as AgencyDetails["gstRegistrationStatus"],
      "not-registered" as AgencyDetails["gstRegistrationStatus"]
    ) ??
    (extraction.gst.lutAvailable.value === true
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "medium",
          "inference"
        )
      : undefined) ??
    ((extraction.gst.type.value === "CGST_SGST" ||
      extraction.gst.type.value === "IGST") &&
    extraction.gst.rate.value &&
    extraction.gst.rate.value > 0
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "medium",
          "inference"
        )
      : undefined) ??
    (extraction.gst.gstin.value
      ? makeCandidate<AgencyDetails["gstRegistrationStatus"]>(
          "registered",
          "medium",
          "inference"
        )
      : undefined);
  const agencyLutAvailability =
    createAiBooleanCandidate(
      extraction.gst.lutAvailable,
      "yes" as AgencyDetails["lutAvailability"],
      "no" as AgencyDetails["lutAvailability"]
    ) ??
    (/export of services/i.test(rawText)
      ? makeCandidate<AgencyDetails["lutAvailability"]>(
          "yes",
          "medium",
          "inference"
        )
      : undefined);
  const taxTypeCandidate = deriveTaxTypeCandidate({
    explicitTaxType: normalizeAiTaxType(extraction.gst.type),
    rawText,
    agencyState: agencyStateValue,
    clientState: clientStateValue,
    clientLocation: clientLocationCandidate?.value,
    gstRegistrationStatus: agencyGstStatus?.value,
    lutAvailability: agencyLutAvailability?.value,
  });
  const paymentScheduleText = formatAiPaymentSchedule(extraction);
  const paymentTermsCandidate =
    createAiCandidate(
      cleanValue(extraction.paymentTerms.value),
      extraction.paymentTerms.confidence
    ) ??
    (paymentScheduleText
      ? makeCandidate(paymentScheduleText, "medium", "ai")
      : undefined);
  const invoiceDateValue = formatDateCandidate(extraction.timeline.invoiceDate.value);
  const dueDateValue = formatDateCandidate(extraction.timeline.dueDate.value);

  const normalized: InvoiceBriefExtractionSchema = {
    agencyName: createAiCandidate(
      cleanValue(extraction.agencyName.value),
      extraction.agencyName.confidence
    ),
    agencyAddress: createAiCandidate(
      cleanAddressValue(agencyAddressValue),
      extraction.agencyAddress.value
        ? extraction.agencyAddress.confidence
        : extraction.locations.agency.confidence
    ),
    agencyState: agencyStateValue
      ? makeCandidate(
          agencyStateValue,
          extraction.agencyState.value
            ? extraction.agencyState.confidence
            : "medium",
          extraction.agencyState.value ? "ai" : "inference"
        )
      : undefined,
    agencyGstRegistrationStatus: agencyGstStatus,
    agencyGstin: createAiCandidate(
      extraction.gst.gstin.value?.toUpperCase()?.replace(/\s+/g, ""),
      extraction.gst.gstin.confidence
    ),
    agencyPan: createAiCandidate(
      extraction.gst.pan.value?.toUpperCase()?.replace(/\s+/g, ""),
      extraction.gst.pan.confidence
    ),
    agencyLutAvailability,
    agencyLutNumber: createAiCandidate(
      cleanValue(extraction.gst.lutNumber.value),
      extraction.gst.lutNumber.confidence
    ),
    clientName: createAiCandidate(
      cleanValue(extraction.clientName.value),
      extraction.clientName.confidence
    ),
    clientAddress: createAiCandidate(
      cleanAddressValue(clientAddressValue),
      extraction.clientAddress.value
        ? extraction.clientAddress.confidence
        : extraction.locations.client.confidence
    ),
    clientState: clientStateValue
      ? makeCandidate(
          clientStateValue,
          extraction.clientState.value ? extraction.clientState.confidence : "medium",
          extraction.clientState.value ? "ai" : "inference"
        )
      : undefined,
    clientCountry: clientCountryValue
      ? makeCandidate(
          clientCountryValue,
          extraction.clientCountry.value ? extraction.clientCountry.confidence : "medium",
          extraction.clientCountry.value ? "ai" : "inference"
        )
      : undefined,
    clientLocation: clientLocationCandidate,
    clientGstin: createAiCandidate(
      cleanValue(extraction.clientTaxId.value || ""),
      extraction.clientTaxId.confidence
    ),
    clientCurrency:
      currencyCandidate?.value &&
      currencyCandidate.value !== "INR" &&
      ["USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD"].includes(
        currencyCandidate.value
      )
        ? makeCandidate(
            currencyCandidate.value as InternationalCurrencyCode,
            currencyCandidate.confidence,
            currencyCandidate.source
          )
        : undefined,
    invoiceIsInternational:
      clientLocationCandidate?.value === "international"
        ? makeCandidate(true, clientLocationCandidate.confidence, clientLocationCandidate.source)
        : explicitInternational === false
        ? makeCandidate(false, extraction.locations.inferredType.confidence, "ai")
        : undefined,
    invoiceCurrencyCode: currencyCandidate,
    invoiceTotalAmount: createAiCandidate(
      extraction.totalAmount.value,
      extraction.totalAmount.confidence
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
          extraction.paymentMode.value ? "ai" : "inference"
        )
      : undefined,
    paymentAccountName: createAiCandidate(
      cleanValue(extraction.payment.accountName.value),
      extraction.payment.accountName.confidence
    ),
    paymentBankName: createAiCandidate(
      cleanValue(extraction.payment.bankName.value),
      extraction.payment.bankName.confidence
    ),
    paymentBankAddress: createAiCandidate(
      cleanAddressValue(extraction.payment.bankAddress.value),
      extraction.payment.bankAddress.confidence
    ),
    paymentAccountNumber: createAiCandidate(
      cleanValue(extraction.payment.accountNumber.value),
      extraction.payment.accountNumber.confidence
    ),
    paymentIfscCode: createAiCandidate(
      extraction.payment.ifscCode.value?.toUpperCase()?.replace(/\s+/g, ""),
      extraction.payment.ifscCode.confidence
    ),
    paymentSwiftBicCode: createAiCandidate(
      extraction.payment.swiftCode.value?.toUpperCase()?.replace(/\s+/g, ""),
      extraction.payment.swiftCode.confidence
    ),
    paymentIbanRoutingCode: createAiCandidate(
      cleanValue(extraction.payment.ibanOrRouting.value),
      extraction.payment.ibanOrRouting.confidence
    ),
    invoiceDate: invoiceDateValue
      ? makeCandidate(
          invoiceDateValue,
          extraction.timeline.invoiceDate.confidence,
          "ai"
        )
      : undefined,
    dueDate: dueDateValue
      ? makeCandidate(
          dueDateValue,
          extraction.timeline.dueDate.confidence,
          "ai"
        )
      : undefined,
    timeline: createAiCandidate(
      cleanValue(extraction.timeline.deliveryTimeline.value),
      extraction.timeline.deliveryTimeline.confidence
    ),
  } satisfies InvoiceBriefExtractionSchema;

  if (!normalized.deliverableType && normalized.lineItems?.[0]?.type) {
    normalized.deliverableType = normalized.lineItems[0].type;
  }

  if (!normalized.deliverableDescription && normalized.lineItems?.[0]?.description) {
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
  heuristicCandidate?: Candidate<T>
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
  heuristic: InvoiceBriefExtractionSchema
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
      type: chooseMergedCandidate(`lineItems.${index}.type`, aiItem?.type, fallbackItem?.type),
      description: chooseMergedCandidate(
        `lineItems.${index}.description`,
        aiItem?.description,
        fallbackItem?.description
      ),
      qty: chooseMergedCandidate(`qty`, aiItem?.qty, fallbackItem?.qty),
      rate: chooseMergedCandidate(`rate`, aiItem?.rate, fallbackItem?.rate),
      rateUnit: chooseMergedCandidate(
        `rateUnit`,
        aiItem?.rateUnit,
        fallbackItem?.rateUnit
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
      heuristicExtraction.agencyName
    ),
    agencyAddress: chooseMergedCandidate(
      "agencyAddress",
      aiExtraction.agencyAddress,
      heuristicExtraction.agencyAddress
    ),
    agencyState: chooseMergedCandidate(
      "agencyState",
      aiExtraction.agencyState,
      heuristicExtraction.agencyState
    ),
    agencyGstRegistrationStatus: chooseMergedCandidate(
      "agencyGstRegistrationStatus",
      aiExtraction.agencyGstRegistrationStatus,
      heuristicExtraction.agencyGstRegistrationStatus
    ),
    agencyGstin: chooseMergedCandidate(
      "agencyGstin",
      aiExtraction.agencyGstin,
      heuristicExtraction.agencyGstin
    ),
    agencyPan: chooseMergedCandidate(
      "agencyPan",
      aiExtraction.agencyPan,
      heuristicExtraction.agencyPan
    ),
    agencyLutAvailability: chooseMergedCandidate(
      "agencyLutAvailability",
      aiExtraction.agencyLutAvailability,
      heuristicExtraction.agencyLutAvailability
    ),
    agencyLutNumber: chooseMergedCandidate(
      "agencyLutNumber",
      aiExtraction.agencyLutNumber,
      heuristicExtraction.agencyLutNumber
    ),
    clientName: chooseMergedCandidate(
      "clientName",
      aiExtraction.clientName,
      heuristicExtraction.clientName
    ),
    clientAddress: chooseMergedCandidate(
      "clientAddress",
      aiExtraction.clientAddress,
      heuristicExtraction.clientAddress
    ),
    clientState: chooseMergedCandidate(
      "clientState",
      aiExtraction.clientState,
      heuristicExtraction.clientState
    ),
    clientCountry: chooseMergedCandidate(
      "clientCountry",
      aiExtraction.clientCountry,
      heuristicExtraction.clientCountry
    ),
    clientLocation: chooseMergedCandidate(
      "clientLocation",
      aiExtraction.clientLocation,
      heuristicExtraction.clientLocation
    ),
    invoiceIsInternational: chooseMergedCandidate(
      "invoiceIsInternational",
      aiExtraction.invoiceIsInternational,
      heuristicExtraction.invoiceIsInternational
    ),
    invoiceCurrencyCode: chooseMergedCandidate(
      "invoiceCurrencyCode",
      aiExtraction.invoiceCurrencyCode,
      heuristicExtraction.invoiceCurrencyCode
    ),
    invoiceTotalAmount: chooseMergedCandidate(
      "invoiceTotalAmount",
      aiExtraction.invoiceTotalAmount,
      heuristicExtraction.invoiceTotalAmount
    ),
    invoiceTaxType: chooseMergedCandidate(
      "invoiceTaxType",
      aiExtraction.invoiceTaxType,
      heuristicExtraction.invoiceTaxType
    ),
    clientCurrency: chooseMergedCandidate(
      "clientCurrency",
      aiExtraction.clientCurrency,
      heuristicExtraction.clientCurrency
    ),
    clientGstin: chooseMergedCandidate(
      "clientGstin",
      aiExtraction.clientGstin,
      heuristicExtraction.clientGstin
    ),
    lineItems: mergeLineItemExtractions(
      aiExtraction.lineItems,
      heuristicExtraction
    ),
    deliverableType: chooseMergedCandidate(
      "deliverableType",
      aiExtraction.deliverableType,
      heuristicExtraction.deliverableType
    ),
    deliverableDescription: chooseMergedCandidate(
      "deliverableDescription",
      aiExtraction.deliverableDescription,
      heuristicExtraction.deliverableDescription
    ),
    qty: chooseMergedCandidate("qty", aiExtraction.qty, heuristicExtraction.qty),
    rate: chooseMergedCandidate(
      "rate",
      aiExtraction.rate,
      heuristicExtraction.rate
    ),
    rateUnit: chooseMergedCandidate(
      "rateUnit",
      aiExtraction.rateUnit,
      heuristicExtraction.rateUnit
    ),
    licenseType: chooseMergedCandidate(
      "licenseType",
      aiExtraction.licenseType,
      heuristicExtraction.licenseType
    ),
    licenseDuration: chooseMergedCandidate(
      "licenseDuration",
      aiExtraction.licenseDuration,
      heuristicExtraction.licenseDuration
    ),
    paymentTerms: chooseMergedCandidate(
      "paymentTerms",
      aiExtraction.paymentTerms,
      heuristicExtraction.paymentTerms
    ),
    paymentMode: chooseMergedCandidate(
      "paymentMode",
      aiExtraction.paymentMode,
      heuristicExtraction.paymentMode
    ),
    paymentAccountName: chooseMergedCandidate(
      "paymentAccountName",
      aiExtraction.paymentAccountName,
      heuristicExtraction.paymentAccountName
    ),
    paymentBankName: chooseMergedCandidate(
      "paymentBankName",
      aiExtraction.paymentBankName,
      heuristicExtraction.paymentBankName
    ),
    paymentBankAddress: chooseMergedCandidate(
      "paymentBankAddress",
      aiExtraction.paymentBankAddress,
      heuristicExtraction.paymentBankAddress
    ),
    paymentAccountNumber: chooseMergedCandidate(
      "paymentAccountNumber",
      aiExtraction.paymentAccountNumber,
      heuristicExtraction.paymentAccountNumber
    ),
    paymentIfscCode: chooseMergedCandidate(
      "paymentIfscCode",
      aiExtraction.paymentIfscCode,
      heuristicExtraction.paymentIfscCode
    ),
    paymentSwiftBicCode: chooseMergedCandidate(
      "paymentSwiftBicCode",
      aiExtraction.paymentSwiftBicCode,
      heuristicExtraction.paymentSwiftBicCode
    ),
    paymentIbanRoutingCode: chooseMergedCandidate(
      "paymentIbanRoutingCode",
      aiExtraction.paymentIbanRoutingCode,
      heuristicExtraction.paymentIbanRoutingCode
    ),
    dueDate: chooseMergedCandidate(
      "dueDate",
      aiExtraction.dueDate,
      heuristicExtraction.dueDate
    ),
    timeline: chooseMergedCandidate(
      "timeline",
      aiExtraction.timeline,
      heuristicExtraction.timeline
    ),
  };
}

function getStateFromText(
  text: string
): InvoiceFormData["agency"]["agencyState"] {
  const normalized = text.toLowerCase();
  const directMatch =
    INDIA_STATE_OPTIONS.find((stateName) =>
      normalized.includes(stateName.toLowerCase())
    ) ?? "";

  if (directMatch) {
    return directMatch;
  }

  return (
    INDIA_STATE_ALIASES.find((entry) =>
      entry.patterns.some((pattern) => pattern.test(text))
    )?.state ?? ""
  );
}

function getCountryFromText(
  text: string
): InvoiceFormData["client"]["clientCountry"] {
  const normalized = text.toLowerCase();
  const directMatch =
    INTERNATIONAL_COUNTRY_OPTIONS.find((countryName) =>
      normalized.includes(countryName.toLowerCase())
    ) ?? "";

  if (directMatch) {
    return directMatch;
  }

  return (
    INTERNATIONAL_COUNTRY_ALIASES.find((entry) =>
      entry.patterns.some((pattern) => pattern.test(text))
    )?.country ?? ""
  );
}

function getCurrencyFromText(
  text: string
): Candidate<InternationalCurrencyCode> | undefined {
  const labelMatches = currencyMatchers.filter((matcher) =>
    matcher.labelPatterns.some((pattern) => pattern.test(text))
  );

  if (labelMatches.length === 1) {
    return makeCandidate(labelMatches[0].code, "high", "label");
  }

  const fallbackMatches = currencyMatchers.filter((matcher) =>
    matcher.fallbackPatterns.some((pattern) => pattern.test(text))
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
  const value = extractLabeledValue(text, [
    "agency name",
    "agency",
    "freelancer name",
    "studio name",
    "from",
  ]);

  if (value) {
    return makeCandidate(cleanAddressValue(value), "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\bwe(?:'re| are)\s+([a-z0-9&.' -]{3,80}?)(?=,|\.|\n|\s+(?:based\b|from\b|at\b|client\b|need\b|invoice\b|did\b|made\b)|$)/i,
    /\bour (?:studio|agency)(?: is)?\s+([a-z0-9&.' -]{3,80}?)(?=,|\.|\n|\s+(?:based\b|from\b|at\b|client\b)|$)/i,
  ]);

  return inferred && looksLikeEntityName(inferred)
    ? makeCandidate(inferred, "medium", "inference")
    : undefined;
}

function extractAgencyAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "agency address",
    "business address",
    "from address",
  ]);

  if (value) {
    return makeCandidate(value, "high", "label");
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
  const labeled = extractLabeledValue(text, [
    "agency gstin",
    "business gstin",
    "freelancer gstin",
    "our gstin",
  ]);

  if (labeled) {
    const match = labeled.toUpperCase().match(GSTIN_REGEX);
    if (match?.[0]) {
      return makeCandidate(match[0], "high", "label");
    }
  }

  const uniqueMatch = findUniquePatternMatch(text.toUpperCase(), GSTIN_REGEX);
  return uniqueMatch ? makeCandidate(uniqueMatch, "low", "regex") : undefined;
}

function extractAgencyPan(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, ["pan", "agency pan", "business pan"]);

  if (labeled) {
    const match = labeled.toUpperCase().match(PAN_REGEX);
    if (match?.[0]) {
      return makeCandidate(match[0], "high", "label");
    }
  }

  const uniqueMatch = findUniquePatternMatch(text.toUpperCase(), PAN_REGEX);
  return uniqueMatch ? makeCandidate(uniqueMatch, "low", "regex") : undefined;
}

function extractClientName(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "client name",
    "client",
    "bill to",
    "customer name",
  ]);

  if (value) {
    return makeCandidate(value, "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\bbill to\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|at\b|in\b|invoice\b|project\b|work\b|rate\b|qty\b|quantity\b|net\b|currency\b|bank\b)|$)/i,
    /\bfor\s+([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:invoice\b|project\b|work\b|landing\b|homepage\b|logo\b|illustration\b|screens?\b|banners?\b|rate\b|at\b|@|qty\b|quantity\b|net\b|currency\b)|$)/i,
    /\bclient(?:\s+name)?\s+(?:is\s+)?([a-z0-9&.' -]{2,80}?)(?=,|\.|\n|\s+(?:address|at\b|in\b|invoice\b|project\b|work\b|rate\b|qty\b|quantity\b|net\b|currency\b|bank\b)|$)/i,
  ]);

  return inferred && looksLikeEntityName(inferred)
    ? makeCandidate(inferred, "medium", "inference")
    : undefined;
}

function extractClientAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "client address",
    "billing address",
    "bill to address",
    "customer address",
  ]);

  return value
    ? makeCandidate(cleanAddressValue(value), "high", "label")
    : undefined;
}

function extractClientTaxId(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, [
    "client gstin",
    "customer gstin",
    "billing gstin",
    "client tax id",
    "tax id",
    "vat no",
    "vat number",
  ]);

  if (!labeled) {
    return undefined;
  }

  const normalized = labeled.toUpperCase().replace(/\s+/g, "");
  const gstinMatch = normalized.match(GSTIN_REGEX);

  return makeCandidate(gstinMatch?.[0] ?? labeled, "high", "label");
}

function extractLineItemType(text: string): Candidate<InvoiceLineItemType> | undefined {
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
        explicitType ? "label" : "pattern"
      );
    }
  }

  return undefined;
}

function extractAgencyGstRegistrationStatus(
  text: string
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

  if (/\b(?:not gst registered|not registered under gst|unregistered under gst|gst unregistered)\b/i.test(text)) {
    return makeCandidate("not-registered", "medium", "pattern");
  }

  if (/\b(?:gst registered|registered under gst|registered for gst)\b/i.test(text)) {
    return makeCandidate("registered", "medium", "pattern");
  }

  return undefined;
}

function extractAgencyLutAvailability(
  text: string
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

function extractDeliverableDescription(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, [
    "deliverable description",
    "deliverable",
    "task description",
    "scope",
    "work description",
  ]);

  if (labeled) {
    return makeCandidate(labeled, "high", "label");
  }

  const inferred = extractPatternValue(text, [
    /\b(?:did|made|created|worked on)\s+(.+?)(?=,|\.\s|(?:\s+(?:at|@|for\b|net\b|bank\b|terms\b))|$)/i,
    /\b((?:landing page|homepage design|home page design|logo(?: design)?|editorial illustration(?: set)?|illustration(?: set)?|ui\/?\s*ux(?: design)?|banner design|banners?))\b/i,
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
    /\b(?:rate|fee|budget|quote(?:d)?|charge(?:d|s|ing)?|cost)\s*(?:is|was|of|:)?\s*((?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?)/i,
    /\b(?:at|@)\s*((?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?)/i,
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

  return undefined;
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
  const labeled = extractLabeledValue(text, ["payment terms", "terms"]);
  if (labeled) {
    return makeCandidate(labeled, "high", "label");
  }

  const netMatch = text.match(/\bnet[\s-]?\d+\b/i);
  if (netMatch?.[0]) {
    return makeCandidate(cleanValue(netMatch[0]), "high", "regex");
  }

  if (/due on receipt/i.test(text)) {
    return makeCandidate("Due on receipt", "high", "pattern");
  }

  return undefined;
}

function extractPaymentField(
  text: string,
  labels: string[]
): Candidate<string> | undefined {
  const value = extractLabeledValue(text, labels);

  return value
    ? makeCandidate(value, "high", "label")
    : undefined;
}

function extractInvoiceTotalAmount(text: string): Candidate<number> | undefined {
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
    /\b(?:total|overall total|project total|invoice total|grand total)\s*(?:amount|fee|budget|cost)?\s*(?:is|was|of|:)?\s*((?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?)/i,
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
  text: string
): Candidate<NormalizedInvoiceTaxType> | undefined {
  if (/\bcgst\b.*\bsgst\b|\bsgst\b.*\bcgst\b/i.test(text)) {
    return makeCandidate("CGST_SGST", "high", "pattern");
  }

  if (/\bigst\b/i.test(text)) {
    return makeCandidate("IGST", "high", "pattern");
  }

  if (
    /\bexport of services\b/i.test(text) ||
    /\bwithout payment of igst\b/i.test(text)
  ) {
    return makeCandidate("ZERO_RATED", "medium", "inference");
  }

  return undefined;
}

function extractInvoiceIsInternational(
  text: string,
  clientCountry?: Candidate<InvoiceFormData["client"]["clientCountry"]>,
  clientState?: Candidate<InvoiceFormData["client"]["clientState"]>,
  clientCurrency?: Candidate<InternationalCurrencyCode>
): Candidate<boolean> | undefined {
  if (
    /\binternational\b|\bforeign client\b|\boverseas\b|\bexport of services\b/i.test(
      text
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

  if (getForeignCityHint(text)) {
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
      text
    )?.[0]
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
  fallback: string
) {
  const localContext = text.slice(
    Math.max(0, matchIndex - 32),
    Math.min(text.length, matchIndex + 48)
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

  return fallback;
}

function extractHeuristicLineItems(text: string) {
  const matchers: Array<{
    pattern: RegExp;
    type: InvoiceLineItemType;
    rateUnit: InvoiceRateUnit;
    fallbackDescription: string;
  }> = [
    {
      pattern: /\b(\d+)\s+screens?\b/gi,
      type: "UI/UX",
      rateUnit: "per-screen",
      fallbackDescription: "Screens",
    },
    {
      pattern: /\b(\d+)\s+images?\b/gi,
      type: "Photography",
      rateUnit: "per-image",
      fallbackDescription: "Images",
    },
    {
      pattern: /\b(\d+)\s+reels?\b/gi,
      type: "Video Editing",
      rateUnit: "per-video",
      fallbackDescription: "Reels",
    },
    {
      pattern: /\b(\d+)\s+banners?\b/gi,
      type: "Social Media",
      rateUnit: "per-item",
      fallbackDescription: "Banners",
    },
    {
      pattern: /\b(\d+)\s+illustrations?\b/gi,
      type: "Illustration",
      rateUnit: "per-item",
      fallbackDescription: "Illustrations",
    },
    {
      pattern: /\b(\d+)\s+logos?\b/gi,
      type: "Logo Design",
      rateUnit: "per-deliverable",
      fallbackDescription: "Logo design",
    },
    {
      pattern: /\b(\d+)\s+posts?\b/gi,
      type: "Social Media",
      rateUnit: "per-post",
      fallbackDescription: "Posts",
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

      const description = buildLineItemDescriptionFromContext(
        text,
        match.index ?? 0,
        matcher.fallbackDescription
      );

      const rateText = text
        .slice(match.index ?? 0, Math.min(text.length, (match.index ?? 0) + 80))
        .match(
          /\b(?:at|@|each|per)\s*((?:(?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s*)?\d[\d,.]*(?:\.\d{1,2})?\s*(?:k|m|lakh|lac)?(?:\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))?)/i
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
  text: string
): InvoiceBriefExtractionSchema {
  const agencyAddress = extractAgencyAddress(text);
  const clientAddress = extractClientAddress(text);
  const clientCurrency = getCurrencyFromText(text);
  const agencyGstin = extractAgencyGstin(text);
  const agencyPan = extractAgencyPan(text);
  const clientGstin = extractClientTaxId(text);
  const explicitClientCountry = extractPaymentField(text, [
    "client country",
    "country",
  ]);
  const derivedClientCountry =
    explicitClientCountry?.value
      ? getCountryFromText(explicitClientCountry.value)
      : getCountryFromText(clientAddress?.value ?? text);

  const clientCountry =
    explicitClientCountry?.value && derivedClientCountry
      ? makeCandidate(derivedClientCountry, "high", "label")
      : derivedClientCountry
      ? makeCandidate(derivedClientCountry, "low", "inference")
      : undefined;

  const agencyState =
    agencyAddress?.value && getStateFromText(agencyAddress.value)
      ? makeCandidate(getStateFromText(agencyAddress.value), "medium", "inference")
      : undefined;

  const explicitClientState = extractPaymentField(text, ["client state"]);
  const clientState =
    explicitClientState?.value && getStateFromText(explicitClientState.value)
      ? makeCandidate(getStateFromText(explicitClientState.value), "high", "label")
      : clientAddress?.value && getStateFromText(clientAddress.value)
      ? makeCandidate(getStateFromText(clientAddress.value), "medium", "inference")
      : undefined;

  const explicitLocation = extractPaymentField(text, ["client location", "location"]);
  const clientLocation: InvoiceBriefExtractionSchema["clientLocation"] =
    explicitLocation?.value &&
    /international|foreign|overseas/i.test(explicitLocation.value)
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "international",
          "high",
          "label"
        )
      : explicitLocation?.value && /domestic|india/i.test(explicitLocation.value)
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "domestic",
          "high",
          "label"
        )
      : clientCountry || clientCurrency || /international client|foreign client|overseas client/i.test(text)
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "international",
          "low",
          "inference"
        )
      : clientState
      ? makeCandidate<InvoiceFormData["client"]["clientLocation"]>(
          "domestic",
          "low",
          "inference"
        )
      : undefined;
  const heuristicLineItems = extractHeuristicLineItems(text);
  const invoiceIsInternational = extractInvoiceIsInternational(
    text,
    clientCountry,
    clientState,
    clientCurrency
  );
  const invoiceTotalAmount = extractInvoiceTotalAmount(text);
  const invoiceTaxType = extractInvoiceTaxType(text);
  const paymentMode = extractPaymentMode(text);
  const timeline = extractTimeline(text);
  const primaryHeuristicLineItem = heuristicLineItems[0];

  return {
    agencyName: extractAgencyName(text),
    agencyAddress,
    agencyState,
    agencyGstRegistrationStatus: extractAgencyGstRegistrationStatus(text),
    agencyGstin,
    agencyPan,
    agencyLutAvailability: extractAgencyLutAvailability(text),
    agencyLutNumber: extractAgencyLutNumber(text),
    clientName: extractClientName(text),
    clientAddress,
    clientState,
    clientCountry,
    clientLocation,
    clientCurrency,
    clientGstin,
    invoiceIsInternational,
    invoiceCurrencyCode: clientCurrency,
    invoiceTotalAmount,
    invoiceTaxType,
    lineItems: heuristicLineItems,
    deliverableType: primaryHeuristicLineItem?.type ?? extractLineItemType(text),
    deliverableDescription:
      primaryHeuristicLineItem?.description ?? extractDeliverableDescription(text),
    qty: primaryHeuristicLineItem?.qty ?? extractQuantity(text),
    rate: primaryHeuristicLineItem?.rate ?? extractRate(text),
    rateUnit: primaryHeuristicLineItem?.rateUnit ?? extractRateUnit(text),
    licenseType: extractLicenseType(text),
    paymentTerms: extractPaymentTerms(text),
    paymentMode,
    paymentAccountName: extractPaymentField(text, [
      "beneficiary",
      "beneficiary name",
      "account name",
      "name on account",
    ]),
    paymentBankName: extractPaymentField(text, ["bank name"]),
    paymentBankAddress: extractPaymentField(text, ["bank address", "bank full address"]),
    paymentAccountNumber: extractPaymentField(text, ["account number"]),
    paymentIfscCode: (() => {
      const field = extractPaymentField(text, ["ifsc", "ifsc code"]);
      return field
        ? makeCandidate(
            field.value.toUpperCase().replace(/\s+/g, ""),
            field.confidence,
            field.source
          )
        : undefined;
    })(),
    paymentSwiftBicCode: (() => {
      const field = extractPaymentField(text, ["swift", "swift / bic code", "bic", "swift code"]);
      return field
        ? makeCandidate(
            field.value.toUpperCase().replace(/\s+/g, ""),
            field.confidence,
            field.source
          )
        : undefined;
    })(),
    paymentIbanRoutingCode: extractPaymentField(text, [
      "iban",
      "routing code",
      "routing number",
      "sort code",
    ]),
    timeline,
  };
}

function shouldApplyCandidate<T>(
  currentValue: T,
  defaultValue: T,
  candidate?: Candidate<T>
) {
  if (!candidate) return false;
  if (candidate.confidence === "low") return false;

  if (typeof currentValue === "string") {
    return (
      !currentValue.trim() ||
      currentValue === defaultValue ||
      candidate.confidence === "high"
    );
  }

  return currentValue === defaultValue || candidate.confidence === "high";
}

function recordField(
  label: string,
  confidence: BriefExtractionConfidence,
  source: BriefExtractionSource,
  filledFields: string[],
  aiFilledFields: string[],
  reviewFields: string[],
  confidentFieldSummaries: BriefAutofillFieldSummary[],
  inferredFieldSummaries: BriefAutofillFieldSummary[]
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
      createFieldSummary(label, candidate.confidence, candidate.source)
    );
    return;
  }

  if (!shouldApplyCandidate(currentValue, defaultValue, candidate)) {
    return;
  }

  assign(candidate.value);
  recordField(
    label,
    candidate.confidence,
    candidate.source,
    filledFields,
    aiFilledFields,
    reviewFields,
    confidentFieldSummaries,
    inferredFieldSummaries
  );
}

export function normalizeBriefIntake(input: BriefIntakeInput) {
  return normalizeBriefText(
    [input.text.trim(), input.voiceTranscript?.trim() ?? ""]
      .filter(Boolean)
      .join("\n\n")
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
  const applyCandidate = <T,>(args: MappingApplyCandidateArgs<T>) =>
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
      nextFormData.client.clientLocation = "international";
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
      nextFormData.client.clientLocation = "international";
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
            item.rateUnit
        );

  if (extractedLineItems.length > 0) {
    const mergedLineItems = [
      ...nextFormData.lineItems.map((item) => ({ ...item })),
    ];

    extractedLineItems.forEach((candidateItem, index) => {
      const existingItem = mergedLineItems[index] ?? {
        ...defaultLineItem,
        id: `brief-line-${index + 1}`,
      };

      applyCandidate({
        label: index === 0 ? "Deliverable type" : `Deliverable ${index + 1} type`,
        currentValue: existingItem.type,
        defaultValue: defaultLineItem.type,
        candidate: candidateItem.type,
        assign: (value) => {
          existingItem.type = value;
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
        currentValue: existingItem.description,
        defaultValue: defaultLineItem.description,
        candidate: candidateItem.description,
        assign: (value) => {
          existingItem.description = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label: index === 0 ? "Quantity" : `Deliverable ${index + 1} quantity`,
        currentValue: existingItem.qty,
        defaultValue: defaultLineItem.qty,
        candidate: candidateItem.qty,
        assign: (value) => {
          existingItem.qty = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label: index === 0 ? "Rate" : `Deliverable ${index + 1} rate`,
        currentValue: existingItem.rate,
        defaultValue: defaultLineItem.rate,
        candidate: candidateItem.rate,
        assign: (value) => {
          existingItem.rate = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      applyCandidate({
        label: index === 0 ? "Rate unit" : `Deliverable ${index + 1} rate unit`,
        currentValue: existingItem.rateUnit,
        defaultValue: defaultLineItem.rateUnit,
        candidate: candidateItem.rateUnit,
        assign: (value) => {
          existingItem.rateUnit = value;
        },
        filledFields,
        aiFilledFields,
        reviewFields,
        lowConfidenceFields,
      });

      mergedLineItems[index] = existingItem;
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
      lowConfidenceFieldSummaries
    ),
  };
}

export function runBriefAutofill(params: {
  currentFormData: InvoiceFormData;
  input: BriefIntakeInput;
  aiExtraction?: AiBriefExtraction | null;
}): BriefAutofillResult {
  const normalizedText = normalizeBriefIntake(params.input);
  const heuristicExtraction = extractInvoiceBriefSchema(normalizedText);
  const aiExtraction = params.aiExtraction
    ? normalizeExtractedData(params.aiExtraction, normalizedText)
    : null;
  const extraction = mergeBriefExtractions({
    aiExtraction,
    heuristicExtraction,
  });
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
