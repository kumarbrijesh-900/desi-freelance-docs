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

/* ─── Types ───────────────────────────────────────────────── */

export type InvoiceStatus = "DRAFT" | "SAVED" | "SENT" | "PARTIAL" | "SETTLED";

export type MsaResponse = "PENDING" | "ACCEPTED" | "REVISION ASKED";

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
  msa_response: MsaResponse;
  msa_responded_at: string | null;
  client_msa_note: string | null;
  /** Bug 2: stored as TEXT (e.g. 'Net 30', 'Due on Receipt') */
  applied_payment_terms: string | null;
  due_date: string | null;
  reminded_due_date: boolean;
  reminded_overdue: boolean;
  created_at: string;
  updated_at: string;
  has_addendum: boolean;
  msa_status: MsaResponse;
  grand_total?: number;
  milestones?: {
    id: string;
    description: string;
    status: string;
    amount: number;
    line_items: {
      id: string;
      description: string;
      qty: number;
      rate: number;
      amount: number;
    }[];
  }[];
}

export interface SaveInvoiceInput {
  formData: InvoiceFormData;
  status?: InvoiceStatus;
  templateId?: string;
  /** Pass an existing ID to update instead of insert */
  existingId?: string;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function getInvoiceNumber(data: InvoiceFormData): string {
  return data.meta?.invoiceNumber || `DRAFT-${Date.now()}`;
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
    status,
    template_id: input.templateId ?? "classic",
    due_date: input.formData.meta?.dueDate || null,
    // Fix: Prioritize meta.paymentTerms, fallback to client.msaPaymentTermsDays
    applied_payment_terms: input.formData.meta?.paymentTerms || 
      (input.formData.client?.msaPaymentTermsDays ? `Net ${input.formData.client.msaPaymentTermsDays}` : null),
    user_id: userId,
  };

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
    const items = input.formData.lineItems || [];
    const grand_total = items.reduce((s: number, i: any) => s + (i.qty || 0) * (i.rate || 0), 0);
    (result.data as any).grand_total = grand_total;
  }

  return { data: result.data as SavedInvoice, error: null };
}

/**
 * Helper to sync the new relational milestones tables from the JSONB form_data.
 * This ensures the 'JOIN explosion' logic has actual data to aggregate.
 */
async function syncMilestonesFromInvoice(invoiceId: string, formData: InvoiceFormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  // 1. Clear existing milestones for this invoice (cascades to line_items)
  await supabase.from("invoice_milestones").delete().eq("invoice_id", invoiceId);

  // 2. Extract and insert new ones
  const milestonesToInsert: any[] = [];
  let currentMilestone: any = null;

  formData.lineItems.forEach((item, idx) => {
    if (item.is_milestone_header) {
      currentMilestone = {
        invoice_id: invoiceId,
        user_id: userId,
        description: item.description,
        status: "PENDING",
        temp_id: item.id, // used to link items later
      };
      milestonesToInsert.push(currentMilestone);
    }
  });

  if (milestonesToInsert.length === 0) return;

  // Insert milestones
  const { data: insertedMilestones, error: mError } = await supabase
    .from("invoice_milestones")
    .insert(milestonesToInsert.map(({ temp_id, ...m }) => m))
    .select();

  if (mError || !insertedMilestones) {
    console.error("Error inserting milestones:", mError);
    return;
  }

  // 3. Link and insert line items
  const itemsToInsert: any[] = [];
  insertedMilestones.forEach((insertedM, mIdx) => {
    const originalMilestone = milestonesToInsert[mIdx];
    const milestoneItems = formData.lineItems.filter(li => {
      // Find items that belong to this milestone (items after this header until the next header)
      const headerIdx = formData.lineItems.findIndex(h => h.id === originalMilestone.temp_id);
      const itemIdx = formData.lineItems.findIndex(i => i.id === li.id);
      if (itemIdx <= headerIdx) return false;
      
      // Check if there's any header between them
      for (let i = headerIdx + 1; i < itemIdx; i++) {
        if (formData.lineItems[i].is_milestone_header) return false;
      }
      return !li.is_milestone_header;
    });

    milestoneItems.forEach((item, itemIdx) => {
      itemsToInsert.push({
        milestone_id: insertedM.id,
        user_id: userId,
        description: item.description,
        qty: item.qty || 0,
        rate: item.rate || 0,
        amount: (item.qty || 0) * (item.rate || 0),
        order_index: itemIdx
      });
    });
  });

  if (itemsToInsert.length > 0) {
    const { error: liError } = await supabase.from("invoice_line_items").insert(itemsToInsert);
    if (liError) console.error("Error inserting line items:", liError);
  }
}

