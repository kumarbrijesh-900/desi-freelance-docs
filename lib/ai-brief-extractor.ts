export type AiBriefConfidence = "high" | "medium" | "low";

export type AiBriefField<T> = {
  value: T | null;
  confidence: AiBriefConfidence;
};

export type AiBriefTaxType = "CGST_SGST" | "IGST" | "ZERO";
export type AiBriefLocationType = "domestic" | "international";

export type AiBriefExtraction = {
  inference_matrix?: {
    macro_resolution: {
      linguistic_translation: string;
      nexus_and_compliance: string;
    };
    agency_nodes_1_to_6: {
      identity_inference: string;
      tax_id_inference: string;
    };
    client_and_msa_nodes_7_to_16: {
      client_identity_inference: string;
      msa_baseline_inference: string;
    };
    meta_nodes_17_to_19: {
      invoice_number_inference: string;
      date_currency_inference: string;
    };
    item_nodes_20_to_24: {
      deliverable_splitting_logic: string;
      financial_math_logic: string;
    };
    tax_nodes_25_to_27: {
      sac_deduction_logic: string;
      rcm_lut_logic: string;
    };
    payment_nodes_28_to_34: {
      bank_routing_inference: string;
      addendum_trigger_logic: string;
    };
  };
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
  hasAddendum: AiBriefField<boolean>;
  addendumNotes: AiBriefField<string>;
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
  values: TValues,
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
      "Agency or freelancer business name.",
    ),
    agencyAddress: createNullableStringFieldSchema("Agency business address."),
    agencyState: createNullableStringFieldSchema(
      "Agency state when known or strongly inferred.",
    ),
    clientName: createNullableStringFieldSchema("Client entity name."),
    clientAddress: createNullableStringFieldSchema(
      "Client billing address or location.",
    ),
    clientCountry: createNullableStringFieldSchema(
      "Client country when international.",
    ),
    clientState: createNullableStringFieldSchema("Client state when domestic."),
    clientTaxId: createNullableStringFieldSchema(
      "Client GSTIN, tax ID, or VAT number.",
    ),
    totalAmount: createNullableNumberFieldSchema(
      "Best overall project amount if the brief suggests a total budget or fee.",
    ),
    currency: createNullableStringFieldSchema(
      "Invoice currency such as INR, USD, EUR, GBP, AED, AUD, CAD, SGD.",
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
          "GST rate percentage such as 18, 9, or 0.",
        ),
        gstin: createNullableStringFieldSchema("Agency GSTIN."),
        isRegistered: createNullableBooleanFieldSchema(
          "True when the agency should likely be treated as GST registered.",
        ),
        lutAvailable: createNullableBooleanFieldSchema(
          "True when the brief suggests a valid LUT is available.",
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
            "Deliverable type such as UI/UX, illustration, reel, image, logo.",
          ),
          description: createNullableStringFieldSchema(
            "Short human-readable description for this deliverable.",
          ),
          quantity: createNullableNumberFieldSchema(
            "Quantity for this deliverable when known.",
          ),
          rate: createNullableNumberFieldSchema(
            "Rate for this deliverable when clearly item-level.",
          ),
          unit: createNullableStringFieldSchema(
            "Billing unit such as per screen, per image, per reel, per item.",
          ),
          sacCode: createNullableStringFieldSchema(
            "6-digit Indian SAC code (e.g., 998314 for Design services).",
          ),
        },
        required: [
          "type",
          "description",
          "quantity",
          "rate",
          "unit",
          "sacCode",
        ],
      },
    },
    paymentTerms: createNullableStringFieldSchema(
      "Invoice payment terms such as Net 15, Due on receipt, 50% advance.",
    ),
    paymentMode: createNullableStringFieldSchema(
      "Payment mode such as bank, wire, wise, payoneer, upi.",
    ),
    paymentSchedule: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          milestone: createNullableStringFieldSchema(
            "Schedule milestone such as advance, booking, balance.",
          ),
          percentage: createNullableNumberFieldSchema(
            "Percentage for this milestone if stated.",
          ),
          dueWhen: createNullableStringFieldSchema(
            "When this milestone is due, such as on booking or on delivery.",
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
          "Beneficiary or account name.",
        ),
        accountNumber: createNullableStringFieldSchema("Account number."),
        ifscCode: createNullableStringFieldSchema("IFSC code."),
        swiftCode: createNullableStringFieldSchema("SWIFT or BIC code."),
        ibanOrRouting: createNullableStringFieldSchema(
          "IBAN, routing number, or sort code.",
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
          "Invoice date if clearly mentioned.",
        ),
        dueDate: createNullableStringFieldSchema(
          "Due date if clearly mentioned.",
        ),
        deliveryTimeline: createNullableStringFieldSchema(
          "Delivery timeline, ETA, deadline, or duration.",
        ),
      },
      required: ["invoiceDate", "dueDate", "deliveryTimeline"],
    },
    locations: {
      type: "object",
      additionalProperties: false,
      properties: {
        agency: createNullableStringFieldSchema(
          "Agency city, state, or location snippet.",
        ),
        client: createNullableStringFieldSchema(
          "Client city, state, country, or location snippet.",
        ),
        inferredType: createNullableEnumFieldSchema(
          "Whether the invoice should be treated as domestic or international.",
          ["domestic", "international"] as const,
        ),
      },
      required: ["agency", "client", "inferredType"],
    },
    license: {
      type: "object",
      additionalProperties: false,
      properties: {
        isIncluded: createNullableBooleanFieldSchema(
          "True when the brief mentions any form of license, usage rights, IP transfer, or copyright assignment.",
        ),
        type: createNullableEnumFieldSchema(
          "The type of license or rights transfer mentioned.",
          [
            "full-assignment",
            "exclusive-license",
            "non-exclusive-license",
          ] as const,
        ),
        duration: createNullableStringFieldSchema(
          "License duration if mentioned, such as '3 years', 'perpetual', 'lifetime', '1 year'.",
        ),
      },
      required: ["isIncluded", "type", "duration"],
    },
    has_addendum: createNullableBooleanFieldSchema(
      "True if the project brief deviates from Master MSA context (e.g., payment terms change).",
    ),
    addendum_notes: createNullableStringFieldSchema(
      "Human-readable notes explaining why an addendum is required (the deltas).",
    ),
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
    "license",
    "has_addendum",
  ],
} as const;

