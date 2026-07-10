import type {
  Confidence,
  NormalizedExtraction,
  NormalizedLineItem,
  NormalizedMilestone,
  NormalizedParserBundle,
  PostProcessResult,
} from "./types.ts";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const SAC_REGEX = /^\d{6}$/;
const PLACEHOLDER_REGEX =
  /\b(?:unknown|unclear|not sure|to be confirmed|tbd|n\/a|placeholder|sample|dummy|example)\b/i;
const PLACEHOLDER_EMAIL_REGEX = /^(?:billing|finance|accounts?|hello|test|client)@client\./i;
const TEAM_ALIAS_REGEX =
  /\b(?:finance|billing|accounts?|payables?|ap|procurement|admin)\s+(?:team|dept|department|desk|office)\b/i;

const typeToSac: Record<string, string> = {
  "Logo Design": "998391",
  "Branding & Identity": "998391",
  "Graphic Design": "998391",
  Illustration: "999632",
  "UI/UX Design": "998314",
  Animation: "999612",
  "Motion Graphics": "999612",
  Photography: "998387",
  Videography: "998387",
  "Video Editing": "999613",
  "Social Media Content": "998361",
  "Packaging Design": "998391",
  "Print Design": "998391",
  "Infographics & Presentation Design": "998391",
  "UI/UX": "998314",
  "Social Media": "998361",
};

const typeAliases: Array<[RegExp, string]> = [
  [/\blogos?\b|\bwordmark\b|\bbrand mark\b/i, "Logo Design"],
  [/\bbrand(?:ing)?\b|\bidentity\b|\bbrand book\b/i, "Branding & Identity"],
  [/\bgraphic\b|\bbrochure\b|\bposter\b|\bbanner\b/i, "Graphic Design"],
  [/\billustration\b|\bcharacter\b|\bconcept art\b/i, "Illustration"],
  [/\bui\b|\bux\b|\blanding page\b|\bwireframe\b|\bdashboard\b/i, "UI/UX Design"],
  [/\banimation\b|\banimated\b|\bexplainer video\b/i, "Animation"],
  [/\bmotion graphics\b|\bkinetic\b|\blower third\b/i, "Motion Graphics"],
  [/\bphotography\b|\bphotos?\b|\bshoot\b/i, "Photography"],
  [/\bvideography\b|\bvideo shoot\b|\bdrone\b/i, "Videography"],
  [/\bvideo editing\b|\breels?\b|\bshorts?\b|\bsubtitles?\b/i, "Video Editing"],
  [/\bsocial media\b|\bcarousel\b|\bposts?\b|\bstories\b/i, "Social Media Content"],
  [/\bpackag(?:e|ing)\b|\blabel\b/i, "Packaging Design"],
  [/\bprint\b|\bpre-press\b|\bpress\b/i, "Print Design"],
  [/\binfographic\b|\bpitch deck\b|\bpresentation\b/i, "Infographics & Presentation Design"],
];

const stateAliases: Record<string, string> = {
  bangalore: "Karnataka",
  bengaluru: "Karnataka",
  karnataka: "Karnataka",
  mumbai: "Maharashtra",
  maharashtra: "Maharashtra",
  delhi: "Delhi",
  "new delhi": "Delhi",
  tamilnadu: "Tamil Nadu",
  "tamil nadu": "Tamil Nadu",
  telangana: "Telangana",
  hyderabad: "Telangana",
  gujarat: "Gujarat",
  rajasthan: "Rajasthan",
  kerala: "Kerala",
  goa: "Goa",
  chandigarh: "Chandigarh",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanEntityName(value: unknown) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return null;
  }

  if (
    PLACEHOLDER_REGEX.test(cleaned) ||
    TEAM_ALIAS_REGEX.test(cleaned) ||
    /^(?:not|yes|no|gst|gst registered|registered under gst|not registered)$/i.test(cleaned) ||
    /\b(?:gstin|pan|lut|payment terms?|invoice date|due date)\b/i.test(cleaned)
  ) {
    return null;
  }

  return cleaned;
}

