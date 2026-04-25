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

/* ─── List all MSAs for current user (across clients) ─ */

export async function listAllUserMsas(): Promise<{
  data: ClientMsa[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("client_msas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ClientMsa[], error: null };
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
  clientId: string;
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

  const { error } = await supabase
    .from("client_msas")
    .delete()
    .eq("id", msaId)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}

/* ─── Get active MSA for a client ─────────────────── */

export async function getActiveMsa(
  clientId: string,
): Promise<{ data: ClientMsa | null; error: string | null }> {
  const { data, error } = await supabase
    .from("client_msas")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as ClientMsa | null, error: null };
}
