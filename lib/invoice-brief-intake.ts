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

type Confidence = "high" | "medium";

type Candidate<T> = {
  value: T;
  confidence: Confidence;
};

type InvoiceBriefCandidates = {
  agencyName?: Candidate<string>;
  agencyAddress?: Candidate<string>;
  agencyState?: Candidate<InvoiceFormData["agency"]["agencyState"]>;
  clientName?: Candidate<string>;
  clientAddress?: Candidate<string>;
  clientState?: Candidate<InvoiceFormData["client"]["clientState"]>;
  clientCountry?: Candidate<InvoiceFormData["client"]["clientCountry"]>;
  clientLocation?: Candidate<InvoiceFormData["client"]["clientLocation"]>;
  clientCurrency?: Candidate<InternationalCurrencyCode>;
  deliverableType?: Candidate<InvoiceLineItemType>;
  deliverableDescription?: Candidate<string>;
  qty?: Candidate<number>;
  rate?: Candidate<number>;
  rateUnit?: Candidate<InvoiceRateUnit>;
  licenseType?: Candidate<LicenseType>;
  paymentTerms?: Candidate<string>;
  paymentAccountName?: Candidate<string>;
  paymentBankName?: Candidate<string>;
  paymentBankAddress?: Candidate<string>;
  paymentAccountNumber?: Candidate<string>;
  paymentIfscCode?: Candidate<string>;
  paymentSwiftBicCode?: Candidate<string>;
  paymentIbanRoutingCode?: Candidate<string>;
};

export type BriefIntakeInput = {
  text: string;
  imageFiles?: Array<{ name: string }>;
  voiceTranscript?: string;
};

export type BriefAutofillResult = {
  normalizedText: string;
  candidates: InvoiceBriefCandidates;
  nextFormData: InvoiceFormData;
  filledFields: string[];
  uncertainFields: string[];
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

function getCurrencyFromText(text: string): Candidate<InternationalCurrencyCode> | undefined {
  const labelMatches = currencyMatchers.filter((matcher) =>
    matcher.labelPatterns.some((pattern) => pattern.test(text))
  );

  if (labelMatches.length === 1) {
    return {
      value: labelMatches[0].code,
      confidence: "high",
    };
  }

  const fallbackMatches = currencyMatchers.filter((matcher) =>
    matcher.fallbackPatterns.some((pattern) => pattern.test(text))
  );

  if (fallbackMatches.length === 1) {
    return {
      value: fallbackMatches[0].code,
      confidence: "medium",
    };
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

  return value ? { value, confidence: "high" } : undefined;
}

function extractAgencyAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "agency address",
    "business address",
    "from address",
  ]);

  return value ? { value, confidence: "high" } : undefined;
}

function extractClientName(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "client name",
    "client",
    "bill to",
    "customer name",
  ]);

  return value ? { value, confidence: "high" } : undefined;
}

function extractClientAddress(text: string): Candidate<string> | undefined {
  const value = extractLabeledValue(text, [
    "client address",
    "billing address",
    "bill to address",
    "customer address",
  ]);

  return value ? { value, confidence: "high" } : undefined;
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
      return {
        value: matcher.type,
        confidence: explicitType ? "high" : "medium",
      };
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
    return {
      value: labeled,
      confidence: "high",
    };
  }

  const sentenceMatch = text.match(
    /\bfor\s+(.+?)\s+(?:at|@)\s*(?:₹|rs\.?|inr|\d)/i
  );

  if (sentenceMatch?.[1]) {
    return {
      value: cleanValue(sentenceMatch[1]),
      confidence: "medium",
    };
  }

  return undefined;
}

function extractQuantity(text: string): Candidate<number> | undefined {
  const explicit = extractLabeledValue(text, ["qty", "quantity", "units"]);
  if (explicit) {
    const qty = Number(explicit.replace(/[^0-9]/g, ""));

    if (Number.isFinite(qty) && qty > 0) {
      return {
        value: qty,
        confidence: "high",
      };
    }
  }

  for (const hint of quantityUnitHints) {
    const match = text.match(hint.pattern);
    const qty = Number(match?.[1]);

    if (Number.isFinite(qty) && qty > 0) {
      return {
        value: qty,
        confidence: "medium",
      };
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
      return {
        value: rate,
        confidence: "high",
      };
    }
  }

  const fallbackMatch = text.match(
    /\b(?:at|@)\s*(₹\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*(?:inr|rupees?))/i
  );

  if (fallbackMatch?.[1]) {
    const rate = parseAmount(fallbackMatch[1]);
    if (rate > 0) {
      return {
        value: rate,
        confidence: "medium",
      };
    }
  }

  return undefined;
}

