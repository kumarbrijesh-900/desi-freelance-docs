import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/track-view
 * Tracks when a client opens an invoice link.
 * Updates read_receipts and notifies the agency owner.
 */
export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { invoiceId, userAgent } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    // 1. Record the view in read_receipts
    await supabaseAdmin.from("read_receipts").insert({
      invoice_id: invoiceId,
      viewer_ua: userAgent || "unknown",
    });

    // 2. Check if this is the FIRST view to notify the owner
    const { count } = await supabaseAdmin
      .from("read_receipts")
      .select("*", { count: "exact", head: true })
      .eq("invoice_id", invoiceId);

    if (count === 1) {
      // Fetch invoice info
      const { data: inv } = await supabaseAdmin
        .from("invoices")
        .select("user_id, invoice_number")
        .eq("id", invoiceId)
        .single();

      if (inv) {
        // Trigger in-app notification
        await supabaseAdmin.from("notifications").insert({
          user_id: inv.user_id,
          invoice_id: invoiceId,
          type: "invoice_viewed",
          title: "Invoice Viewed",
          message: `Client opened Invoice ${inv.invoice_number}.`,
          is_read: false,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("TRACK_VIEW_ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
