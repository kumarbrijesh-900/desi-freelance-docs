import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { computeAppliedMsaSnapshot } from "@/lib/msa-applied-snapshot";

export const dynamic = "force-dynamic";

const TriggerModeSchema = z.enum(["immediate", "scheduled", "cancelled"]);

const NewSchema = z.object({
  invoice_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  trigger_mode: TriggerModeSchema,
  trigger_date: z.string().nullable().optional(),
});

const LegacySchema = z.object({
  parentInvoiceId: z.string().uuid(),
  nextMilestoneIndex: z.number().int().min(0),
});

const Schema = z.union([NewSchema, LegacySchema]);

type TriggerMode = z.infer<typeof TriggerModeSchema>;

function isLegacyPayload(input: z.infer<typeof Schema>): input is z.infer<typeof LegacySchema> {
  return "parentInvoiceId" in input;
}

function isClosedMilestone(status?: string | null): boolean {
  const normalized = (status || "").toLowerCase();
  return normalized === "settled" || normalized === "cancelled";
}

function getMilestoneOrderIndex(milestone: any): number {
  return Number(milestone?.order_index ?? milestone?.orderIndex ?? 0);
}

function updateFormDataMilestones(
  formData: any,
  statusUpdates: Map<number, string>,
  dueDate?: string,
) {
  const nextFormData = {
    ...(formData || {}),
    meta: {
      ...((formData || {}).meta || {}),
      ...(
        dueDate
          ? { dueDate }
          : {}
      ),
    },
    milestones: Array.isArray(formData?.milestones)
      ? formData.milestones.map((milestone: any, index: number) => {
          const nextStatus = statusUpdates.get(index);
          return nextStatus ? { ...milestone, status: nextStatus } : milestone;
        })
      : formData?.milestones,
  };

  return nextFormData;
}

