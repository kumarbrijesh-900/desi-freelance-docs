import { Resend } from "resend";
import { computeAppliedMsaSnapshot } from "@/lib/msa-applied-snapshot";

export interface FireMilestoneInvoiceResult {
  childInvoiceId?: string;
  token?: string;
  invoiceNumber?: string;
  milestoneIndex?: number;
  ok?: boolean;
  error?: string;
}

function updateFormDataMilestones(
  formData: any,
  statusUpdates: Map<number, string>,
  dueDate?: string,
) {
  return {
    ...(formData || {}),
    meta: {
      ...((formData || {}).meta || {}),
      ...(dueDate ? { dueDate } : {}),
    },
    milestones: Array.isArray(formData?.milestones)
      ? formData.milestones.map((milestone: any, index: number) => {
          const nextStatus = statusUpdates.get(index);
          return nextStatus ? { ...milestone, status: nextStatus } : milestone;
        })
      : formData?.milestones,
  };
}

export async function fireMilestoneInvoice(
  supabase: any,
  milestoneRow: any,
  projectRow?: any,
): Promise<FireMilestoneInvoiceResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const invoiceId = milestoneRow?.invoice_id;
  const nextMilestoneIndex = Number(milestoneRow?.order_index ?? 0);
  const nowIso = new Date().toISOString();

  if (!invoiceId) {
    throw new Error("Milestone row is missing invoice_id");
  }

  if (nextMilestoneIndex === 0) {
    return {
      ok: false,
      error: "first milestone is billed on the master; cannot fire as a child",
    };
  }

  const { data: parent, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (fetchError || !parent) {
    throw new Error(fetchError?.message || "Parent invoice not found");
  }

  const effectiveProjectId = projectRow?.id || parent.project_id || null;
  const formData = parent.form_data || {};
  const formMilestones = Array.isArray(formData?.milestones) ? formData.milestones : [];
  const nextMilestone =
    formMilestones[nextMilestoneIndex] ||
    (milestoneRow
      ? {
          title: milestoneRow.title || `Milestone ${nextMilestoneIndex + 1}`,
          status: milestoneRow.status || "PENDING",
          lineItems: [],
        }
      : null);

  if (!nextMilestone) {
    throw new Error("No more milestones");
  }

  const paymentTermsDays = Number(formData?.meta?.paymentTerms) || 15;
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays);
  const calculatedDueDate = dueDateObj.toISOString().split("T")[0];

  const statusUpdates = new Map<number, string>();
  if (nextMilestoneIndex > 0) {
    statusUpdates.set(nextMilestoneIndex - 1, "SETTLED");
  }
  statusUpdates.set(nextMilestoneIndex, "LIVE");

  const updatedParentFormData = updateFormDataMilestones(
    formData,
    statusUpdates,
    calculatedDueDate,
  );

  const { error: parentUpdateError } = await supabase
    .from("invoices")
    .update({
      due_date: calculatedDueDate,
      status: "PARTIAL",
      form_data: updatedParentFormData,
      ...computeAppliedMsaSnapshot(updatedParentFormData as any),
      applied_payment_terms: (updatedParentFormData as any).meta?.paymentTerms
        ? `Net ${(updatedParentFormData as any).meta.paymentTerms} days`
        : computeAppliedMsaSnapshot(updatedParentFormData as any).applied_payment_terms,
    })
    .eq("id", invoiceId);

  if (parentUpdateError) {
    throw new Error(parentUpdateError.message);
  }

  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data: existingNumbers } = await supabase
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
  const appliedSnapshot = computeAppliedMsaSnapshot(childFormData as any);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const randBytes = Array.from(crypto.getRandomValues(new Uint8Array(12)));
  const token = randBytes.map((b) => chars[b % chars.length]).join("");

  const { data: childInvoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: newInvoiceNumber,
      form_data: childFormData,
      status: "finalized",
      template_id: parent.template_id ?? "classic",
      user_id: parent.user_id,
      parent_invoice_id: invoiceId,
      milestone_index: nextMilestoneIndex + 1,
      msa_id: parent.msa_id,
      msa_response: "pending",
      share_token: token,
      shared_to_email: parent.shared_to_email,
      shared_at: nowIso,
      due_date: calculatedDueDate,
      project_id: effectiveProjectId,
      client_id: parent.client_id ?? null,
      ...appliedSnapshot,
      applied_payment_terms: childFormData.meta?.paymentTerms
        ? `Net ${childFormData.meta.paymentTerms} days`
        : appliedSnapshot.applied_payment_terms,
    })
    .select()
    .single();

  if (insertError || !childInvoice) {
    throw new Error(insertError?.message ?? "Failed to create invoice");
  }

  const milestoneUpdate = supabase
    .from("invoice_milestones")
    .update({
      status: "LIVE",
      trigger_mode: milestoneRow?.trigger_mode === "scheduled" ? "scheduled" : "immediate",
      trigger_status: "fired",
      trigger_error: null,
      trigger_fired_at: nowIso,
    });

  const { error: fireMilestoneError } = milestoneRow?.id
    ? await milestoneUpdate.eq("id", milestoneRow.id)
    : await milestoneUpdate
        .eq("invoice_id", invoiceId)
        .eq("order_index", nextMilestoneIndex);

  if (fireMilestoneError) {
    throw new Error(fireMilestoneError.message);
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_name")
    .eq("user_id", parent.user_id)
    .maybeSingle();

  const agencyName = profile?.agency_name || "Your Agency";
  const clientEmail = parent.shared_to_email;
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`;

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
                  <a href="${shareUrl}" style="display:inline-block;background:#111118;color:var(--color-lime-warm);font-size:15px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
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

    await supabase.from("notifications").insert({
      user_id: parent.user_id,
      type: "invoice_sent",
      title: `Milestone ${nextMilestoneIndex + 1} invoice sent`,
      message: `Milestone ${nextMilestoneIndex + 1} invoice was automatically sent to ${clientEmail}.`,
      invoice_id: childInvoice.id,
      is_read: false,
    });
  }

  return {
    childInvoiceId: childInvoice.id,
    token,
    invoiceNumber: newInvoiceNumber,
    milestoneIndex: nextMilestoneIndex,
  };
}
