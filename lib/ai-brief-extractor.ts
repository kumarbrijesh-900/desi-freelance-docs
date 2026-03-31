import type {
  AgencyDetails,
  ClientDetails,
  InvoiceLineItemType,
  InvoiceRateUnit,
  LicenseType,
} from "@/types/invoice";
import type { InternationalCurrencyCode } from "@/lib/international-billing-options";

export type AiBriefField<T> = {
  value: T;
  confidence: "high" | "medium" | "low";
};

export type AiBriefLineItem = {
  type: AiBriefField<InvoiceLineItemType | "">;
  description: AiBriefField<string>;
  qty: AiBriefField<number>;
  rate: AiBriefField<number>;
  rateUnit: AiBriefField<InvoiceRateUnit | "">;
};

export type AiBriefExtraction = {
  agency: {
    name: AiBriefField<string>;
    address: AiBriefField<string>;
    state: AiBriefField<AgencyDetails["agencyState"]>;
    gstRegistrationStatus: AiBriefField<AgencyDetails["gstRegistrationStatus"]>;
    gstin: AiBriefField<string>;
    pan: AiBriefField<string>;
    lutAvailable: AiBriefField<AgencyDetails["lutAvailability"]>;
    lutNumber: AiBriefField<string>;
  };
  client: {
    location: AiBriefField<ClientDetails["clientLocation"] | "">;
    name: AiBriefField<string>;
    address: AiBriefField<string>;
    state: AiBriefField<ClientDetails["clientState"]>;
    country: AiBriefField<ClientDetails["clientCountry"]>;
    taxId: AiBriefField<string>;
    gstin: AiBriefField<string>;
  };
  invoice: {
    currency: AiBriefField<InternationalCurrencyCode | "">;
    paymentTerms: AiBriefField<string>;
  };
  lineItems: AiBriefLineItem[];
  license: {
    type: AiBriefField<LicenseType | "">;
    duration: AiBriefField<string>;
  };
  payment: {
    bankName: AiBriefField<string>;
    accountName: AiBriefField<string>;
    accountNumber: AiBriefField<string>;
    ifscCode: AiBriefField<string>;
    swiftCode: AiBriefField<string>;
    ibanOrRouting: AiBriefField<string>;
    bankAddress: AiBriefField<string>;
  };
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

function createStringFieldSchema(description: string) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: {
        type: "string",
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

function createNumberFieldSchema(description: string) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: {
        type: "number",
        minimum: 0,
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
        name: createStringFieldSchema("Agency or freelancer business name."),
        address: createStringFieldSchema("Agency business address."),
        state: {
          ...createStringFieldSchema("Indian state or union territory for the agency."),
        },
        gstRegistrationStatus: {
          type: "object",
          additionalProperties: false,
          properties: {
            value: {
              type: "string",
              enum: ["", "registered", "not-registered"],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["value", "confidence"],
        },
        gstin: createStringFieldSchema("Agency GSTIN, if present."),
        pan: createStringFieldSchema("Agency PAN, if present."),
        lutAvailable: {
          type: "object",
          additionalProperties: false,
          properties: {
            value: {
              type: "string",
              enum: ["", "yes", "no"],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["value", "confidence"],
        },
        lutNumber: createStringFieldSchema("LUT number or ARN, if present."),
      },
      required: [
        "name",
        "address",
        "state",
        "gstRegistrationStatus",
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
        location: {
          type: "object",
          additionalProperties: false,
          properties: {
            value: {
              type: "string",
              enum: ["", "domestic", "international"],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["value", "confidence"],
        },
        name: createStringFieldSchema("Client or customer name."),
        address: createStringFieldSchema("Client billing address."),
        state: createStringFieldSchema(
          "Indian state or union territory for domestic clients."
        ),
        country: createStringFieldSchema("Country for international clients."),
        taxId: createStringFieldSchema("Client tax ID or VAT number if present."),
        gstin: createStringFieldSchema("Client GSTIN if present."),
      },
      required: ["location", "name", "address", "state", "country", "taxId", "gstin"],
    },
    invoice: {
      type: "object",
      additionalProperties: false,
      properties: {
        currency: {
          type: "object",
          additionalProperties: false,
          properties: {
            value: {
              type: "string",
              enum: ["", "USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD"],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["value", "confidence"],
        },
        paymentTerms: createStringFieldSchema(
          "Payment terms such as Net 15 or Due on receipt."
        ),
      },
      required: ["currency", "paymentTerms"],
    },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "object",
            additionalProperties: false,
            properties: {
              value: {
                type: "string",
                enum: [
                  "",
                  "Logo Design",
                  "UI/UX",
                  "Illustration",
                  "Photography",
                  "Video Editing",
                  "Social Media",
                  "Other",
                ],
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
            },
            required: ["value", "confidence"],
          },
          description: createStringFieldSchema("Deliverable description."),
          qty: createNumberFieldSchema("Quantity for this line item."),
          rate: createNumberFieldSchema("Rate for this line item."),
          rateUnit: {
            type: "object",
            additionalProperties: false,
            properties: {
              value: {
                type: "string",
                enum: [
                  "",
                  "per-deliverable",
                  "per-item",
                  "per-screen",
                  "per-hour",
                  "per-day",
                  "per-revision",
                  "per-concept",
                  "per-post",
                  "per-video",
                  "per-image",
                ],
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
            },
            required: ["value", "confidence"],
          },
        },
        required: ["type", "description", "qty", "rate", "rateUnit"],
      },
    },
    license: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "object",
          additionalProperties: false,
          properties: {
            value: {
              type: "string",
              enum: [
                "",
                "full-assignment",
                "exclusive-license",
                "non-exclusive-license",
              ],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["value", "confidence"],
        },
        duration: createStringFieldSchema("License duration if explicitly mentioned."),
      },
      required: ["type", "duration"],
    },
    payment: {
      type: "object",
      additionalProperties: false,
      properties: {
        bankName: createStringFieldSchema("Bank name."),
        accountName: createStringFieldSchema("Beneficiary or account name."),
        accountNumber: createStringFieldSchema("Bank account number."),
        ifscCode: createStringFieldSchema("IFSC code."),
        swiftCode: createStringFieldSchema("SWIFT or BIC code."),
        ibanOrRouting: createStringFieldSchema("IBAN, routing number, or sort code."),
        bankAddress: createStringFieldSchema("Full bank address."),
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
  },
  required: ["agency", "client", "invoice", "lineItems", "license", "payment"],
} as const;

const SYSTEM_PROMPT = `
You extract structured invoice data from messy briefs, OCR text, emails, chats, and dictated notes.

Rules:
- Return JSON only that matches the schema exactly.
- Do not invent facts that are not present in the brief.
- If a value is missing or unclear, use an empty string for text/enums or 0 for numbers and set confidence to "low".
- Prefer "high" only when the value is explicit.
- Use "medium" for reasonable but not explicit interpretation.
- Use "low" when uncertain or inferred.
- For client location, use "domestic" only when India/domestic is explicit or clearly implied; otherwise "international" only when explicit or clearly implied; otherwise empty string.
- For GST registration and LUT status, only fill when explicitly stated.
- For currency, use one of: USD, EUR, GBP, AED, AUD, CAD, SGD, or empty string.
- For line items, extract all likely billable deliverables mentioned. If none are clear, return an empty array.
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
        throw new Error(content.refusal || "The AI extractor refused the request.");
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
          name: "invoice_brief_extraction",
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

  return JSON.parse(outputText) as AiBriefExtraction;
}
