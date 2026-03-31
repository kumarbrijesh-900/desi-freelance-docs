import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  type InternationalCurrencyCode,
} from "@/lib/international-billing-options";
import {
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceLineItemType,
  type InvoiceRateUnit,
  type LicenseType,
} from "@/types/invoice";

export type BriefExtractionConfidence = "high" | "medium" | "low";

export type BriefExtractionSource = "label" | "regex" | "pattern" | "inference";

export type BriefExtractedField<T> = {
  value: T;
  confidence: BriefExtractionConfidence;
  source: BriefExtractionSource;
};

type Candidate<T> = BriefExtractedField<T>;

export type InvoiceBriefExtractionSchema = {
  agencyName?: BriefExtractedField<string>;
  agencyAddress?: BriefExtractedField<string>;
  agencyState?: BriefExtractedField<InvoiceFormData["agency"]["agencyState"]>;
  agencyGstin?: BriefExtractedField<string>;
  agencyPan?: BriefExtractedField<string>;
  clientName?: BriefExtractedField<string>;
  clientAddress?: BriefExtractedField<string>;
  clientState?: BriefExtractedField<InvoiceFormData["client"]["clientState"]>;
  clientCountry?: BriefExtractedField<InvoiceFormData["client"]["clientCountry"]>;
  clientLocation?: BriefExtractedField<InvoiceFormData["client"]["clientLocation"]>;
  clientCurrency?: BriefExtractedField<InternationalCurrencyCode>;
  clientGstin?: BriefExtractedField<string>;
  deliverableType?: BriefExtractedField<InvoiceLineItemType>;
  deliverableDescription?: BriefExtractedField<string>;
  qty?: BriefExtractedField<number>;
  rate?: BriefExtractedField<number>;
  rateUnit?: BriefExtractedField<InvoiceRateUnit>;
  licenseType?: BriefExtractedField<LicenseType>;
  paymentTerms?: BriefExtractedField<string>;
  paymentAccountName?: BriefExtractedField<string>;
  paymentBankName?: BriefExtractedField<string>;
  paymentBankAddress?: BriefExtractedField<string>;
  paymentAccountNumber?: BriefExtractedField<string>;
  paymentIfscCode?: BriefExtractedField<string>;
  paymentSwiftBicCode?: BriefExtractedField<string>;
  paymentIbanRoutingCode?: BriefExtractedField<string>;
};

