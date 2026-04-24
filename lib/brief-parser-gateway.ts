import type {
  AiBriefConfidence,
  AiBriefExtraction,
  AiBriefLocationType,
  AiBriefTaxType,
} from "@/lib/ai-brief-extractor";

export type BriefParserProvider = "gemini-flash" | "groq-llama" | "grok";
export type BriefParserConfidence = AiBriefConfidence;

export type BriefParserSourceMetadata = {
  locale?: string;
  timezone?: string;
  attachmentNames?: string[];
  attachmentTypes?: string[];
};

export type ParserInputContext = {
  isGuest: boolean;
  existingClients?: Array<{
    id: string;
    name: string;
    msaPaymentTermsDays: number;
    msaLateFeeRate: number;
    msaIpTriggerType: string;
    msaJurisdictionCity: string;
  }>;
};

export type BriefParserInputBundle = {
  briefText?: string;
  ocrText?: string;
  voiceTranscript?: string;
  attachmentSummary?: string;
  userId?: string;
  documentId?: string;
  context?: ParserInputContext;
  sourceMetadata?: BriefParserSourceMetadata;
};

export type NormalizedBriefLineItem = {
  type?: string | null;
  description?: string | null;
  quantity?: number | null;
  rate?: number | null;
  unit?: string | null;
  sacCode?: string | null;
};

export type NormalizedBriefExtraction = {
  agency: {
    businessName?: string | null;
    gstRegistered?: boolean | null;
    gstin?: string | null;
    pan?: string | null;
    lutEnabled?: boolean | null;
    lutNumber?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
    country?: string | null;
  };
  client: {
    name?: string | null;
    email?: string | null;
    location?: "domestic" | "international" | null;
    gstinOrTaxId?: string | null;
    isSezUnit?: boolean | null;
    country?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
    postalCode?: string | null;
  };
  deliverables: NormalizedBriefLineItem[];
  payment: {
    terms?: string | null;
    mode?: string | null;
    accountName?: string | null;
    bankName?: string | null;
    bankAddress?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    swiftCode?: string | null;
    ibanOrRouting?: string | null;
  };
  meta: {
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    dueDate?: string | null;
    currency?: string | null;
    totalAmount?: number | null;
  };
  taxHints: {
    treatment?: "CGST_SGST" | "IGST" | "ZERO_RATED" | "NONE" | null;
    rate?: number | null;
    domesticOrInternational?: "domestic" | "international" | null;
    placeOfSupply?: string | null;
    exportMentioned?: boolean | null;
    sezMentioned?: boolean | null;
    lutMentioned?: boolean | null;
    ambiguity?: string | null;
  };
  license: {
    isIncluded?: boolean | null;
    type?: "full-assignment" | "exclusive-license" | "non-exclusive-license" | null;
    duration?: string | null;
  };
};

export type BriefParserConfidenceReport = {
  overall: BriefParserConfidence;
  fields: Record<string, BriefParserConfidence>;
};

export type BriefParserResponse = {
  normalizedExtraction: NormalizedBriefExtraction;
  legacyExtraction?: AiBriefExtraction | null;
  confidence: BriefParserConfidenceReport;
  missingFields: string[];
  clarificationQuestions: string[];
  providerUsed: BriefParserProvider | null;
  fallbackUsed: boolean;
  fallbackPath: BriefParserProvider[];
  rawStored: boolean;
  documentId?: string | null;
  warnings: string[];
  parserVersion: string;
  parsedAt: string;
};

