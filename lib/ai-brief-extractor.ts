export type AiBriefConfidence = "high" | "medium" | "low";

export type AiBriefField<T> = {
  value: T | null;
  confidence: AiBriefConfidence;
};

export type AiBriefTaxType = "CGST_SGST" | "IGST" | "ZERO";
export type AiBriefLocationType = "domestic" | "international";

export type AiBriefExtraction = {
  reasoning_log: {
    step_1_linguistic_and_pronoun_mapping: {
      slang_translation: string;
      pronoun_resolution: string;
    };
    step_2_master_data_reconciliation: {
      agency_verification: string;
      client_verification: string;
    };
    step_3_tax_nexus_and_compliance: {
      place_of_supply: string;
      gst_applicability: string;
      export_and_lut_status: string;
      rcm_and_tds: string;
    };
    step_4_sac_classification: {
      service_analysis: string;
      sac_code_deduction: string;
    };
    step_5_contractual_deltas: {
      payment_terms_logic: string;
      addendum_trigger: string;
    };
    step_6_financial_math: {
      unit_normalization: string;
      subtotal_calculation: string;
      modifiers_logic: string;
      tax_calculation: string;
      grand_total: string;
    };
    confidence_and_warnings: string[];
  };
  invoice_data: {
    agencyName: AiBriefField<string>;
    agencyAddress: AiBriefField<string>;
    agencyState: AiBriefField<string>;
    clientName: AiBriefField<string>;
    clientAddress: AiBriefField<string>;
    clientCountry: AiBriefField<string>;
    clientState: AiBriefField<string>;
    clientTaxId: AiBriefField<string>;
    totalAmount: AiBriefField<number>;
    currency: AiBriefField<string>;
    gst: {
      type: AiBriefField<AiBriefTaxType>;
      rate: AiBriefField<number>;
      gstin: AiBriefField<string>;
      isRegistered: AiBriefField<boolean>;
      lutAvailable: AiBriefField<boolean>;
      lutNumber: AiBriefField<string>;
      pan: AiBriefField<string>;
    };
    deliverables: Array<{
      type: AiBriefField<string>;
      description: AiBriefField<string>;
      quantity: AiBriefField<number>;
      rate: AiBriefField<number>;
      unit: AiBriefField<string>;
      sacCode: AiBriefField<string>;
    }>;
    paymentTerms: AiBriefField<string>;
    paymentMode: AiBriefField<string>;
    paymentSchedule: Array<{
      milestone: AiBriefField<string>;
      percentage: AiBriefField<number>;
      dueWhen: AiBriefField<string>;
    }>;
    payment: {
      bankName: AiBriefField<string>;
      accountName: AiBriefField<string>;
      accountNumber: AiBriefField<string>;
      ifscCode: AiBriefField<string>;
      swiftCode: AiBriefField<string>;
      ibanOrRouting: AiBriefField<string>;
      bankAddress: AiBriefField<string>;
    };
    timeline: {
      invoiceDate: AiBriefField<string>;
      dueDate: AiBriefField<string>;
      deliveryTimeline: AiBriefField<string>;
    };
    locations: {
      agency: AiBriefField<string>;
      client: AiBriefField<string>;
      inferredType: AiBriefField<AiBriefLocationType>;
    };
    license: {
      isIncluded: AiBriefField<boolean>;
      type: AiBriefField<string>;
      duration: AiBriefField<string>;
    };
    confidenceScore: AiBriefConfidence;
  };
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";
const AI_EXTRACTION_TIMEOUT_MS = 4500;

function createNullableStringFieldSchema(description: string) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description,
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
    },
    required: ["value", "confidence"],
  } as const;
}

function createNullableNumberFieldSchema(description: string) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: {
        anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
        description,
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
    },
    required: ["value", "confidence"],
  } as const;
}

function createNullableBooleanFieldSchema(description: string) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: {
        anyOf: [{ type: "boolean" }, { type: "null" }],
        description,
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
    },
    required: ["value", "confidence"],
  } as const;
}

function createNullableEnumFieldSchema<TValues extends readonly string[]>(
  description: string,
  values: TValues
) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: {
        anyOf: [{ type: "string", enum: values }, { type: "null" }],
        description,
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
    },
    required: ["value", "confidence"],
  } as const;
}

