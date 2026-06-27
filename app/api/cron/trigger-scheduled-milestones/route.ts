import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fireMilestoneInvoice } from "@/lib/supabase/milestones";

export const dynamic = "force-dynamic";

type CronMilestoneResult =
  | { id: string; status: "fired"; childInvoiceId: string }
  | { id: string; status: "failed"; error: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "cron secret not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const authorized =
    authHeader === `Bearer ${cronSecret}` || Boolean(vercelCronHeader);

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const nowIso = new Date().toISOString();
  const results: CronMilestoneResult[] = [];

  const { data: dueMilestones, error: dueMilestonesError } = await supabaseAdmin
    .from("invoice_milestones")
    .select("*")
    .eq("trigger_mode", "scheduled")
    .eq("trigger_status", "pending")
    .neq("order_index", 0)
    .lte("trigger_date", nowIso)
    .order("trigger_date", { ascending: true });

  if (dueMilestonesError) {
    return NextResponse.json(
      { error: dueMilestonesError.message },
      { status: 500 },
    );
  }

  for (const milestone of dueMilestones ?? []) {
    try {
      const { data: parentInvoice, error: parentInvoiceError } =
        await supabaseAdmin
          .from("invoices")
          .select("id, project_id")
          .eq("id", milestone.invoice_id)
          .single();

      if (parentInvoiceError || !parentInvoice) {
        throw new Error(parentInvoiceError?.message || "Parent invoice not found");
      }

      let projectRow = null;
      if (parentInvoice.project_id) {
        const { data: project, error: projectError } = await supabaseAdmin
          .from("projects")
          .select("*")
          .eq("id", parentInvoice.project_id)
          .maybeSingle();

        if (projectError) {
          throw new Error(projectError.message);
        }

        projectRow = project;
      }

      // Defense-in-depth: never fire a milestone for a closed project.
      // (Closing a project already cancels its pending triggers, but guard anyway.)
      if (projectRow && (projectRow as any).status === "closed") {
        await supabaseAdmin
          .from("invoice_milestones")
          .update({
            status: "cancelled",
            trigger_status: "cancelled",
            trigger_mode: "cancelled",
          })
          .eq("id", milestone.id);
        continue;
      }

      const fired = await fireMilestoneInvoice(
        supabaseAdmin,
        milestone,
        projectRow,
      );

      if (fired.ok === false || !fired.childInvoiceId) {
        throw new Error(fired.error || "Failed to fire milestone invoice");
      }

      results.push({
        id: milestone.id,
        status: "fired",
        childInvoiceId: fired.childInvoiceId,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      await supabaseAdmin
        .from("invoice_milestones")
        .update({
          trigger_status: "failed",
          trigger_error: message,
        })
        .eq("id", milestone.id);

      console.error("SCHEDULED_MILESTONE_TRIGGER_FAILED:", {
        milestoneId: milestone.id,
        invoiceId: milestone.invoice_id,
        orderIndex: milestone.order_index,
        error,
      });

      results.push({
        id: milestone.id,
        status: "failed",
        error: message,
      });
    }
  }

  const fired = results.filter((result) => result.status === "fired").length;
  const failed = results.filter((result) => result.status === "failed").length;

  return NextResponse.json({
    processed: results.length,
    fired,
    failed,
    milestones: results,
  });
}
