import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/nudge-client
 * Sends a polite payment/MSA reminder email to the client.
 * Does NOT change invoice or milestone status — purely a reminder.
 */

const NudgeSchema = z.object({
  invoice_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json();
    const result = NudgeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { invoice_id } = result.data;

    /* ── 1. Fetch invoice ── */
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, user_id, invoice_number, share_token, shared_to_email, due_date, status, msa_status, form_data",
      )
      .eq("id", invoice_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 },
      );
    }

    const clientEmail = invoice.shared_to_email;
    if (!clientEmail) {
      return NextResponse.json(
        { error: "No client email found — invoice has not been shared yet." },
        { status: 400 },
      );
    }

    /* ── 2. Fetch agency profile ── */
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("email, agency_name")
      .eq("user_id", invoice.user_id)
      .maybeSingle();

    const agencyName = profile?.agency_name || "Your Agency";
    const clientName =
      (invoice.form_data as any)?.client?.clientName ||
      (invoice.form_data as any)?.client?.name ||
      "Client";
    const invoiceNumber = invoice.invoice_number || "INV";

    /* ── 3. Determine context for email copy ── */
    const msaStatus = (invoice.msa_status || "").toLowerCase();
    const isMsaPending =
      msaStatus === "pending" || msaStatus === "proposed";
    const shareUrl = invoice.share_token
      ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${invoice.share_token}`
      : null;

    let subject: string;
    let headline: string;
    let bodyHtml: string;
    let cta: string;

    if (isMsaPending) {
      subject = `Action needed: Please review terms for invoice ${invoiceNumber} — ${agencyName}`;
      headline = "Agreement Pending Review";
      bodyHtml = `<p>Hi ${clientName},</p>
        <p>A gentle reminder that invoice <strong>${invoiceNumber}</strong> from ${agencyName} requires your review and acceptance of the Master Service Agreement terms before proceeding.</p>
        <p>Please take a moment to review the terms at your earliest convenience so we can proceed smoothly.</p>`;
      cta = "Review Terms & Invoice →";
    } else {
      subject = `Payment reminder: Invoice ${invoiceNumber} from ${agencyName}`;
      headline = "Friendly Payment Reminder";
      bodyHtml = `<p>Hi ${clientName},</p>
        <p>Just a friendly nudge that invoice <strong>${invoiceNumber}</strong> from ${agencyName} has a payment date approaching or past due.</p>
        <p>If you have already processed the payment, please disregard this email. Otherwise, we'd appreciate it if you could arrange payment at your earliest convenience.</p>`;
      cta = "View Invoice →";
    }

    /* ── 4. Send email ── */
    if (!shareUrl) {
      return NextResponse.json(
        { error: "Invoice has no share link — cannot nudge." },
        { status: 400 },
      );
    }

    const { error: emailError } = await resend.emails.send({
      from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
      to: clientEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background:#111118;padding:24px 32px;">
                    <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.02em;">Lance</span>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 32px;">
                    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">
                      ${headline}
                    </h1>
                    ${bodyHtml}
                    <br/>
                    <a href="${shareUrl}"
                      style="display:inline-block;background-color:#1e3d33;color:#f0e9d6;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
                      ${cta}
                    </a>
                    <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      This is a reminder from ${agencyName}. This secure link was sent only to ${clientEmail}.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      Powered by <strong>Lance</strong> — Smart Invoicing for Freelancers
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
      console.error("NUDGE_EMAIL_ERROR:", emailError);
      return NextResponse.json(
        { error: "Email delivery failed. Please try again." },
        { status: 500 },
      );
    }

    /* ── 5. Create notification for agency ── */
    await supabaseAdmin.from("notifications").insert({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      type: "invoice_sent",
      title: "Payment Reminder Sent",
      message: `Nudge sent to ${clientEmail} for invoice ${invoiceNumber}.`,
      is_read: false,
    });

    /* ── 6. Mark invoice as nudged (update reminded flag) ── */
    await supabaseAdmin
      .from("invoices")
      .update({ reminded_due_date: true })
      .eq("id", invoice.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("NUDGE_CLIENT_ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