const INVOICE_DATA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    agencyName: createNullableStringFieldSchema(
      "Agency or freelancer business name."
    ),
    agencyAddress: createNullableStringFieldSchema(
      "Agency business address."
    ),
    agencyState: createNullableStringFieldSchema(
      "Agency state when known or strongly inferred."
    ),
    clientName: createNullableStringFieldSchema("Client entity name."),
    clientAddress: createNullableStringFieldSchema(
      "Client billing address or location."
    ),
    clientCountry: createNullableStringFieldSchema(
      "Client country when international."
    ),
    clientState: createNullableStringFieldSchema(
      "Client state when domestic."
    ),
    clientTaxId: createNullableStringFieldSchema(
      "Client GSTIN, tax ID, or VAT number."
    ),
    totalAmount: createNullableNumberFieldSchema(
      "Best overall project amount if the brief suggests a total budget or fee."
    ),
    currency: createNullableStringFieldSchema(
      "Invoice currency such as INR, USD, EUR, GBP, AED, AUD, CAD, SGD."
    ),
    gst: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: createNullableEnumFieldSchema("GST treatment for the invoice.", [
          "CGST_SGST",
          "IGST",
          "ZERO",
        ] as const),
        rate: createNullableNumberFieldSchema(
          "GST rate percentage such as 18, 9, or 0."
        ),
        gstin: createNullableStringFieldSchema("Agency GSTIN."),
        isRegistered: createNullableBooleanFieldSchema(
          "True when the agency should likely be treated as GST registered."
        ),
        lutAvailable: createNullableBooleanFieldSchema(
          "True when the brief suggests a valid LUT is available."
        ),
        lutNumber: createNullableStringFieldSchema("LUT number or ARN."),
        pan: createNullableStringFieldSchema("Agency PAN."),
      },
      required: [
        "type",
        "rate",
        "gstin",
        "isRegistered",
        "lutAvailable",
        "lutNumber",
        "pan",
      ],
    },
    deliverables: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: createNullableStringFieldSchema(
            "Deliverable type such as UI/UX, illustration, reel, image, logo."
          ),
          description: createNullableStringFieldSchema(
            "Short human-readable description for this deliverable."
          ),
          quantity: createNullableNumberFieldSchema(
            "Quantity for this deliverable when known."
          ),
          rate: createNullableNumberFieldSchema(
            "Rate for this deliverable when clearly item-level."
          ),
          unit: createNullableStringFieldSchema(
            "Billing unit such as per screen, per image, per reel, per item."
          ),
          sacCode: createNullableStringFieldSchema(
            "6-digit Indian SAC code (e.g., 998314 for Design services)."
          ),
        },
        required: ["type", "description", "quantity", "rate", "unit", "sacCode"],
      },
    },
    paymentTerms: createNullableStringFieldSchema(
      "Invoice payment terms such as Net 15, Due on receipt, 50% advance."
    ),
    paymentMode: createNullableStringFieldSchema(
      "Payment mode such as bank, wire, wise, payoneer, upi."
    ),
    paymentSchedule: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          milestone: createNullableStringFieldSchema(
            "Schedule milestone such as advance, booking, balance."
          ),
          percentage: createNullableNumberFieldSchema(
            "Percentage for this milestone if stated."
          ),
          dueWhen: createNullableStringFieldSchema(
            "When this milestone is due, such as on booking or on delivery."
          ),
        },
        required: ["milestone", "percentage", "dueWhen"],
      },
    },
    payment: {
      type: "object",
      additionalProperties: false,
      properties: {
        bankName: createNullableStringFieldSchema("Bank name."),
        accountName: createNullableStringFieldSchema(
          "Beneficiary or account name."
        ),
        accountNumber: createNullableStringFieldSchema("Account number."),
        ifscCode: createNullableStringFieldSchema("IFSC code."),
        swiftCode: createNullableStringFieldSchema("SWIFT or BIC code."),
        ibanOrRouting: createNullableStringFieldSchema(
          "IBAN, routing number, or sort code."
        ),
        bankAddress: createNullableStringFieldSchema("Full bank address."),
      },
      required: [
        "bankName",
        "accountName",
        "accountNumber",
        "ifscCode",
        "swiftCode",
        "ibanOrRouting",
        "bankAddress",
      ],
    },
    timeline: {
      type: "object",
      additionalProperties: false,
      properties: {
        invoiceDate: createNullableStringFieldSchema(
          "Invoice date if clearly mentioned."
        ),
        dueDate: createNullableStringFieldSchema(
          "Due date if clearly mentioned."
        ),
        deliveryTimeline: createNullableStringFieldSchema(
          "Delivery timeline, ETA, deadline, or duration."
        ),
      },
      required: ["invoiceDate", "dueDate", "deliveryTimeline"],
    },
    locations: {
      type: "object",
      additionalProperties: false,
      properties: {
        agency: createNullableStringFieldSchema(
          "Agency city, state, or location snippet."
        ),
        client: createNullableStringFieldSchema(
          "Client city, state, country, or location snippet."
        ),
        inferredType: createNullableEnumFieldSchema(
          "Whether the invoice should be treated as domestic or international.",
          ["domestic", "international"] as const
        ),
      },
      required: ["agency", "client", "inferredType"],
    },
    license: {
      type: "object",
      additionalProperties: false,
      properties: {
        isIncluded: createNullableBooleanFieldSchema(
          "True when the brief mentions any form of license, usage rights, IP transfer, or copyright assignment."
        ),
        type: createNullableEnumFieldSchema(
          "The type of license or rights transfer mentioned.",
          ["full-assignment", "exclusive-license", "non-exclusive-license"] as const
        ),
        duration: createNullableStringFieldSchema(
          "License duration if mentioned, such as '3 years', 'perpetual', 'lifetime', '1 year'."
        ),
      },
      required: ["isIncluded", "type", "duration"],
    },
