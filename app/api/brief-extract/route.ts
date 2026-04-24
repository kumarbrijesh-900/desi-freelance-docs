import { NextResponse } from "next/server";
import {
  invokeBriefParserGateway,
  normalizeBriefParserInput,
  toLegacyAiBriefExtraction,
  type BriefParserInputBundle,
} from "@/lib/brief-parser-gateway";

import { ratelimit } from "@/lib/upstash";

const MAX_INPUT_BYTES = 10_240; // 10 KB max brief size

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  // ─── Rate limiting ────────────────────────────────────────
  const clientIp = getClientIp(request);
  const { success } = await ratelimit.limit(clientIp);

  if (!success) {
    return NextResponse.json(
      {
        extraction: null,
        parser: null,
        available: false,
        error: "Too many requests. Please try again in a minute.",
      },
      { status: 429 }
    );
  }

  try {
    // ─── Input size guard ─────────────────────────────────────
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_INPUT_BYTES) {
      return NextResponse.json(
        {
          extraction: null,
          parser: null,
          available: false,
          error: "Request body too large. Maximum brief size is 10 KB.",
        },
        { status: 413 }
      );
    }

    const body = (await request.json()) as
      | (BriefParserInputBundle & { text?: string })
      | null;
    const input = normalizeBriefParserInput({
      briefText: body?.briefText ?? body?.text ?? "",
      ocrText: body?.ocrText ?? "",
      voiceTranscript: body?.voiceTranscript ?? "",
      attachmentSummary: body?.attachmentSummary ?? "",
      documentId: body?.documentId,
      sourceMetadata: body?.sourceMetadata,
    });

    if (!input.combinedText.trim()) {
      return NextResponse.json(
        {
          extraction: null,
          parser: null,
          available: false,
          error: "Text, OCR text, or voice transcript is required.",
        },
        { status: 400 }
      );
    }

    const parserResult = await invokeBriefParserGateway({
      input,
      authorizationHeader: request.headers.get("authorization"),
    });

    if (!parserResult.ok) {
      console.error("=== EDGE FUNCTION GATEWAY FAILED ===", parserResult);
      return NextResponse.json(
        {
          extraction: null,
          parser: null,
          available: false,
          error: parserResult.error,
        },
        { status: 200 }
      );
    }

    const legacyExtraction =
      parserResult.response.legacyExtraction ??
      toLegacyAiBriefExtraction(parserResult.response);

    return NextResponse.json({
      extraction: legacyExtraction,
      parser: {
        ...parserResult.response,
        legacyExtraction,
      },
      available: Boolean(parserResult.response.providerUsed),
    });
  } catch (error) {
    console.error("Brief parser gateway request failed:", error);
    return NextResponse.json(
      {
        extraction: null,
        parser: null,
        available: false,
        error: "Brief parser gateway request failed.",
      },
      { status: 200 }
    );
  }
}

