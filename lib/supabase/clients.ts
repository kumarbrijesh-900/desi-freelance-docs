/**
 * ─── Client Directory Service ──────────────────────
 *
 * CRUD for clients table — saved clients that can be
 * re-used across invoices and have MSAs attached.
 * Scoped to auth.uid() via RLS.
 */

import { supabase } from "@/lib/supabase/client";
import type { ClientDetails } from "@/types/invoice";

/* ─── Types ───────────────────────────────────────── */

export interface SavedClient {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  client_address: string;
  client_address_line1: string;
  client_address_line2: string;
  client_city: string;
  client_pin_code: string;
  client_postal_code: string;
  client_state: string;
  client_country: string;
  client_currency: string;
  client_gstin: string;
  client_location: string;
  is_client_sez_unit: string;
  invoice_count: number;
  last_invoiced_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Converters ──────────────────────────────────── */

/** Convert a DB client row to ClientDetails for the invoice form */
export function savedClientToClientDetails(c: SavedClient): ClientDetails {
  return {
    clientName: c.client_name,
    clientAddress: c.client_address,
    clientAddressLine1: c.client_address_line1,
    clientAddressLine2: c.client_address_line2,
    clientCity: c.client_city,
    clientPinCode: c.client_pin_code,
    clientPostalCode: c.client_postal_code,
    clientEmail: c.client_email,
    clientState: c.client_state as ClientDetails["clientState"],
    clientCountry: c.client_country as ClientDetails["clientCountry"],
    clientCurrency: c.client_currency as ClientDetails["clientCurrency"],
    clientGstin: c.client_gstin,
    clientLocation: (c.client_location || "domestic") as ClientDetails["clientLocation"],
    isClientSezUnit: c.is_client_sez_unit as ClientDetails["isClientSezUnit"],
  };
}

/** Convert ClientDetails to DB row for upsert */
export function clientDetailsToRow(
  details: ClientDetails
): Record<string, unknown> {
  return {
    client_name: details.clientName,
    client_email: details.clientEmail || "",
    client_address: details.clientAddress,
    client_address_line1: details.clientAddressLine1 || "",
    client_address_line2: details.clientAddressLine2 || "",
    client_city: details.clientCity || "",
    client_pin_code: details.clientPinCode || "",
    client_postal_code: details.clientPostalCode || "",
    client_state: details.clientState || "",
    client_country: details.clientCountry || "",
    client_currency: details.clientCurrency || "",
    client_gstin: details.clientGstin || "",
    client_location: details.clientLocation || "domestic",
    is_client_sez_unit: details.isClientSezUnit || "",
    updated_at: new Date().toISOString(),
  };
}

/* ─── List ────────────────────────────────────────── */

export async function listClients(): Promise<{
  data: SavedClient[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SavedClient[], error: null };
}

/* ─── Get Single ──────────────────────────────────── */

export async function getClient(
  clientId: string
): Promise<{ data: SavedClient | null; error: string | null }> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SavedClient, error: null };
}

/* ─── Upsert (by client name match or explicit ID) ── */

export async function upsertClient(
  details: ClientDetails,
  existingId?: string
): Promise<{ data: SavedClient | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const row = clientDetailsToRow(details);

  if (existingId) {
    // Update existing
    const { data, error } = await supabase
      .from("clients")
      .update(row)
      .eq("id", existingId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as SavedClient, error: null };
  }

  // Check if client with same name exists (for auto-save after invoice)
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .ilike("client_name", details.clientName.trim())
    .maybeSingle();

  if (existing) {
    // Update existing client
    const { data, error } = await supabase
      .from("clients")
      .update({
        ...row,
        last_invoiced_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as SavedClient, error: null };
  }

  // Insert new
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...row, user_id: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SavedClient, error: null };
}

/* ─── Increment Invoice Count ─────────────────────── */

export async function incrementClientInvoiceCount(
  clientId: string
): Promise<void> {
  const { data: client } = await supabase
    .from("clients")
    .select("invoice_count")
    .eq("id", clientId)
    .single();

  if (client) {
    await supabase
      .from("clients")
      .update({
        invoice_count: (client.invoice_count || 0) + 1,
        last_invoiced_at: new Date().toISOString(),
      })
      .eq("id", clientId);
  }
}

/* ─── Delete ──────────────────────────────────────── */

export async function deleteClient(
  clientId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}
