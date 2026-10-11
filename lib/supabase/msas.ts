/**
 * ─── Client MSA Service ────────────────────────────
 *
 * CRUD for client_msas table — Master Service Agreements
 * attached to specific clients. Plain text/markdown format.
 * Used in Phase 9's shareable link flow for MSA gating.
 */

import { supabase } from "@/lib/supabase/client";

/* ─── Types ───────────────────────────────────────── */

export type MsaStatus = "draft" | "active" | "expired";

export interface ClientMsa {
  id: string;
  client_id: string;
  user_id: string;
  title: string;
  content: string;
  status: MsaStatus;
  created_at: string;
  updated_at: string;
}

/* ─── List MSAs for a client ──────────────────────── */

export async function listClientMsas(
  clientId: string,
): Promise<{ data: ClientMsa[]; error: string | null }> {
  const { data, error } = await supabase
    .from("client_msas")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ClientMsa[], error: null };
}

/* ─── What actually governs a client ──────────────── */

export interface ClientAgreementContext {
  /** The account's default contract. Edited in Profile, never here. */
  globalMsa: ClientMsa | null;
  /** This client's invoices already issued under that default. */
  invoicesUnderGlobal: number;
}

/**
 * The agreement that actually covers a client, resolved the way
 * app/api/share-invoice resolves it at send time: an active client-specific
 * MSA wins, otherwise the account's global default.
 *
 * listClientMsas cannot answer this. It filters `.eq("client_id", clientId)`,
 * and in SQL `= <uuid>` never matches NULL, so a global default - which is
 * stored with client_id NULL - is invisible to it. The client page therefore
 * read "No agreements yet" for every client while the default governed all
 * of their invoices. This is the missing half.
 */
export async function getClientAgreementContext(
  clientId: string,
): Promise<{ data: ClientAgreementContext; error: string | null }> {
  const empty: ClientAgreementContext = { globalMsa: null, invoicesUnderGlobal: 0 };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: empty, error: "Not authenticated" };

  // status 'active' matches the share-time lookup. A draft or expired default
  // does not govern anything, so claiming it does on this page would be a
  // different lie from the one being fixed.
  const { data: global, error: globalError } = await supabase
    .from("client_msas")
    .select("*")
    .eq("user_id", user.id)
    .is("client_id", null)
    .eq("status", "active")
    .maybeSingle();

  if (globalError) return { data: empty, error: globalError.message };
  if (!global) return { data: empty, error: null };

  const globalMsa = global as ClientMsa;

  const { count, error: countError } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("msa_id", globalMsa.id);

  if (countError) {
    // The agreement is the point; the count is colour. Surface the agreement
    // rather than hiding it because a tally failed.
    return { data: { globalMsa, invoicesUnderGlobal: 0 }, error: countError.message };
  }

  return { data: { globalMsa, invoicesUnderGlobal: count ?? 0 }, error: null };
}

/* ─── Get Single MSA ──────────────────────────────── */

export async function getMsa(
  msaId: string,
): Promise<{ data: ClientMsa | null; error: string | null }> {
  const { data, error } = await supabase
    .from("client_msas")
    .select("*")
    .eq("id", msaId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ClientMsa, error: null };
}

/* ─── Create MSA ──────────────────────────────────── */

export async function createMsa(input: {
  clientId: string | null;
  title: string;
  content: string;
  status?: MsaStatus;
}): Promise<{ data: ClientMsa | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("client_msas")
    .insert({
      client_id: input.clientId,
      user_id: user.id,
      title: input.title || "Master Service Agreement",
      content: input.content,
      status: input.status || "draft",
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ClientMsa, error: null };
}

/* ─── Update MSA ──────────────────────────────────── */

export async function updateMsa(
  msaId: string,
  updates: { title?: string; content?: string; status?: MsaStatus },
): Promise<{ data: ClientMsa | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("client_msas")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", msaId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ClientMsa, error: null };
}

/* ─── Delete MSA ──────────────────────────────────── */

export async function deleteMsa(
  msaId: string,
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // An invoice issued under an agreement keeps that agreement on record, so a
  // referenced MSA is not deletable. The FK is ON DELETE SET NULL, meaning a
  // delete would not remove those invoices, it would strand them: the
  // agreement text exists nowhere else, and clearing msa_id also clears the
  // gate, which silently exposes the line items of any invoice that was
  // withholding them pending acceptance.
  const { count, error: countError } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("msa_id", msaId);

  if (countError) return { error: countError.message };

  if ((count ?? 0) > 0) {
    return {
      error: `This agreement is attached to ${count} invoice${count === 1 ? "" : "s"} and cannot be deleted.`,
    };
  }

  const { error } = await supabase
    .from("client_msas")
    .delete()
    .eq("id", msaId)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}
