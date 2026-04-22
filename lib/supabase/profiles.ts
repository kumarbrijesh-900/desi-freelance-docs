/**
 * ─── User Profile Service ──────────────────────────
 *
 * CRUD for user_profiles table — agency details + payment
 * defaults that auto-fill every new invoice.
 * Scoped to auth.uid() via RLS.
 */

import { supabase } from "@/lib/supabase/client";
import type { AgencyDetails, PaymentDetails } from "@/types/invoice";

/* ─── Types ───────────────────────────────────────── */

export interface UserProfile {
  id: string;
  user_id: string;
  agency_name: string;
  address: string;
  address_line1: string;
  address_line2: string;
  city: string;
  pin_code: string;
  state: string;
  gstin: string;
  pan: string;
  logo_url: string;
  gst_registration_status: string;
  lut_availability: string;
  lut_number: string;
  no_lut_tax_handling: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
  bank_address: string;
  swift_bic_code: string;
  iban_routing_code: string;
  qr_code_url: string;
  created_at: string;
  updated_at: string;
}

/* ─── Converters ──────────────────────────────────── */

/** Convert a DB profile row into AgencyDetails for the invoice form */
export function profileToAgencyDetails(p: UserProfile): AgencyDetails {
  return {
    agencyName: p.agency_name,
    address: p.address,
    addressLine1: p.address_line1,
    addressLine2: p.address_line2,
    city: p.city,
    pinCode: p.pin_code,
    agencyState: p.state as AgencyDetails["agencyState"],
    gstin: p.gstin,
    pan: p.pan,
    logoUrl: p.logo_url,
    gstRegistrationStatus: (p.gst_registration_status || "not-registered") as AgencyDetails["gstRegistrationStatus"],
    lutAvailability: p.lut_availability as AgencyDetails["lutAvailability"],
    lutNumber: p.lut_number,
    noLutTaxHandling: p.no_lut_tax_handling as AgencyDetails["noLutTaxHandling"],
  };
}

/** Convert a DB profile row into PaymentDetails defaults */
export function profileToPaymentDefaults(p: UserProfile): Partial<PaymentDetails> {
  return {
    bankName: p.bank_name,
    accountName: p.account_name,
    accountNumber: p.account_number,
    ifscCode: p.ifsc_code,
    bankAddress: p.bank_address,
    swiftBicCode: p.swift_bic_code,
    ibanRoutingCode: p.iban_routing_code,
    qrCodeUrl: p.qr_code_url,
  };
}

/** Convert AgencyDetails + payment back to DB columns for upsert */
export function agencyToProfileRow(
  agency: AgencyDetails,
  payment?: Partial<PaymentDetails>
): Record<string, unknown> {
  return {
    agency_name: agency.agencyName,
    address: agency.address,
    address_line1: agency.addressLine1,
    address_line2: agency.addressLine2,
    city: agency.city,
    pin_code: agency.pinCode,
    state: agency.agencyState,
    gstin: agency.gstin,
    pan: agency.pan,
    logo_url: agency.logoUrl,
    gst_registration_status: agency.gstRegistrationStatus || "not-registered",
    lut_availability: agency.lutAvailability || "",
    lut_number: agency.lutNumber || "",
    no_lut_tax_handling: agency.noLutTaxHandling || "",
    bank_name: payment?.bankName || "",
    account_name: payment?.accountName || "",
    account_number: payment?.accountNumber || "",
    ifsc_code: payment?.ifscCode || "",
    bank_address: payment?.bankAddress || "",
    swift_bic_code: payment?.swiftBicCode || "",
    iban_routing_code: payment?.ibanRoutingCode || "",
    qr_code_url: payment?.qrCodeUrl || "",
    updated_at: new Date().toISOString(),
  };
}

/* ─── Load ────────────────────────────────────────── */

export async function loadProfile(): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile | null, error: null };
}

/* ─── Upsert ──────────────────────────────────────── */

export async function upsertProfile(
  agency: AgencyDetails,
  payment?: Partial<PaymentDetails>
): Promise<{ data: UserProfile | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const row = agencyToProfileRow(agency, payment);

  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("user_profiles")
      .update(row)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as UserProfile, error: null };
  }

  // Insert
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ ...row, user_id: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile, error: null };
}
