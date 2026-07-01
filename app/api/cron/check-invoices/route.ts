import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { renderLanceEmail } from "@/lib/email-template";

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
            html: renderLanceEmail({
              headline: "Payment due today",
              paragraphs: [
                `Hi ${clientName},`,
                `This is a gentle reminder that invoice <strong>${inv.invoice_number}</strong> from ${agencyName} is due for payment today. If you have already arranged payment, please disregard this note.`,
              ],
              cta: shareUrl ? { label: "View invoice →", url: shareUrl } : undefined,
            }),
          });
        }

        if (agencyEmail) {
          await resend.emails.send({
            from: `Lance Automated Alerts <invoices@lanceinvoice.xyz>`,
            to: agencyEmail,
            subject: `Due today: Invoice ${inv.invoice_number} for ${clientName}`,
            html: renderLanceEmail({
              headline: "Invoice due today",
              paragraphs: [
                `Invoice <strong>${inv.invoice_number}</strong> for ${clientName} is due today. We have sent the client a gentle reminder.`,
                `Received the payment? Mark the invoice as <strong>Settled</strong> in your dashboard to close the loop.`,
              ],
              cta: { label: "Open dashboard →", url: `${APP_URL}/dashboard` },
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
            html: renderLanceEmail({
              headline: "Invoice 2 days overdue",
              paragraphs: [
                `Invoice <strong>${inv.invoice_number}</strong> for ${clientName} is now 2 days past its due date.`,
                `If they have not paid, we recommend following up directly. If they have, mark the invoice as <strong>Settled</strong> to keep your records clean.`,
              ],
              cta: { label: "Open dashboard →", url: `${APP_URL}/dashboard` },
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
