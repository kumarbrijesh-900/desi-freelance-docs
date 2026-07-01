import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderLanceEmail } from "@/lib/email-template";

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
    const ctaLabel = accepted ? "Open dashboard →" : "Review &amp; reissue →";

    await resend.emails.send({
      from: "Lance Automated Alerts <invoices@lanceinvoice.xyz>",
      to: agencyEmail,
      subject,
      html: renderLanceEmail({
        headline,
        paragraphs: [intro],
        noteBlock: proposed && note ? { label: "What the client wrote", text: note } : undefined,
        cta: { label: ctaLabel, url: dashboardUrl },
      }),
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
          html: renderLanceEmail({
            headline: "You're all set",
            paragraphs: [
              `You accepted the Master Service Agreement for invoice ${invoiceNumber} from ${escapeHtml(senderName)}. They've been notified and will begin work. Keep this email for your records.`,
            ],
            cta: { label: "View your invoice →", url: shareUrl },
          }),
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
