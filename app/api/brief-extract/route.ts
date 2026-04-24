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

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
    
    // ─── Session & Context Gathering ─────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    let context = { isGuest: true, existingClients: [] as any[] };

    if (session?.user) {
      // BRANCH A: Registered User
      const { data: clients } = await supabase
        .from("clients")
        .select("id, client_name, msa_payment_terms_days, msa_late_fee_rate, msa_ip_trigger_type, msa_jurisdiction_city")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      context = {
        isGuest: false,
        existingClients: (clients ?? []).map(c => ({
          id: c.id,
          name: c.client_name,
          msaPaymentTermsDays: c.msa_payment_terms_days,
          msaLateFeeRate: c.msa_late_fee_rate,
          msaIpTriggerType: c.msa_ip_trigger_type,
          msaJurisdictionCity: c.msa_jurisdiction_city,
        })),
      };
    } else {
      // BRANCH B: Guest Mode
      context = { isGuest: true, existingClients: [] };
    }

    const input = normalizeBriefParserInput({
      briefText: body?.briefText ?? body?.text ?? "",
      ocrText: body?.ocrText ?? "",
      voiceTranscript: body?.voiceTranscript ?? "",
      attachmentSummary: body?.attachmentSummary ?? "",
      documentId: body?.documentId,
      sourceMetadata: body?.sourceMetadata,
      context, // Pass context to Edge Function
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

    // Ensure is_guest flag is in the final JSON as requested
    const finalResponse = {
      extraction: legacyExtraction,
      parser: {
        ...parserResult.response,
        legacyExtraction,
        is_guest: context.isGuest, // Metadata for frontend
      },
      available: Boolean(parserResult.response.providerUsed),
    };

    return NextResponse.json(finalResponse);
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

