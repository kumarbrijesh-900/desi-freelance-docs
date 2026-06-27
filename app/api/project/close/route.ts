import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/project/close
 * Closes a project early — distinct from completion (all milestones settled).
 * Records a reason, stamps closed_at, sets status='closed', and cancels any
 * still-pending milestone triggers so no further child invoices are generated.
 * Owner-only: the caller must be the project's owner.
 */

const CloseSchema = z.object({
  project_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
  notify_client: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  // 1. Authenticated user (session) — only the owner may close.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Validate body.
  const body = await req.json().catch(() => null);
  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A project and a closure reason are required." },
      { status: 400 },
    );
  }
  const { project_id, reason, notify_client } = parsed.data;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 3. Close the project — ownership enforced inline in the WHERE clause.
    const { data: closed, error: closeErr } = await supabaseAdmin
      .from("projects")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closure_reason: reason,
      })
      .eq("id", project_id)
      .eq("user_id", user.id)
      .select("id, name")
      .maybeSingle();

    if (closeErr) {
      console.error("PROJECT_CLOSE_UPDATE_ERROR:", closeErr);
      return NextResponse.json(
        { error: "Could not close the project." },
        { status: 500 },
      );
    }
    if (!closed) {
      // Either it doesn't exist or it isn't this user's project.
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // 4. Cancel still-pending milestone triggers so no further invoices fire.
    const { data: projInvoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    const invoiceIds = (projInvoices || []).map((i) => i.id);
    if (invoiceIds.length > 0) {
      await supabaseAdmin
        .from("invoice_milestones")
        .update({
          status: "cancelled",
          trigger_status: "cancelled",
          trigger_mode: "cancelled",
        })
        .in("invoice_id", invoiceIds)
        .eq("trigger_status", "pending");
    }

    // 5. Optionally send the client a brief, neutral closure notice. The internal
    //    closure reason is NEVER included — the client only learns the project is
    //    no longer active. A failed send must not fail the close itself.
    let notified = false;
    if (notify_client) {
      try {
        const { data: master } = await supabaseAdmin
          .from("invoices")
          .select("shared_to_email, form_data")
          .eq("project_id", project_id)
          .eq("user_id", user.id)
          .is("parent_invoice_id", null)
          .maybeSingle();

        const clientEmail = (master?.shared_to_email as string | null) || null;
        if (clientEmail) {
          const { data: profile } = await supabaseAdmin
            .from("user_profiles")
            .select("agency_name")
            .eq("user_id", user.id)
            .maybeSingle();

          const agencyName = profile?.agency_name || "Your Agency";
          const clientName =
            (master?.form_data as any)?.client?.clientName ||
            (master?.form_data as any)?.client?.name ||
            "there";
          const projectName = closed.name || "your project";

          const resend = new Resend(process.env.RESEND_API_KEY);
          const { error: emailError } = await resend.emails.send({
            from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
            to: clientEmail,
            subject: `Update on your project with ${agencyName}`,
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
                        <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">Project closed</h1>
                        <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">Hi ${clientName},</p>
                        <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">We're writing to let you know that ${agencyName} has closed the project <strong>${projectName}</strong>, and it is no longer active. No further invoices will be sent for this project.</p>
                        <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">If you have any questions, please reply to this email or reach out to ${agencyName} directly.</p>
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
          if (!emailError) notified = true;
          else console.error("PROJECT_CLOSE_EMAIL_ERROR:", emailError);
        }
      } catch (mailErr) {
        console.error("PROJECT_CLOSE_EMAIL_EXCEPTION:", mailErr);
      }
    }

    return NextResponse.json({ success: true, notified });
  } catch (err: any) {
    console.error("PROJECT_CLOSE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
