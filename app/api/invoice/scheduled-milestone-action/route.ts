import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { parseScheduledMilestoneTriggerDate } from "@/lib/milestone-trigger-date";
import { fireMilestoneInvoice } from "@/lib/supabase/milestones";

export const dynamic = "force-dynamic";

const ScheduledMilestoneActionSchema = z.object({
  milestone_id: z.string().uuid(),
  action: z.enum(["send_now", "reschedule", "cancel"]),
  new_trigger_date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabaseAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const body = await req.json().catch(() => null);
  const result = ScheduledMilestoneActionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { milestone_id, action, new_trigger_date } = result.data;

  const { data: milestone, error: milestoneError } = await supabaseAdmin
    .from("invoice_milestones")
    .select("*")
    .eq("id", milestone_id)
    .single();

  if (milestoneError || !milestone) {
    return NextResponse.json(
      { error: "Milestone not found" },
      { status: 404 },
    );
  }

  const { data: parentInvoice, error: parentInvoiceError } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", milestone.invoice_id)
    .single();

  if (parentInvoiceError || !parentInvoice) {
    return NextResponse.json(
      { error: "Parent invoice not found" },
      { status: 404 },
    );
  }

  if (parentInvoice.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (milestone.trigger_status !== "pending") {
    return NextResponse.json(
      {
        error: "Milestone trigger is not pending",
        reason: `Current trigger_status is ${milestone.trigger_status || "unset"}`,
      },
      { status: 409 },
    );
  }

  if (action === "send_now") {
    let projectRow = null;
    if (parentInvoice.project_id) {
      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("*")
        .eq("id", parentInvoice.project_id)
        .maybeSingle();

      if (projectError) {
        return NextResponse.json(
          { error: projectError.message },
          { status: 500 },
        );
      }

      projectRow = project;
    }

    let fired;
    try {
      fired = await fireMilestoneInvoice(
        supabaseAdmin,
        milestone,
        projectRow,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "send_now",
      new_invoice_id: fired.childInvoiceId,
    });
  }

  if (action === "reschedule") {
    const nextDate = parseScheduledMilestoneTriggerDate(new_trigger_date);
    if (!nextDate) {
      return NextResponse.json(
        { error: "new_trigger_date must be a valid today-or-future date" },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("invoice_milestones")
      .update({
        trigger_date: nextDate.toISOString(),
        trigger_mode: "scheduled",
        trigger_status: "pending",
        trigger_error: null,
      })
      .eq("id", milestone_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "reschedule",
      trigger_date: nextDate.toISOString(),
    });
  }

  if (action === "cancel") {
    const { error: updateError } = await supabaseAdmin
      .from("invoice_milestones")
      .update({
        trigger_mode: "cancelled",
        trigger_status: "cancelled",
        trigger_error: null,
        status: "CANCELLED",
      })
      .eq("id", milestone_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "cancel",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
