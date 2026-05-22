/**
 * Invoice persistence service — Supabase CRUD for invoices.
 *
 * All operations are scoped to the authenticated user via RLS.
 * localStorage remains the offline fallback; this layer handles
 * cloud persistence for logged-in users.
 */

/** Last updated: 2026-04-24 19:01 (IST) */
import { supabase } from "@/lib/supabase/client";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import { computeAppliedMsaSnapshot } from "@/lib/msa-applied-snapshot";

/* ─── Types ───────────────────────────────────────────────── */

export type InvoiceStatus = "DRAFT" | "SAVED" | "SENT" | "PARTIAL" | "SETTLED" | "CANCELLED";

export type MsaStatus = "pending" | "accepted" | "rejected" | "proposed";

/**
 * @deprecated Use MsaStatus instead. Kept temporarily for backward compatibility
 * with code that hasn't been migrated yet.
 */
export type MsaResponse = MsaStatus;

export interface SavedInvoice {
  id: string;
  user_id: string;
  invoice_number: string;
  form_data: InvoiceFormData;
  status: InvoiceStatus;
  share_token: string | null;
  shared_at: string | null;
  shared_to_email: string | null;
  template_id: string | null;
  msa_id: string | null;
  /** msa_accepted_at removed — use msa_responded_at instead */
  msa_response: string | null;
  msa_responded_at: string | null;
  client_msa_note: string | null;
  /** Bug 2: stored as TEXT (e.g. 'Net 30', 'Due on Receipt') */
  applied_payment_terms: string | null;
  applied_late_fee_rate: number | null;
  applied_late_fee_unit: string | null;
  due_date: string | null;
  reminded_due_date: boolean;
  reminded_overdue: boolean;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
  has_addendum: boolean;
  payment_terms_days: number | null;
  msa_status: MsaResponse;
  is_offline: boolean;
  grand_total?: number;
  milestones?: {
    id: string;
    title: string;
    status: string;
    amount: number;
    order_index: number;
    line_items: {
      id: string;
      description: string;
      qty: number;
      rate: number;
      amount: number;
    }[];
  }[];
  parent_invoice_id?: string | null;
  children?: {
    id: string;
    invoice_number: string;
    milestone_index: number;
  }[];
  project_id?: string | null;
  project?: {
    msa_accepted_at: string | null;
    status: string;
  } | null;
}