export type BriefParserGatewayResult =
  | {
      ok: true;
      response: BriefParserResponse;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function normalizeTextPart(value?: string | null) {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

export function normalizeBriefParserInput(
  input: BriefParserInputBundle
): BriefParserInputBundle & { combinedText: string } {
  const briefText = normalizeTextPart(input.briefText);
  const ocrText = normalizeTextPart(input.ocrText);
  const voiceTranscript = normalizeTextPart(input.voiceTranscript);
  const attachmentSummary = normalizeTextPart(input.attachmentSummary);

  return {
    ...input,
    briefText,
    ocrText,
    voiceTranscript,
    attachmentSummary,
    combinedText: [
      briefText ? `Typed brief:\n${briefText}` : "",
      ocrText ? `OCR text:\n${ocrText}` : "",
      voiceTranscript ? `Voice transcript:\n${voiceTranscript}` : "",
      attachmentSummary ? `Attachment summary:\n${attachmentSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fieldConfidenceFromValue(value: unknown): BriefParserConfidence {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "low";
}

function overallConfidenceFromValue(value: unknown): BriefParserConfidence {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Accepts finite numbers and common JSON string forms so gateway normalization
 * matches live model output (strings are not uncommon from LLM JSON).
 */
function numberOrNull(value: unknown) {
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

function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function normalizeLineItem(value: unknown): NormalizedBriefLineItem | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    type: stringOrNull(value.type),
    description: stringOrNull(value.description),
    quantity: numberOrNull(value.quantity),
    rate: numberOrNull(value.rate),
    unit: stringOrNull(value.unit),
    sacCode: stringOrNull(value.sacCode),
  };
}

export function normalizeBriefParserResponse(
  value: unknown
): BriefParserResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const extraction = isRecord(value.normalizedExtraction)
    ? value.normalizedExtraction
    : {};
  const agency = isRecord(extraction.agency) ? extraction.agency : {};
  const client = isRecord(extraction.client) ? extraction.client : {};
  const payment = isRecord(extraction.payment) ? extraction.payment : {};
  const meta = isRecord(extraction.meta) ? extraction.meta : {};
  const taxHints = isRecord(extraction.taxHints) ? extraction.taxHints : {};
  const license = isRecord(extraction.license) ? extraction.license : {};
  const confidence = isRecord(value.confidence) ? value.confidence : {};
  const fields = isRecord(confidence.fields) ? confidence.fields : {};

  return {
    normalizedExtraction: {
      agency: {
        businessName: stringOrNull(agency.businessName),
        gstRegistered: booleanOrNull(agency.gstRegistered),
        gstin: stringOrNull(agency.gstin),
        pan: stringOrNull(agency.pan),
        lutEnabled: booleanOrNull(agency.lutEnabled),
        lutNumber: stringOrNull(agency.lutNumber),
        addressLine1: stringOrNull(agency.addressLine1),
        addressLine2: stringOrNull(agency.addressLine2),
        city: stringOrNull(agency.city),
        state: stringOrNull(agency.state),
        pinCode: stringOrNull(agency.pinCode),
        country: stringOrNull(agency.country),
      },
      client: {
        name: stringOrNull(client.name),
        email: stringOrNull(client.email),
        location:
          client.location === "domestic" || client.location === "international"
            ? client.location
            : null,
        gstinOrTaxId: stringOrNull(client.gstinOrTaxId),
        isSezUnit: booleanOrNull(client.isSezUnit),
        country: stringOrNull(client.country),
        addressLine1: stringOrNull(client.addressLine1),
        addressLine2: stringOrNull(client.addressLine2),
        city: stringOrNull(client.city),
        state: stringOrNull(client.state),
        pinCode: stringOrNull(client.pinCode),
        postalCode: stringOrNull(client.postalCode),
      },
      deliverables: Array.isArray(extraction.deliverables)
        ? extraction.deliverables
            .map((item) => normalizeLineItem(item))
            .filter((item): item is NormalizedBriefLineItem => Boolean(item))
        : [],
      payment: {
        terms: stringOrNull(payment.terms),
        mode: stringOrNull(payment.mode),
        accountName: stringOrNull(payment.accountName),
        bankName: stringOrNull(payment.bankName),
        bankAddress: stringOrNull(payment.bankAddress),
        accountNumber: stringOrNull(payment.accountNumber),
        ifscCode: stringOrNull(payment.ifscCode),
        swiftCode: stringOrNull(payment.swiftCode),
        ibanOrRouting: stringOrNull(payment.ibanOrRouting),
      },
      meta: {
        invoiceNumber: stringOrNull(meta.invoiceNumber),
        invoiceDate: stringOrNull(meta.invoiceDate),
        dueDate: stringOrNull(meta.dueDate),
        currency: stringOrNull(meta.currency),
        totalAmount: numberOrNull(meta.totalAmount),
      },
      taxHints: {
        treatment:
          taxHints.treatment === "CGST_SGST" ||
          taxHints.treatment === "IGST" ||
          taxHints.treatment === "ZERO_RATED" ||
          taxHints.treatment === "NONE"
            ? taxHints.treatment
            : null,
        rate: numberOrNull(taxHints.rate),
        domesticOrInternational:
          taxHints.domesticOrInternational === "domestic" ||
          taxHints.domesticOrInternational === "international"
            ? taxHints.domesticOrInternational
            : null,
        placeOfSupply: stringOrNull(taxHints.placeOfSupply),
        exportMentioned: booleanOrNull(taxHints.exportMentioned),
        sezMentioned: booleanOrNull(taxHints.sezMentioned),
        lutMentioned: booleanOrNull(taxHints.lutMentioned),
        ambiguity: stringOrNull(taxHints.ambiguity),
      },
      license: {
        isIncluded: booleanOrNull(license.isIncluded),
        type:
          license.type === "full-assignment" ||
          license.type === "exclusive-license" ||
          license.type === "non-exclusive-license"
            ? license.type
            : null,
        duration: stringOrNull(license.duration),
      },
    },
    legacyExtraction: isRecord(value.legacyExtraction)
      ? (value.legacyExtraction as AiBriefExtraction)
      : null,
    confidence: {
      overall: overallConfidenceFromValue(confidence.overall),
      fields: Object.fromEntries(
        Object.entries(fields).map(([key, fieldEntry]) => [
          key,
          fieldConfidenceFromValue(fieldEntry),
        ])
      ),
    },
    missingFields: Array.isArray(value.missingFields)
      ? value.missingFields.filter(
          (field): field is string => typeof field === "string"
        )
      : [],
    clarificationQuestions: Array.isArray(value.clarificationQuestions)
      ? value.clarificationQuestions.filter(
          (question): question is string => typeof question === "string"
        )
      : [],
    providerUsed:
      value.providerUsed === "gemini-flash" ||
      value.providerUsed === "groq-llama" ||
      value.providerUsed === "grok"
        ? value.providerUsed
        : null,
    fallbackUsed: Boolean(value.fallbackUsed),
    fallbackPath: Array.isArray(value.fallbackPath)
      ? value.fallbackPath.filter(
          (provider): provider is BriefParserProvider =>
            provider === "gemini-flash" ||
            provider === "groq-llama" ||
            provider === "grok"
        )
      : [],
    rawStored: Boolean(value.rawStored),
    documentId: stringOrNull(value.documentId),
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter(
          (warning): warning is string => typeof warning === "string"
        )
      : [],
    parserVersion:
      typeof value.parserVersion === "string"
        ? value.parserVersion
        : "parse-brief-v1",
    parsedAt:
      typeof value.parsedAt === "string"
        ? value.parsedAt
        : new Date().toISOString(),
  };
}

function createField<T>(
  value: T | null | undefined,
  confidence: BriefParserConfidence = "low"
) {
  return {
    value: value ?? null,
    confidence,
  };
}

function getFieldConfidence(
  response: BriefParserResponse,
  key: string
): BriefParserConfidence {
  return response.confidence.fields[key] ?? response.confidence.overall;
}

function mapTaxTreatment(
  treatment: NormalizedBriefExtraction["taxHints"]["treatment"]
): AiBriefTaxType | null {
  if (treatment === "ZERO_RATED" || treatment === "NONE") {
    return "ZERO";
  }

  if (treatment === "CGST_SGST" || treatment === "IGST") {
    return treatment;
  }

  return null;
}

function mapLocationType(
  location: NormalizedBriefExtraction["client"]["location"]
): AiBriefLocationType | null {
  return location === "domestic" || location === "international"
    ? location
    : null;
}

export function toLegacyAiBriefExtraction(
  response: BriefParserResponse
): AiBriefExtraction {
  const { normalizedExtraction } = response;
  const agencyAddress = [
    normalizedExtraction.agency.addressLine1,
    normalizedExtraction.agency.addressLine2,
    normalizedExtraction.agency.city,
    normalizedExtraction.agency.state,
    normalizedExtraction.agency.pinCode,
  ]
    .filter(Boolean)
    .join(", ");
  const clientAddress = [
    normalizedExtraction.client.addressLine1,
    normalizedExtraction.client.addressLine2,
    normalizedExtraction.client.city,
    normalizedExtraction.client.state,
    normalizedExtraction.client.pinCode ||
      normalizedExtraction.client.postalCode,
    normalizedExtraction.client.country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    agencyName: createField(
      normalizedExtraction.agency.businessName,
      getFieldConfidence(response, "agency.businessName")
    ),
    agencyAddress: createField(
      agencyAddress || null,
      getFieldConfidence(response, "agency.address")
    ),
    agencyState: createField(
      normalizedExtraction.agency.state,
      getFieldConfidence(response, "agency.state")
    ),
    clientName: createField(
      normalizedExtraction.client.name,
      getFieldConfidence(response, "client.name")
    ),
    clientAddress: createField(
      clientAddress || null,
      getFieldConfidence(response, "client.address")
    ),
    clientCountry: createField(
      normalizedExtraction.client.country,
      getFieldConfidence(response, "client.country")
    ),
    clientState: createField(
      normalizedExtraction.client.state,
      getFieldConfidence(response, "client.state")
    ),
    clientTaxId: createField(
      normalizedExtraction.client.gstinOrTaxId,
      getFieldConfidence(response, "client.gstinOrTaxId")
    ),
    totalAmount: createField(
      normalizedExtraction.meta.totalAmount,
      getFieldConfidence(response, "meta.totalAmount")
    ),
    currency: createField(
      normalizedExtraction.meta.currency,
      getFieldConfidence(response, "meta.currency")
    ),
    gst: {
      type: createField(
        mapTaxTreatment(normalizedExtraction.taxHints.treatment),
        getFieldConfidence(response, "taxHints.treatment")
      ),
      rate: createField(
        normalizedExtraction.taxHints.rate,
        getFieldConfidence(response, "taxHints.rate")
      ),
      gstin: createField(
        normalizedExtraction.agency.gstin,
        getFieldConfidence(response, "agency.gstin")
      ),
      isRegistered: createField(
        normalizedExtraction.agency.gstRegistered,
        getFieldConfidence(response, "agency.gstRegistered")
      ),
      lutAvailable: createField(
        normalizedExtraction.agency.lutEnabled,
        getFieldConfidence(response, "agency.lutEnabled")
      ),
      lutNumber: createField(
        normalizedExtraction.agency.lutNumber,
        getFieldConfidence(response, "agency.lutNumber")
      ),
      pan: createField(
        normalizedExtraction.agency.pan,
        getFieldConfidence(response, "agency.pan")
      ),
    },
    deliverables: normalizedExtraction.deliverables.map((item, index) => ({
      type: createField(
        item.type,
        getFieldConfidence(response, `deliverables.${index}.type`)
      ),
      description: createField(
        item.description,
        getFieldConfidence(response, `deliverables.${index}.description`)
      ),
      quantity: createField(
        item.quantity,
        getFieldConfidence(response, `deliverables.${index}.quantity`)
      ),
      rate: createField(
        item.rate,
        getFieldConfidence(response, `deliverables.${index}.rate`)
      ),
      unit: createField(
        item.unit,
        getFieldConfidence(response, `deliverables.${index}.unit`)
      ),
    })),
    paymentTerms: createField(
      normalizedExtraction.payment.terms,
      getFieldConfidence(response, "payment.terms")
    ),
    paymentMode: createField(
      normalizedExtraction.payment.mode,
      getFieldConfidence(response, "payment.mode")
    ),
    paymentSchedule: [],
    payment: {
      bankName: createField(
        normalizedExtraction.payment.bankName,
        getFieldConfidence(response, "payment.bankName")
      ),
      accountName: createField(
        normalizedExtraction.payment.accountName,
        getFieldConfidence(response, "payment.accountName")
      ),
      accountNumber: createField(
        normalizedExtraction.payment.accountNumber,
        getFieldConfidence(response, "payment.accountNumber")
      ),
      ifscCode: createField(
        normalizedExtraction.payment.ifscCode,
        getFieldConfidence(response, "payment.ifscCode")
      ),
      swiftCode: createField(
        normalizedExtraction.payment.swiftCode,
        getFieldConfidence(response, "payment.swiftCode")
      ),
      ibanOrRouting: createField(
        normalizedExtraction.payment.ibanOrRouting,
        getFieldConfidence(response, "payment.ibanOrRouting")
      ),
      bankAddress: createField(
        normalizedExtraction.payment.bankAddress,
        getFieldConfidence(response, "payment.bankAddress")
      ),
    },
    timeline: {
      invoiceDate: createField(
        normalizedExtraction.meta.invoiceDate,
        getFieldConfidence(response, "meta.invoiceDate")
      ),
      dueDate: createField(
        normalizedExtraction.meta.dueDate,
        getFieldConfidence(response, "meta.dueDate")
      ),
      deliveryTimeline: createField(null),
    },
    locations: {
      agency: createField(
        normalizedExtraction.agency.city ||
          normalizedExtraction.agency.state ||
          null,
        getFieldConfidence(response, "agency.location")
      ),
      client: createField(
        normalizedExtraction.client.city ||
          normalizedExtraction.client.state ||
          normalizedExtraction.client.country ||
          null,
        getFieldConfidence(response, "client.location")
      ),
      inferredType: createField(
        mapLocationType(normalizedExtraction.client.location),
        getFieldConfidence(response, "client.location")
      ),
    },
    license: {
      isIncluded: createField(
        normalizedExtraction.license.isIncluded,
        getFieldConfidence(response, "license.isIncluded")
      ),
      type: createField(
        normalizedExtraction.license.type,
        getFieldConfidence(response, "license.type")
      ),
      duration: createField(
        normalizedExtraction.license.duration,
        getFieldConfidence(response, "license.duration")
      ),
    },
    confidenceScore: response.confidence.overall,
  };
}

export async function invokeBriefParserGateway(params: {
  input: BriefParserInputBundle;
  authorizationHeader?: string | null;
}): Promise<BriefParserGatewayResult> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      ok: false,
      status: 503,
      error: "Supabase Edge Function environment is not configured.",
    };
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/parse-brief`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: params.authorizationHeader || `Bearer ${anonKey}`,
    },
    body: JSON.stringify(params.input),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "Brief parser gateway request failed.",
    };
  }

  const normalizedResponse = normalizeBriefParserResponse(payload);

  if (!normalizedResponse) {
    return {
      ok: false,
      status: 502,
      error: "Brief parser gateway returned an invalid response.",
    };
  }

  return {
    ok: true,
    response: normalizedResponse,
  };
}
