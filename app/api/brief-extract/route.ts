import { NextResponse } from "next/server";
import { extractInvoiceBriefWithAi } from "@/lib/ai-brief-extractor";
import { ratelimit } from "@/lib/upstash";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const MAX_INPUT_BYTES = 10_240; // 10 KB max brief size

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const BriefExtractSchema = z.object({
  raw_input: z.string().max(10240),
  raw_input_image: z.string().optional().nullable(),
  agency_context: z.object({
    businessName: z.string().optional().nullable(),
    full_name: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    gstin: z.string().optional().nullable(),
  }),
  client_context: z
    .object({
      id: z.string().uuid().optional().nullable(),
      name: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      gstinOrTaxId: z.string().optional().nullable(),
      msa: z
        .object({
          payment_terms: z.number().optional().nullable(),
          late_fee: z.number().optional().nullable(),
          ip_trigger: z.string().optional().nullable(),
          jurisdiction: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
  documentId: z.string().uuid().optional().nullable(),
  isRetry: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    // ─── Auth verification ─────────────────────────────────────
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ─── Rate limiting ────────────────────────────────────────
    const clientIp = getClientIp(request);
    const { success } = await ratelimit.limit(clientIp);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again in a minute.",
        },
        { status: 429 },
      );
    }

    // ─── Input size guard ─────────────────────────────────────
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_INPUT_BYTES * 50) {
      // Increased for images
      return NextResponse.json(
        {
          error: "Request body too large.",
        },
        { status: 413 },
      );
    }

    const body = await request.json();
    const result = BriefExtractSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload.",
          details: result.error.format(),
        },
        { status: 400 },
      );
    }

    const validatedData = result.data;

    // ─── AI Extraction Stage ─────────────────────────────────
    const extraction = await extractInvoiceBriefWithAi({
      rawInput: validatedData.raw_input,
      rawInputImage: validatedData.raw_input_image || undefined,
      agencyContext: validatedData.agency_context,
      clientContext: validatedData.client_context,
    });

    if (!extraction) {
      return NextResponse.json(
        {
          error: "AI engine failed to parse the brief.",
        },
        { status: 502 },
      );
    }

    // The extraction already contains { reasoning_log, invoice_data }
    return NextResponse.json({
      extraction,
      available: true,
    });
  } catch (error) {
    console.error("Omniscient Agent extraction failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
