import { Resend } from "resend";
import { computeAppliedMsaSnapshot } from "@/lib/msa-applied-snapshot";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { renderLanceEmail } from "@/lib/email-template";

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

  // CA-3 defense-in-depth: a GST-registered supply must never fall into the
  // tax engine's silent 'exempt' branch on this server money path. The parent
  // was validated at finalize; this guards corrupted/legacy rows only.
  if (formData?.agency?.gstRegistrationStatus === "registered") {
    const clientStateOk =
      formData?.client?.clientLocation === "international" ||
      Boolean(formData?.client?.clientState);
    if (!formData?.agency?.agencyState || !clientStateOk) {
      throw new Error(
        "fireMilestoneInvoice: missing agency/client state on a GST-registered invoice — refusing to compute child tax silently as exempt."
      );
    }
  }

  const childFormData = {
    ...formData,
    milestones: [nextMilestone],
    meta: {
      ...formData.meta,
      invoiceNumber: newInvoiceNumber,
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: calculatedDueDate,
      // Child docs must state their true position — the child's own
      // milestones array is [this one], so count/index come from the parent.
      milestoneIndex: nextMilestoneIndex + 1,
      milestoneTotal: Array.isArray(formData.milestones)
        ? formData.milestones.length
        : 1,
    },
  };
  const appliedSnapshot = computeAppliedMsaSnapshot(childFormData as any);
  const childGrandTotal = calculateInvoiceTotals(childFormData as any).grandTotal;

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const randBytes = Array.from(crypto.getRandomValues(new Uint8Array(12)));
  const token = randBytes.map((b) => chars[b % chars.length]).join("");

  const { data: childInvoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: newInvoiceNumber,
      form_data: childFormData,
      grand_total: childGrandTotal,
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
    try {
      await resend.emails.send({
        from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
        to: clientEmail,
        subject: `Milestone ${nextMilestoneIndex + 1} Invoice from ${agencyName} — ready for review`,
        html: renderLanceEmail({
          headline: `Milestone ${nextMilestoneIndex + 1} Invoice from ${agencyName}`,
          paragraphs: [
            "Your previous milestone has been completed. The next milestone invoice is now ready for your review.",
          ],
          cta: {
            label: `View Milestone ${nextMilestoneIndex + 1} Invoice →`,
            url: shareUrl,
          },
          finePrint: `This secure link was sent only to ${clientEmail}.`,
        }),
      });
    } catch (emailError) {
      console.error("Milestone-fire email failed (child invoice was created):", emailError);
    }

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

// ---------------------------------------------------------------------------
// Client-facing settlement emails. Both are best-effort: a failed send must
// never throw into the settle route. They reuse the shared E email module.
// ---------------------------------------------------------------------------

async function resolveAgencyName(supabase: any, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("agency_name")
    .eq("user_id", userId)
    .maybeSingle();
  return profile?.agency_name || "Your freelancer";
}

/** #2 — payment receipt to the client when a (non-final) milestone is settled. */
export async function sendMilestoneSettledReceipt(
  supabase: any,
  parent: any,
  milestoneNumber: number,
): Promise<void> {
  const clientEmail = parent?.shared_to_email;
  if (!clientEmail) return;
  try {
    const agencyName = await resolveAgencyName(supabase, parent.user_id);
    const shareUrl = parent.share_token
      ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${parent.share_token}`
      : undefined;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
      to: clientEmail,
      subject: `Payment recorded — Milestone ${milestoneNumber}, Invoice ${parent.invoice_number}`,
      html: renderLanceEmail({
        headline: "Payment recorded",
        paragraphs: [
          `${agencyName} has marked Milestone ${milestoneNumber} of invoice <strong>${parent.invoice_number}</strong> as settled. Thank you — this milestone is now complete.`,
          `Keep this email for your records.`,
        ],
        cta: shareUrl ? { label: "View invoice →", url: shareUrl } : undefined,
      }),
    });
  } catch (err) {
    console.error("MILESTONE_RECEIPT_EMAIL_ERROR:", err);
  }
}

/** #1 — project-complete email to the client when the final milestone settles. */
export async function sendProjectCompleteEmail(
  supabase: any,
  parent: any,
): Promise<void> {
  const clientEmail = parent?.shared_to_email;
  if (!clientEmail) return;
  try {
    const agencyName = await resolveAgencyName(supabase, parent.user_id);
    const shareUrl = parent.share_token
      ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${parent.share_token}`
      : undefined;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `${agencyName} via Lance <invoices@lanceinvoice.xyz>`,
      to: clientEmail,
      subject: `Project complete — Invoice ${parent.invoice_number}`,
      html: renderLanceEmail({
        headline: "Your project is complete",
        paragraphs: [
          `Every milestone on invoice <strong>${parent.invoice_number}</strong> from ${agencyName} has now been delivered and settled. The project is officially complete.`,
          `Thank you for working with ${agencyName}. Keep this email for your records.`,
        ],
        cta: shareUrl ? { label: "View invoice →", url: shareUrl } : undefined,
      }),
    });
  } catch (err) {
    console.error("PROJECT_COMPLETE_EMAIL_ERROR:", err);
  }
}
