import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { computeAppliedMsaSnapshot } from "@/lib/msa-applied-snapshot";
import { parseScheduledMilestoneTriggerDate } from "@/lib/milestone-trigger-date";
import {
  fireMilestoneInvoice,
  sendMilestoneSettledReceipt,
  sendProjectCompleteEmail,
} from "@/lib/supabase/milestones";

export const dynamic = "force-dynamic";

const TriggerModeSchema = z.enum(["immediate", "scheduled", "cancelled"]);

const NewSchema = z.object({
  invoice_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  trigger_mode: TriggerModeSchema,
  trigger_date: z.string().nullable().optional(),
  tds_amount: z.number().nonnegative().nullable().optional(),
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
  return parseScheduledMilestoneTriggerDate(triggerDate);
}

export async function POST(req: NextRequest) {
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
    const tdsAmount = isLegacy ? 0 : Number(input.tds_amount ?? 0);

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
      return NextResponse.json({ error: "trigger_date must be a valid today-or-future date" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const statusUpdates = new Map<number, string>();

    if (!isLegacy) {
      statusUpdates.set(currentOrderIndex, "SETTLED");
      const { error: settleError } = await supabaseAdmin
        .from("invoice_milestones")
        .update({ status: "SETTLED", tds_amount: tdsAmount })
        .eq("invoice_id", invoiceId)
        .eq("order_index", currentOrderIndex);

      if (settleError) {
        return NextResponse.json({ error: settleError.message }, { status: 500 });
      }

      // Stamp the billing invoice for the milestone just settled. order_index 0
      // (M1) is billed on the master itself and is covered by the master roll-up
      // below (partial while open, settled on close). Milestones >= 1 are billed
      // on child invoices whose milestone_index is 1-based (= order_index + 1);
      // a child is fully settled the instant its milestone settles.
      if (currentOrderIndex >= 1) {
        const { error: childSettleError } = await supabaseAdmin
          .from("invoices")
          .update({ status: "settled", settled_at: nowIso })
          .eq("parent_invoice_id", invoiceId)
          .eq("milestone_index", currentOrderIndex + 1);

        if (childSettleError) {
          return NextResponse.json({ error: childSettleError.message }, { status: 500 });
        }
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: parent.user_id,
        invoice_id: invoiceId,
        type: "milestone_settled",
        title: "Milestone Paid",
        message: `Milestone ${currentOrderIndex + 1} for Invoice ${parent.invoice_number} settled.`,
        is_read: false,
      });

      // Payment receipt to the client for this milestone. Skipped on the final
      // milestone, where the project-complete email (below) covers it instead.
      if (nextMilestone) {
        await sendMilestoneSettledReceipt(supabaseAdmin, parent, currentOrderIndex + 1);
      }
    }

    if (triggerMode === "scheduled") {
      const scheduledDate = scheduledDateForMode;
      if (!scheduledDate) {
        return NextResponse.json({ error: "trigger_date must be a valid today-or-future date" }, { status: 400 });
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
          applied_payment_terms: (updatedFormData as any).meta?.paymentTerms
            ? `Net ${(updatedFormData as any).meta.paymentTerms} days`
            : computeAppliedMsaSnapshot(updatedFormData as any).applied_payment_terms,
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
          status: "settled",
          settled_at: nowIso,
          form_data: updatedFormData,
          ...computeAppliedMsaSnapshot(updatedFormData as any),
          applied_payment_terms: (updatedFormData as any).meta?.paymentTerms
            ? `Net ${(updatedFormData as any).meta.paymentTerms} days`
            : computeAppliedMsaSnapshot(updatedFormData as any).applied_payment_terms,
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

      // Project-complete email — only on genuine completion (final milestone
      // settled), not on an early close that still had remaining milestones.
      if (!nextMilestone) {
        await sendProjectCompleteEmail(supabaseAdmin, parent);
      }

      return NextResponse.json({
        success: true,
        cancelled: true,
        milestones_cancelled: cancelledMilestones?.length || 0,
      });
    }

    const milestoneToFire = nextMilestoneRow || {
      invoice_id: invoiceId,
      order_index: nextMilestoneIndex,
      title: nextMilestone?.title,
      status: nextMilestone?.status,
    };
    const fireResult = await fireMilestoneInvoice(
      supabaseAdmin,
      milestoneToFire,
      effectiveProjectId ? { id: effectiveProjectId } : null,
    );

    return NextResponse.json({
      success: true,
      childInvoiceId: fireResult.childInvoiceId,
      token: fireResult.token,
    });
  } catch (err: any) {
    console.error("TRIGGER_NEXT_MILESTONE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