const INFERENCE_MATRIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    macro_resolution: {
      type: "object",
      additionalProperties: false,
      properties: {
        linguistic_translation: { type: "string" },
        nexus_and_compliance: { type: "string" },
      },
      required: ["linguistic_translation", "nexus_and_compliance"],
    },
    agency_nodes_1_to_6: {
      type: "object",
      additionalProperties: false,
      properties: {
        identity_inference: { type: "string" },
        tax_id_inference: { type: "string" },
      },
      required: ["identity_inference", "tax_id_inference"],
    },
    client_and_msa_nodes_7_to_16: {
      type: "object",
      additionalProperties: false,
      properties: {
        client_identity_inference: { type: "string" },
        msa_baseline_inference: { type: "string" },
      },
      required: ["client_identity_inference", "msa_baseline_inference"],
    },
    meta_nodes_17_to_19: {
      type: "object",
      additionalProperties: false,
      properties: {
        invoice_number_inference: { type: "string" },
        date_currency_inference: { type: "string" },
      },
      required: ["invoice_number_inference", "date_currency_inference"],
    },
    item_nodes_20_to_24: {
      type: "object",
      additionalProperties: false,
      properties: {
        deliverable_splitting_logic: { type: "string" },
        financial_math_logic: { type: "string" },
      },
      required: ["deliverable_splitting_logic", "financial_math_logic"],
    },
    tax_nodes_25_to_27: {
      type: "object",
      additionalProperties: false,
      properties: {
        sac_deduction_logic: { type: "string" },
        rcm_lut_logic: { type: "string" },
      },
      required: ["sac_deduction_logic", "rcm_lut_logic"],
    },
    payment_nodes_28_to_34: {
      type: "object",
      additionalProperties: false,
      properties: {
        bank_routing_inference: { type: "string" },
        addendum_trigger_logic: { type: "string" },
      },
      required: ["bank_routing_inference", "addendum_trigger_logic"],
    },
  },
  required: [
    "macro_resolution",
    "agency_nodes_1_to_6",
    "client_and_msa_nodes_7_to_16",
    "meta_nodes_17_to_19",
    "item_nodes_20_to_24",
    "tax_nodes_25_to_27",
    "payment_nodes_28_to_34",
  ],
} as const;

