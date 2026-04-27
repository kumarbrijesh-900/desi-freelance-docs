import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ratelimit } from "@/lib/upstash";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/share-invoice — sends invoice link to client via email.
 * Link is NEVER returned to the UI. Only goes to the client's inbox.
 */

function generateShareToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let token = "";
  for (let i = 0; i < bytes.length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const ShareInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  clientEmail: z.string().email(),
  msaId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  // Initialized here (not module level) so env vars are read at request time
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // ─── 0. Rate limiting ───
    const clientIp = getClientIp(req);
    const hasRatelimitKeys = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (hasRatelimitKeys) {
      const { success } = await ratelimit.limit(clientIp);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again in 10 seconds." },
          { status: 429 },
        );
      }
    }

    // ─── 0.5. Zod Validation ───
    const body = await req.json();
    const result = ShareInvoiceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", details: result.error.format() },
        { status: 400 },
      );
    }

    const { invoiceId, clientEmail, msaId } = result.data;

    /* ── 1. Fetch invoice and verify it exists ── */
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, share_token, form_data, template_id")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
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
          status: "SENT",
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
    const hasAddendum = false;

    const { error: emailError } = await resend.emails.send({
      from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
      to: clientEmail,
      subject: `Invoice from ${agencyName} — ready for your review`,
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
                      Invoice from ${agencyName}
                    </h1>
                    <p style="margin:0 0 32px;font-size:16px;color:#4b5563;line-height:1.6;">
                      A new invoice is ready for your review. Please review the Master Service Agreement terms before viewing the final invoice.
                    </p>
                    
                    <a href="${shareUrl}"
                      style="display:inline-block;background:#111118;color:#d4ff00;font-size:15px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
                      View Invoice & Terms →
                    </a>
                    
                    <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      This secure link was sent only to ${clientEmail}. It will expire once the invoice is processed.
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
      console.error("RESEND_ERROR:", emailError);
      return NextResponse.json(
        {
          error:
            "Email delivery failed. Invoice was saved but not sent. Please try again.",
        },
        { status: 500 },
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
  } catch (err: any) {
    console.error("SHARE_INVOICE_CRITICAL_ERROR:", err);
    return NextResponse.json(
      { error: `Server error: ${err?.message || "Unknown error"}` },
      { status: 500 },
    );
  }
}
