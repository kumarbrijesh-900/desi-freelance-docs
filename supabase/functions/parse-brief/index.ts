/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { normalizeParserBundle } from "./normalization.ts";
import {
  callGeminiFlash,
  callGroqLlama,
  callGrok,
} from "./provider-adapters.ts";
import { persistParserResult } from "./persistence.ts";
import {
  postProcessProviderOutput,
  shouldEscalateToGrok,
  shouldFallbackToGroq,
} from "./postprocess.ts";
import type {
  NormalizedParserBundle,
  ParserInputBundle,
  ParserResponse,
  PostProcessResult,
  ProviderAttempt,
  ProviderName,
} from "./types.ts";

const PARSER_VERSION = "parse-brief-v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

function createEmptyResult(bundle: NormalizedParserBundle): PostProcessResult {
  return {
    extraction: {
      agency: {},
      client: {},
      deliverables: [],
      payment: {},
      meta: {},
      taxHints: {
        exportMentioned: /\bexport|international|foreign\b/i.test(
          bundle.combinedText
        ),
        sezMentioned: /\bsez\b/i.test(bundle.combinedText),
        lutMentioned: /\blut\b|\bbond\b/i.test(bundle.combinedText),
      },
    },
    confidence: {
      overall: "low",
      fields: {},
    },
    missingFields: ["client.name", "deliverables"],
    clarificationQuestions: [
      "Who should this invoice be billed to?",
      "What deliverables should be listed on the invoice?",
    ],
    warnings: ["No provider returned a usable parse."],
    hardAmbiguity: false,
    valid: false,
  };
}

async function runProviderRouting(bundle: NormalizedParserBundle) {
  const attempts: ProviderAttempt[] = [];
  let selectedAttempt: ProviderAttempt | null = null;
  let selectedResult: PostProcessResult | null = null;

  console.log("Brief parser provider attempt: gemini-flash");
  const geminiAttempt = await callGeminiFlash(bundle);
  attempts.push(geminiAttempt);
  console.log("Brief parser provider result: gemini-flash", {
    ok: geminiAttempt.ok,
  });

  if (geminiAttempt.ok) {
    const result = postProcessProviderOutput(geminiAttempt.rawJson, bundle);
    selectedAttempt = geminiAttempt;
    selectedResult = result;

    if (!shouldFallbackToGroq(result)) {
      return { attempts, selectedAttempt, selectedResult };
    }
  }

  console.log("Brief parser provider attempt: groq-llama");
  const groqAttempt = await callGroqLlama(bundle);
  attempts.push(groqAttempt);
  console.log("Brief parser provider result: groq-llama", {
    ok: groqAttempt.ok,
  });

  if (groqAttempt.ok) {
    const result = postProcessProviderOutput(groqAttempt.rawJson, bundle);
    selectedAttempt = groqAttempt;
    selectedResult = result;

    if (!shouldEscalateToGrok(result)) {
      return { attempts, selectedAttempt, selectedResult };
    }
  }

  if (selectedResult && !shouldEscalateToGrok(selectedResult)) {
    return { attempts, selectedAttempt, selectedResult };
  }

  console.log("Brief parser provider attempt: grok");
  const grokAttempt = await callGrok(bundle);
  attempts.push(grokAttempt);
  console.log("Brief parser provider result: grok", {
    ok: grokAttempt.ok,
  });

  if (grokAttempt.ok) {
    selectedAttempt = grokAttempt;
    selectedResult = postProcessProviderOutput(grokAttempt.rawJson, bundle);
  }

  return {
    attempts,
    selectedAttempt,
    selectedResult: selectedResult ?? createEmptyResult(bundle),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  let input: ParserInputBundle;

  try {
    input = (await request.json()) as ParserInputBundle;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const bundle = normalizeParserBundle(input);

  if (!bundle.combinedText.trim()) {
    return jsonResponse(
      { error: "briefText, ocrText, or voiceTranscript is required." },
      { status: 400 }
    );
  }

  const parsedAt = new Date().toISOString();
  const { attempts, selectedAttempt, selectedResult } = await runProviderRouting(
    bundle
  );
  const fallbackPath = attempts.map((attempt) => attempt.provider);
  const providerUsed = selectedAttempt?.ok
    ? (selectedAttempt.provider as ProviderName)
    : null;

  console.log("Brief parser provider selected:", providerUsed ?? "none", {
    fallbackPath,
  });

  const initialResponse: ParserResponse = {
    normalizedExtraction: selectedResult.extraction,
    confidence: selectedResult.confidence,
    missingFields: selectedResult.missingFields,
    clarificationQuestions: selectedResult.clarificationQuestions,
    providerUsed,
    fallbackUsed: fallbackPath.length > 1,
    fallbackPath,
    rawStored: false,
    documentId: bundle.documentId ?? null,
    warnings: [
      ...selectedResult.warnings,
      ...attempts
        .filter((attempt) => !attempt.ok && attempt.error)
        .map((attempt) => `${attempt.provider}: ${attempt.error}`),
    ],
    parserVersion: PARSER_VERSION,
    parsedAt,
  };

  const persistence = await persistParserResult({
    authorizationHeader: request.headers.get("authorization"),
    bundle,
    response: initialResponse,
    selectedAttempt,
    attempts,
  });

  return jsonResponse({
    ...initialResponse,
    rawStored: persistence.rawStored,
    documentId: persistence.documentId,
    warnings: [...initialResponse.warnings, ...persistence.warnings],
  });
});
