import { SupabaseClient } from "@supabase/supabase-js";
import { canSynthesizeGlobalMsa, synthesizeGlobalMsa, AgencyMsaDefaults } from "@/lib/msa-synthesis";

export type MsaSource = "client" | "global" | "none";

export interface MsaResolution {
  msaId: string | null;
  source: MsaSource;
}

/**
 * Resolves which MSA should gate this share, in priority order:
 *   1. Client-specific MSA (if clientEmail matches a known client of this user)
 *   2. Agency global MSA (client_msas row with client_id IS NULL for this user)
 *   3. Auto-synthesized global MSA (created on demand from user_profiles defaults)
 *   4. None — caller must block the share
 *
 * Note: This uses the supabase admin client (service role) so it bypasses RLS.
 * Caller must already have authenticated the user before invoking.
 */
export async function resolveMsaForShare(
  supabaseAdmin: SupabaseClient,
  userId: string,
  clientEmail: string,
): Promise<MsaResolution> {
  // ── Tier 1: Client-specific MSA ─────────────────────────────
  const { data: matchedClient } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .ilike("client_email", clientEmail)
    .maybeSingle();

  if (matchedClient?.id) {
    const { data: clientMsa } = await supabaseAdmin
      .from("client_msas")
      .select("id")
      .eq("user_id", userId)
      .eq("client_id", matchedClient.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clientMsa?.id) {
      return { msaId: clientMsa.id, source: "client" };
    }
  }

  // ── Tier 2: Existing global MSA ─────────────────────────────
  const { data: existingGlobal } = await supabaseAdmin
    .from("client_msas")
    .select("id")
    .eq("user_id", userId)
    .is("client_id", null)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingGlobal?.id) {
    return { msaId: existingGlobal.id, source: "global" };
  }

  // ── Tier 3: Auto-synthesize global MSA from profile defaults ─
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("agency_name, msa_payment_terms_days, msa_late_fee_rate, msa_late_fee_unit, msa_ip_trigger_type, msa_jurisdiction_city")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile && canSynthesizeGlobalMsa(profile as AgencyMsaDefaults)) {
    const { title, content } = synthesizeGlobalMsa(profile as AgencyMsaDefaults);

    const { data: newGlobal, error: insertError } = await supabaseAdmin
      .from("client_msas")
      .insert({
        user_id: userId,
        client_id: null,
        title,
        content,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("MSA_GLOBAL_INSERT_FAILED:", insertError);
      return { msaId: null, source: "none" };
    }

    if (newGlobal?.id) {
      return { msaId: newGlobal.id, source: "global" };
    }
  }

  // ── Tier 4: Nothing available — caller must block ───────────
  return { msaId: null, source: "none" };
}

/**
 * Re-synthesizes the agency's global MSA from the latest profile defaults.
 * Called when user updates Global Contract Defaults in profile settings.
 *
 * If a global MSA row exists, updates it in place. If not, creates one.
 * Silently no-ops if profile lacks required fields.
 */
export async function syncGlobalMsaFromProfile(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<{ updated: boolean; reason?: string }> {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("agency_name, msa_payment_terms_days, msa_late_fee_rate, msa_late_fee_unit, msa_ip_trigger_type, msa_jurisdiction_city")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || !canSynthesizeGlobalMsa(profile as AgencyMsaDefaults)) {
    return { updated: false, reason: "Profile defaults incomplete." };
  }

  const { title, content } = synthesizeGlobalMsa(profile as AgencyMsaDefaults);

  // Check for existing global MSA
  const { data: existing } = await supabaseAdmin
    .from("client_msas")
    .select("id")
    .eq("user_id", userId)
    .is("client_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("client_msas")
      .update({ title, content, status: "active" })
      .eq("id", existing.id);

    if (error) {
      console.error("MSA_GLOBAL_UPDATE_FAILED:", error);
      return { updated: false, reason: error.message };
    }
    return { updated: true };
  }

  const { error } = await supabaseAdmin
    .from("client_msas")
    .insert({
      user_id: userId,
      client_id: null,
      title,
      content,
      status: "active",
    });

  if (error) {
    console.error("MSA_GLOBAL_INSERT_FAILED:", error);
    return { updated: false, reason: error.message };
  }
  return { updated: true };
}
