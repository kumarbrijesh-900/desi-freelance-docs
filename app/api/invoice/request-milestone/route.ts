import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RequestMilestoneSchema = z.object({
  invoiceId: z.string().uuid(),
  milestoneId: z.string(),
});

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json();
    const result = RequestMilestoneSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { invoiceId, milestoneId } = result.data;

    // 1. Fetch invoice and verified token/email
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, share_token, shared_to_email, form_data")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice || !invoice.share_token || !invoice.shared_to_email) {
      return NextResponse.json({ error: "Invoice share data not found" }, { status: 404 });
    }

    // 2. Fetch agency name
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("agency_name")
      .eq("user_id", invoice.user_id)
      .maybeSingle();

    const agencyName = profile?.agency_name || "Your Agency";
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${invoice.share_token}`;

    // 3. Find milestone description
    const milestone = invoice.form_data.lineItems.find((li: any) => li.id === milestoneId);
    const milestoneTitle = milestone?.description || "Next Milestone";

    // 4. Send Email via Resend
    const { error: emailError } = await resend.emails.send({
      from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
      to: invoice.shared_to_email,
      subject: `Action Required: Next Milestone for Invoice — ${agencyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <tr style="background:#111118;padding:24px 32px;">
                  <td style="padding:24px 32px;">
                    <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.02em;">Lance</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 32px;">
                    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">
                      Next Milestone Ready
                    </h1>
                    <p style="margin:0 0 24px;font-size:16px;color:#4b5563;line-height:1.6;">
                      The next phase of your project is ready: <strong>${milestoneTitle}</strong>. 
                    </p>
                    <p style="margin:0 0 32px;font-size:16px;color:#4b5563;line-height:1.6;">
                      Please view the updated ledger to process the next milestone payment.
                    </p>
                    
                    <a href="${shareUrl}"
                      style="display:inline-block;background:#111118;color:#d4ff00;font-size:15px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
                      View Milestone Ledger →
                    </a>
                    
                    <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      This notification was sent by ${agencyName}.
                    </p>
                  </td>
                </tr>
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
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("REQUEST_MILESTONE_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
