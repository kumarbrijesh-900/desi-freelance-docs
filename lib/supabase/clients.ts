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
  address_line_1: string;
  address_line_2: string;
  city: string;
  pin_code: string;
  client_postal_code: string;
  state: string;
  country: string;
  client_currency: string;
  gstin: string;
  client_type: string;
  client_location: string;
  client_entity_type: string; // new field for agency vs freelancer
  sez_status: string;
  invoice_count: number;
  last_invoiced_at: string | null;
  msa_effective_date: string | null;
  msa_payment_terms_days: number;
  msa_late_fee_rate: number;
  msa_late_fee_unit: "monthly" | "annually" | "daily";
  msa_ip_trigger_type:
    | "upon_full_payment"
    | "upon_signing"
    | "upon_delivery"
    | "proportional_transfer"
    | "retained_by_creator";
  msa_jurisdiction_city: string;
  msa_version_label: string;
  msa_notes_boilerplate: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Converters ──────────────────────────────────── */

/** Convert a DB client row to ClientDetails for the invoice form */
export function savedClientToClientDetails(c: SavedClient): ClientDetails {
  return {
    clientName: c.client_name,
    clientAddress: c.client_address,
    clientAddressLine1: c.address_line_1,
    clientAddressLine2: c.address_line_2,
    clientCity: c.city,
    clientPinCode: c.pin_code,
    clientPostalCode: c.client_postal_code,
    clientEmail: c.client_email,
    clientState: c.state as ClientDetails["clientState"],
    clientCountry: c.country as ClientDetails["clientCountry"],
    clientCurrency: c.client_currency as ClientDetails["clientCurrency"],
    clientGstin: c.gstin,
    clientLocation: (c.client_location ||
      "domestic") as ClientDetails["clientLocation"],
    clientType: (c.client_entity_type ||
      "agency") as ClientDetails["clientType"],
    isClientSezUnit: c.sez_status as ClientDetails["isClientSezUnit"],
    msaEffectiveDate: c.msa_effective_date || undefined,
    msaPaymentTermsDays: c.msa_payment_terms_days,
    msaLateFeeRate: c.msa_late_fee_rate,
    msaLateFeeUnit: (c.msa_late_fee_unit || "monthly") as any,
    msaIpTriggerType: c.msa_ip_trigger_type,
    msaJurisdictionCity: c.msa_jurisdiction_city,
    msaVersionLabel: c.msa_version_label,
    msaNotesBoilerplate: c.msa_notes_boilerplate || undefined,
  };
}

/** Convert ClientDetails to DB row for upsert */
export function clientDetailsToRow(
  details: ClientDetails,
): Record<string, unknown> {
  return {
    client_name: details.clientName,
    client_email: details.clientEmail || "",
    client_address: details.clientAddress,
    address_line_1: details.clientAddressLine1 || "",
    address_line_2: details.clientAddressLine2 || "",
    city: details.clientCity || "",
    pin_code: details.clientPinCode || "",
    client_postal_code: details.clientPostalCode || "",
    state: details.clientState || "",
    country: details.clientCountry || "",
    client_currency: details.clientCurrency || "",
    gstin: details.clientGstin || "",
    // Bug 3 fix: DB column is client_location, not client_type
    client_location: details.clientLocation || "domestic",
    client_entity_type: details.clientType || "agency",
    sez_status: details.isClientSezUnit || "no",
    msa_effective_date: details.msaEffectiveDate || null,
    msa_payment_terms_days: details.msaPaymentTermsDays ?? 20,
    msa_late_fee_rate: details.msaLateFeeRate ?? 1.5,
    msa_late_fee_unit: details.msaLateFeeUnit || "monthly",
    msa_ip_trigger_type: details.msaIpTriggerType || "upon_full_payment",
    msa_jurisdiction_city: details.msaJurisdictionCity || "Bangalore",
    msa_version_label: details.msaVersionLabel || "Standard Lance MSA v1.2",
    msa_notes_boilerplate: details.msaNotesBoilerplate || null,
    updated_at: new Date().toISOString(),
  };
}

/* ─── List ────────────────────────────────────────── */

export async function listClients(): Promise<{
  data: SavedClient[];
  error: string | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
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
  clientId: string,
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
  existingId?: string,
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
  clientId: string,
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
  clientId: string,
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
