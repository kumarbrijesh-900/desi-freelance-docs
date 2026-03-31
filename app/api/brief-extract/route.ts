import { NextResponse } from "next/server";
import { extractInvoiceBriefWithAi } from "@/lib/ai-brief-extractor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body?.text ?? "";

    if (!text.trim()) {
      return NextResponse.json(
        { extraction: null, available: false, error: "Text is required." },
        { status: 400 }
      );
    }

    const extraction = await extractInvoiceBriefWithAi(text);

    return NextResponse.json({
      extraction,
      available: Boolean(process.env.OPENAI_API_KEY),
    });
  } catch (error) {
    console.error("AI brief extraction failed:", error);

    return NextResponse.json(
      {
        extraction: null,
        available: Boolean(process.env.OPENAI_API_KEY),
        error: "AI brief extraction failed.",
      },
      { status: 200 }
    );
  }
}