function cleanEmail(value: unknown) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return null;
  }

  if (
    PLACEHOLDER_REGEX.test(cleaned) ||
    PLACEHOLDER_EMAIL_REGEX.test(cleaned) ||
    /^[^@\s]+@(?:example|test|invalid|localhost)\./i.test(cleaned)
  ) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null;
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/,/g, "");
    if (!trimmed) {
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function fieldConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "low";
}

function overallConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeState(value: unknown) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return null;
  }

  return stateAliases[cleaned.toLowerCase()] ?? cleaned;
}

function normalizeGstin(value: unknown, warnings: string[]) {
  const cleaned = cleanString(value)?.toUpperCase() ?? null;

  if (!cleaned) {
    return null;
  }

  if (!GSTIN_REGEX.test(cleaned)) {
    warnings.push("GSTIN was present but did not match the standard format.");
    return cleaned;
  }

  return cleaned;
}

function normalizeClientTaxId(params: {
  value: unknown;
  agencyGstin: string | null;
  agencyPan: string | null;
  clientLocation: "domestic" | "international" | null;
  warnings: string[];
}) {
  const cleaned = cleanString(params.value)?.toUpperCase() ?? null;

  if (!cleaned || PLACEHOLDER_REGEX.test(cleaned)) {
    return null;
  }

  if (PAN_REGEX.test(cleaned)) {
    params.warnings.push("Ignored PAN-shaped value in client GSTIN / tax ID.");
    return null;
  }

  if (
    cleaned === params.agencyGstin ||
    (params.agencyPan && cleaned === params.agencyPan)
  ) {
    params.warnings.push("Ignored agency identifier in client tax field.");
    return null;
  }

  if (params.clientLocation === "domestic" && !GSTIN_REGEX.test(cleaned)) {
    params.warnings.push("Client domestic tax ID was present but not a GSTIN.");
    return null;
  }

  return cleaned;
}

function normalizeDate(value: unknown, warnings: string[]) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    warnings.push(`Could not normalize date "${cleaned}".`);
    return cleaned;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeType(value: unknown, description?: string | null) {
  const cleaned = cleanString(value);
  const searchable = `${cleaned ?? ""} ${description ?? ""}`.trim();

  if (!searchable) {
    return null;
  }

  if (typeToSac[cleaned ?? ""] || cleaned === "Other") {
    return cleaned;
  }

  for (const [pattern, type] of typeAliases) {
    if (pattern.test(searchable)) {
      return type;
    }
  }

  return "Other";
}

function normalizeLineItem(
  value: unknown,
  warnings: string[]
): NormalizedLineItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const description = cleanString(value.description);
  const type = normalizeType(value.type, description);
  const rawSac = cleanString(value.sacCode);
  const mappedSac = type && type !== "Other" ? typeToSac[type] ?? null : null;
  const sacCode = mappedSac ?? (rawSac && SAC_REGEX.test(rawSac) ? rawSac : null);

  if (rawSac && !SAC_REGEX.test(rawSac)) {
    warnings.push(`Ignored invalid SAC "${rawSac}" from model output.`);
  } else if (rawSac && mappedSac && rawSac !== mappedSac) {
    warnings.push(`Replaced model SAC "${rawSac}" with canonical SAC "${mappedSac}" for ${type}.`);
  }

  return {
    type,
    description,
    quantity: cleanNumber(value.quantity),
    rate: cleanNumber(value.rate),
    unit: cleanString(value.unit),
    sacCode,
  };
}

function normalizeMilestone(
  value: unknown,
  warnings: string[]
): NormalizedMilestone | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = cleanString(value.title);
  const percent = cleanNumber(value.percent);
  const amount = cleanNumber(value.amount);
  const condition = cleanString(value.condition);
  const date = normalizeDate(value.date, warnings);

  if (!title && percent === null && amount === null && !condition) {
    return null;
  }

  return { title, percent, amount, condition, date };
}

function normalizeTreatment(value: unknown) {
  if (
    value === "CGST_SGST" ||
    value === "IGST" ||
    value === "ZERO_RATED" ||
    value === "NONE"
  ) {
    return value;
  }

  if (value === "ZERO") {
    return "ZERO_RATED";
  }

  return null;
}

