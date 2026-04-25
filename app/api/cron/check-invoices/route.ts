import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/check-invoices
 * Vercel Cron endpoint. Runs daily to check invoice due dates.
 */
export async function GET(request: Request) {
  // 1. Verify this request actually came from Vercel Cron (security)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    
    // Get date for 2 days ago
    const twoDaysAgoDate = new Date();
    twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2);
    const twoDaysAgo = twoDaysAgoDate.toISOString().split("T")[0];

    console.log(`[CRON] Running checks for today: ${today}`);

    /* ─────────────────────────────────────────────────────────────────
       ACTION 1: Mark Past-Due Invoices as 'overdue'
       (If status is 'finalized' and due_date < today)
       ───────────────────────────────────────────────────────────────── */
    const { data: toMarkOverdue, error: overdueErr } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("status", "finalized")
      .lt("due_date", today);

    if (!overdueErr && toMarkOverdue?.length) {
      const ids = toMarkOverdue.map(i => i.id);
      await supabaseAdmin
        .from("invoices")
        .update({ status: "overdue" })
        .in("id", ids);
      console.log(`[CRON] Marked ${ids.length} invoices as overdue.`);
    }

    /* ─────────────────────────────────────────────────────────────────
       ACTION 2: "Due Today" - Gentle Nudge
       ───────────────────────────────────────────────────────────────── */
    const { data: dueToday } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, user_id, shared_to_email, form_data")
      .eq("due_date", today)
      .eq("reminded_due_date", false)
      .in("status", ["finalized", "overdue"]);

    if (dueToday && dueToday.length > 0) {
      for (const inv of dueToday) {
        // Fetch agency profile to get their email
        const { data: profile } = await supabaseAdmin
          .from("user_profiles")
          .select("email, agency_name")
          .eq("user_id", inv.user_id)
          .single();

        const agencyName = profile?.agency_name || "Your Agency";
        const clientEmail = inv.shared_to_email;
        const agencyEmail = profile?.email;
        const clientName = (inv.form_data as any)?.client?.name || "Client";

        // Only send if we have emails
        if (clientEmail && agencyEmail) {
          // Send to Client
          await resend.emails.send({
            from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
            to: clientEmail,
            subject: `Reminder: Invoice ${inv.invoice_number} from ${agencyName} is due today`,
            html: `<p>Hi ${clientName},</p><p>This is a gentle reminder that invoice <strong>${inv.invoice_number}</strong> from ${agencyName} is due for payment today.</p><p>If you have already processed the payment, please disregard this email.</p>`,
          });

          // Send to Agency
          await resend.emails.send({
            from: `Lance Automated Alerts <invoices@lanceinvoice.xyz>`,
            to: agencyEmail,
            subject: `Due Today: Invoice ${inv.invoice_number} for ${clientName}`,
            html: `<p>Your invoice <strong>${inv.invoice_number}</strong> for ${clientName} is due today.</p><p>We have sent a gentle reminder to the client. <br/><br/><strong>Did you receive payment?</strong> Don't forget to mark this invoice as "Settled" in your dashboard to close the loop.</p>`,
          });

          // Update flag
          await supabaseAdmin.from("invoices").update({ reminded_due_date: true }).eq("id", inv.id);
        }
      }
      console.log(`[CRON] Sent ${dueToday.length} 'Due Today' reminders.`);
    }

    /* ─────────────────────────────────────────────────────────────────
       ACTION 3: "2 Days Overdue" - Urgent Nudge to Close Loop
       ───────────────────────────────────────────────────────────────── */
    const { data: twoDaysOverdue } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, user_id, shared_to_email, form_data")
      .eq("due_date", twoDaysAgo)
      .eq("reminded_overdue", false)
      .eq("status", "overdue"); // Ensure it hasn't been settled

    if (twoDaysOverdue && twoDaysOverdue.length > 0) {
      for (const inv of twoDaysOverdue) {
        const { data: profile } = await supabaseAdmin
          .from("user_profiles")
          .select("email, agency_name")
          .eq("user_id", inv.user_id)
          .single();

        const agencyEmail = profile?.email;
        const clientName = (inv.form_data as any)?.client?.name || "Client";

        if (agencyEmail) {
          // Urgent Nudge to Agency
          await resend.emails.send({
            from: `Lance Automated Alerts <invoices@lanceinvoice.xyz>`,
            to: agencyEmail,
            subject: `Action Required: Invoice ${inv.invoice_number} is 2 Days Overdue`,
            html: `<p><strong>Invoice ${inv.invoice_number} for ${clientName} is now 2 days past its due date.</strong></p><p>If the client has not paid, we recommend following up with them directly.</p><p>If they <em>have</em> paid, please log into your Lance dashboard and mark the invoice as "Settled" to close the loop and keep your records clean.</p>`,
          });

          // Update flag
          await supabaseAdmin.from("invoices").update({ reminded_overdue: true }).eq("id", inv.id);
        }
      }
      console.log(`[CRON] Sent ${twoDaysOverdue.length} 'Overdue' urgent nudges.`);
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[CRON_ERROR]", err);
    return NextResponse.json({ error: "Internal Cron Error" }, { status: 500 });
  }
}