export interface SaveInvoiceInput {
  formData: InvoiceFormData;
  status?: InvoiceStatus;
  templateId?: string;
  /** Pass an existing ID to update instead of insert */
  existingId?: string;
  projectId?: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function getInvoiceNumber(data: InvoiceFormData): string {
  const year = new Date().getFullYear();
  return data.meta?.invoiceNumber || `INV-${year}-000`;
}

/**
 * Query Supabase for the highest invoice number this year for the current user
 * and return the next sequential number in INV-YYYY-NNN format.
 *
 * Returns null if not authenticated — caller should fall back to a draft placeholder.
 */
export async function generateNextInvoiceNumber(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const year = String(new Date().getFullYear());
  const prefix = `INV-${year}-`;

  // Fetch all invoice_numbers for this user that match the current year prefix.
  // We do an in-memory max because Postgres text comparison is unreliable for
  // mixed-format strings (some users have INV-2026-046, others have inv-2026-10).
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", userId)
    .ilike("invoice_number", `${prefix}%`);

  if (error) {
    console.error("Failed to query invoice numbers:", error);
    return null;
  }

  let maxSequence = 0;
  for (const row of data ?? []) {
    const match = (row.invoice_number ?? "").match(/^INV-\d{4}-(\d+)$/i);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (Number.isFinite(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const nextSequence = maxSequence + 1;
  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

/* ─── Auth Check ──────────────────────────────────────────── */

export async function getCurrentUserId(): Promise<string | null> {
  // Try session first (fast, in-memory/local storage)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  // Fallback to getUser (strict, network request)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

/* ─── Save (upsert) ──────────────────────────────────────── */

export async function saveInvoice(
  input: SaveInvoiceInput,
): Promise<{ data: SavedInvoice | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      data: null,
      error: "Not authenticated. Please log in to save invoices.",
    };
  }

  const invoiceNumber = getInvoiceNumber(input.formData);
  const status = input.status ?? "DRAFT";

  // Fix Bug 2: Map MSA fields correctly to database columns
  const row: any = {
    invoice_number: invoiceNumber,
    form_data: input.formData as unknown as Record<string, unknown>,
    ...computeAppliedMsaSnapshot(input.formData),
    applied_license_type: input.formData.payment?.license?.licenseType || null,
    status,
    template_id: input.templateId ?? "classic",
    due_date: input.formData.meta?.dueDate || null,
    has_addendum: input.formData.meta?.hasAddendum || false,
    payment_terms_days: input.formData.meta?.paymentTerms || null,
    user_id: userId,
  };

  if (input.projectId !== undefined) {
    row.project_id = input.projectId;
  }

  console.log("saveInvoice - sending row:", row);

  let result;
  
  // Task 1: Upsert logic — check for existing by ID or invoice_number
  let targetId = input.existingId;
  if (!targetId) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("user_id", userId)
      .eq("invoice_number", invoiceNumber)
      .limit(1)
      .maybeSingle();
    if (existing) targetId = existing.id;
  }

  if (targetId) {
    // Update existing
    result = await supabase
      .from("invoices")
      .update(row)
      .eq("id", targetId)
      .select()
      .single();
  } else {
    // Insert new
    result = await supabase
      .from("invoices")
      .insert(row)
      .select()
      .single();
  }

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  // Task: Clear/Replace relational milestones if they exist in relational tables
  if (result.data) {
    await syncMilestonesFromInvoice(result.data.id, input.formData);
    
    // Task 3: Map calculated grand_total to the returned object so UI updates immediately
    const milestones = input.formData.milestones || [];
    const grand_total = milestones.length > 0
      ? milestones.reduce((s, m) => s + m.lineItems.reduce(
          (sum, li) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0
        ), 0)
      : (input.formData.lineItems || []).reduce(
          (s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0
        );
    (result.data as any).grand_total = grand_total;
  }

  return { data: result.data as SavedInvoice, error: null };
}

/**
 * Helper to sync the new relational milestones tables from the JSONB form_data.
 * This ensures the 'JOIN explosion' logic has actual data to aggregate.
 */
async function syncMilestonesFromInvoice(invoiceId: string, formData: InvoiceFormData) {
  // 1. Clear existing milestones for this invoice
  await supabase.from("invoice_milestones").delete().eq("invoice_id", invoiceId);

  // 2. Use milestones array if available, otherwise skip (form_data JSON is the fallback)
  const milestones = formData.milestones;
  if (!milestones || milestones.length === 0) return;

  // 3. Insert milestones with correct column names
  const milestonesToInsert = milestones.map((m, idx) => ({
    invoice_id: invoiceId,
    title: m.title || `Milestone ${idx + 1}`,
    status: m.status || 'PENDING',
    tds_amount: m.tdsAmount || 0,
    amount: m.lineItems.reduce(
      (sum, li) => sum + Number(li.qty || 0) * Number(li.rate || 0),
      0
    ),
    order_index: idx,
  }));

  const { data: insertedMilestones, error: mError } = await supabase
    .from("invoice_milestones")
    .insert(milestonesToInsert)
    .select();

  if (mError || !insertedMilestones) {
    console.error("Error inserting milestones:", mError);
    return;
  }

  // 4. Insert line items with correct column names
  const itemsToInsert: any[] = [];
  insertedMilestones.forEach((insertedM, mIdx) => {
    const milestone = milestones[mIdx];
    if (!milestone) return;
    milestone.lineItems.forEach((item, itemIdx) => {
      itemsToInsert.push({
        milestone_id: insertedM.id,
        item_type: item.type,
        description: item.description,
        quantity: Number(item.qty || 0),
        rate: Number(item.rate || 0),
        unit: item.rateUnit,
        total: Number(item.qty || 0) * Number(item.rate || 0),
        order_index: itemIdx,
      });
    });
  });

  if (itemsToInsert.length > 0) {
    const { error: liError } = await supabase
      .from("invoice_line_items")
      .insert(itemsToInsert);
    if (liError) console.error("Error inserting line items:", liError);
  }
}

/* ─── Load Single ─────────────────────────────────────────── */

export async function loadInvoice(
  invoiceId: string,
): Promise<{ data: SavedInvoice | null; error: string | null }> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, project:projects(msa_accepted_at, status)")
    .eq("id", invoiceId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as SavedInvoice, error: null };
}

/* ─── List (for history page) ─────────────────────────────── */

export async function listInvoices(): Promise<{
  data: SavedInvoice[];
  error: string | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: [], error: "Not authenticated" };
  }

  // Fetch with explicit LEFT JOIN structure (default in Supabase)
  // We alias the tables to 'milestones' and 'line_items' for code compatibility
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      milestones:invoice_milestones (
        *,
        line_items:invoice_line_items (*)
      ),
      children:invoices!parent_invoice_id (
        id,
        invoice_number,
        milestone_index
      )
    `)
    .eq("user_id", userId)
    .is("parent_invoice_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Relational fetch failed, falling back to flat fetch:", error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (fallbackError) return { data: [], error: fallbackError.message };
    
    // Process flat data with legacy fallback
    const fallbackProcessed = (fallbackData || []).map((inv: any) => {
      const items = inv.form_data?.lineItems ?? [];
      const grandTotal = items.reduce((s: number, i: any) => s + Number(i.qty ?? 0) * Number(i.rate ?? 0), 0);
      return { ...inv, grand_total: grandTotal };
    });
    return { data: fallbackProcessed as SavedInvoice[], error: null };
  }

  // Aggregate data and calculate Grand Total manually
  const processedInvoices = (data ?? []).map((inv: any) => {
    // Sort milestones by order_index ascending
    if (inv.milestones && inv.milestones.length > 0) {
      inv.milestones.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }

    // Calculate total amount from relational data if available, fallback to form_data
    let grandTotal = 0;
    if (inv.milestones && inv.milestones.length > 0) {
      inv.milestones.forEach((m: any) => {
        // Use the pre-calculated amount column in invoice_milestones
        const milestoneAmount = Number(m.amount || 0);
        grandTotal += milestoneAmount;
      });
    } else {
      // Fallback to form_data logic
      const items = inv.form_data?.lineItems ?? [];
      grandTotal = items.reduce((s: number, i: any) => s + Number(i.qty ?? 0) * Number(i.rate ?? 0), 0);
    }

    return {
      ...inv,
      grand_total: grandTotal,
    };
  });

  // Ensure unique invoices by id (Group by invoice.id)
  const uniqueInvoices = Array.from(
    new Map(processedInvoices.map((inv) => [inv.id, inv])).values()
  );

  return { data: uniqueInvoices as SavedInvoice[], error: null };
}

/* ─── Delete ──────────────────────────────────────────────── */

export async function deleteInvoice(
  invoiceId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "Not authenticated" };
  }

  // 1. Fetch milestone IDs first to safely clear their nested line items
  const { data: milestones } = await supabase
    .from("invoice_milestones")
    .select("id")
    .eq("invoice_id", invoiceId);

  if (milestones && milestones.length > 0) {
    const milestoneIds = milestones.map(m => m.id);
    await supabase
      .from("invoice_line_items")
      .delete()
      .in("milestone_id", milestoneIds);
  }

  // 2. Clear milestones
  await supabase
    .from("invoice_milestones")
    .delete()
    .eq("invoice_id", invoiceId);

  // 3. Delete parent invoice
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

/* ─── Share Token Generation ─────────────────────────── */

function generateShareToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  for (const b of bytes) {
    token += chars[b % chars.length];
  }
  return token;
}

/* ─── Share Invoice ──────────────────────────────────── */

export async function shareInvoice(
  invoiceId: string,
): Promise<{ token: string | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { token: null, error: "Not authenticated" };

  // Check if already shared
  const { data: existing } = await supabase
    .from("invoices")
    .select("share_token")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (existing?.share_token) {
    return { token: existing.share_token, error: null };
  }

  const token = generateShareToken();
  const { error } = await supabase
    .from("invoices")
    .update({
      share_token: token,
      shared_at: new Date().toISOString(),
      status: "SENT" as InvoiceStatus,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) return { token: null, error: error.message };
  return { token, error: null };
}

/* ─── Load by Share Token (public) ───────────────────── */

export async function loadInvoiceByToken(
  token: string,
): Promise<{ data: SavedInvoice | null; error: string | null }> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, project:projects(msa_accepted_at, status)")
    .eq("share_token", token)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SavedInvoice, error: null };
}

/* ─── Read Receipts ──────────────────────────────────── */

export async function recordView(
  invoiceId: string,
  userAgent: string,
): Promise<void> {
  // Check if it's the first view to avoid spamming notifications
  const { count } = await supabase
    .from("read_receipts")
    .select("*", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);

  await supabase.from("read_receipts").insert({
    invoice_id: invoiceId,
    viewer_ua: userAgent,
  });

  if (count === 0) {
    // Fetch invoice to get owner
    const { data: inv } = await supabase
      .from("invoices")
      .select("user_id, invoice_number")
      .eq("id", invoiceId)
      .single();

    if (inv) {
      await supabase.from("notifications").insert({
        user_id: inv.user_id,
        invoice_id: invoiceId,
        type: "invoice_viewed",
        title: "Invoice Viewed",
        message: `Your client just opened invoice ${inv.invoice_number}.`,
        is_read: false,
      });
    }
  }
}

export async function getReadReceipts(
  invoiceId: string,
): Promise<{ count: number; lastViewed: string | null }> {
  const { data } = await supabase
    .from("read_receipts")
    .select("viewed_at")
    .eq("invoice_id", invoiceId)
    .order("viewed_at", { ascending: false });

  return {
    count: data?.length ?? 0,
    lastViewed: data?.[0]?.viewed_at ?? null,
  };
}

/** Batch-load read receipt counts for multiple invoices (for dashboard) */
export async function getReadReceiptsBatch(
  invoiceIds: string[],
): Promise<Record<string, { count: number; lastViewed: string | null }>> {
  if (!invoiceIds.length) return {};

  const { data } = await supabase
    .from("read_receipts")
    .select("invoice_id, viewed_at")
    .in("invoice_id", invoiceIds)
    .order("viewed_at", { ascending: false });

  const result: Record<string, { count: number; lastViewed: string | null }> =
    {};
  for (const row of data ?? []) {
    if (!result[row.invoice_id]) {
      result[row.invoice_id] = { count: 0, lastViewed: null };
    }
    result[row.invoice_id].count += 1;
    if (!result[row.invoice_id].lastViewed) {
      result[row.invoice_id].lastViewed = row.viewed_at;
    }
  }
  return result;
}

/* ─── MSA Gating ───────────────────────────────────── */

/** Attach an MSA to a shared invoice (called by invoice owner) */
export async function attachMsaToInvoice(
  invoiceId: string,
  msaId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("invoices")
    .update({ msa_id: msaId })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

/** Remove MSA from a shared invoice */
export async function detachMsaFromInvoice(
  invoiceId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("invoices")
    .update({ msa_id: null, msa_response: "PENDING", msa_responded_at: null })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

/** Load the MSA content for a shared invoice (public — uses RLS) */
export async function loadMsaForSharedInvoice(
  invoiceId: string,
  msaId: string,
): Promise<{ title: string; content: string } | null> {
  const { data } = await supabase
    .from("client_msas")
    .select("title, content")
    .eq("id", msaId)
    .single();

  if (!data) return null;
  return { title: data.title, content: data.content };
}

/** Respond to MSA on a shared invoice (public — anon user) */
export async function respondToMsa(
  shareToken: string,
  status: "accepted" | "rejected",
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = {
    msa_status: status,
  };

  if (status === "accepted") {
    updateFields.msa_accepted_at = now;
  } else {
    updateFields.msa_responded_at = now;
  }

  const { data: inv, error: fetchErr } = await supabase
    .from("invoices")
    .update(updateFields)
    .eq("share_token", shareToken)
    .not("msa_id", "is", null)
    .select("id, user_id, invoice_number")
    .single();

  if (fetchErr) return { error: fetchErr.message };

  // Create notification for the agency
  await supabase.from("notifications").insert({
    user_id: inv.user_id,
    invoice_id: inv.id,
    type: status === "accepted" ? "msa_accepted" : "msa_rejected",
    title: status === "accepted" ? "MSA Accepted" : "MSA Rejected",
    message:
      status === "accepted"
        ? `Client accepted the MSA for invoice ${inv.invoice_number}.`
        : `Client rejected the MSA for invoice ${inv.invoice_number}.`,
    is_read: false,
  });

  return { error: null };
}

/** Update the shared_to_email on an invoice */
export async function setSharedToEmail(
  invoiceId: string,
  email: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("invoices")
    .update({ shared_to_email: email })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

/* ─── Order-to-Cash Workflow ────────────────────────── */

/** Client proposes changes to the MSA (public — anon user) */
export async function proposeMsaChanges(
  invoiceId: string,
  noteText: string,
): Promise<{ error: string | null }> {
  const { data: inv, error: updateErr } = await supabase
    .from("invoices")
    .update({
      msa_status: "proposed" as MsaStatus,
      msa_response: noteText,
      msa_responded_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .not("share_token", "is", null)
    .select("id, user_id, invoice_number")
    .single();

  if (updateErr) return { error: updateErr.message };

  // Create notification
  await supabase.from("notifications").insert({
    user_id: inv.user_id,
    invoice_id: inv.id,
    type: "msa_negotiating",
    title: "MSA Changes Proposed",
    message: `Client proposed new terms for invoice ${inv.invoice_number}: "${noteText}"`,
    is_read: false,
  });

  return { error: null };
}

export async function markMilestoneSettled(
  invoiceId: string,
  orderIndex: number,
  tdsAmount: number = 0,
  milestoneId?: string,
): Promise<{
  error: string | null;
  invoiceStatus?: InvoiceStatus;
  settledAt?: string | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  let milestone: { id: string; order_index: number | null } | null = null;

  // Prefer the row UUID from the UI. order_index is only a fallback because
  // historical rows can drift when old invoices are regenerated.
  if (milestoneId) {
    const { data, error } = await supabase
      .from("invoice_milestones")
      .select("id, order_index")
      .eq("id", milestoneId)
      .eq("invoice_id", invoiceId)
      .maybeSingle();

    if (error) {
      console.warn("Could not find milestone by id", milestoneId, error.message);
    } else {
      milestone = data;
    }
  }

  if (!milestone) {
    const { data, error } = await supabase
      .from("invoice_milestones")
      .select("id, order_index")
      .eq("invoice_id", invoiceId)
      .eq("order_index", orderIndex)
      .maybeSingle();

    if (error) {
      console.warn("Could not find milestone at index", orderIndex, error.message);
      return { error: error.message };
    }

    milestone = data;
  }

  if (!milestone) {
    console.warn("Could not find milestone", { invoiceId, orderIndex, milestoneId });
    return { error: "Milestone not found" };
  }

  // 2. Update by the current UUID
  const { error: milestoneUpdateErr } = await supabase
    .from("invoice_milestones")
    .update({
      status: "SETTLED",
      tds_amount: tdsAmount,
    })
    .eq("id", milestone.id)
    .eq("invoice_id", invoiceId);

  if (milestoneUpdateErr) {
    console.error("invoice_milestones update failed:", milestoneUpdateErr.message);
    return { error: milestoneUpdateErr.message };
  }

  // 3. Fetch invoice for status update
  const { data: inv, error: fetchErr } = await supabase
    .from("invoices")
    .select("invoice_number, form_data")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !inv) return { error: fetchErr?.message || "Invoice not found" };

  // 4. Check if all milestones are now settled
  const { data: allMilestones } = await supabase
    .from("invoice_milestones")
    .select("id, status")
    .eq("invoice_id", invoiceId);

  const allSettled = allMilestones?.length
    ? allMilestones.every((m) => m.status === "SETTLED")
    : false;

  const newStatus = allSettled ? "SETTLED" : "PARTIAL";
  const settledAt = allSettled ? new Date().toISOString() : null;

  const updatedFormData = mergeInvoiceFormData(inv.form_data);
  const mIndex = milestone.order_index ?? orderIndex;
  if (updatedFormData.milestones && updatedFormData.milestones[mIndex]) {
    updatedFormData.milestones[mIndex].status = "SETTLED";
  }

  const invoiceUpdatePayload: {
    status: InvoiceStatus;
    settled_at?: string;
    form_data: any;
    applied_payment_terms?: string;
    applied_late_fee_rate?: number;
    applied_late_fee_unit?: string;
  } = {
    status: newStatus as InvoiceStatus,
    form_data: updatedFormData as any,
    ...computeAppliedMsaSnapshot(updatedFormData),
  };

  if (settledAt) {
    invoiceUpdatePayload.settled_at = settledAt;
  }

  // 5. Update invoice status
  const { error: invoiceUpdateErr } = await supabase
    .from("invoices")
    .update(invoiceUpdatePayload)
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (invoiceUpdateErr) {
    console.error("invoices status update failed:", invoiceUpdateErr.message);
    return { error: invoiceUpdateErr.message };
  }

  // 6. Notification
  await supabase.from("notifications").insert({
    user_id: userId,
    invoice_id: invoiceId,
    type: "milestone_settled",
    title: "Milestone Paid",
    message: `Milestone ${(milestone.order_index ?? orderIndex) + 1} for Invoice ${inv.invoice_number} settled. TDS deducted: ₹${tdsAmount.toLocaleString("en-IN")}.`,
    is_read: false,
  });

  if (allSettled) {
    const clientName = inv.form_data?.client?.clientName || "Client";
    await supabase.from("notifications").insert({
      user_id: userId,
      invoice_id: invoiceId,
      type: "invoice_settled",
      title: "Invoice Settled",
      message: `All milestones for Invoice ${inv.invoice_number} have been settled for ${clientName}.`,
      is_read: false,
    });
  }

  return { error: null, invoiceStatus: newStatus as InvoiceStatus, settledAt };
}

/** Trigger a "Request Next Milestone" notification for the client */
export async function requestNextMilestone(
  invoiceId: string,
  milestoneId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const { data: inv, error: fetchErr } = await supabase
    .from("invoices")
    .select("invoice_number, form_data")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !inv) return { error: fetchErr?.message || "Invoice not found" };

  const formData = mergeInvoiceFormData(inv.form_data);
  const milestone = formData.lineItems.find(m => m.id === milestoneId);

  // Create notification
  const { error: notifErr } = await supabase.from("notifications").insert({
    user_id: userId,
    invoice_id: invoiceId,
    type: "milestone_requested",
    title: "Milestone Requested",
    message: `You have requested the next milestone "${milestone?.description}" for Invoice ${inv.invoice_number}.`,
    is_read: false,
  });

  return { error: notifErr?.message ?? null };
}

/** Mark an invoice as fully paid/settled (freelancer action) */
export async function markInvoiceSettled(
  invoiceId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const { data: inv, error } = await supabase
    .from("invoices")
    .update({ 
      status: "SETTLED" as InvoiceStatus,
      settled_at: new Date().toISOString()
    })
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .select("invoice_number, form_data")
    .single();

  if (!error && inv) {
    const clientName = inv.form_data?.client?.clientName || "Client";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      invoice_id: invoiceId,
      type: "invoice_settled",
      title: "Invoice Settled",
      message: `You have settled INVOICE No ${inv.invoice_number} for ${clientName} on ${dateStr} ${timeStr}.`,
      is_read: false,
    });
  }

  return { error: error?.message ?? null };
}

/** Reissue an invoice after negotiation (freelancer action) */
export async function reissueNegotiatedInvoice(
  invoiceId: string,
  newFormData: InvoiceFormData,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  // Reset status back to 'pending' so the client must accept the new version,
  // but preserve msa_response (the client's previous proposal text) and
  // msa_responded_at (when they made it) as a permanent audit trail.
  // Also preserve client_msa_note for editor-side display of negotiation history.
  const { error } = await supabase
    .from("invoices")
    .update({
      form_data: newFormData as unknown as Record<string, unknown>,
      msa_status: "pending" as MsaStatus,
      msa_accepted_at: null,
      ...computeAppliedMsaSnapshot(newFormData),
      applied_license_type: newFormData.payment?.license?.licenseType || null,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

/**
 * Mark an invoice as offline. Used when the user chooses to download
 * the PDF and manage the invoice manually. The invoice will be excluded
 * from the master list and dashboard metrics until they re-enable tracking.
 *
 * Returns the updated row on success, or throws.
 */
export async function markInvoiceAsOffline(
  invoiceId: string
): Promise<{ id: string; is_offline: boolean }> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ is_offline: true })
    .eq('id', invoiceId)
    .select('id, is_offline')
    .single()
  if (error) {
    throw new Error(`Failed to mark invoice offline: ${error.message}`)
  }
  if (!data) {
    throw new Error('Invoice not found when marking offline')
  }
  return data;
}

/**
 * Reverse markInvoiceAsOffline — switch a manually-managed invoice back
 * into the tracked digital flow. Returns the updated row or throws.
 */
export async function markInvoiceAsTracked(
  invoiceId: string
): Promise<{ id: string; is_offline: boolean }> {
  const { data, error } = await supabase
    .from("invoices")
    .update({ is_offline: false })
    .eq("id", invoiceId)
    .select("id, is_offline")
    .single();
  if (error) {
    throw new Error(`Failed to mark invoice tracked: ${error.message}`);
  }
  if (!data) {
    throw new Error("Invoice not found when marking tracked");
  }
  return data;
}

/**
 * Cancel / close an invoice project.
 * Sets the status to 'cancelled' so it exits the active pipeline.
 */
export async function cancelInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", invoiceId);
  if (error) {
    throw new Error(`Failed to cancel invoice: ${error.message}`);
  }
}

/**
 * Expose service methods to fetch user projects by client ID: listProjectsByClient(clientId: string)
 */
export async function listProjectsByClient(
  clientId: string
): Promise<{ data: any[] | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated" };
  }
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, status, msa_accepted_at")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Create a new project for a client.
 */
export async function createProject(
  name: string,
  clientId: string,
  description?: string
): Promise<{ data: any | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated" };
  }
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      client_id: clientId,
      name,
      description: description || "",
      status: "active"
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}