function hasInternationalHint(text: string) {
  return /\b(export|international|foreign|usd|eur|gbp|aed|london|new york|singapore|dubai|usa|uk|europe)\b/i.test(
    text
  );
}

function hasDomesticHint(text: string) {
  return /\b(gstin|igst|cgst|sgst|india|indian|karnataka|maharashtra|delhi|bengaluru|bangalore|mumbai)\b/i.test(
    text
  );
}

function detectHardAmbiguity(
  bundle: NormalizedParserBundle,
  extraction: NormalizedExtraction
) {
  const inputContradiction =
    Boolean(bundle.briefText && bundle.ocrText) &&
    hasInternationalHint(bundle.briefText) !== hasInternationalHint(bundle.ocrText) &&
    hasDomesticHint(bundle.briefText) !== hasDomesticHint(bundle.ocrText);
  const multipleClients = (
    bundle.combinedText.match(/\b(client|bill to|invoice for)\b/gi) ?? []
  ).length > 2;
  const sezVague =
    extraction.taxHints.sezMentioned === true &&
    extraction.client.isSezUnit === null;
  const taxAmbiguous = Boolean(extraction.taxHints.ambiguity);

  return inputContradiction || multipleClients || sezVague || taxAmbiguous;
}

function collectMissingFields(extraction: NormalizedExtraction) {
  const missing: string[] = [];

  if (!extraction.client.name) missing.push("client.name");
  if (extraction.deliverables.length === 0) missing.push("deliverables");

  extraction.deliverables.forEach((item, index) => {
    if (!item.description) missing.push(`deliverables.${index}.description`);
    if (!item.rate) missing.push(`deliverables.${index}.rate`);
    if (item.type === "Other" && !item.sacCode) {
      missing.push(`deliverables.${index}.sacCode`);
    }
  });

  if (
    extraction.client.location === "domestic" &&
    extraction.taxHints.sezMentioned === true &&
    extraction.client.isSezUnit === null
  ) {
    missing.push("client.isSezUnit");
  }

  if (
    !extraction.meta.currency &&
    extraction.client.location === "international" &&
    (extraction.meta.totalAmount !== null ||
      extraction.deliverables.some((item) => item.rate !== null))
  ) {
    missing.push("meta.currency");
  }

  if (
    extraction.taxHints.treatment === "ZERO_RATED" &&
    extraction.taxHints.lutMentioned !== true
  ) {
    missing.push("taxHints.lutStatus");
  }

  return missing;
}

function hasDeliverableSignal(item: NormalizedLineItem) {
  return Boolean(item.type || item.description || item.quantity || item.rate);
}

function hasUsableCoreExtraction(extraction: NormalizedExtraction) {
  return (
    Boolean(extraction.client.name) &&
    extraction.deliverables.some(hasDeliverableSignal)
  );
}

function hasStrongPartialExtraction(extraction: NormalizedExtraction) {
  return (
    Boolean(extraction.client.name) ||
    extraction.deliverables.some(hasDeliverableSignal)
  );
}

function hasStructuralGap(result: PostProcessResult) {
  return (
    !hasStrongPartialExtraction(result.extraction) ||
    result.missingFields.includes("deliverables")
  );
}

function buildClarifications(missingFields: string[], hardAmbiguity: boolean) {
  const questions: string[] = [];

  if (missingFields.includes("client.name")) {
    questions.push("Who should this invoice be billed to?");
  }

  if (missingFields.includes("deliverables")) {
    questions.push("What deliverables should be listed on the invoice?");
  }

  if (missingFields.some((field) => field.endsWith(".rate"))) {
    questions.push("What rate or total price should be used for the deliverables?");
  }

  if (missingFields.some((field) => field.endsWith(".sacCode"))) {
    questions.push("Which SAC code should be used for the custom deliverable?");
  }

  if (missingFields.includes("client.isSezUnit")) {
    questions.push("Is the domestic client an SEZ unit or developer for authorised operations?");
  }

  if (missingFields.includes("meta.currency")) {
    questions.push("Which currency should the amounts be in (INR, USD, AED, ...)?");
  }

  if (missingFields.includes("taxHints.lutStatus")) {
    questions.push("Do you have an LUT on file for zero-rated export, or should IGST apply?");
  }

  if (hardAmbiguity) {
    questions.push("Which brief detail should be treated as final where the sources conflict?");
  }

  return [...new Set(questions)];
}

