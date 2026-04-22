import { NextResponse } from "next/server";
import {
  invokeBriefParserGateway,
  normalizeBriefParserInput,
  toLegacyAiBriefExtraction,
  type BriefParserInputBundle,
} from "@/lib/brief-parser-gateway";

// ─── Simple in-memory rate limiter ────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per IP per window
const MAX_INPUT_BYTES = 10_240; // 10 KB max brief size

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// Periodic cleanup to prevent memory leak (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60_000);

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
  if (isRateLimited(clientIp)) {
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

