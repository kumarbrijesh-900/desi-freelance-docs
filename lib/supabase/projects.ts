/**
 * Projects database service layer.
 * All queries are scoped to the authenticated user via Row Level Security (RLS).
 */

import { supabase } from "@/lib/supabase/client";

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  status: "active" | "completed" | "cancelled";
  msa_accepted_at: string | null;
  msa_accepted_via_invoice_id: string | null;
  project_addendum_text: string | null;
  master_po_number: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch authenticated user ID safely.
 */
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Fetch a single project by ID.
 */
export async function getProject(
  projectId: string
): Promise<{ data: Project | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Project, error: null };
}

/**
 * Create a new project for a client.
 */
export async function createProject(
  name: string,
  clientId: string,
  description?: string
): Promise<{ data: Project | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      client_id: clientId,
      name,
      description: description || "",
      status: "active"
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Project, error: null };
}

/**
 * Fetch all projects for a given client.
 */
export async function listProjectsByClient(
  clientId: string
): Promise<{ data: Project[] | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Project[], error: null };
}
