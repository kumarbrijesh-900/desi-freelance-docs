export type ProviderName = "gemini-flash" | "groq-llama";
export type Confidence = "high" | "medium" | "low";

export type ParserInputContext = {
  isGuest: boolean;
  databaseContext?: any;
};

export type ParserInputBundle = {
  briefText?: string;
  ocrText?: string;
  voiceTranscript?: string;
  attachmentSummary?: string;
  userId?: string;
  documentId?: string;
  context?: ParserInputContext;
  sourceMetadata?: {
    locale?: string;
    timezone?: string;
    attachmentNames?: string[];
    attachmentTypes?: string[];
  };
};

export type NormalizedParserBundle = ParserInputBundle & {
  briefText: string;
  ocrText: string;
  voiceTranscript: string;
  attachmentSummary: string;
  combinedText: string;
};

export type NormalizedMilestone = {
  title: string | null;
  percent: number | null;
  amount: number | null;
  condition: string | null;
  date: string | null;
};

export type NormalizedLineItem = {
  type?: string | null;
  description?: string | null;
  quantity?: number | null;
  rate?: number | null;
  unit?: string | null;
  sacCode?: string | null;
};

export type NormalizedExtraction = {
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
  deliverables: NormalizedLineItem[];
  milestones: NormalizedMilestone[];
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
};

export type PostProcessResult = {
  extraction: NormalizedExtraction;
  confidence: {
    overall: Confidence;
    fields: Record<string, Confidence>;
  };
  missingFields: string[];
  clarificationQuestions: string[];
  warnings: string[];
  hardAmbiguity: boolean;
  valid: boolean;
};

export type ProviderAttempt = {
  provider: ProviderName;
  ok: boolean;
  rawText: string;
  rawJson: unknown;
  error?: string;
};

export type ParserResponse = {
  normalizedExtraction: NormalizedExtraction;
  confidence: PostProcessResult["confidence"];
  missingFields: string[];
  clarificationQuestions: string[];
  providerUsed: ProviderName | null;
  fallbackUsed: boolean;
  fallbackPath: ProviderName[];
  rawStored: boolean;
  documentId?: string | null;
  warnings: string[];
  parserVersion: string;
  parsedAt: string;
};