const AI_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    inference_matrix: INFERENCE_MATRIX_SCHEMA,
    extracted_data: INVOICE_DATA_SCHEMA,
  },
  required: ["inference_matrix", "extracted_data"],
} as const;

const SYSTEM_PROMPT = `
You are the Lance Omniscient Context Agent, a high-fidelity Deep Matrix Inference engine for freelance invoice and tax compliance. 

### THE DEEP MATRIX INFERENCE PROTOCOL
You process 34 distinct form fields across multimodal inputs. You MUST execute these exact 7 reasoning blocks in your inference_matrix BEFORE populating extracted_data:

Block 1: Macro Resolution (Linguistic & Nexus)
- linguistic_translation: Translate Hinglish, slang ('15 din' -> Net 15, 'lumpsum' -> Fixed Fee), and resolve 'I/my' (Agency) vs 'they/them' (Client).
- nexus_and_compliance: Compare Agency State vs Client State. Deduce Place of Supply, IGST vs CGST/SGST, and Export/LUT applicability.

Block 2: Agency Nodes 1-6 (Sender Identity)
- identity_inference: Source agency Name, Email, Address, PIN from Master Data unless explicitly overridden in prompt.
- tax_id_inference: Verify presence of GSTIN/PAN in prompt/image vs Master Data.

Block 3: Client & MSA Nodes 7-16 (Recipient & Contracts)
- client_identity_inference: Reconcile client Name, Address, GSTIN against client_context. Flag mismatches.
- msa_baseline_inference: Load Master MSA terms (Payment Days, Late Fee, License, IP Trigger) to use as the baseline for Addendum checks.

Block 4: Meta Nodes 17-19 (Identifiers & Timeline)
- invoice_number_inference: Detect explicit invoice number. If missing, null.
- date_currency_inference: Deduce issue date (default today). Deduce currency based on Geography (INR for domestic, USD/foreign for export).

Block 5: Item Nodes 20-24 (Deliverables & Math)
- deliverable_splitting_logic: Split distinct items (e.g., '40 images + 5 reels'). Normalize units ('mahina' -> months).
- financial_math_logic: Show subtotal calculation (Qty * Rate) + modifiers (discounts/rush fees).

Block 6: Tax Nodes 25-27 (Compliance Logic)
- sac_deduction_logic: Deduce the most accurate 6-digit Indian SAC Code (e.g., 998314 for Design).
- rcm_lut_logic: Determine if Reverse Charge (RCM) or Export LUT applies based on Macro Resolution.

Block 7: Payment Nodes 28-34 (Routing & Contractual Deltas)
- bank_routing_inference: Check prompt/image for specific Bank/Account/IFSC. Fallback to agency_context if missing.
- addendum_trigger_logic: Compare extracted terms ('15 din') or license requests against msa_baseline_inference. If they deviate, set project meta (addendum) to TRUE and generate override notes.

### SOURCE OF TRUTH HIERARCHY
1. Priority 1: Explicit text/image extraction (e.g., "Use my HDFC account" overrides Master Data).
2. Priority 2: Contextual deduction (e.g., "15 din" = Net 15, overriding Master MSA days).
3. Priority 3: Master Data Fallback (agency_context, client_context).

### ANTI-HALLUCINATION & PRECISION
- The final resolved data for the invoice UI. If a field is not found in the input and cannot be inferred from Master Data, set it to null.
- NEVER invent GSTINs, PANs, or Bank details.
- Do not output "N/A", "Unknown", or bracketed placeholders.
- Every field object MUST include value and confidence.

### ADDENDUM LOGIC
- If payment_nodes_28_to_34 detects a deviation from the provided MSA context (e.g., Net 15 vs Master's Net 30), set has_addendum to true and populate the specific override fields.

### OUTPUT RULES
- Return JSON only.
- follow the schema exactly.
- confidenceScore summarizes overall matrix quality.
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
          content.refusal || "The AI extractor refused the request.",
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
  rawInputImage?: string;
  agencyContext: any;
  clientContext?: any;
}): Promise<AiBriefExtraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const { rawInput, rawInputImage, agencyContext, clientContext } = params;

  if (!apiKey || (!rawInput.trim() && !rawInputImage)) {
    return null;
  }

  const contextPrompt = `