export type BriefAutofillMappingResult = {
  nextFormData: InvoiceFormData;
  filledFields: string[];
  reviewFields: string[];
  lowConfidenceFields: string[];
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
  reviewFields: string[];
  lowConfidenceFields: string[];
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

function cleanValue(value?: string) {
  return (value ?? "")
    .replace(/^[\s\-*•]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .trim();
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
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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

function getStateFromText(
  text: string
): InvoiceFormData["agency"]["agencyState"] {
  const normalized = text.toLowerCase();

  return (
    INDIA_STATE_OPTIONS.find((stateName) =>
      normalized.includes(stateName.toLowerCase())
    ) ?? ""
  );
}

function getCountryFromText(
  text: string
): InvoiceFormData["client"]["clientCountry"] {
  const normalized = text.toLowerCase();

  return (
    INTERNATIONAL_COUNTRY_OPTIONS.find((countryName) =>
      normalized.includes(countryName.toLowerCase())
    ) ?? ""
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

  return value ? makeCandidate(value, "high", "label") : undefined;
}

function extractAgencyAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "agency address",
    "business address",
    "from address",
  ]);

  return value ? makeCandidate(value, "high", "label") : undefined;
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

  return value ? makeCandidate(value, "high", "label") : undefined;
}

function extractClientAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "client address",
    "billing address",
    "bill to address",
    "customer address",
  ]);

  return value ? makeCandidate(value, "high", "label") : undefined;
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

  const sentenceMatch = text.match(
    /\bfor\s+(.+?)\s+(?:at|@)\s*(?:₹|rs\.?|inr|\d)/i
  );

  if (sentenceMatch?.[1]) {
    return makeCandidate(cleanValue(sentenceMatch[1]), "low", "inference");
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

  const fallbackMatch = text.match(
    /\b(?:at|@)\s*((?:₹|rs\.?|inr|rupees?|US\$|A\$|C\$|S\$|\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*(?:inr|rupees?|usd|eur|gbp|aed|aud|cad|sgd))/i
  );

  if (fallbackMatch?.[1]) {
    const rate = parseAmount(fallbackMatch[1]);
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

  return {
    agencyName: extractAgencyName(text),
    agencyAddress,
    agencyState,
    agencyGstin,
    agencyPan,
    clientName: extractClientName(text),
    clientAddress,
    clientState,
    clientCountry,
    clientLocation,
    clientCurrency,
    clientGstin,
    deliverableType: extractLineItemType(text),
    deliverableDescription: extractDeliverableDescription(text),
    qty: extractQuantity(text),
    rate: extractRate(text),
    rateUnit: extractRateUnit(text),
    licenseType: extractLicenseType(text),
    paymentTerms: extractPaymentTerms(text),
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
    return !currentValue.trim() || currentValue === defaultValue;
  }

  return currentValue === defaultValue;
}

function recordField(
  label: string,
  confidence: BriefExtractionConfidence,
  filledFields: string[],
  reviewFields: string[]
) {
  filledFields.push(label);
  if (confidence === "medium") {
    reviewFields.push(label);
  }
}

function applyCandidate<T>({
  label,
  currentValue,
  defaultValue,
  candidate,
  assign,
  filledFields,
  reviewFields,
  lowConfidenceFields,
}: {
  label: string;
  currentValue: T;
  defaultValue: T;
  candidate?: Candidate<T>;
  assign: (value: T) => void;
  filledFields: string[];
  reviewFields: string[];
  lowConfidenceFields: string[];
}) {
  if (!candidate) {
    return;
  }

  if (candidate.confidence === "low") {
    lowConfidenceFields.push(label);
    return;
  }

  if (!shouldApplyCandidate(currentValue, defaultValue, candidate)) {
    return;
  }

  assign(candidate.value);
  recordField(label, candidate.confidence, filledFields, reviewFields);
}

export function normalizeBriefIntake(input: BriefIntakeInput) {
  return [input.text.trim(), input.voiceTranscript?.trim() ?? ""]
    .filter(Boolean)
    .join("\n\n");
}

export function mapBriefExtractionToInvoiceForm(params: {
  currentFormData: InvoiceFormData;
  extraction: InvoiceBriefExtractionSchema;
}): BriefAutofillMappingResult {
  const nextFormData = mergeInvoiceFormData(params.currentFormData);
  const filledFields: string[] = [];
  const reviewFields: string[] = [];
  const lowConfidenceFields: string[] = [];
  const { extraction } = params;

  applyCandidate({
    label: "Agency name",
    currentValue: nextFormData.agency.agencyName,
    defaultValue: defaultInvoiceFormData.agency.agencyName,
    candidate: extraction.agencyName,
    assign: (value) => {
      nextFormData.agency.agencyName = value;
    },
    filledFields,
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
    reviewFields,
    lowConfidenceFields,
  });

  const firstLineItem = nextFormData.lineItems[0] ?? {
    ...defaultLineItem,
  };

  applyCandidate({
    label: "Deliverable type",
    currentValue: firstLineItem.type,
    defaultValue: defaultLineItem.type,
    candidate: extraction.deliverableType,
    assign: (value) => {
      firstLineItem.type = value;
    },
    filledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Deliverable description",
    currentValue: firstLineItem.description,
    defaultValue: defaultLineItem.description,
    candidate: extraction.deliverableDescription,
    assign: (value) => {
      firstLineItem.description = value;
    },
    filledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Quantity",
    currentValue: firstLineItem.qty,
    defaultValue: defaultLineItem.qty,
    candidate: extraction.qty,
    assign: (value) => {
      firstLineItem.qty = value;
    },
    filledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Rate",
    currentValue: firstLineItem.rate,
    defaultValue: defaultLineItem.rate,
    candidate: extraction.rate,
    assign: (value) => {
      firstLineItem.rate = value;
    },
    filledFields,
    reviewFields,
    lowConfidenceFields,
  });

  applyCandidate({
    label: "Rate unit",
    currentValue: firstLineItem.rateUnit,
    defaultValue: defaultLineItem.rateUnit,
    candidate: extraction.rateUnit,
    assign: (value) => {
      firstLineItem.rateUnit = value;
    },
    filledFields,
    reviewFields,
    lowConfidenceFields,
  });

  nextFormData.lineItems[0] = firstLineItem;

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
    reviewFields,
    lowConfidenceFields,
  });

  return {
    nextFormData,
    filledFields: [...new Set(filledFields)],
    reviewFields: [...new Set(reviewFields)],
    lowConfidenceFields: [...new Set(lowConfidenceFields)],
  };
}

export function runBriefAutofill(params: {
  currentFormData: InvoiceFormData;
  input: BriefIntakeInput;
}): BriefAutofillResult {
  const normalizedText = normalizeBriefIntake(params.input);
  const extraction = extractInvoiceBriefSchema(normalizedText);
  const mapping = mapBriefExtractionToInvoiceForm({
    currentFormData: params.currentFormData,
    extraction,
  });

  return {
    normalizedText,
    extraction,
    nextFormData: mapping.nextFormData,
    filledFields: mapping.filledFields,
    reviewFields: mapping.reviewFields,
    lowConfidenceFields: mapping.lowConfidenceFields,
    hasImageAttachments: Boolean(params.input.imageFiles?.length),
    hasVoiceTranscript: Boolean(params.input.voiceTranscript?.trim()),
  };
}
