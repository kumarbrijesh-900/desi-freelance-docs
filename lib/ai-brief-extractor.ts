export type AiBriefConfidence = "high" | "medium" | "low";

export type AiBriefField<T> = {
  value: T | null;
  confidence: AiBriefConfidence;
};

export type AiBriefTaxType = "CGST_SGST" | "IGST" | "ZERO_RATED";

export type AiBriefExtraction = {
  agency: {
    agencyName: AiBriefField<string>;
    agencyAddress: AiBriefField<string>;
    agencyState: AiBriefField<string>;
    gstRegistered: AiBriefField<boolean>;
    gstin: AiBriefField<string>;
    pan: AiBriefField<string>;
    lutAvailable: AiBriefField<boolean>;
    lutNumber: AiBriefField<string>;
  };
  client: {
    clientName: AiBriefField<string>;
    clientAddress: AiBriefField<string>;
    clientCountry: AiBriefField<string>;
    clientState: AiBriefField<string>;
    taxId: AiBriefField<string>;
    gstin: AiBriefField<string>;
  };
  invoice: {
    currency: AiBriefField<string>;
    isInternational: AiBriefField<boolean>;
    totalAmount: AiBriefField<number>;
    taxType: AiBriefField<AiBriefTaxType>;
  };
  deliverables: Array<{
    type: AiBriefField<string>;
    description: AiBriefField<string>;
    quantity: AiBriefField<number>;
    rate: AiBriefField<number>;
    unit: AiBriefField<string>;
  }>;
  payment: {
    paymentTerms: AiBriefField<string>;
    paymentMode: AiBriefField<string>;
    bankName: AiBriefField<string>;
    accountName: AiBriefField<string>;
    accountNumber: AiBriefField<string>;
    ifscCode: AiBriefField<string>;
    swiftCode: AiBriefField<string>;
    ibanOrRouting: AiBriefField<string>;
    bankAddress: AiBriefField<string>;
  };
  dates: {
    dueDate: AiBriefField<string>;
    timeline: AiBriefField<string>;
  };
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

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
    agency: {
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
          "Indian state for the agency if known."
        ),
        gstRegistered: createNullableBooleanFieldSchema(
          "True when the brief clearly indicates the agency is GST registered."
        ),
        gstin: createNullableStringFieldSchema("Agency GSTIN."),
        pan: createNullableStringFieldSchema("Agency PAN."),
        lutAvailable: createNullableBooleanFieldSchema(
          "True when a valid LUT is clearly available."
        ),
        lutNumber: createNullableStringFieldSchema("LUT number or ARN."),
      },
      required: [
        "agencyName",
        "agencyAddress",
        "agencyState",
        "gstRegistered",
        "gstin",
        "pan",
        "lutAvailable",
        "lutNumber",
      ],
    },
    client: {
      type: "object",
      additionalProperties: false,
      properties: {
        clientName: createNullableStringFieldSchema("Client entity name."),
        clientAddress: createNullableStringFieldSchema("Client billing address."),
        clientCountry: createNullableStringFieldSchema(
          "Client country if international."
        ),
        clientState: createNullableStringFieldSchema(
          "Client state if domestic."
        ),
        taxId: createNullableStringFieldSchema("Client tax ID or VAT number."),
        gstin: createNullableStringFieldSchema("Client GSTIN."),
      },
      required: [
        "clientName",
        "clientAddress",
        "clientCountry",
        "clientState",
        "taxId",
        "gstin",
      ],
    },
    invoice: {
      type: "object",
      additionalProperties: false,
      properties: {
        currency: createNullableStringFieldSchema(
          "Invoice currency such as INR, USD, EUR, GBP, AED, AUD, CAD, SGD."
        ),
        isInternational: createNullableBooleanFieldSchema(
          "True when the invoice is for a client outside India."
        ),
        totalAmount: createNullableNumberFieldSchema(
          "Total project amount if clearly stated."
        ),
        taxType: createNullableEnumFieldSchema("Likely tax type.", [
          "CGST_SGST",
          "IGST",
          "ZERO_RATED",
        ] as const),
      },
      required: ["currency", "isInternational", "totalAmount", "taxType"],
    },
    deliverables: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: createNullableStringFieldSchema("Deliverable type."),
          description: createNullableStringFieldSchema(
            "Deliverable description."
          ),
          quantity: createNullableNumberFieldSchema(
            "Quantity for this deliverable."
          ),
          rate: createNullableNumberFieldSchema(
            "Rate for this deliverable."
          ),
          unit: createNullableStringFieldSchema(
            "Billing unit such as per screen, per item, per image, per reel."
          ),
        },
        required: ["type", "description", "quantity", "rate", "unit"],
      },
    },
    payment: {
      type: "object",
      additionalProperties: false,
      properties: {
        paymentTerms: createNullableStringFieldSchema(
          "Payment terms such as Net 15 or Due on receipt."
        ),
        paymentMode: createNullableStringFieldSchema(
          "Payment mode such as bank, wise, payoneer, upi."
        ),
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
        "paymentTerms",
        "paymentMode",
        "bankName",
        "accountName",
        "accountNumber",
        "ifscCode",
        "swiftCode",
        "ibanOrRouting",
        "bankAddress",
      ],
    },
    dates: {
      type: "object",
      additionalProperties: false,
      properties: {
        dueDate: createNullableStringFieldSchema(
          "Invoice due date if explicitly mentioned."
        ),
        timeline: createNullableStringFieldSchema(
          "Project timeline or delivery timeline if mentioned."
        ),
      },
      required: ["dueDate", "timeline"],
    },
  },
  required: [
    "agency",
    "client",
    "invoice",
    "deliverables",
    "payment",
    "dates",
  ],
} as const;