const AI_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning_log: {
      type: "object",
      additionalProperties: false,
      properties: {
        step_1_linguistic_and_pronoun_mapping: {
          type: "object",
          additionalProperties: false,
          properties: {
            slang_translation: { type: "string" },
            pronoun_resolution: { type: "string" },
          },
          required: ["slang_translation", "pronoun_resolution"],
        },
        step_2_master_data_reconciliation: {
          type: "object",
          additionalProperties: false,
          properties: {
            agency_verification: { type: "string" },
            client_verification: { type: "string" },
          },
          required: ["agency_verification", "client_verification"],
        },
        step_3_tax_nexus_and_compliance: {
          type: "object",
          additionalProperties: false,
          properties: {
            place_of_supply: { type: "string" },
            gst_applicability: { type: "string" },
            export_and_lut_status: { type: "string" },
            rcm_and_tds: { type: "string" },
          },
          required: [
            "place_of_supply",
            "gst_applicability",
            "export_and_lut_status",
            "rcm_and_tds",
          ],
        },
        step_4_sac_classification: {
          type: "object",
          additionalProperties: false,
          properties: {
            service_analysis: { type: "string" },
            sac_code_deduction: { type: "string" },
          },
          required: ["service_analysis", "sac_code_deduction"],
        },
        step_5_contractual_deltas: {
          type: "object",
          additionalProperties: false,
          properties: {
            payment_terms_logic: { type: "string" },
            addendum_trigger: { type: "string" },
          },
          required: ["payment_terms_logic", "addendum_trigger"],
        },
        step_6_financial_math: {
          type: "object",
          additionalProperties: false,
          properties: {
            unit_normalization: { type: "string" },
            subtotal_calculation: { type: "string" },
            modifiers_logic: { type: "string" },
            tax_calculation: { type: "string" },
            grand_total: { type: "string" },
          },
          required: [
            "unit_normalization",
            "subtotal_calculation",
            "modifiers_logic",
            "tax_calculation",
            "grand_total",
          ],
        },
        confidence_and_warnings: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "step_1_linguistic_and_pronoun_mapping",
        "step_2_master_data_reconciliation",
        "step_3_tax_nexus_and_compliance",
        "step_4_sac_classification",
        "step_5_contractual_deltas",
        "step_6_financial_math",
        "confidence_and_warnings",
      ],
    },
    invoice_data: INVOICE_DATA_SCHEMA,
  },
  required: ["reasoning_log", "invoice_data"],
} as const;

