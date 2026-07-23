/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import type {
  NormalizedParserBundle,
  ProviderAttempt,
  ProviderName,
} from "./types.ts";

const GEMINI_TIMEOUT_MS = 30000;
const GROQ_TIMEOUT_MS = 30000;

const JSON_SCHEMA_DESCRIPTION = `
Return strict JSON with this shape. ALWAYS output the _scratchpad field first to reason through the data before filling the remaining fields!
{
  "_scratchpad": "string (Think step-by-step about locations, tax rules, exact numbers from colloquial Indian slang, missing data, and ambiguities)",
  "normalizedExtraction": {
    "agency": {
      "businessName": string|null,
      "gstRegistered": boolean|null,
      "gstin": string|null,
      "pan": string|null,
      "lutEnabled": boolean|null,
      "lutNumber": string|null,
      "addressLine1": string|null,
      "addressLine2": string|null,
      "city": string|null,
      "state": string|null,
      "pinCode": string|null,
      "country": string|null
    },
    "client": {
      "name": string|null,
      "email": string|null,
      "location": "domestic"|"international"|null,
      "gstinOrTaxId": string|null,
      "isSezUnit": boolean|null,
      "country": string|null,
      "addressLine1": string|null,
      "addressLine2": string|null,
      "city": string|null,
      "state": string|null,
      "pinCode": string|null,
      "postalCode": string|null
    },
    "deliverables": [
      {
        "type": string|null,
        "description": string|null,
        "quantity": number|null,
        "rate": number|null,
        "unit": string|null,
        "sacCode": string|null
      }
    ],
    "milestones": [
      {
        "title": string|null,
        "percent": number|null,
        "amount": number|null,
        "condition": string|null,
        "date": string|null
      }
    ],
    "payment": {
      "terms": string|null,
      "mode": string|null,
      "accountName": string|null,
      "bankName": string|null,
      "bankAddress": string|null,
      "accountNumber": string|null,
      "ifscCode": string|null,
      "swiftCode": string|null,
      "ibanOrRouting": string|null
    },
    "meta": {
      "invoiceNumber": string|null,
      "invoiceDate": string|null,
      "dueDate": string|null,
      "currency": string|null,
      "totalAmount": number|null
    },
    "taxHints": {
      "treatment": "CGST_SGST"|"IGST"|"ZERO_RATED"|"NONE"|null,
      "rate": number|null,
      "domesticOrInternational": "domestic"|"international"|null,
      "placeOfSupply": string|null,
      "exportMentioned": boolean|null,
      "sezMentioned": boolean|null,
      "lutMentioned": boolean|null,
      "ambiguity": string|null
    }
  },
  "confidence": {
    "overall": "high"|"medium"|"low",
    "fields": { "field.path": "high"|"medium"|"low" }
  },
  "missingFields": string[],
  "clarificationQuestions": string[],
  "warnings": string[]
}
`;