const SYSTEM_PROMPT = `
You are an expert invoice assistant.

Extract structured invoice data from the following unstructured brief.

Rules:
- Understand meaning, not just keywords
- Infer missing information when obvious
- Do NOT hallucinate
- If unsure -> return null
- Group related data properly

Extract:

AGENCY:
- agencyName
- agencyAddress
- agencyState
- gstRegistered (true/false)
- gstin
- lutAvailable (true/false)

CLIENT:
- clientName
- clientAddress
- clientCountry
- clientState

INVOICE:
- currency (INR, USD, etc.)
- isInternational (true if outside India)
- totalAmount
- taxType (CGST_SGST / IGST / ZERO_RATED)

DELIVERABLES (array):
- type
- description
- quantity
- rate
- unit

PAYMENT:
- paymentTerms
- paymentMode (bank / wise / payoneer / etc.)

DATES:
- dueDate
- timeline

Compatibility extras:
- If PAN, LUT number / ARN, client tax ID, GSTIN, bank name, account number, IFSC, SWIFT/BIC, IBAN/routing, or bank address are clearly present, include them too.
- Return confidence for every field:
  - high = explicit mention
  - medium = clear inference
  - low = weak guess
- Resolve entities by role: agency vs client vs payment recipient.
- For multiple deliverables like "40 images + 5 reels", return separate array items.
- If one total amount covers multiple deliverables, keep invoice.totalAmount and leave item-level rate null unless the brief clearly gives per-item pricing.
- Normalize shorthand amounts such as 15k => 15000, $500 => 500 with USD, and ₹15000 => 15000 with INR.
- Use null instead of guessing when country, LUT state, or payment mode is not reasonably clear.
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

  const response = await fetch(OPENAI_API_URL, {
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
          name: "invoice_brief_extraction_v2",
          strict: true,
          schema: AI_EXTRACTION_SCHEMA,
        },
      },
    }),
  });

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
  console.log("[Brief Intake AI] Raw AI response:", parsed);
  return parsed;
}
