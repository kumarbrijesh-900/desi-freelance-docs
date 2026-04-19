/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import type {
  NormalizedParserBundle,
  ParserResponse,
  ProviderAttempt,
} from "./types.ts";

type PersistResult = {
  rawStored: boolean;
  documentId: string | null;
  warnings: string[];
};

function getSupabaseConfig() {
  return {
    url: Deno.env.get("SUPABASE_URL") ?? "",
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  };
}

async function getAuthenticatedUserId(
  authorizationHeader: string | null
): Promise<string | null> {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey || !authorizationHeader) {
    return null;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authorizationHeader,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return typeof payload?.id === "string" ? payload.id : null;
}

async function upsertDocument(params: {
  authorizationHeader: string;
  userId: string;
  documentId?: string | null;
  body: Record<string, unknown>;
}) {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase REST environment is not configured.");
  }

  if (params.documentId) {
    const updateResponse = await fetch(
      `${url}/rest/v1/documents?id=eq.${encodeURIComponent(
        params.documentId
      )}&user_id=eq.${encodeURIComponent(params.userId)}&select=id`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: params.authorizationHeader,
          Prefer: "return=representation",
        },
        body: JSON.stringify(params.body),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(
        `Document parser update failed with ${updateResponse.status}: ${await updateResponse.text()}`
      );
    }

    const updatedRows = await updateResponse.json();
    const updatedId = updatedRows?.[0]?.id;

    if (typeof updatedId === "string") {
      return updatedId;
    }
  }

  const insertResponse = await fetch(`${url}/rest/v1/documents?select=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: params.authorizationHeader,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: params.userId,
      project_type: "invoice",
      status: "draft",
      current_step: 0,
      ...params.body,
    }),
  });

  if (!insertResponse.ok) {
    throw new Error(
      `Document parser insert failed with ${insertResponse.status}: ${await insertResponse.text()}`
    );
  }

  const insertedRows = await insertResponse.json();
  const insertedId = insertedRows?.[0]?.id;

  return typeof insertedId === "string" ? insertedId : null;
}

export async function persistParserResult(params: {
  authorizationHeader: string | null;
  bundle: NormalizedParserBundle;
  response: ParserResponse;
  selectedAttempt: ProviderAttempt | null;
  attempts: ProviderAttempt[];
}): Promise<PersistResult> {
  const warnings: string[] = [];
  const userId = await getAuthenticatedUserId(params.authorizationHeader);

  if (!userId || !params.authorizationHeader) {
    return {
      rawStored: false,
      documentId: params.bundle.documentId ?? null,
      warnings: ["Parser result was not persisted because no authenticated user was available."],
    };
  }

  try {
    const persistedId = await upsertDocument({
      authorizationHeader: params.authorizationHeader,
      userId,
      documentId: params.bundle.documentId,
      body: {
        raw_brief: params.bundle.combinedText,
        extracted_data: {
          parser: {
            version: params.response.parserVersion,
            inputBundle: {
              briefText: params.bundle.briefText,
              ocrText: params.bundle.ocrText,
              voiceTranscript: params.bundle.voiceTranscript,
              attachmentSummary: params.bundle.attachmentSummary,
              sourceMetadata: params.bundle.sourceMetadata ?? null,
            },
            providerUsed: params.response.providerUsed,
            fallbackUsed: params.response.fallbackUsed,
            fallbackPath: params.response.fallbackPath,
            rawProviderResponse: params.selectedAttempt?.rawText ?? "",
            providerAttempts: params.attempts.map((attempt) => ({
              provider: attempt.provider,
              ok: attempt.ok,
              error: attempt.error ?? null,
            })),
            normalizedExtraction: params.response.normalizedExtraction,
            confidence: params.response.confidence,
            missingFields: params.response.missingFields,
            clarificationQuestions: params.response.clarificationQuestions,
            warnings: params.response.warnings,
            parsedAt: params.response.parsedAt,
          },
        },
        review_state: {
          parser: {
            providerUsed: params.response.providerUsed,
            fallbackPath: params.response.fallbackPath,
            confidence: params.response.confidence,
            missingFields: params.response.missingFields,
            clarificationQuestions: params.response.clarificationQuestions,
          },
        },
        updated_at: new Date().toISOString(),
      },
    });

    return {
      rawStored: Boolean(persistedId),
      documentId: persistedId,
      warnings,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));

    return {
      rawStored: false,
      documentId: params.bundle.documentId ?? null,
      warnings,
    };
  }
}
