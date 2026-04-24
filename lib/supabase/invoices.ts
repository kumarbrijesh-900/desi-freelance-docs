/**
 * Invoice persistence service — Supabase CRUD for invoices.
 *
 * All operations are scoped to the authenticated user via RLS.
 * localStorage remains the offline fallback; this layer handles
 * cloud persistence for logged-in users.
 */

import { supabase } from "@/lib/supabase/client";
import type { InvoiceFormData } from "@/types/invoice";

/* ─── Types ───────────────────────────────────────────────── */

export type InvoiceStatus = "draft" | "finalized";

export type MsaResponse = "pending" | "accepted" | "rejected";

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
  msa_accepted_at: string | null;
  msa_response: MsaResponse;
  msa_responded_at: string | null;
  applied_payment_terms: string | null;
  applied_late_fee_rate: number | null;
  applied_license_type: string | null;
  created_at: string;
  updated_at: string;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/* ─── Save (upsert) ──────────────────────────────────────── */

export async function saveInvoice(
  input: SaveInvoiceInput
): Promise<{ data: SavedInvoice | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated. Please log in to save invoices." };
  }

  const invoiceNumber = getInvoiceNumber(input.formData);
  const status = input.status ?? "draft";

  const row = {
    invoice_number: invoiceNumber,
    form_data: input.formData as unknown as Record<string, unknown>,
    status,
    template_id: input.templateId ?? "classic",
    applied_payment_terms: input.formData.meta?.paymentTerms || null,
    applied_late_fee_rate: input.formData.client?.msaLateFeeRate || null,
    applied_license_type: input.formData.payment?.license?.licenseType || null,
  };

  if (input.existingId) {
    // Update existing
    const { data, error } = await supabase
      .from("invoices")
      .update(row)
      .eq("id", input.existingId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as SavedInvoice, error: null };
  }

  // Insert new
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      ...row,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as SavedInvoice, error: null };
}

/* ─── Load Single ─────────────────────────────────────────── */

export async function loadInvoice(
  invoiceId: string
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

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as SavedInvoice[], error: null };
}

/* ─── Delete ──────────────────────────────────────────────── */

export async function deleteInvoice(
  invoiceId: string
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
  invoiceId: string
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
      status: "finalized" as InvoiceStatus,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) return { token: null, error: error.message };
  return { token, error: null };
}

/* ─── Load by Share Token (public) ───────────────────── */

export async function loadInvoiceByToken(
  token: string
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
  userAgent: string
): Promise<void> {
  await supabase.from("read_receipts").insert({
    invoice_id: invoiceId,
    viewer_ua: userAgent,
  });
}

export async function getReadReceipts(
  invoiceId: string
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
  invoiceIds: string[]
): Promise<Record<string, { count: number; lastViewed: string | null }>> {
  if (!invoiceIds.length) return {};

  const { data } = await supabase
    .from("read_receipts")
    .select("invoice_id, viewed_at")
    .in("invoice_id", invoiceIds)
    .order("viewed_at", { ascending: false });

  const result: Record<string, { count: number; lastViewed: string | null }> = {};
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
  msaId: string
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
  invoiceId: string
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("invoices")
    .update({ msa_id: null, msa_accepted_at: null, msa_response: "pending", msa_responded_at: null })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

/** Load the MSA content for a shared invoice (public — uses RLS) */
export async function loadMsaForSharedInvoice(
  invoiceId: string,
  msaId: string
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
  response: "accepted" | "rejected"
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = {
    msa_response: response,
    msa_responded_at: now,
  };
  // Also set legacy msa_accepted_at for backward compat
  if (response === "accepted") {
    updateFields.msa_accepted_at = now;
  }

  const { error } = await supabase
    .from("invoices")
    .update(updateFields)
    .eq("share_token", shareToken)
    .not("msa_id", "is", null);

  return { error: error?.message ?? null };
}

/** Update the shared_to_email on an invoice */
export async function setSharedToEmail(
  invoiceId: string,
  email: string
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