function createPrompt(bundle: NormalizedParserBundle, resolverMode = false) {
  return `
You are a highly intelligent, GST-aware freelance invoice parser trained for the Indian context.

Parse the input bundle into invoice-ready structured data. Return JSON only. You must always use the _scratchpad first to reason about the extraction.

Rules:
- Extract only grounded values. Never invent GSTIN, tax treatment, dates, or prices.
- **Registration needs a GSTIN**: Set agency.gstRegistered = true ONLY when an agency (supplier) GSTIN is actually present. If no agency GSTIN is stated, set gstRegistered = null — NEVER true. Claiming registration with no GSTIN produces an invoice that charges GST while carrying none, which is invalid.
- **Strict Name Boundaries**: When extracting 'agency.businessName' or 'client.name', extract ONLY the exact, short proper noun. NEVER extract entire sentences or action phases (e.g., skip "doing a total of dedh lakh...").
- **Indian Numerals & Slang**: Accurately convert informal amounts. "18k" = 18000, "1 lakh" = 100000, "athraa hazaar" = 18000, "dedh lakh" (1.5L) = 150000. Normalize all rates to digits.
- **Locations & Taxes**: If agency state and client state are identical, taxHints.treatment should strongly lean toward "CGST_SGST". If states differ but both are in India, use "IGST".
- **Contradicting Locations**: If the text gives two mutually exclusive locations for the SAME entity (e.g., "Pune" and "Gurgaon" for the client), DO NOT guess or merge them. Leave both location fields completely blank and ask a 'clarificationQuestion' asking which is correct.
- **Payment Terms & Structure**: Always capture any stated payment arrangement into payment.terms, preserving the wording. This includes net terms ("Net 15", "pay me in a couple weeks" -> "Net 15"/"14 Days") AND partial or milestone structures ("40% advance", "50% upfront rest on delivery", "milestone-based", "advance + balance"). Do not leave payment.terms empty when the brief states any such arrangement.
- **UPI IDs are atomic**: A UPI/VPA handle (any name@provider pattern, e.g. "ruhnika@okhdfcbank", "priya@ybl") must be captured VERBATIM and WHOLE into payment.accountName. NEVER split it at "@", never move the suffix into bankName, and never infer a bank from the handle. Set payment.mode to "UPI" when a VPA is present, and leave bankName null unless a bank is explicitly named in the text.
- If typed text, OCR, and voice contradict each other, mark ambiguity and ask concise clarification questions.
- If a client is outside India, mark client.location as international.
- Split multiple deliverables into separate line items.
- **SAC Categorization**: Assign each deliverable the closest 6-digit sacCode from this table; prefer a confident closest match over null. Only use null if the work is too vague to categorize at all.
  - Web / Website / App / Landing page (build, development or redesign) = 998314
  - UX / UI / Product Design = 998314
  - Logo / Branding / Graphic / Print / Packaging Design = 998391
  - Illustration / Concept art = 999632
  - Animation / Motion Graphics = 999612
  - Video / Photography / Film shoot = 998387
  - Video Editing / Reels / Shorts = 999613
  - Social Media Content = 998361
  - Writing / Copywriting / Content = 998399
- **Milestone Schedules (structured)**: When the brief states a split or phased payment plan ("40% advance on signing, 40% on design approval, 20% on go-live", "50% upfront rest on delivery"), populate normalizedExtraction.milestones with one entry per phase — percent OR amount, the triggering condition, and any stated date (normalize to YYYY-MM-DD). Keep payment.terms as the human-readable summary; milestones[] is the structured truth. NEVER drop stated milestone dates.
- **Currency Discipline**: Set meta.currency ONLY when the brief states it explicitly or uses an unambiguous symbol/code (₹/Rs/INR, $/USD, €/EUR, £/GBP, AED, SGD...). If amounts have no stated currency and the client is international, leave currency null and ask a clarificationQuestion for it. NEVER default an international client to INR.
- **totalAmount is PRE-TAX**: meta.totalAmount is always the pre-tax subtotal (before GST). If the brief gives a tax-inclusive figure with a known rate, back the tax out; if unsure, leave totalAmount null and add a warning. Never return a GST-inclusive total.
- **Numbers must be literal**: Every numeric JSON value (quantity, rate, amount, percent, totalAmount) MUST be a single finished number such as 176000. NEVER output an arithmetic expression, formula, or string like "35000 * 4 + 18000 * 2" — do the math yourself and emit only the result. An expression is invalid JSON and fails the entire parse.
- **Zero-rated needs LUT status**: If treatment would be ZERO_RATED but LUT is not mentioned, still hint ZERO_RATED only alongside a clarificationQuestion asking whether an LUT is on file (without LUT, export is IGST-with-refund).
- Model output is not final business logic. Prefer unresolved questions and confidence: "low" over false certainty.

Few-Shot Example Context:
If input is: "I did a logo design for Metro Shoes in Bangalore for athraa hazaar. My agency is in Karnataka."
Your _scratchpad should be: "Agency is in Karnataka. Client Metro Shoes is in Bangalore, which is also Karnataka. Same state means intra-state supply, so CGST_SGST applies. Rate is 'athraa hazaar' which translates to 18000 INR."

${resolverMode ? '- You are the final ambiguity resolver. Focus on contradictions, tax/SEZ/export uncertainty, and unclear pricing.' : ""}

${JSON_SCHEMA_DESCRIPTION}

Input bundle:
${bundle.combinedText}
`.trim();
}

function parseJsonFromText(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function createFailedAttempt(
  provider: ProviderName,
  error: unknown
): ProviderAttempt {
  return {
    provider,
    ok: false,
    rawText: "",
    rawJson: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function callGeminiFlash(
  bundle: NormalizedParserBundle
): Promise<ProviderAttempt> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_FLASH_MODEL") || "gemini-1.5-flash";

  if (!apiKey) {
    return createFailedAttempt("gemini-flash", "GEMINI_API_KEY is not set.");
  }

  try {
    const response = await fetchJsonWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: createPrompt(bundle) }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
      GEMINI_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(
        `Gemini returned ${response.status}: ${await response.text()}`
      );
    }

    const payload = await response.json();
    const rawText =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text ??
      payload?.text ??
      "";

    return {
      provider: "gemini-flash",
      ok: true,
      rawText,
      rawJson: parseJsonFromText(rawText),
    };
  } catch (error) {
    return createFailedAttempt("gemini-flash", error);
  }
}

async function callOpenAiCompatibleProvider(params: {
  provider: ProviderName;
  apiKeyName: string;
  modelName: string;
  defaultModel: string;
  url: string;
  bundle: NormalizedParserBundle;
  resolverMode?: boolean;
  timeoutMs: number;
}): Promise<ProviderAttempt> {
  const apiKey = Deno.env.get(params.apiKeyName);
  const model = Deno.env.get(params.modelName) || params.defaultModel;

  if (!apiKey) {
    return createFailedAttempt(
      params.provider,
      `${params.apiKeyName} is not set.`
    );
  }

  try {
    const response = await fetchJsonWithTimeout(
      params.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You return strict JSON only. You are careful with GST, SAC, SEZ, export, and pricing ambiguity.",
            },
            {
              role: "user",
              content: createPrompt(params.bundle, params.resolverMode),
            },
          ],
        }),
      },
      params.timeoutMs
    );

    if (!response.ok) {
      throw new Error(
        `${params.provider} returned ${response.status}: ${await response.text()}`
      );
    }

    const payload = await response.json();
    const rawText = payload?.choices?.[0]?.message?.content ?? "";

    return {
      provider: params.provider,
      ok: true,
      rawText,
      rawJson: parseJsonFromText(rawText),
    };
  } catch (error) {
    return createFailedAttempt(params.provider, error);
  }
}

export function callGroqLlama(bundle: NormalizedParserBundle) {
  return callOpenAiCompatibleProvider({
    provider: "groq-llama",
    apiKeyName: "GROQ_API_KEY",
    modelName: "GROQ_LLAMA_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    url: "https://api.groq.com/openai/v1/chat/completions",
    bundle,
    timeoutMs: GROQ_TIMEOUT_MS,
  });
}
