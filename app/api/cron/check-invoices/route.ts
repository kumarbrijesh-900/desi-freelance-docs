import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/check-invoices
 * Vercel Cron (daily). Sends payment reminders for invoices that are awaiting
 * payment — status 'finalized' or 'PARTIAL' — including auto-generated milestone
 * child invoices (which are also 'finalized'). Skips any invoice whose project
 * is no longer active, so closing a project stops its reminders.
 *
 * Reminders fire on the due date (client + agency) and again 2 days past due
 * (agency follow-up). The reminded_due_date / reminded_overdue flags prevent
 * duplicates.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lanceinvoice.xyz";

// Branded email shell, consistent with share-invoice / nudge-client.
function renderEmail(opts: {
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<a href="${opts.ctaUrl}" style="display:inline-block;background-color:#1e3d33;color:#f0e9d6;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">${opts.ctaLabel}</a>`
      : "";
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:#111118;padding:24px 32px;">
                <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.02em;">Lance</span>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px;">
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">${opts.headline}</h1>
                ${opts.bodyHtml}
                ${cta ? `<br/>${cta}` : ""}
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <strong>Lance</strong> — Smart Invoicing for Freelancers</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function GET(request: Request) {
  // Verify this request came from Vercel Cron. Fails closed.
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Resolve agency display name (user_profiles) + login email (auth.users).
  // The email lives ONLY in auth.users — user_profiles has no email column and
  // profiles.email is empty.
  const agencyCache = new Map<string, { name: string; email?: string }>();
  async function getAgency(userId: string) {
    const cached = agencyCache.get(userId);
    if (cached) return cached;
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("agency_name")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const resolved = {
      name: profile?.agency_name || "Your Agency",
      email: userData?.user?.email || undefined,
    };
    agencyCache.set(userId, resolved);
    return resolved;
  }

  // project_id -> status, so we can skip reminders for non-active projects
  // (e.g. closed/cancelled). Closing a project therefore stops its reminders.
  async function loadProjectStatuses(invoices: { project_id?: string | null }[]) {
    const ids = Array.from(
      new Set(invoices.map((i) => i.project_id).filter(Boolean)),
    ) as string[];
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const { data: projs } = await supabaseAdmin
      .from("projects")
      .select("id, status")
      .in("id", ids);
    (projs || []).forEach((p) => map.set(p.id, p.status));
    return map;
  }

  function projectIsActive(
    inv: { project_id?: string | null },
    statuses: Map<string, string>,
  ) {
    if (!inv.project_id) return true; // legacy / no project
    const s = statuses.get(inv.project_id);
    return !s || s === "active";
  }

  const clientNameOf = (inv: any, fallback: string) =>
    (inv.form_data as any)?.client?.clientName ||
    (inv.form_data as any)?.client?.name ||
    fallback;

  try {
    const today = new Date().toISOString().split("T")[0];
    const twoDaysAgoDate = new Date();
    twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2);
    const twoDaysAgo = twoDaysAgoDate.toISOString().split("T")[0];

    console.log(`[CRON] check-invoices for ${today}`);

    const AWAITING_PAYMENT = ["finalized", "PARTIAL"];

    /* ───────── Action 1: Due today — remind client + agency ───────── */
    const { data: dueToday } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, invoice_number, user_id, shared_to_email, share_token, form_data, project_id",
      )
      .eq("due_date", today)
      .eq("reminded_due_date", false)
      .in("status", AWAITING_PAYMENT);

    if (dueToday && dueToday.length > 0) {
      const projStatuses = await loadProjectStatuses(dueToday);
      let sent = 0;
      for (const inv of dueToday) {
        if (!projectIsActive(inv, projStatuses)) continue;

        const { name: agencyName, email: agencyEmail } = await getAgency(
          inv.user_id,
        );
        const clientEmail = inv.shared_to_email as string | null;
        const clientName = clientNameOf(inv, "there");
        const shareUrl = inv.share_token
          ? `${APP_URL}/share/${inv.share_token}`
          : undefined;

        if (clientEmail) {
          await resend.emails.send({
            from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
            to: clientEmail,
            subject: `Reminder: Invoice ${inv.invoice_number} from ${agencyName} is due today`,
            html: renderEmail({
              headline: "Payment due today",
              bodyHtml: `<p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">Hi ${clientName},</p>
                <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">This is a gentle reminder that invoice <strong>${inv.invoice_number}</strong> from ${agencyName} is due for payment today. If you have already arranged payment, please disregard this note.</p>`,
              ctaLabel: shareUrl ? "View invoice →" : undefined,
              ctaUrl: shareUrl,
            }),
          });
        }

        if (agencyEmail) {
          await resend.emails.send({
            from: `Lance Automated Alerts <invoices@lanceinvoice.xyz>`,
            to: agencyEmail,
            subject: `Due today: Invoice ${inv.invoice_number} for ${clientName}`,
            html: renderEmail({
              headline: "Invoice due today",
              bodyHtml: `<p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">Invoice <strong>${inv.invoice_number}</strong> for ${clientName} is due today. We have sent the client a gentle reminder.</p>
                <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">Received the payment? Mark the invoice as <strong>Settled</strong> in your dashboard to close the loop.</p>`,
              ctaLabel: "Open dashboard →",
              ctaUrl: `${APP_URL}/dashboard`,
            }),
          });
        }

        if (clientEmail || agencyEmail) {
          await supabaseAdmin.from("notifications").insert({
            user_id: inv.user_id,
            invoice_id: inv.id,
            type: "invoice_sent",
            title: "Due date reminder sent",
            message: `Reminder sent for invoice ${inv.invoice_number} (due today).`,
            is_read: false,
          });
        }

        await supabaseAdmin
          .from("invoices")
          .update({ reminded_due_date: true })
          .eq("id", inv.id);
        sent++;
      }
      console.log(`[CRON] Processed ${sent} 'due today' reminders.`);
    }

    /* ───────── Action 2: 2 days overdue — nudge agency to follow up ───────── */
    const { data: overdue } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, user_id, form_data, project_id")
      .eq("due_date", twoDaysAgo)
      .eq("reminded_overdue", false)
      .in("status", AWAITING_PAYMENT);

    if (overdue && overdue.length > 0) {
      const projStatuses = await loadProjectStatuses(overdue);
      let sent = 0;
      for (const inv of overdue) {
        if (!projectIsActive(inv, projStatuses)) continue;

        const { email: agencyEmail } = await getAgency(inv.user_id);
        const clientName = clientNameOf(inv, "your client");

        if (agencyEmail) {
          await resend.emails.send({
            from: `Lance Automated Alerts <invoices@lanceinvoice.xyz>`,
            to: agencyEmail,
            subject: `Action required: Invoice ${inv.invoice_number} is 2 days overdue`,
            html: renderEmail({
              headline: "Invoice 2 days overdue",
              bodyHtml: `<p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">Invoice <strong>${inv.invoice_number}</strong> for ${clientName} is now 2 days past its due date.</p>
                <p style="margin:0 0 16px;font-size:16px;color:#4b5563;line-height:1.6;">If they have not paid, we recommend following up directly. If they have, mark the invoice as <strong>Settled</strong> to keep your records clean.</p>`,
              ctaLabel: "Open dashboard →",
              ctaUrl: `${APP_URL}/dashboard`,
            }),
          });
        }

        await supabaseAdmin
          .from("invoices")
          .update({ reminded_overdue: true })
          .eq("id", inv.id);
        sent++;
      }
      console.log(`[CRON] Processed ${sent} 'overdue' nudges.`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON_ERROR]", err);
    return NextResponse.json({ error: "Internal Cron Error" }, { status: 500 });
  }
}
