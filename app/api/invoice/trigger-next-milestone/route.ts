import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { computeAppliedMsaSnapshot } from "@/lib/msa-applied-snapshot";

export const dynamic = "force-dynamic";

const Schema = z.object({
  parentInvoiceId: z.string().uuid(),
  nextMilestoneIndex: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json();
    const result = Schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { parentInvoiceId, nextMilestoneIndex } = result.data;

    // 1. Fetch parent invoice
    const { data: parent, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", parentInvoiceId)
      .single();

    if (fetchError || !parent) {
      return NextResponse.json({ error: "Parent invoice not found" }, { status: 404 });
    }

    const formData = parent.form_data;
    const milestones = formData?.milestones ?? [];

    if (nextMilestoneIndex >= milestones.length) {
      return NextResponse.json({ error: "No more milestones" }, { status: 400 });
    }

    const nextMilestone = milestones[nextMilestoneIndex];

    // 2. Generate next sequential invoice number
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const { data: existingNumbers } = await supabaseAdmin
      .from("invoices")
      .select("invoice_number")
      .eq("user_id", parent.user_id)
      .ilike("invoice_number", `${prefix}%`);

    let maxNum = 0;
    for (const row of existingNumbers ?? []) {
      const match = (row.invoice_number ?? "").match(/^INV-\d{4}-(\d+)$/i);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
    const newInvoiceNumber = `INV-${year}-${String(maxNum + 1).padStart(4, "0")}`;

    // 3. Build child invoice form_data — only the next milestone
    // Calculate due date: today + payment terms days
    const paymentTermsDays = Number(formData?.meta?.paymentTerms) || 15;
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays);
    const calculatedDueDate = dueDateObj.toISOString().split("T")[0];

    const childFormData = {
      ...formData,
      milestones: [nextMilestone],
      meta: {
        ...formData.meta,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: calculatedDueDate,
      },
    };

    // 4. Generate share token
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const randBytes = Array.from(crypto.getRandomValues(new Uint8Array(12)));
    const token = randBytes.map((b) => chars[b % chars.length]).join("");

    // 5. Insert child invoice
    const { data: childInvoice, error: insertError } = await supabaseAdmin
      .from("invoices")
      .insert({
        invoice_number: newInvoiceNumber,
        form_data: childFormData,
        status: "finalized",
        template_id: parent.template_id ?? "classic",
        user_id: parent.user_id,
        parent_invoice_id: parentInvoiceId,
        milestone_index: nextMilestoneIndex + 1,
        msa_id: parent.msa_id,
        msa_response: "pending",
        share_token: token,
        shared_to_email: parent.shared_to_email,
        shared_at: new Date().toISOString(),
        due_date: calculatedDueDate,
        ...computeAppliedMsaSnapshot(childFormData as any),
      })
      .select()
      .single();

    if (insertError || !childInvoice) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create invoice" },
        { status: 500 }
      );
    }

    // 6. Fetch agency name
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("agency_name")
      .eq("user_id", parent.user_id)
      .maybeSingle();

    const agencyName = profile?.agency_name || "Your Agency";
    const clientEmail = parent.shared_to_email;
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`;

    // 7. Send email if client email exists
    if (clientEmail) {
      await resend.emails.send({
        from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
        to: clientEmail,
        subject: `Milestone ${nextMilestoneIndex + 1} Invoice from ${agencyName} — ready for review`,
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
                    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111118;letter-spacing:-0.03em;">
                      Milestone ${nextMilestoneIndex + 1} Invoice from ${agencyName}
                    </h1>
                    <p style="margin:0 0 32px;font-size:16px;color:#4b5563;line-height:1.6;">
                      Your previous milestone has been completed. The next milestone invoice is now ready for your review.
                    </p>
                    <a href="${shareUrl}" style="display:inline-block;background:#111118;color:#d4ff00;font-size:15px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
                      View Milestone ${nextMilestoneIndex + 1} Invoice →
                    </a>
                    <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      This secure link was sent only to ${clientEmail}.
                    </p>
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

      await supabaseAdmin.from("notifications").insert({
        user_id: parent.user_id,
        type: "invoice_sent",
        title: `Milestone ${nextMilestoneIndex + 1} invoice sent`,
        message: `Milestone ${nextMilestoneIndex + 1} invoice was automatically sent to ${clientEmail}.`,
        invoice_id: childInvoice.id,
        is_read: false,
      });
    }

    return NextResponse.json({ success: true, childInvoiceId: childInvoice.id, token });
  } catch (err: any) {
    console.error("TRIGGER_NEXT_MILESTONE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
