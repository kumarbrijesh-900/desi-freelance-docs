import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/msa-response
 * Emails the agency owner when their client responds to the MSA on the public
 * share page (accepts, or proposes changes). The share page itself performs the
 * invoice update and writes the in-app notification; this route ONLY sends the
 * owner email, because Resend is a server-side secret and cannot run in the
 * browser. The share page calls it fire-and-forget, so it never blocks the client.
 *
 * The email type is derived from the invoice's CURRENT msa_status (not from any
 * client-supplied flag), so it always reflects real state and cannot be spoofed
 * into sending the wrong notice.
 */

const Schema = z.object({
  shareToken: z.string().min(1),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { shareToken } = parsed.data;

    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, user_id, invoice_number, shared_to_email, msa_status, client_msa_note, form_data",
      )
      .eq("share_token", shareToken)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const status = (invoice.msa_status || "").toLowerCase();
    const accepted = status === "accepted";
    const proposed = status === "proposed";
    // Only these two states warrant an owner email.
    if (!accepted && !proposed) {
      return NextResponse.json({ success: true, emailed: false });
    }

    // Agency email lives only in auth.users; display name in user_profiles.
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("agency_name")
      .eq("user_id", invoice.user_id)
      .maybeSingle();
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
      invoice.user_id,
    );
    const agencyEmail = userData?.user?.email;
    if (!agencyEmail) {
      return NextResponse.json({ success: true, emailed: false });
    }

    const agencyName = profile?.agency_name || "there";
    const clientName =
      (invoice.form_data as any)?.client?.clientName ||
      (invoice.form_data as any)?.client?.name ||
      "Your client";
    const invoiceNumber = invoice.invoice_number || "your invoice";
    const clientEmail = invoice.shared_to_email || "your client";
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://lanceinvoice.xyz"}/dashboard`;
    const note = (invoice.client_msa_note || "").trim();

    const subject = accepted
      ? `${clientName} accepted your terms — Invoice ${invoiceNumber}`
      : `${clientName} proposed changes — Invoice ${invoiceNumber}`;
    const headline = accepted ? "Terms accepted" : "Client proposed changes";
    const intro = accepted
      ? `Good news — ${clientName} (${clientEmail}) accepted the Master Service Agreement for invoice ${invoiceNumber}. You're clear to begin work.`
      : `${clientName} (${clientEmail}) reviewed the Master Service Agreement for invoice ${invoiceNumber} and proposed changes before accepting.`;
    const noteBlock =
      proposed && note
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
               <tr><td style="border-left:4px solid #c8943b;background:#f6ecd6;padding:16px 20px;">
                 <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a5772a;">What the client wrote</p>
                 <p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563;white-space:pre-wrap;font-style:italic;">&quot;${escapeHtml(note)}&quot;</p>
               </td></tr>
             </table>`
        : "";
    const ctaLabel = accepted ? "Open dashboard →" : "Review &amp; reissue →";

    await resend.emails.send({
      from: "Lance Automated Alerts <invoices@lanceinvoice.xyz>",
      to: agencyEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                <tr><td style="background:#111118;padding:24px 32px;">
                  <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.02em;">Lance</span>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">${headline}</h1>
                  <p style="margin:0 0 24px;font-size:16px;color:#4b5563;line-height:1.6;">${intro}</p>
                  ${noteBlock}
                  <a href="${dashboardUrl}" style="display:inline-block;background-color:#1e3d33;color:#f0e9d6;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">${ctaLabel}</a>
                </td></tr>
                <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <strong>Lance</strong> — Smart Invoicing for Freelancers</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    // Client-facing confirmation — acceptance only, best-effort.
    // A failed client send must never break the agency email or the route,
    // so it is wrapped in its own try/catch and gated on a real recipient.
    if (accepted && invoice.shared_to_email) {
      const senderName = profile?.agency_name || "your freelancer";
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://lanceinvoice.xyz"}/share/${shareToken}`;
      try {
        await resend.emails.send({
          from: "Lance <invoices@lanceinvoice.xyz>",
          to: invoice.shared_to_email,
          subject: `You're all set — Invoice ${invoiceNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                    <tr><td style="background:#111118;padding:24px 32px;">
                      <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.02em;">Lance</span>
                    </td></tr>
                    <tr><td style="padding:40px 32px;">
                      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">You're all set</h1>
                      <p style="margin:0 0 24px;font-size:16px;color:#4b5563;line-height:1.6;">You accepted the Master Service Agreement for invoice ${invoiceNumber} from ${escapeHtml(senderName)}. They've been notified and will begin work. Keep this email for your records.</p>
                      <a href="${shareUrl}" style="display:inline-block;background-color:#1e3d33;color:#f0e9d6;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">View your invoice →</a>
                    </td></tr>
                    <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <strong>Lance</strong> — Smart Invoicing for Freelancers</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
          `,
        });
      } catch (clientErr) {
        console.error("MSA_CLIENT_CONFIRM_EMAIL_ERROR:", clientErr);
      }
    }

    return NextResponse.json({ success: true, emailed: true });
  } catch (err: any) {
    console.error("MSA_RESPONSE_EMAIL_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