export function postProcessProviderOutput(
  rawJson: unknown,
  bundle: NormalizedParserBundle
): PostProcessResult {
  const warnings: string[] = [];
  const root = isRecord(rawJson) ? rawJson : {};
  const source = isRecord(root.normalizedExtraction)
    ? root.normalizedExtraction
    : root;
  const agency = isRecord(source.agency) ? source.agency : {};
  const client = isRecord(source.client) ? source.client : {};
  const payment = isRecord(source.payment) ? source.payment : {};
  const meta = isRecord(source.meta) ? source.meta : {};
  const taxHints = isRecord(source.taxHints) ? source.taxHints : {};
  const confidenceRoot = isRecord(root.confidence) ? root.confidence : {};
  const confidenceFields = isRecord(confidenceRoot.fields)
    ? confidenceRoot.fields
    : {};

  const extraction: NormalizedExtraction = {
    agency: {
      businessName: cleanEntityName(agency.businessName),
      gstRegistered: cleanBoolean(agency.gstRegistered),
      gstin: normalizeGstin(agency.gstin, warnings),
      pan: cleanString(agency.pan)?.toUpperCase() ?? null,
      lutEnabled: cleanBoolean(agency.lutEnabled),
      lutNumber: cleanString(agency.lutNumber),
      addressLine1: cleanString(agency.addressLine1),
      addressLine2: cleanString(agency.addressLine2),
      city: cleanString(agency.city),
      state: normalizeState(agency.state),
      pinCode: cleanString(agency.pinCode),
      country: cleanString(agency.country),
    },
    client: {
      name: cleanEntityName(client.name),
      email: cleanEmail(client.email),
      location:
        client.location === "domestic" || client.location === "international"
          ? client.location
          : hasInternationalHint(bundle.combinedText)
          ? "international"
          : null,
      gstinOrTaxId: normalizeClientTaxId({
        value: client.gstinOrTaxId,
        agencyGstin: normalizeGstin(agency.gstin, warnings),
        agencyPan: cleanString(agency.pan)?.toUpperCase() ?? null,
        clientLocation:
          client.location === "domestic" || client.location === "international"
            ? client.location
            : hasInternationalHint(bundle.combinedText)
            ? "international"
            : null,
        warnings,
      }),
      isSezUnit: cleanBoolean(client.isSezUnit),
      country: cleanString(client.country),
      addressLine1: cleanString(client.addressLine1),
      addressLine2: cleanString(client.addressLine2),
      city: cleanString(client.city),
      state: normalizeState(client.state),
      pinCode: cleanString(client.pinCode),
      postalCode: cleanString(client.postalCode),
    },
    deliverables: Array.isArray(source.deliverables)
      ? source.deliverables
          .map((item) => normalizeLineItem(item, warnings))
          .filter((item): item is NormalizedLineItem => Boolean(item))
      : [],
    milestones: Array.isArray(source.milestones)
      ? source.milestones
          .map((item) => normalizeMilestone(item, warnings))
          .filter((item): item is NormalizedMilestone => Boolean(item))
      : [],
    payment: {
      terms: cleanString(payment.terms)?.replace(/\bnet[\s-]?(\d+)\b/i, "Net $1") ?? null,
      mode: cleanString(payment.mode),
      accountName: cleanString(payment.accountName),
      bankName: cleanString(payment.bankName),
      bankAddress: cleanString(payment.bankAddress),
      accountNumber: cleanString(payment.accountNumber),
      ifscCode: cleanString(payment.ifscCode)?.toUpperCase() ?? null,
      swiftCode: cleanString(payment.swiftCode)?.toUpperCase() ?? null,
      ibanOrRouting: cleanString(payment.ibanOrRouting),
    },
    meta: {
      invoiceNumber: cleanString(meta.invoiceNumber),
      invoiceDate: normalizeDate(meta.invoiceDate, warnings),
      dueDate: normalizeDate(meta.dueDate, warnings),
      currency: cleanString(meta.currency)?.toUpperCase() ?? null,
      totalAmount: cleanNumber(meta.totalAmount),
    },
    taxHints: {
      treatment: normalizeTreatment(taxHints.treatment),
      rate: cleanNumber(taxHints.rate),
      domesticOrInternational:
        taxHints.domesticOrInternational === "domestic" ||
        taxHints.domesticOrInternational === "international"
          ? taxHints.domesticOrInternational
          : null,
      placeOfSupply: normalizeState(taxHints.placeOfSupply),
      exportMentioned: cleanBoolean(taxHints.exportMentioned),
      sezMentioned:
        cleanBoolean(taxHints.sezMentioned) ??
        (/\bsez\b/i.test(bundle.combinedText) ? true : null),
      lutMentioned:
        cleanBoolean(taxHints.lutMentioned) ??
        (/\blut\b|\bbond\b/i.test(bundle.combinedText) ? true : null),
      ambiguity: cleanString(taxHints.ambiguity),
    },
  };

  if (extraction.agency.gstin && extraction.agency.gstRegistered === null) {
    extraction.agency.gstRegistered = true;
  }

  if (extraction.taxHints.domesticOrInternational && !extraction.client.location) {
    extraction.client.location = extraction.taxHints.domesticOrInternational;
  }

  if (
    extraction.taxHints.sezMentioned === true &&
    extraction.client.isSezUnit === null
  ) {
    extraction.taxHints.treatment = null;
    extraction.taxHints.ambiguity =
      extraction.taxHints.ambiguity ||
      "SEZ was mentioned, but authorised-operations status is unresolved.";
  }

  // P1-D backstop: never let a defaulted INR stand for an international
  // client when the text itself never mentions rupees.
  if (
    extraction.meta.currency === "INR" &&
    extraction.client.location === "international" &&
    !/₹|\brs\.?\s?\d|\binr\b|rupee/i.test(bundle.combinedText)
  ) {
    warnings.push(
      'Dropped defaulted currency "INR" for an international client; currency was never stated.'
    );
    extraction.meta.currency = null;
  }

  const missingFields = collectMissingFields(extraction);
  const hardAmbiguity = detectHardAmbiguity(bundle, extraction);
  const confidence = {
    overall: overallConfidence(confidenceRoot.overall),
    fields: Object.fromEntries(
      Object.entries(confidenceFields).map(([key, value]) => [
        key,
        fieldConfidence(value),
      ])
    ),
  };
  const clarificationQuestions = [
    ...new Set([
      ...(Array.isArray(root.clarificationQuestions)
        ? root.clarificationQuestions.filter(
            (question): question is string => typeof question === "string"
          )
        : []),
      ...buildClarifications(missingFields, hardAmbiguity),
    ]),
  ];

  return {
    extraction,
    confidence,
    missingFields,
    clarificationQuestions,
    warnings: [
      ...warnings,
      ...(Array.isArray(root.warnings)
        ? root.warnings.filter(
            (warning): warning is string => typeof warning === "string"
          )
        : []),
    ],
    hardAmbiguity,
    valid: hasUsableCoreExtraction(extraction) && !hardAmbiguity,
  };
}

export function shouldFallbackToGroq(result: PostProcessResult) {
  return (
    result.hardAmbiguity ||
    hasStructuralGap(result) ||
    (result.confidence.overall === "low" &&
      !hasStrongPartialExtraction(result.extraction))
  );
}

export function shouldEscalateToGrok(result: PostProcessResult) {
  return (
    result.hardAmbiguity ||
    !hasStrongPartialExtraction(result.extraction) ||
    (result.confidence.overall === "low" && hasStructuralGap(result))
  );
}
