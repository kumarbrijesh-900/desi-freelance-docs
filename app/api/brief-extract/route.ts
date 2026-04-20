import { NextResponse } from "next/server";
import {
  invokeBriefParserGateway,
  normalizeBriefParserInput,
  toLegacyAiBriefExtraction,
  type BriefParserInputBundle,
} from "@/lib/brief-parser-gateway";

export async function POST(request: Request) {
  try {
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