const SYSTEM_PROMPT = `
You are the Lance Omniscient Context Agent, an expert freelance invoice and tax engine for the Indian market.

Your mission is to transform a messy project brief into a legally compliant, GST-ready invoice. 
You are equipped with high-fidelity context about the Agency (the sender) and the Client (the recipient).

### THE OMNISCIENT REASONING PROTOCOL
You MUST execute these exact 7 steps in your reasoning_log before populating invoice_data:

Step 1: Linguistic and Pronoun Mapping
- Translate Hinglish, slang, or colloquialisms (e.g., '15 din' -> Net 15, 'lumpsum' -> Fixed Fee, 'shukriya' -> Thank you) into standard business terms.
- Map pronouns ('I', 'we', 'our', 'my bank') to the Agency (sender).
- Map pronouns ('they', 'them', 'their', 'you guys') to the Client (recipient) based on the provided context.

Step 2: Master Data Reconciliation
- Use agency_context as the absolute truth for the sender.
- Match the brief's mention of a client to the provided client_context. Note if this is a NEW client or a match.

Step 3: Tax Nexus and Compliance
- Determine Place of Supply (PoS) based on Agency vs Client geography.
- Applicability: 
  - Same State -> CGST + SGST (9%+9%).
  - Different State -> IGST (18%).
  - International/SEZ -> ZERO Rated (Assume LUT active if brief suggests export).
- RCM/TDS: Detect if Reverse Charge applies or if TDS deductions are mentioned.

Step 4: SAC Classification
- Analyze the deliverables.
- Map to the correct 6-digit Indian SAC code (e.g., 998314 for Design, 998311 for IT, 998733 for Video). Explain the deduction.

Step 5: Contractual Deltas
- Compare the extracted payment terms/licensing against the MSA defaults in client_context.
- If they differ, state 'MSA Deviation Detected: Project Addendum required'.

Step 6: Financial Math
- Normalize units (e.g., '5 screens', '10 hours').
- Calculate Subtotal: (Qty * Rate).
- Apply Modifiers: Discounts or Rush Fees BEFORE tax.
- Calculate Tax: Apply the % from Step 3.
- Final Grand Total: Subtotal + Tax.

Step 7: Confidence and Warnings
- List critical assumptions that require human verification.

### CRITICAL RULES
- Preserve all existing Indian GST compliance logic.
- Do NOT hallucinate. Use grounded guesses only.
- If a field is a bracketed placeholder like [Name], return null.

INTERPRETATION RULES:
- Amount detection:
  - Detect project budgets, fees, costs, quoted amounts, and currency symbols like ₹, $, €, £
  - Use totalAmount for overall project fee when that seems most likely
  - If a single amount might be a line-item rate instead of the full project fee, still return the best guess and lower confidence
  - ₹[Amount] or $[Amount] with bracket placeholders → return null, NOT 0
- GST logic:
  - If the brief suggests same-state billing, prefer CGST_SGST
  - If the brief suggests interstate billing, prefer IGST
  - If the brief suggests export or international services, prefer ZERO with 0% rate
  - If GSTIN is present, treat the agency as likely GST registered
- Location inference:
  - Infer domestic vs international from city names, country names, or payment context
  - Map Indian cities to states:
    - Bangalore/Bengaluru → Karnataka
    - Mumbai/Bombay → Maharashtra
    - Delhi/New Delhi → Delhi
    - Chennai/Madras → Tamil Nadu
    - Hyderabad → Telangana
    - Pune → Maharashtra
    - Kolkata/Calcutta → West Bengal
    - Ahmedabad → Gujarat
    - Jaipur → Rajasthan
    - Lucknow → Uttar Pradesh
    - Kochi/Cochin → Kerala
    - Chandigarh → Chandigarh
    - Goa → Goa
  - Indian neighborhood names are location clues:
    - Indiranagar, Koramangala, Whitefield, HSR Layout, Jayanagar → Bengaluru → Karnataka
    - Bandra, Andheri, Powai, Lower Parel → Mumbai → Maharashtra
    - Connaught Place, Hauz Khas, Saket → Delhi → Delhi
  - "Place of Supply: Karnataka (29)" → state = Karnataka, GST state code = 29
  - Numeric GST state codes (01-37) should be mapped to Indian states:
    - 29 = Karnataka, 27 = Maharashtra, 07 = Delhi, 33 = Tamil Nadu, 06 = Haryana, 36 = Telangana
  - Map foreign cities like London, New York, San Francisco, Dubai, Singapore as international clues
- Deliverables:
  - Split multiple deliverables into separate array items when the brief says things like "40 images + 5 reels"
  - When items are labeled "Item 01", "Item 02", etc., split into SEPARATE deliverable objects
  - Preserve the description even when amounts are missing — use null for rate if the amount is a placeholder
  - Preserve quantity, type, description, rate, and unit when possible
  - Understand common freelance wording like landing page, homepage, logo, illustration, banner, brand film, reel, shorts, shots, videos, and screens
  - "Logo Design & Brand Color Palette" is ONE deliverable, not two
  - "5 Social Media Creative Templates" → quantity = 5, type = "Social Media"
- Payment terms:
  - Detect Net 15 / Net 30 / Due on receipt
  - Detect milestone schedules like 50% advance, 40% booking, balance on delivery
  - "50% to commence work, 50% upon approval" → combine into a single payment terms string
  - "prior to file handover" implies final payment must be cleared before delivery
- Timeline:
  - Extract invoice dates, due dates, explicit deadlines, and delivery durations
  - "Delivery Date: [Date]" with placeholder → return null
  - Infer due date from payment terms when possible (e.g., Net 15 → due date = invoice date + 15 days)
- License detection:
  - "commercial usage rights", "IP transfer", "full rights", "copyright assignment" → license.isIncluded = true
  - "full commercial usage rights for the designs will be transferred" → license.type = "full-assignment"
  - "exclusive rights" or "exclusive license" → license.type = "exclusive-license"
  - "non-exclusive usage" or "limited license" → license.type = "non-exclusive-license"
  - "rights transferred on payment" or "upon full payment" → conditional license transfer, still mark isIncluded = true
  - "3 years", "perpetual", "lifetime", "1 year usage rights" → license.duration = the stated duration
  - "IP ownership remains with studio" → license.isIncluded = false or non-exclusive
  - If NO license language is found anywhere in the brief, set license.isIncluded to null (not false)
  - Also note any license signals in the paymentTerms field as additional context
- Mixed language and OCR:
  - Be resilient to shorthand, broken spacing, OCR noise, and conversational phrasing

STRICT OUTPUT RULES:
- Return JSON only
- Follow the schema exactly
- Every field object must include value and confidence
- confidenceScore should summarize the overall extraction quality
- Use null only when there is no grounded guess at all OR when the value is a template placeholder
`.trim();

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";

  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
        refusal?: string;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal") {
        throw new Error(
          content.refusal || "The AI extractor refused the request."
        );
      }

      if (
        (content.type === "output_text" || content.type === "text") &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return "";
}

