import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const rawBrief = body?.rawBrief ?? "";

  const lowerBrief = rawBrief.toLowerCase();

  const projectType = lowerBrief.includes("logo")
    ? "logo-design"
    : lowerBrief.includes("social media")
    ? "social-media-design"
    : lowerBrief.includes("ui") || lowerBrief.includes("ux")
    ? "ui-ux-design"
    : lowerBrief.includes("illustration")
    ? "illustration"
    : lowerBrief.includes("photo")
    ? "photography"
    : lowerBrief.includes("video")
    ? "video-editing"
    : "";

  const clientNameMatch =
    rawBrief.match(/client named\s+([A-Za-z0-9&\-\s]+?)(?=\s+the|\s+for|\s*,|\.|$)/i) ||
    rawBrief.match(/client is\s+([A-Za-z0-9&\-\s]+?)(?=\s+the|\s+for|\s*,|\.|$)/i) ||
    rawBrief.match(/called\s+([A-Za-z0-9&\-\s]+?)(?=\s+the|\s+for|\s*,|\.|$)/i);

  const timelineMatch = rawBrief.match(
    /(\d+\s*(?:day|days|week|weeks|month|months|year|years))/i
  );

  const revisionsMatch = rawBrief.match(
    /(\d+\s*(?:revision|revisions|round|rounds))/i
  );

  const feeMatch = rawBrief.match(
    /(₹\s?\d[\d,]*|\d[\d,]*\s?(?:rupees|inr))/i
  );

  return NextResponse.json({
    clientName: clientNameMatch ? clientNameMatch[1].trim() : "",
    projectType,
    deliverables: [],
    timeline: timelineMatch ? timelineMatch[1].trim() : "",
    revisions: revisionsMatch ? revisionsMatch[1].trim() : "",
    fee: feeMatch ? feeMatch[1].trim() : "",
    gstApplicable: false,
    notes: rawBrief,
    exclusions: [],
  });
}