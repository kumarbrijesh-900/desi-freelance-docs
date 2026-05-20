import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MsaResponseSchema = z.object({
  shareToken: z.string().min(1, "shareToken is required"),
  response: z.enum(["ACCEPTED", "REVISION ASKED", "PENDING"]),
  note: z.string().max(2000).trim().optional().nullable(),
});

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
  const supabaseAuth = await createServerClient();

  try {
    const body = await req.json();
    const result = MsaResponseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 },
      );
    }
    const { shareToken, response, note } = result.data;

    // 0. Fetch the invoice to check ownership
    const { data: existingInvoice, error: fetchErr } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, invoice_number, shared_to_email, form_data")
      .eq("share_token", shareToken)
      .single();

    if (fetchErr || !existingInvoice) {
      console.error("MSA_RESPONSE_FETCH_ERROR:", fetchErr);
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // SECURITY GUARD: invoice owners cannot accept or reject their own MSA.
    // This protects the audit trail integrity. The agency can preview the
    // share page but the acceptance action is reserved for the client.
    const {
      data: { user: __mssa_currentUser },
    } = await supabaseAuth.auth.getUser();
    if (
      __mssa_currentUser &&
      existingInvoice &&
      __mssa_currentUser.id === existingInvoice.user_id
    ) {
      return NextResponse.json(
        {
          error: "owner_cannot_accept_own_msa",
          message:
            "The invoice owner cannot accept or reject their own MSA. Send the share link to your client.",
        },
        { status: 403 }
      );
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
      .eq("id", existingInvoice.id)
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
      const subject = response === "ACCEPTED" 
        ? `Action Required: MSA Accepted for Invoice ${inv.invoice_number}`
        : `Action Required: MSA Changes Proposed for Invoice ${inv.invoice_number}`;
      
      const message = response === "ACCEPTED"
        ? `Great news! Your client (${inv.shared_to_email}) has accepted the Master Service Agreement and viewed Invoice ${inv.invoice_number}.`
        : `Your client (${inv.shared_to_email}) has proposed changes to the MSA for Invoice ${inv.invoice_number}.<br/><br/><strong>Proposal:</strong> "${note}"`;

      await resend.emails.send({
        from: "Lance Notifications <notifications@lanceinvoice.xyz>",
        to: ownerEmail,
        subject: subject,
        html: `
          <div style="font-family:sans-serif;padding:24px;border:1px solid #eee;border-radius:12px;max-width:500px;">
            <h2 style="margin-top:0;font-size:18px;">${subject}</h2>
            <p style="color:#444;line-height:1.6;font-size:15px;">${message}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="font-size:12px;color:#888;">Log in to your <a href="https://lanceinvoice.xyz/invoices" style="color:#111;font-weight:700;">Lance dashboard</a> to view full details and reissue the invoice.</p>
          </div>
        `
      });
    }

    // 4. Create in-app notification
    const notificationTitle = response === "ACCEPTED" ? "MSA Approved" : "MSA Changes Proposed";
    const notificationMessage = response === "ACCEPTED"
      ? `Client has accepted the MSA and viewed Invoice ${inv.invoice_number}.`
      : `Client has proposed changes to the MSA for Invoice ${inv.invoice_number}. View Proposal.`;

    await supabaseAdmin.from("notifications").insert({
      user_id: inv.user_id,
      type: `msa_${response}`,
      title: notificationTitle,
      message: notificationMessage,
      invoice_id: inv.id,
      is_read: false,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("MSA_RESPONSE_CRITICAL_ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
