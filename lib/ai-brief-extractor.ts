export type AiBriefConfidence = "high" | "medium" | "low";

export type AiBriefField<T> = {
  value: T | null;
  confidence: AiBriefConfidence;
};

export type AiBriefTaxType = "CGST_SGST" | "IGST" | "ZERO";
export type AiBriefLocationType = "domestic" | "international";

export type AiBriefExtraction = {
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
  confidenceScore: AiBriefConfidence;
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

const AI_EXTRACTION_SCHEMA = {
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
        },
        required: ["type", "description", "quantity", "rate", "unit"],
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
    confidenceScore: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
  },
  required: [
    "agencyName",
    "agencyAddress",
    "agencyState",
    "clientName",
    "clientAddress",
    "clientCountry",
    "clientState",
    "clientTaxId",
    "totalAmount",
    "currency",
    "gst",
    "deliverables",
    "paymentTerms",
    "paymentMode",
    "paymentSchedule",
    "payment",
    "timeline",
    "locations",
    "confidenceScore",
  ],
} as const;

const SYSTEM_PROMPT = `
You are an expert freelance invoice assistant.

Given a messy brief (chat, email, OCR text), your job is to:
1. Understand the intent
2. Infer missing structure
3. Extract invoice-ready structured data

IMPORTANT RULES:
- Do NOT wait for perfect labels
- Infer meaning from context
- Convert conversational language into structured fields
- Prefer the best grounded guess with a confidence score instead of skipping fields
- Do NOT hallucinate details that are unsupported by the brief
- If a guess would be too speculative, still return the closest grounded interpretation with low confidence
- Separate agency details from client details from payment details
- Treat sender/self-referential phrases like "we are", "I'm", "from", "our studio", and beneficiary/account-name details as agency clues
- Treat phrases like "invoice for", "bill to", "client", "brand", and "your company" as client clues
- Treat AI output as an intelligent assistant interpretation, not a literal regex dump
- If any grounded signal exists for a schema field, try to map it instead of leaving the field empty
- Favor role-based extraction: agency, client, invoice, deliverables, compliance, payment, timeline
- If GSTIN is present, strongly lean toward GST registration being true
- If export or LUT signals exist, strongly consider ZERO tax treatment unless IGST is explicitly stated
- If multiple deliverables are present, keep them as separate deliverable objects instead of collapsing them

INTERPRETATION RULES:
- Amount detection:
  - Detect project budgets, fees, costs, quoted amounts, and currency symbols like ₹, $, €, £
  - Use totalAmount for overall project fee when that seems most likely
  - If a single amount might be a line-item rate instead of the full project fee, still return the best guess and lower confidence
- GST logic:
  - If the brief suggests same-state billing, prefer CGST_SGST
  - If the brief suggests interstate billing, prefer IGST
  - If the brief suggests export or international services, prefer ZERO with 0% rate
  - If GSTIN is present, treat the agency as likely GST registered
- Location inference:
  - Infer domestic vs international from city names, country names, or payment context
  - Map Indian cities like Bangalore/Bengaluru -> Karnataka, Mumbai -> Maharashtra, Delhi -> Delhi
  - Map foreign cities like London, New York, San Francisco, Dubai, Singapore as international clues
- Deliverables:
  - Split multiple deliverables into separate array items when the brief says things like "40 images + 5 reels"
  - Preserve quantity, type, description, rate, and unit when possible
  - Understand common freelance wording like landing page, homepage, logo, illustration, banner, brand film, reel, shorts, shots, videos, and screens
- Payment terms:
  - Detect Net 15 / Net 30 / Due on receipt
  - Detect milestone schedules like 50% advance, 40% booking, balance on delivery
- Timeline:
  - Extract invoice dates, due dates, explicit deadlines, and delivery durations
- Mixed language and OCR:
  - Be resilient to shorthand, broken spacing, OCR noise, and conversational phrasing

STRICT OUTPUT RULES:
- Return JSON only
- Follow the schema exactly
- Every field object must include value and confidence
- confidenceScore should summarize the overall extraction quality
- Use null only when there is no grounded guess at all
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

export async function extractInvoiceBriefWithAi(
  normalizedText: string
): Promise<AiBriefExtraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !normalizedText.trim()) {
    return null;
  }

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
                text: normalizedText,
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
