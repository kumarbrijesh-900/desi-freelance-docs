import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

/**
 * POST /api/msa-response
 * Handles client response (accept/reject) to an MSA.
 * Updates the database and notifies the agency owner.
 */
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { shareToken, response, note } = await req.json();

    if (!shareToken || !["accepted", "rejected", "negotiating"].includes(response)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // 1. Update the invoice status
    const { data: inv, error: updateErr } = await supabaseAdmin
      .from("invoices")
      .update({
        msa_status: response,
        msa_response: response, // Keep legacy field synced
        msa_responded_at: new Date().toISOString(),
        client_msa_note: note || null,
      })
      .eq("share_token", shareToken)
      .select("id, user_id, invoice_number, shared_to_email, form_data")
      .single();

    if (updateErr || !inv) {
      console.error("MSA_RESPONSE_UPDATE_ERROR:", updateErr);
      return NextResponse.json({ error: "Invoice not found or update failed" }, { status: 404 });
    }

    // 2. Fetch agency owner email and profile
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("agency_name, user_id")
      .eq("user_id", inv.user_id)
      .single();
    
    // Get user email from auth
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(inv.user_id);
    const ownerEmail = userData?.user?.email;

    const agencyName = profile?.agency_name || "Agency Owner";

    // 3. Send email notification to agency owner
    if (ownerEmail) {
      const subject = response === "accepted" 
        ? `Action Required: MSA Accepted for Invoice ${inv.invoice_number}`
        : `Notification: MSA ${response === "rejected" ? "Rejected" : "Negotiation"} for Invoice ${inv.invoice_number}`;
      
      const message = response === "accepted"
        ? `Great news! Your client (${inv.shared_to_email}) has accepted the Master Service Agreement and viewed Invoice ${inv.invoice_number}.`
        : response === "rejected"
          ? `Your client (${inv.shared_to_email}) has declined the Master Service Agreement for Invoice ${inv.invoice_number}.`
          : `Your client (${inv.shared_to_email}) has proposed changes to the MSA for Invoice ${inv.invoice_number}: "${note}"`;

      await resend.emails.send({
        from: "Lance Notifications <notifications@lanceinvoice.xyz>",
        to: ownerEmail,
        subject: subject,
        html: `
          <div style="font-family:sans-serif;padding:24px;border:1px solid #eee;border-radius:12px;max-width:500px;">
            <h2 style="margin-top:0;">${subject}</h2>
            <p style="color:#444;line-height:1.6;">${message}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="font-size:12px;color:#888;">Log in to your Lance dashboard to view full details.</p>
          </div>
        `
      });
    }

    // 4. Create in-app notification
    await supabaseAdmin.from("notifications").insert({
      user_id: inv.user_id,
      type: `msa_${response}`,
      title: response === "accepted" ? "MSA Approved" : "MSA Response",
      message: response === "accepted" 
        ? `Client has accepted the MSA and viewed Invoice ${inv.invoice_number}.`
        : `Client responded: ${response} to MSA for ${inv.invoice_number}`,
      invoice_id: inv.id,
      is_read: false,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("MSA_RESPONSE_CRITICAL_ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
