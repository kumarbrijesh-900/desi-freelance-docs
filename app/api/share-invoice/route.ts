import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/share-invoice — sends invoice link to client via email.
 * Link is NEVER returned to the UI. Only goes to the client's inbox.
 */

function generateShareToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export async function POST(req: NextRequest) {
  // Initialized here (not module level) so env vars are read at request time
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { invoiceId, clientEmail, msaId } = await req.json();

    if (!invoiceId || !clientEmail) {
      return NextResponse.json(
        { error: "invoiceId and clientEmail are required." },
        { status: 400 }
      );
    }

    /* ── 1. Fetch invoice and verify it exists ── */
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, share_token, form_data, template_id")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    /* ── 2. Fetch agency name from user_profiles ── */
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("agency_name")
      .eq("user_id", invoice.user_id)
      .maybeSingle();

    const agencyName = profile?.agency_name || "Your Agency";

    /* ── 3. Generate or reuse share token ── */
    let token = invoice.share_token;
    if (!token) {
      token = generateShareToken();
      await supabaseAdmin
        .from("invoices")
        .update({
          share_token: token,
          shared_at: new Date().toISOString(),
          shared_to_email: clientEmail,
          status: "finalized",
          ...(msaId ? { msa_id: msaId } : {}),
        })
        .eq("id", invoiceId);
    } else {
      // Update email and MSA even if token already exists (resend scenario)
      await supabaseAdmin
        .from("invoices")
        .update({
          shared_to_email: clientEmail,
          shared_at: new Date().toISOString(),
          ...(msaId !== undefined ? { msa_id: msaId } : {}),
        })
        .eq("id", invoiceId);
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${token}`;

    /* ── 4. Send email to client (link only goes to inbox) ── */
    const hasMsa = !!msaId;
    const { error: emailError } = await resend.emails.send({
      from: `${agencyName} via Lance <invoices@resend.dev>`,
      to: clientEmail,
      subject: `Invoice from ${agencyName} — ready for your review`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background:#111118;padding:24px 32px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:#d4ff00;border-radius:6px;font-weight:900;font-size:16px;color:#111118;text-decoration:none;">L</span>
                    <span style="color:#fff;font-size:16px;font-weight:700;margin-left:10px;letter-spacing:-0.02em;">Lance</span>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111118;letter-spacing:-0.02em;">
                      Invoice ready for your review
                    </h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      <strong style="color:#111118;">${agencyName}</strong> has sent you an invoice via Lance.
                      ${hasMsa ? "Please review and accept the Master Service Agreement before viewing the invoice." : "Click below to view your invoice."}
                    </p>
                    ${hasMsa ? `
                    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;background:#f9fafb;">
                      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">What to expect</p>
                      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
                        You will be asked to read and accept a Master Service Agreement (MSA) from ${agencyName}. This protects both parties and outlines the terms of work. You can also propose changes.
                      </p>
                    </div>
                    ` : ""}
                    <a href="${shareUrl}"
                      style="display:inline-block;background:#111118;color:#d4ff00;font-size:14px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
                      ${hasMsa ? "Review MSA &amp; View Invoice →" : "View Invoice →"}
                    </a>
                    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
                      This link is private and was sent only to ${clientEmail}. Do not share it.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="border-top:1px solid #f3f4f6;padding:16px 32px;">
                    <p style="margin:0;font-size:11px;color:#9ca3af;">
                      Powered by <strong>Lance</strong> — Professional Invoicing for Freelancers
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("RESEND_ERROR:", emailError);
      return NextResponse.json(
        { error: "Email delivery failed. Invoice was saved but not sent. Please try again." },
        { status: 500 }
      );
    }

    /* ── 5. Create in-app notification for the agency ── */
    await supabaseAdmin.from("notifications").insert({
      user_id: invoice.user_id,
      type: "invoice_sent",
      title: "Invoice sent to client",
      message: `Your invoice was delivered to ${clientEmail}.${hasMsa ? " They must accept your MSA before viewing it." : ""}`,
      invoice_id: invoiceId,
      is_read: false,
    });

    /* ── 6. Return only the token (for state sync — URL never exposed to UI) ── */
    return NextResponse.json({ token, success: true });
  } catch (err) {
    console.error("SHARE_INVOICE_ERROR:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