function extractRateUnit(text: string): Candidate<InvoiceRateUnit> | undefined {
  for (const matcher of rateUnitMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(text))) {
      return {
        value: matcher.unit,
        confidence: "high",
      };
    }
  }

  for (const hint of quantityUnitHints) {
    if (hint.pattern.test(text)) {
      return {
        value: hint.unit,
        confidence: "medium",
      };
    }
  }

  return undefined;
}

function extractLicenseType(text: string): Candidate<LicenseType> | undefined {
  if (/full assignment/i.test(text)) {
    return { value: "full-assignment", confidence: "high" };
  }

  if (/exclusive license/i.test(text)) {
    return { value: "exclusive-license", confidence: "high" };
  }

  if (/non[-\s]?exclusive license/i.test(text)) {
    return { value: "non-exclusive-license", confidence: "high" };
  }

  return undefined;
}

function extractPaymentTerms(text: string): Candidate<string> | undefined {
  const labeled = extractLabeledValue(text, ["payment terms", "terms"]);
  if (labeled) {
    return {
      value: labeled,
      confidence: "high",
    };
  }

  const netMatch = text.match(/\bnet[\s-]?\d+\b/i);
  if (netMatch?.[0]) {
    return {
      value: cleanValue(netMatch[0]),
      confidence: "high",
    };
  }

  if (/due on receipt/i.test(text)) {
    return {
      value: "Due on receipt",
      confidence: "high",
    };
  }

  return undefined;
}

function extractPaymentField(
  text: string,
  labels: string[]
): Candidate<string> | undefined {
  const value = extractLabeledValue(text, labels);

  return value
    ? {
        value,
        confidence: "high",
      }
    : undefined;
}