export async function extractInvoiceBriefWithAi(params: {
  rawInput: string;
  agencyContext: any;
  clientContext?: any;
}): Promise<AiBriefExtraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const { rawInput, agencyContext, clientContext } = params;

  if (!apiKey || !rawInput.trim()) {
    return null;
  }

  const contextPrompt = `
AGENCY_CONTEXT (Absolute Truth for Sender):
${JSON.stringify(agencyContext, null, 2)}

CLIENT_CONTEXT (Known Master Data for Recipient):
${clientContext ? JSON.stringify(clientContext, null, 2) : "No master data for this client yet."}

RAW_INPUT (Process this brief):
${rawInput}
  `;

  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort("AI brief extraction timed out."),
    AI_EXTRACTION_TIMEOUT_MS
  );

  let response: Response;

  try {
    response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_BRIEF_EXTRACTION_MODEL || DEFAULT_MODEL,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: SYSTEM_PROMPT,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: contextPrompt,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "invoice_brief_interpretation_v3",
            strict: true,
            schema: AI_EXTRACTION_SCHEMA,
          },
        },
      }),
      signal: abortController.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message.includes("timed out") ||
        error.message.includes("aborted"))
    ) {
      console.warn("AI brief extraction timed out; falling back to parser only.");
      return null;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AI brief extraction failed with ${response.status}: ${errorText}`
    );
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);

  if (!outputText.trim()) {
    return null;
  }

  const parsed = JSON.parse(outputText) as AiBriefExtraction;
  console.log("AI STRUCTURED OUTPUT:", parsed);
  return parsed;
}