AGENCY_CONTEXT (Absolute Truth for Sender):
${JSON.stringify(agencyContext, null, 2)}

CLIENT_CONTEXT (Known Master Data for Recipient):
${clientContext ? JSON.stringify(clientContext, null, 2) : "No master data for this client yet."}

RAW_INPUT_TEXT (Process this brief):
${rawInput}
  `;

  const userContent: any[] = [
    {
      type: "input_text",
      text: contextPrompt,
    },
  ];

  if (rawInputImage) {
    userContent.push({
      type: "input_image",
      image: {
        format: "jpeg",
        data: rawInputImage.replace(/^data:image\/[a-z]+;base64,/, ""),
      },
    });
  }

  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort("AI brief extraction timed out."),
    AI_EXTRACTION_TIMEOUT_MS,
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
            content: userContent,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "invoice_deep_matrix_inference_v1",
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
      console.warn(
        "AI brief extraction timed out; falling back to parser only.",
      );
      return null;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AI brief extraction failed with ${response.status}: ${errorText}`,
    );
  }

  const payload = await response.json();
  const responseText = extractOutputText(payload);
  if (!responseText) {
    return null;
  }

  try {
    const result = JSON.parse(responseText);
    const extraction = result as AiBriefDeepMatrixOutput;

    // Flatten for legacy consumption
    const legacy: AiBriefExtraction = {
      inference_matrix: extraction.inference_matrix,
      agencyName: createField(extraction.extracted_data.agencyName),
      agencyAddress: createField(extraction.extracted_data.agencyAddress),
      agencyState: createField(extraction.extracted_data.agencyState),
      clientName: createField(extraction.extracted_data.clientName),
      clientAddress: createField(extraction.extracted_data.clientAddress),
      clientCountry: createField(extraction.extracted_data.clientCountry),
      clientState: createField(extraction.extracted_data.clientState),
      clientTaxId: createField(extraction.extracted_data.clientTaxId),
      totalAmount: createField(extraction.extracted_data.totalAmount),
      currency: createField(extraction.extracted_data.currency),
      gst: {
        type: createField(extraction.extracted_data.gst.type),
        rate: createField(extraction.extracted_data.gst.rate),
        gstin: createField(extraction.extracted_data.gst.gstin),
        isRegistered: createField(extraction.extracted_data.gst.isRegistered),
        lutAvailable: createField(extraction.extracted_data.gst.lutAvailable),
        lutNumber: createField(extraction.extracted_data.gst.lutNumber),
        pan: createField(extraction.extracted_data.gst.pan),
      },
      deliverables: extraction.extracted_data.deliverables.map((d) => ({
        type: createField(d.type),
        description: createField(d.description),
        quantity: createField(d.quantity),
        rate: createField(d.rate),
        unit: createField(d.unit),
        sacCode: createField(d.sacCode),
      })),
      paymentTerms: createField(extraction.extracted_data.paymentTerms),
      paymentMode: createField(extraction.extracted_data.paymentMode),
      paymentSchedule: extraction.extracted_data.paymentSchedule.map((s) => ({
        milestone: createField(s.milestone),
        percentage: createField(s.percentage),
        dueWhen: createField(s.dueWhen),
      })),
      payment: {
        bankName: createField(extraction.extracted_data.payment.bankName),
        accountName: createField(extraction.extracted_data.payment.accountName),
        accountNumber: createField(
          extraction.extracted_data.payment.accountNumber,
        ),
        ifscCode: createField(extraction.extracted_data.payment.ifscCode),
        swiftCode: createField(extraction.extracted_data.payment.swiftCode),
        ibanOrRouting: createField(
          extraction.extracted_data.payment.ibanOrRouting,
        ),
        bankAddress: createField(extraction.extracted_data.payment.bankAddress),
      },
      timeline: {
        invoiceDate: createField(extraction.extracted_data.timeline.invoiceDate),
        dueDate: createField(extraction.extracted_data.timeline.dueDate),
        deliveryTimeline: createField(
          extraction.extracted_data.timeline.deliveryTimeline,
        ),
      },
      locations: {
        agency: createField(extraction.extracted_data.locations.agency),
        client: createField(extraction.extracted_data.locations.client),
        inferredType: createField(
          extraction.extracted_data.locations.inferredType,
        ),
      },
      license: {
        isIncluded: createField(extraction.extracted_data.license.isIncluded),
        type: createField(extraction.extracted_data.license.type),
        duration: createField(extraction.extracted_data.license.duration),
      },
      hasAddendum: createField(extraction.extracted_data.has_addendum),
      addendumNotes: createField(extraction.extracted_data.addendum_notes),
      confidenceScore: "medium",
    };

    console.log("AI STRUCTURED OUTPUT (FLATTENED):", legacy);
    return legacy;
  } catch (error) {
    console.error("Failed to parse AI structured output:", error);
    return null;
  }
}

