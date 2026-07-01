import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderLanceEmail } from "@/lib/email-template";

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
      .select("agency_name")
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
    let paragraphs: string[];
    let cta: string;

    if (isMsaPending) {
      subject = `Action needed: Please review terms for invoice ${invoiceNumber} — ${agencyName}`;
      headline = "Agreement Pending Review";
      paragraphs = [
        `Hi ${clientName},`,
        `A gentle reminder that invoice <strong>${invoiceNumber}</strong> from ${agencyName} requires your review and acceptance of the Master Service Agreement terms before proceeding.`,
        `Please take a moment to review the terms at your earliest convenience so we can proceed smoothly.`,
      ];
      cta = "Review Terms & Invoice →";
    } else {
      subject = `Payment reminder: Invoice ${invoiceNumber} from ${agencyName}`;
      headline = "Friendly Payment Reminder";
      paragraphs = [
        `Hi ${clientName},`,
        `Just a friendly nudge that invoice <strong>${invoiceNumber}</strong> from ${agencyName} has a payment date approaching or past due.`,
        `If you have already processed the payment, please disregard this email. Otherwise, we'd appreciate it if you could arrange payment at your earliest convenience.`,
      ];
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
      html: renderLanceEmail({
        headline,
        paragraphs,
        cta: { label: cta, url: shareUrl },
        finePrint: `This is a reminder from ${agencyName}. This secure link was sent only to ${clientEmail}.`,
      }),
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
