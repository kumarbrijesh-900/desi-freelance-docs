import type {
  Confidence,
  NormalizedExtraction,
  NormalizedLineItem,
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

  // ─── NEW STRUCTURE MAPPING ────────────────────────────────
  // The Autonomous Billing Engine uses a flatter, more relational structure
  const clientDetails = isRecord(root.client_details) ? root.client_details : {};
  const taxDet = isRecord(root.tax_determination) ? root.tax_determination : {};
  const msaTerms = isRecord(root.msa_terms) ? root.msa_terms : {};
  const lineItems = Array.isArray(root.line_items) ? root.line_items : [];
  
  // Database context for defaults if needed
  const dbCtx = bundle.context?.databaseContext || {};
  const agencyData = dbCtx.agency || {};

  const extraction: NormalizedExtraction = {
    agency: {
      businessName: cleanEntityName(agencyData.name),
      gstin: normalizeGstin(agencyData.gstin, warnings),
      state: normalizeState(agencyData.location),
      // Guest-mode might have extracted agency info if it wasn't in context
      ...(isRecord(root.agency_details) ? {
        businessName: cleanEntityName(root.agency_details.name) || cleanEntityName(agencyData.name),
        gstin: normalizeGstin(root.agency_details.gstin, warnings) || normalizeGstin(agencyData.gstin, warnings),
      } : {}),
    },
    client: {
      name: cleanEntityName(clientDetails.name),
      gstinOrTaxId: normalizeClientTaxId({
        value: clientDetails.gstin,
        agencyGstin: normalizeGstin(agencyData.gstin, warnings),
        agencyPan: null,
        clientLocation: clientDetails.is_international ? "international" : "domestic",
        warnings,
      }),
      location: clientDetails.is_international ? "international" : "domestic",
      state: normalizeState(clientDetails.state_code),
    },
    deliverables: lineItems.map((item: any) => ({
      description: cleanString(item.description),
      quantity: cleanNumber(item.qty) ?? 1,
      rate: cleanNumber(item.base_rate),
      sacCode: cleanString(item.sac_code),
      type: normalizeType(null, item.description),
    })),
    payment: {
      terms: cleanString(msaTerms.payment_terms),
    },
    meta: {
      currency: "INR", // Default for now
    },
    taxHints: {
      treatment: normalizeTreatment(taxDet.tax_type),
      rate: cleanNumber(taxDet.tax_rate_percentage),
      domesticOrInternational: clientDetails.is_international ? "international" : "domestic",
    },
  };

  // ─── POST-MAPPING REFINEMENTS ─────────────────────────────
  if (extraction.agency.gstin && extraction.agency.gstRegistered === null) {
    extraction.agency.gstRegistered = true;
  }

  const missingFields = collectMissingFields(extraction);
  const hardAmbiguity = detectHardAmbiguity(bundle, extraction);
  
  // Confidence for the new engine is driven by the presence of reasoning
  const overallConf: Confidence = root._thought_process ? "high" : "medium";

  const confidence = {
    overall: overallConf,
    fields: {}, // Simplified for new engine
  };

  const clarificationQuestions = buildClarifications(missingFields, hardAmbiguity);

  return {
    extraction,
    confidence,
    missingFields,
    clarificationQuestions,
    warnings: [
      ...warnings,
      ...(Array.isArray(root.warnings)
        ? root.warnings.filter((w): w is string => typeof w === "string")
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