function createField<T>(
  value: T | null | undefined,
  confidence: AiBriefConfidence = "medium",
): AiBriefField<T> {
  return {
    value: value ?? null,
    confidence,
  };
}

type AiBriefDeepMatrixOutput = {
  inference_matrix: NonNullable<AiBriefExtraction["inference_matrix"]>;
  extracted_data: {
    agencyName: string | null;
    agencyAddress: string | null;
    agencyState: string | null;
    clientName: string | null;
    clientAddress: string | null;
    clientCountry: string | null;
    clientState: string | null;
    clientTaxId: string | null;
    totalAmount: number | null;
    currency: string | null;
    gst: {
      type: AiBriefTaxType | null;
      rate: number | null;
      gstin: string | null;
      isRegistered: boolean | null;
      lutAvailable: boolean | null;
      lutNumber: string | null;
      pan: string | null;
    };
    deliverables: Array<{
      type: string | null;
      description: string | null;
      quantity: number | null;
      rate: number | null;
      unit: string | null;
      sacCode: string | null;
    }>;
    paymentTerms: string | null;
    paymentMode: string | null;
    paymentSchedule: Array<{
      milestone: string | null;
      percentage: number | null;
      dueWhen: string | null;
    }>;
    payment: {
      bankName: string | null;
      accountName: string | null;
      accountNumber: string | null;
      ifscCode: string | null;
      swiftCode: string | null;
      ibanOrRouting: string | null;
      bankAddress: string | null;
    };
    timeline: {
      invoiceDate: string | null;
      dueDate: string | null;
      deliveryTimeline: string | null;
    };
    locations: {
      agency: string | null;
      client: string | null;
      inferredType: AiBriefLocationType | null;
    };
    license: {
      isIncluded: boolean | null;
      type: LicenseType | null;
      duration: string | null;
    };
    has_addendum: boolean | null;
    addendum_notes: string | null;
  };
};

type LicenseType =
  | "full-assignment"
  | "exclusive-license"
  | "non-exclusive-license";
