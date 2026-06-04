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
  lut_validity: string;
  no_lut_tax_handling: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
  bank_address: string;
  swift_bic_code: string;
  iban_routing_code: string;
  qr_code_url: string;
  signature_url: string;
  // MSA Defaults (Global)
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
  primary_service: string;
  free_revision_rounds: number;
  extra_revision_fee_percent: number;
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
    gstRegistrationStatus: (p.gst_registration_status ||
      "not-registered") as AgencyDetails["gstRegistrationStatus"],
    lutAvailability: p.lut_availability as AgencyDetails["lutAvailability"],
    lutNumber: p.lut_number,
    lutValidity: p.lut_validity,
    noLutTaxHandling:
      p.no_lut_tax_handling as AgencyDetails["noLutTaxHandling"],
    signatureUrl: p.signature_url,
    // Add MSA defaults to agency details if we need them in the editor
    msaPaymentTermsDays: p.msa_payment_terms_days,
    msaLateFeeRate: p.msa_late_fee_rate,
    msaLateFeeUnit: (p.msa_late_fee_unit || "monthly") as any,
    msaIpTriggerType: p.msa_ip_trigger_type,
    msaJurisdictionCity: p.msa_jurisdiction_city,
    primaryService: p.primary_service,
    freeRevisionRounds: p.free_revision_rounds,
    extraRevisionFeePercent: p.extra_revision_fee_percent,
  };
}

/** Convert a DB profile row into PaymentDetails defaults */
export function profileToPaymentDefaults(
  p: UserProfile,
): Partial<PaymentDetails> {
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
  payment?: Partial<PaymentDetails>,
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
    lut_validity: agency.lutValidity || "",
    no_lut_tax_handling: agency.noLutTaxHandling || "",
    bank_name: payment?.bankName || "",
    account_name: payment?.accountName || "",
    account_number: payment?.accountNumber || "",
    ifsc_code: payment?.ifscCode || "",
    bank_address: payment?.bankAddress || "",
    swift_bic_code: payment?.swiftBicCode || "",
    iban_routing_code: payment?.ibanRoutingCode || "",
    qr_code_url: payment?.qrCodeUrl || "",
    signature_url: agency.signatureUrl || "",
    // MSA Defaults
    msa_payment_terms_days: Number.isFinite(agency.msaPaymentTermsDays) ? Math.max(0, agency.msaPaymentTermsDays as number) : 20,
    msa_late_fee_rate: Number.isFinite(agency.msaLateFeeRate) ? Math.max(0, agency.msaLateFeeRate as number) : 1.5,
    msa_late_fee_unit: agency.msaLateFeeUnit || "monthly",
    msa_ip_trigger_type: agency.msaIpTriggerType || "upon_full_payment",
    msa_jurisdiction_city: agency.msaJurisdictionCity || "Bengaluru",
    primary_service: agency.primaryService || "",
    free_revision_rounds: Number.isFinite(agency.freeRevisionRounds) ? Math.max(0, agency.freeRevisionRounds as number) : 2,
    extra_revision_fee_percent: Number.isFinite(agency.extraRevisionFeePercent) ? Math.max(0, agency.extraRevisionFeePercent as number) : 15,
    updated_at: new Date().toISOString(),
  };
}

/* ─── Load ────────────────────────────────────────── */

export async function loadProfile(): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    console.warn("loadProfile: No session found");
    return { data: null, error: "Not authenticated" };
  }
  const user = session.user;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("SUPABASE_LOAD_ERROR:", error.message);
    return { data: null, error: error.message };
  }

  if (!data) {
    console.log(
      "SUPABASE_LOAD_INFO: No profile row found for user_id:",
      user.id,
    );
  } else {
    console.log(
      "SUPABASE_LOAD_SUCCESS: Profile found for agency:",
      data.agency_name,
    );
  }

  return { data: data as UserProfile | null, error: null };
}

/* ─── Upsert ──────────────────────────────────────── */

export async function upsertProfile(
  agency: AgencyDetails,
  payment?: Partial<PaymentDetails>,
): Promise<{ data: UserProfile | null; error: string | null }> {
  // Force-refresh session to ensure we have latest user_id
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { data: null, error: "Not authenticated" };
  const user = session.user;

  const row = agencyToProfileRow(agency, payment);

  // Use UPSERT directly with ON CONFLICT (user_id) if possible,
  // but for safety we'll stick to our exist check with a force update.
  const { data: existing, error: checkError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) return { data: null, error: checkError.message };

  if (existing) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(row)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("SUPABASE_UPDATE_ERROR:", error.message);
      return { data: null, error: error.message };
    }
    return { data: data as UserProfile, error: null };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ ...row, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("SUPABASE_INSERT_ERROR:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as UserProfile, error: null };
}

export type ProfileGlobalMsaSaveStatus =
  | "success"
  | "partial_profile_saved"
  | "failed";

export type ProfileGlobalMsaSaveResult = {
  status: ProfileGlobalMsaSaveStatus;
  atomic: boolean;
  data: {
    profileId: string | null;
    globalMsaId: string | null;
  } | null;
  error: string | null;
};

function isMissingAtomicSaveFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.message?.includes("save_profile_with_global_msa") ||
    error.message?.includes("Could not find the function") ||
    false
  );
}

async function upsertGlobalMsaFallback(input: {
  userId: string;
  globalMsaId: string | null;
  title: string;
  content: string;
}): Promise<{ id: string | null; error: string | null }> {
  if (input.globalMsaId) {
    const { data, error } = await supabase
      .from("client_msas")
      .update({
        title: input.title,
        content: input.content,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.globalMsaId)
      .eq("user_id", input.userId)
      .is("client_id", null)
      .select("id")
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    if (!data?.id) return { id: null, error: "Global MSA was not found for this user." };
    return { id: data.id as string, error: null };
  }

  const { data: existing, error: existingError } = await supabase
    .from("client_msas")
    .select("id")
    .eq("user_id", input.userId)
    .is("client_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return { id: null, error: existingError.message };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("client_msas")
      .update({
        title: input.title,
        content: input.content,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", input.userId)
      .is("client_id", null)
      .select("id")
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    return { id: data?.id as string | null, error: null };
  }

  const { data, error } = await supabase
    .from("client_msas")
    .insert({
      user_id: input.userId,
      client_id: null,
      title: input.title,
      content: input.content,
      status: "active",
    })
    .select("id")
    .maybeSingle();

  if (error) return { id: null, error: error.message };
  return { id: data?.id as string | null, error: null };
}

export async function saveProfileWithGlobalMsa(input: {
  agency: AgencyDetails;
  payment?: Partial<PaymentDetails>;
  globalMsaId: string | null;
  globalMsaTitle: string;
  globalMsaContent: string;
}): Promise<ProfileGlobalMsaSaveResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return {
      status: "failed",
      atomic: false,
      data: null,
      error: "Not authenticated",
    };
  }

  const row = agencyToProfileRow(input.agency, input.payment);
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_profile_with_global_msa",
    {
      p_profile: row,
      p_global_msa_id: input.globalMsaId,
      p_global_msa_title: input.globalMsaTitle,
      p_global_msa_content: input.globalMsaContent,
    },
  );

  if (!rpcError) {
    const payload = rpcData as { profile_id?: string; global_msa_id?: string } | null;
    return {
      status: "success",
      atomic: true,
      data: {
        profileId: payload?.profile_id ?? null,
        globalMsaId: payload?.global_msa_id ?? null,
      },
      error: null,
    };
  }

  if (!isMissingAtomicSaveFunction(rpcError)) {
    console.error("PROFILE_ATOMIC_SAVE_ERROR:", rpcError.message);
    return {
      status: "failed",
      atomic: true,
      data: null,
      error: rpcError.message,
    };
  }

  console.warn(
    "PROFILE_ATOMIC_SAVE_RPC_MISSING: Falling back to explicit partial-success save. Apply migration 20260526000000_atomic_profile_global_msa_save.sql.",
  );

  const { data: profile, error: profileError } = await upsertProfile(
    input.agency,
    input.payment,
  );

  if (profileError) {
    return {
      status: "failed",
      atomic: false,
      data: null,
      error: profileError,
    };
  }

  const globalMsaResult = await upsertGlobalMsaFallback({
    userId: session.user.id,
    globalMsaId: input.globalMsaId,
    title: input.globalMsaTitle,
    content: input.globalMsaContent,
  });

  if (globalMsaResult.error) {
    return {
      status: "partial_profile_saved",
      atomic: false,
      data: {
        profileId: profile?.id ?? null,
        globalMsaId: null,
      },
      error: globalMsaResult.error,
    };
  }

  return {
    status: "success",
    atomic: false,
    data: {
      profileId: profile?.id ?? null,
      globalMsaId: globalMsaResult.id,
    },
    error: null,
  };
}

/**
 * Syncs the user profile from a given invoice form data.
 * Useful for "Guest to Registered" transition.
 * Only fills in fields that are currently empty in the profile.
 */
export async function syncProfileFromInvoice(
  formData: any,
): Promise<{ success: boolean; error?: string }> {
  // Never sync from an invoice with no real agency identity — upsertProfile is a
  // full-row overwrite, so a blank agency would erase the saved profile.
  const invoiceAgencyName = String(formData?.agency?.agencyName ?? "").trim();
  if (!invoiceAgencyName) return { success: true };

  const { data: profile, error: loadError } = await loadProfile();
  if (loadError && loadError !== "Not authenticated")
    return { success: false, error: loadError };

  // First-capture only: once the profile has an agency identity (seeded or set on
  // the Profile page), that is the source of truth — don't clobber it from an invoice.
  if (profile && String(profile.agency_name ?? "").trim()) {
    return { success: true };
  }

  const { error: upsertError } = await upsertProfile(
    formData.agency,
    formData.payment,
  );

  if (upsertError) return { success: false, error: upsertError };
  return { success: true };
}
