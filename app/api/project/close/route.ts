import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/project/close
 * Closes a project early — distinct from completion (all milestones settled).
 * Records a reason, stamps closed_at, sets status='closed', and cancels any
 * still-pending milestone triggers so no further child invoices are generated.
 * Owner-only: the caller must be the project's owner.
 */

const CloseSchema = z.object({
  project_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

export async function POST(req: NextRequest) {
  // 1. Authenticated user (session) — only the owner may close.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Validate body.
  const body = await req.json().catch(() => null);
  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A project and a closure reason are required." },
      { status: 400 },
    );
  }
  const { project_id, reason } = parsed.data;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 3. Close the project — ownership enforced inline in the WHERE clause.
    const { data: closed, error: closeErr } = await supabaseAdmin
      .from("projects")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closure_reason: reason,
      })
      .eq("id", project_id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (closeErr) {
      console.error("PROJECT_CLOSE_UPDATE_ERROR:", closeErr);
      return NextResponse.json(
        { error: "Could not close the project." },
        { status: 500 },
      );
    }
    if (!closed) {
      // Either it doesn't exist or it isn't this user's project.
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // 4. Cancel still-pending milestone triggers so no further invoices fire.
    const { data: projInvoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    const invoiceIds = (projInvoices || []).map((i) => i.id);
    if (invoiceIds.length > 0) {
      await supabaseAdmin
        .from("invoice_milestones")
        .update({
          status: "cancelled",
          trigger_status: "cancelled",
          trigger_mode: "cancelled",
        })
        .in("invoice_id", invoiceIds)
        .eq("trigger_status", "pending");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PROJECT_CLOSE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