function validateScheduledDate(triggerDate?: string | null): Date | null {
  if (!triggerDate) return null;
  const date = new Date(triggerDate);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() <= Date.now()) return null;
  return date;
}

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

    const input = result.data;
    const isLegacy = isLegacyPayload(input);
    const invoiceId = isLegacy ? input.parentInvoiceId : input.invoice_id;
    const triggerMode: TriggerMode = isLegacy ? "immediate" : input.trigger_mode;
    const requestedProjectId = isLegacy ? null : input.project_id ?? null;
    const requestedTriggerDate = isLegacy ? null : input.trigger_date ?? null;

    const { data: parent, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !parent) {
      return NextResponse.json({ error: "Parent invoice not found" }, { status: 404 });
    }

    if (requestedProjectId && parent.project_id && requestedProjectId !== parent.project_id) {
      return NextResponse.json({ error: "project_id does not match invoice project" }, { status: 400 });
    }

    const effectiveProjectId = requestedProjectId || parent.project_id || null;
    const formData = parent.form_data || {};
    const formMilestones = Array.isArray(formData?.milestones) ? formData.milestones : [];

    const { data: milestoneRows, error: milestonesError } = await supabaseAdmin
      .from("invoice_milestones")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("order_index", { ascending: true });

    if (milestonesError) {
      return NextResponse.json({ error: milestonesError.message }, { status: 500 });
    }

    if (!milestoneRows?.length && !formMilestones.length) {
      return NextResponse.json({ error: "No milestones found" }, { status: 400 });
    }

    const currentMilestone = isLegacy
      ? milestoneRows?.find((milestone: any) => getMilestoneOrderIndex(milestone) === input.nextMilestoneIndex - 1)
      : milestoneRows?.find((milestone: any) => !isClosedMilestone(milestone.status));

    const currentOrderIndex = isLegacy
      ? input.nextMilestoneIndex - 1
      : currentMilestone
        ? getMilestoneOrderIndex(currentMilestone)
        : formMilestones.findIndex((milestone: any) => !isClosedMilestone(milestone.status));

    if (!isLegacy && currentOrderIndex < 0) {
      return NextResponse.json({ error: "No open milestone found" }, { status: 400 });
    }

    const nextMilestoneIndex = isLegacy ? input.nextMilestoneIndex : currentOrderIndex + 1;
    const nextMilestoneRow = milestoneRows?.find(
      (milestone: any) => getMilestoneOrderIndex(milestone) === nextMilestoneIndex,
    );
    const nextMilestone =
      formMilestones[nextMilestoneIndex] ||
      (nextMilestoneRow
        ? {
            title: nextMilestoneRow.title || `Milestone ${nextMilestoneIndex + 1}`,
            status: nextMilestoneRow.status || "PENDING",
            lineItems: [],
          }
        : null);

    if (triggerMode !== "cancelled" && !nextMilestone) {
      return NextResponse.json({ error: "No more milestones" }, { status: 400 });
    }

    const scheduledDateForMode =
      triggerMode === "scheduled" ? validateScheduledDate(requestedTriggerDate) : null;
    if (triggerMode === "scheduled" && !scheduledDateForMode) {
      return NextResponse.json({ error: "trigger_date must be a valid future ISO date" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const statusUpdates = new Map<number, string>();

    if (!isLegacy) {
      statusUpdates.set(currentOrderIndex, "SETTLED");
      const { error: settleError } = await supabaseAdmin
        .from("invoice_milestones")
        .update({ status: "SETTLED" })
        .eq("invoice_id", invoiceId)
        .eq("order_index", currentOrderIndex);

      if (settleError) {
        return NextResponse.json({ error: settleError.message }, { status: 500 });
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: parent.user_id,
        invoice_id: invoiceId,
        type: "milestone_settled",
        title: "Milestone Paid",
        message: `Milestone ${currentOrderIndex + 1} for Invoice ${parent.invoice_number} settled.`,
        is_read: false,
      });
    }

    if (triggerMode === "scheduled") {
      const scheduledDate = scheduledDateForMode;
      if (!scheduledDate) {
        return NextResponse.json({ error: "trigger_date must be a valid future ISO date" }, { status: 400 });
      }

      const { data: scheduledMilestone, error: scheduleError } = await supabaseAdmin
        .from("invoice_milestones")
        .update({
          trigger_mode: "scheduled",
          trigger_date: scheduledDate.toISOString(),
          trigger_status: "pending",
        })
        .eq("invoice_id", invoiceId)
        .eq("order_index", nextMilestoneIndex)
        .select("id")
        .single();

      if (scheduleError || !scheduledMilestone) {
        return NextResponse.json(
          { error: scheduleError?.message || "Failed to schedule next milestone" },
          { status: 500 },
        );
      }

      const updatedFormData = updateFormDataMilestones(formData, statusUpdates);
      const { error: invoiceUpdateError } = await supabaseAdmin
        .from("invoices")
        .update({
          status: "PARTIAL",
          form_data: updatedFormData,
          ...computeAppliedMsaSnapshot(updatedFormData as any),
        })
        .eq("id", invoiceId);

      if (invoiceUpdateError) {
        return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        milestone_id: scheduledMilestone.id,
        trigger_date: scheduledDate.toISOString(),
      });
    }

    if (triggerMode === "cancelled") {
      const statusCancelUpdates = new Map(statusUpdates);
      formMilestones.forEach((_: any, index: number) => {
        if (index > currentOrderIndex) {
          statusCancelUpdates.set(index, "CANCELLED");
        }
      });

      let projectInvoiceIds = [invoiceId];
      if (effectiveProjectId) {
        const { data: projectInvoices, error: projectInvoiceError } = await supabaseAdmin
          .from("invoices")
          .select("id")
          .eq("user_id", parent.user_id)
          .eq("project_id", effectiveProjectId);

        if (projectInvoiceError) {
          return NextResponse.json({ error: projectInvoiceError.message }, { status: 500 });
        }

        projectInvoiceIds = projectInvoices?.map((invoice: any) => invoice.id) || [invoiceId];
      }

      const { data: cancelledMilestones, error: cancelMilestonesError } = await supabaseAdmin
        .from("invoice_milestones")
        .update({
          trigger_mode: "cancelled",
          trigger_status: "cancelled",
          status: "CANCELLED",
        })
        .in("invoice_id", projectInvoiceIds)
        .gt("order_index", currentOrderIndex)
        .neq("trigger_status", "fired")
        .select("id");

      if (cancelMilestonesError) {
        return NextResponse.json({ error: cancelMilestonesError.message }, { status: 500 });
      }

      const updatedFormData = updateFormDataMilestones(formData, statusCancelUpdates);
      const { error: invoiceUpdateError } = await supabaseAdmin
        .from("invoices")
        .update({
          status: "SETTLED",
          settled_at: nowIso,
          form_data: updatedFormData,
          ...computeAppliedMsaSnapshot(updatedFormData as any),
        })
        .eq("id", invoiceId);

      if (invoiceUpdateError) {
        return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: parent.user_id,
        invoice_id: invoiceId,
        type: "invoice_settled",
        title: "Project Milestones Closed",
        message: `Invoice ${parent.invoice_number} was settled and remaining milestones were cancelled.`,
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        cancelled: true,
        milestones_cancelled: cancelledMilestones?.length || 0,
      });
    }

    if (!nextMilestone) {
      return NextResponse.json({ error: "No more milestones" }, { status: 400 });
    }

    const paymentTermsDays = Number(formData?.meta?.paymentTerms) || 15;
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays);
    const calculatedDueDate = dueDateObj.toISOString().split("T")[0];

    statusUpdates.set(nextMilestoneIndex, "LIVE");
    const updatedParentFormData = updateFormDataMilestones(formData, statusUpdates, calculatedDueDate);

    const { error: parentUpdateError } = await supabaseAdmin
      .from("invoices")
      .update({
        due_date: calculatedDueDate,
        status: "PARTIAL",
        form_data: updatedParentFormData,
        ...computeAppliedMsaSnapshot(updatedParentFormData as any),
      })
      .eq("id", invoiceId);

    if (parentUpdateError) {
      return NextResponse.json({ error: parentUpdateError.message }, { status: 500 });
    }

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

    const { data: childInvoice, error: insertError } = await supabaseAdmin
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
        ...appliedSnapshot,
      })
      .select()
      .single();

    if (insertError || !childInvoice) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create invoice" },
        { status: 500 },
      );
    }

    const { error: fireMilestoneError } = await supabaseAdmin
      .from("invoice_milestones")
      .update({
        status: "LIVE",
        trigger_mode: "immediate",
        trigger_status: "fired",
        trigger_fired_at: nowIso,
      })
      .eq("invoice_id", invoiceId)
      .eq("order_index", nextMilestoneIndex);

    if (fireMilestoneError) {
      return NextResponse.json({ error: fireMilestoneError.message }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
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
      { status: 500 },
    );
  }
}
