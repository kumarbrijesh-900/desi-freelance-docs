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

export interface SavedInvoice {
  id: string;
  user_id: string;
  invoice_number: string;
  form_data: InvoiceFormData;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface SaveInvoiceInput {
  formData: InvoiceFormData;
  status?: InvoiceStatus;
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

  if (input.existingId) {
    // Update existing
    const { data, error } = await supabase
      .from("invoices")
      .update({
        invoice_number: invoiceNumber,
        form_data: input.formData as unknown as Record<string, unknown>,
        status,
      })
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
      user_id: userId,
      invoice_number: invoiceNumber,
      form_data: input.formData as unknown as Record<string, unknown>,
      status,
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
