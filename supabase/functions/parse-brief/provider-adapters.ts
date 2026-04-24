/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import type {
  NormalizedParserBundle,
  ProviderAttempt,
  ProviderName,
} from "./types.ts";

const GEMINI_TIMEOUT_MS = 30000;
const GROQ_TIMEOUT_MS = 30000;
const GROK_TIMEOUT_MS = 30000;

const JSON_SCHEMA_DESCRIPTION = `
Return strict JSON with this shape. ALWAYS output the _thought_process field first to reason through the data before filling the remaining fields!
{
  "_thought_process": {
    "identity_status": "guest | partial_data | full_data",
    "gstin_logic": "Explain how you identified the client GSTIN vs agency GSTIN.",
    "tax_logic": "Compare state codes to determine IGST vs CGST/SGST.",
    "categorization_logic": "Explain SAC code choices."
  },
  "is_guest": boolean,
  "client_details": {
    "client_id": "uuid if known, else null",
    "is_new_client": boolean,
    "name": "Proper Noun",
    "gstin": "string or null",
    "state_code": "2 digit string or null",
    "is_international": boolean
  },
  "tax_determination": {
    "tax_type": "IGST | CGST_SGST | LUT | NONE",
    "tax_rate_percentage": 18
  },
  "msa_terms": {
    "payment_terms": "string",
    "ip_transfer_trigger": "string"
  },
  "line_items": [
    { "description": "string", "sac_code": "string", "qty": number, "base_rate": number }
  ]
}
`;

function createPrompt(bundle: NormalizedParserBundle, resolverMode = false) {
  const { context } = bundle;
  const databaseContext = context?.databaseContext ?? { user_state: "guest" };

  return `
You are the "Autonomous Billing Engine" for Lance, a premium freelance platform.
Your mission is to transform unstructured briefs into perfect, tax-compliant relational data.

DATABASE_CONTEXT (The User's Reality):
${JSON.stringify(databaseContext, null, 2)}

Strict Reasoning Rules (Process these in _thought_process):
1. **IDENTITY RESOLUTION**: Check the DATABASE_CONTEXT. Are you dealing with a guest, a registered user with a new client, or a registered user with a known client? Map to existing 'client_id' if known (fuzzy match client name).
2. **GSTIN DISAMBIGUATION**: If multiple GSTINs are present in the text, cross-reference them with the Agency GSTIN in the DATABASE_CONTEXT to determine which belongs to the Agency and which belongs to the Client.
3. **TAX GEOGRAPHY**: The first 2 digits of an Indian GSTIN represent the State Code. Compare the Agency State Code to the Client State Code. 
   - Match = CGST/SGST.
   - Differ = IGST.
   - International = LUT (if client is outside India).
4. **CATEGORIZATION**: Analyze the work and assign the correct SAC code:
   - UX/UI / Product Design = 998314
   - Web / App Development = 998313
   - 3D / Motion / Video = 998315
   - Branding / Strategy = 998311
5. **MATH DELEGATION**: Extract the base rates and quantities perfectly. Do NOT calculate the final grand total with taxes. Default qty to 1 if not mentioned.

General Extraction Rules:
- **Client Name**: Extract ONLY the official proper noun. Ignore conversational descriptors.
- **Line Items**: Meticulously separate distinct deliverables.
- **Quantities vs. Terms**: NEVER confuse payment term days (e.g., Net 15) with item quantities.
- **Strict Schema Adherence**: You MUST return the full JSON structure. Use explicit empty values (null, [], "") if data is missing.

${resolverMode ? "- You are the final ambiguity resolver. Focus on contradictions, tax/SEZ/export uncertainty, and unclear pricing." : ""}

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

export function callGrok(bundle: NormalizedParserBundle) {
  return callOpenAiCompatibleProvider({
    provider: "grok",
    apiKeyName: "GROK_API_KEY",
    modelName: "GROK_MODEL",
    defaultModel: "grok-4.20-reasoning",
    url: "https://api.x.ai/v1/chat/completions",
    bundle,
    resolverMode: true,
    timeoutMs: GROK_TIMEOUT_MS,
  });
}