/* ─── Load Single ─────────────────────────────────────────── */

export async function loadInvoice(
  invoiceId: string,
): Promise<{ data: SavedInvoice | null; error: string | null }> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
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
      )
    `)
    .eq("user_id", userId)
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
      const grandTotal = items.reduce((s: number, i: any) => s + (i.qty ?? 0) * (i.rate ?? 0), 0);
      return { ...inv, grand_total: grandTotal };
    });
    return { data: fallbackProcessed as SavedInvoice[], error: null };
  }

  // Aggregate data and calculate Grand Total manually
  const processedInvoices = (data ?? []).map((inv: any) => {
    // Calculate total amount from relational data if available, fallback to form_data
    let grandTotal = 0;
    if (inv.milestones && inv.milestones.length > 0) {
      inv.milestones.forEach((m: any) => {
        const milestoneTotal = (m.line_items ?? []).reduce(
          (sum: number, item: any) => sum + (item.qty ?? 0) * (item.rate ?? 0),
          0
        );
        m.amount = milestoneTotal;
        grandTotal += milestoneTotal;
      });
    } else {
      // Fallback to form_data logic
      const items = inv.form_data?.lineItems ?? [];
      grandTotal = items.reduce((s: number, i: any) => s + (i.qty ?? 0) * (i.rate ?? 0), 0);
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
    .select("*")
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
  response: "ACCEPTED" | "REVISION ASKED",
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = {
    msa_response: response,
    msa_responded_at: now,
  };
  // msa_accepted_at does not exist in the DB — msa_responded_at is the canonical field.

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
    type: `msa_${response}`,
    title: response === "ACCEPTED" ? "MSA Approved" : "MSA Rejected",
    message:
      response === "ACCEPTED"
        ? `Client approved MSA and seen invoice ${inv.invoice_number}.`
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
      msa_response: "REVISION ASKED" as MsaResponse,
      client_msa_note: noteText,
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
    message: `Client Proposing new MSA for ${inv.invoice_number}: "${noteText}"`,
    is_read: false,
  });

  return { error: null };
}

export async function markMilestoneSettled(
  invoiceId: string,
  milestoneId: string,
  tdsAmount: number = 0,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  // 1. Fetch current invoice data
  const { data: inv, error: fetchErr } = await supabase
    .from("invoices")
    .select("form_data, status, invoice_number")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !inv) return { error: fetchErr?.message || "Invoice not found" };

  const formData = mergeInvoiceFormData(inv.form_data);
  const lineItems = formData.lineItems || [];

  // 2. Update the milestone status
  let updated = false;
  lineItems.forEach((item) => {
    if (item.id === milestoneId) {
      item.milestone_status = "SETTLED";
      item.tds_amount = tdsAmount;
      updated = true;
    }
  });

  if (!updated) return { error: "Milestone not found" };

  // 3. Determine new parent status
  const allMilestones = lineItems.filter((i) => i.is_milestone_header);
  const settledMilestones = allMilestones.filter((i) => i.milestone_status === "SETTLED");
  
  let newStatus = "PARTIAL";
  if (settledMilestones.length === allMilestones.length) {
    newStatus = "SETTLED";
  }

  // 4. Update Supabase
  const { error: updateErr } = await supabase
    .from("invoices")
    .update({
      form_data: formData as unknown as Record<string, unknown>,
      status: newStatus as InvoiceStatus,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (!updateErr) {
    const milestone = allMilestones.find(m => m.id === milestoneId);
    await supabase.from("notifications").insert({
      user_id: userId,
      invoice_id: invoiceId,
      type: "milestone_settled",
      title: "Milestone Paid",
      message: `Milestone "${milestone?.description}" for Invoice ${inv.invoice_number} has been marked as SETTLED.`,
      is_read: false,
    });
  }

  return { error: updateErr?.message ?? null };
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
    .update({ status: "SETTLED" as InvoiceStatus })
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

  const { error } = await supabase
    .from("invoices")
    .update({
      form_data: newFormData as unknown as Record<string, unknown>,
      client_msa_note: null,
      msa_response: "PENDING" as MsaResponse,
      msa_responded_at: null,
      applied_payment_terms: newFormData.meta?.paymentTerms || null,
      applied_late_fee_rate: newFormData.client?.msaLateFeeRate || null,
      applied_license_type: newFormData.payment?.license?.licenseType || null,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}