function extractInvoiceBriefCandidates(text: string): InvoiceBriefCandidates {
  const agencyAddress = extractAgencyAddress(text);
  const clientAddress = extractClientAddress(text);
  const clientCurrency = getCurrencyFromText(text);
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
      ? {
          value: derivedClientCountry,
          confidence: "high" as const,
        }
      : derivedClientCountry
      ? {
          value: derivedClientCountry,
          confidence: "medium" as const,
        }
      : undefined;

  const agencyState =
    agencyAddress?.value && getStateFromText(agencyAddress.value)
      ? {
          value: getStateFromText(agencyAddress.value),
          confidence: "medium" as const,
        }
      : undefined;

  const explicitClientState = extractPaymentField(text, ["client state"]);
  const clientState =
    explicitClientState?.value && getStateFromText(explicitClientState.value)
      ? {
          value: getStateFromText(explicitClientState.value),
          confidence: "high" as const,
        }
      : clientAddress?.value && getStateFromText(clientAddress.value)
      ? {
          value: getStateFromText(clientAddress.value),
          confidence: "medium" as const,
        }
      : undefined;

  const explicitLocation = extractPaymentField(text, ["client location", "location"]);
  const clientLocation =
    explicitLocation?.value &&
    /international|foreign|overseas/i.test(explicitLocation.value)
      ? {
          value: "international" as const,
          confidence: "high" as const,
        }
      : explicitLocation?.value && /domestic|india/i.test(explicitLocation.value)
      ? {
          value: "domestic" as const,
          confidence: "high" as const,
        }
      : clientCountry || clientCurrency || /international client|foreign client|overseas client/i.test(text)
      ? {
          value: "international" as const,
          confidence: "medium" as const,
        }
      : clientState
      ? {
          value: "domestic" as const,
          confidence: "medium" as const,
        }
      : undefined;

  return {
    agencyName: extractAgencyName(text),
    agencyAddress,
    agencyState,
    clientName: extractClientName(text),
    clientAddress,
    clientState,
    clientCountry,
    clientLocation,
    clientCurrency,
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
        ? {
            value: field.value.toUpperCase().replace(/\s+/g, ""),
            confidence: field.confidence,
          }
        : undefined;
    })(),
    paymentSwiftBicCode: (() => {
      const field = extractPaymentField(text, ["swift", "swift / bic code", "bic", "swift code"]);
      return field
        ? {
            value: field.value.toUpperCase().replace(/\s+/g, ""),
            confidence: field.confidence,
          }
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

  if (typeof currentValue === "string") {
    return !currentValue.trim() || currentValue === defaultValue;
  }

  return currentValue === defaultValue;
}

function recordField(
  label: string,
  confidence: Confidence,
  filledFields: string[],
  uncertainFields: string[]
) {
  filledFields.push(label);
  if (confidence === "medium") {
    uncertainFields.push(label);
  }
}

function applyCandidate<T>({
  label,
  currentValue,
  defaultValue,
  candidate,
  assign,
  filledFields,
  uncertainFields,
}: {
  label: string;
  currentValue: T;
  defaultValue: T;
  candidate?: Candidate<T>;
  assign: (value: T) => void;
  filledFields: string[];
  uncertainFields: string[];
}) {
  if (!shouldApplyCandidate(currentValue, defaultValue, candidate)) {
    return;
  }

  if (!candidate) {
    return;
  }

  assign(candidate.value);
  recordField(label, candidate.confidence, filledFields, uncertainFields);
}

export function normalizeBriefIntake(input: BriefIntakeInput) {
  return [input.text.trim(), input.voiceTranscript?.trim() ?? ""]
    .filter(Boolean)
    .join("\n\n");
}

export function runBriefAutofill(params: {
  currentFormData: InvoiceFormData;
  input: BriefIntakeInput;
}): BriefAutofillResult {
  const normalizedText = normalizeBriefIntake(params.input);
  const candidates = extractInvoiceBriefCandidates(normalizedText);
  const nextFormData = mergeInvoiceFormData(params.currentFormData);
  const filledFields: string[] = [];
  const uncertainFields: string[] = [];

  applyCandidate({
    label: "Agency name",
    currentValue: nextFormData.agency.agencyName,
    defaultValue: defaultInvoiceFormData.agency.agencyName,
    candidate: candidates.agencyName,
    assign: (value) => {
      nextFormData.agency.agencyName = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Agency address",
    currentValue: nextFormData.agency.address,
    defaultValue: defaultInvoiceFormData.agency.address,
    candidate: candidates.agencyAddress,
    assign: (value) => {
      nextFormData.agency.address = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Agency state",
    currentValue: nextFormData.agency.agencyState,
    defaultValue: defaultInvoiceFormData.agency.agencyState,
    candidate: candidates.agencyState,
    assign: (value) => {
      nextFormData.agency.agencyState = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Client name",
    currentValue: nextFormData.client.clientName,
    defaultValue: defaultInvoiceFormData.client.clientName,
    candidate: candidates.clientName,
    assign: (value) => {
      nextFormData.client.clientName = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Client address",
    currentValue: nextFormData.client.clientAddress,
    defaultValue: defaultInvoiceFormData.client.clientAddress,
    candidate: candidates.clientAddress,
    assign: (value) => {
      nextFormData.client.clientAddress = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Client location",
    currentValue: nextFormData.client.clientLocation,
    defaultValue: defaultInvoiceFormData.client.clientLocation,
    candidate: candidates.clientLocation,
    assign: (value) => {
      nextFormData.client.clientLocation = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Client state",
    currentValue: nextFormData.client.clientState,
    defaultValue: defaultInvoiceFormData.client.clientState,
    candidate: candidates.clientState,
    assign: (value) => {
      nextFormData.client.clientState = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Client country",
    currentValue: nextFormData.client.clientCountry,
    defaultValue: defaultInvoiceFormData.client.clientCountry,
    candidate: candidates.clientCountry,
    assign: (value) => {
      nextFormData.client.clientCountry = value;
      nextFormData.client.clientLocation = "international";
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Invoice currency",
    currentValue: nextFormData.client.clientCurrency,
    defaultValue: defaultInvoiceFormData.client.clientCurrency,
    candidate: candidates.clientCurrency,
    assign: (value) => {
      nextFormData.client.clientCurrency = value;
      nextFormData.client.clientLocation = "international";
    },
    filledFields,
    uncertainFields,
  });

  const firstLineItem = nextFormData.lineItems[0] ?? {
    ...defaultLineItem,
  };

  applyCandidate({
    label: "Deliverable type",
    currentValue: firstLineItem.type,
    defaultValue: defaultLineItem.type,
    candidate: candidates.deliverableType,
    assign: (value) => {
      firstLineItem.type = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Deliverable description",
    currentValue: firstLineItem.description,
    defaultValue: defaultLineItem.description,
    candidate: candidates.deliverableDescription,
    assign: (value) => {
      firstLineItem.description = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Quantity",
    currentValue: firstLineItem.qty,
    defaultValue: defaultLineItem.qty,
    candidate: candidates.qty,
    assign: (value) => {
      firstLineItem.qty = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Rate",
    currentValue: firstLineItem.rate,
    defaultValue: defaultLineItem.rate,
    candidate: candidates.rate,
    assign: (value) => {
      firstLineItem.rate = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Rate unit",
    currentValue: firstLineItem.rateUnit,
    defaultValue: defaultLineItem.rateUnit,
    candidate: candidates.rateUnit,
    assign: (value) => {
      firstLineItem.rateUnit = value;
    },
    filledFields,
    uncertainFields,
  });

  nextFormData.lineItems[0] = firstLineItem;

  applyCandidate({
    label: "License type",
    currentValue: nextFormData.payment.license.licenseType,
    defaultValue: defaultInvoiceFormData.payment.license.licenseType,
    candidate: candidates.licenseType,
    assign: (value) => {
      nextFormData.payment.license.isLicenseIncluded = true;
      nextFormData.payment.license.licenseType = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Payment terms",
    currentValue: nextFormData.meta.paymentTerms,
    defaultValue: defaultInvoiceFormData.meta.paymentTerms,
    candidate: candidates.paymentTerms,
    assign: (value) => {
      nextFormData.meta.paymentTerms = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Beneficiary / account name",
    currentValue: nextFormData.payment.accountName,
    defaultValue: defaultInvoiceFormData.payment.accountName,
    candidate: candidates.paymentAccountName,
    assign: (value) => {
      nextFormData.payment.accountName = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Bank name",
    currentValue: nextFormData.payment.bankName,
    defaultValue: defaultInvoiceFormData.payment.bankName,
    candidate: candidates.paymentBankName,
    assign: (value) => {
      nextFormData.payment.bankName = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Bank address",
    currentValue: nextFormData.payment.bankAddress,
    defaultValue: defaultInvoiceFormData.payment.bankAddress,
    candidate: candidates.paymentBankAddress,
    assign: (value) => {
      nextFormData.payment.bankAddress = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "Account number",
    currentValue: nextFormData.payment.accountNumber,
    defaultValue: defaultInvoiceFormData.payment.accountNumber,
    candidate: candidates.paymentAccountNumber,
    assign: (value) => {
      nextFormData.payment.accountNumber = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "IFSC code",
    currentValue: nextFormData.payment.ifscCode,
    defaultValue: defaultInvoiceFormData.payment.ifscCode,
    candidate: candidates.paymentIfscCode,
    assign: (value) => {
      nextFormData.payment.ifscCode = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "SWIFT / BIC code",
    currentValue: nextFormData.payment.swiftBicCode,
    defaultValue: defaultInvoiceFormData.payment.swiftBicCode,
    candidate: candidates.paymentSwiftBicCode,
    assign: (value) => {
      nextFormData.payment.swiftBicCode = value;
    },
    filledFields,
    uncertainFields,
  });

  applyCandidate({
    label: "IBAN / routing code",
    currentValue: nextFormData.payment.ibanRoutingCode,
    defaultValue: defaultInvoiceFormData.payment.ibanRoutingCode,
    candidate: candidates.paymentIbanRoutingCode,
    assign: (value) => {
      nextFormData.payment.ibanRoutingCode = value;
    },
    filledFields,
    uncertainFields,
  });

  return {
    normalizedText,
    candidates,
    nextFormData,
    filledFields: [...new Set(filledFields)],
    uncertainFields: [...new Set(uncertainFields)],
    hasImageAttachments: Boolean(params.input.imageFiles?.length),
    hasVoiceTranscript: Boolean(params.input.voiceTranscript?.trim()),
  };
}
