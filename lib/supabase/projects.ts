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

export interface ProjectClient {
  id: string;
  client_name: string;
  city: string | null;
  client_address: string | null;
}

export interface ProjectRow extends Project {
  client?: ProjectClient | null;
}

export interface InvoiceRow {
  id: string;
  user_id: string;
  project_id: string | null;
  invoice_number: string;
  form_data: any;
  status: string;
  share_token: string | null;
  shared_at: string | null;
  shared_to_email: string | null;
  msa_id: string | null;
  client_msa_note: string | null;
  msa_status: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
  has_addendum: boolean | null;
  grand_total?: number;
}

export interface MilestoneRow {
  id: string;
  invoice_id: string;
  title: string | null;
  status: string | null;
  amount: number | null;
  order_index: number | null;
  trigger_mode?: "scheduled" | "immediate" | "manual";
  trigger_status?: "pending" | "fired" | "failed";
  trigger_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProjectWithInvoices {
  project: ProjectRow;
  invoices: InvoiceRow[];
  milestones: MilestoneRow[];
  metrics: {
    billed: number;
    collected: number;
    outstanding: number;
    daysActive: number;
  };
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

function getInvoiceTotal(invoice: InvoiceRow, milestones: MilestoneRow[]): number {
  if (milestones.length > 0) {
    return milestones.reduce((sum, milestone) => sum + Number(milestone.amount || 0), 0);
  }

  const items = invoice.form_data?.lineItems ?? [];
  if (items.length > 0) {
    return items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.qty || 0) * Number(item.rate || 0),
      0
    );
  }

  return Number(invoice.form_data?.totals?.total || invoice.grand_total || 0);
}

function getProjectMetrics(
  project: ProjectRow,
  invoices: InvoiceRow[],
  milestones: MilestoneRow[]
): ProjectWithInvoices["metrics"] {
  let billed = 0;
  let collected = 0;
  let outstanding = 0;
  const milestonesByInvoice = new Map<string, MilestoneRow[]>();

  milestones.forEach((milestone) => {
    const list = milestonesByInvoice.get(milestone.invoice_id) ?? [];
    list.push(milestone);
    milestonesByInvoice.set(milestone.invoice_id, list);
  });

  invoices.forEach((invoice) => {
    const status = (invoice.status || "").toLowerCase();
    if (status === "cancelled" || status === "draft") return;

    const invoiceMilestones = milestonesByInvoice.get(invoice.id) ?? [];
    billed += getInvoiceTotal(invoice, invoiceMilestones);

    if (invoiceMilestones.length > 0) {
      invoiceMilestones.forEach((milestone) => {
        const milestoneStatus = (milestone.status || "").toLowerCase();
        const amount = Number(milestone.amount || 0);
        if (milestoneStatus === "settled" || milestoneStatus === "paid") {
          collected += amount;
        } else {
          outstanding += amount;
        }
      });
      return;
    }

    const amount = getInvoiceTotal(invoice, []);
    if (status === "settled" || status === "paid") {
      collected += amount;
    } else {
      outstanding += amount;
    }
  });

  const createdAt = new Date(project.created_at).getTime();
  const daysActive = Number.isNaN(createdAt)
    ? 0
    : Math.max(0, Math.ceil((Date.now() - createdAt) / 86400000));

  return { billed, collected, outstanding, daysActive };
}

/**
 * Fetch all projects with invoices, milestones, and computed metrics.
 */
export async function getAllProjectsWithInvoices(): Promise<{
  data: ProjectWithInvoices[];
  error: string | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: [], error: "Not authenticated" };
  }

  const { data: projectsData, error: projectsError } = await supabase
    .from("projects")
    .select("*, client:clients(id, client_name, city, client_address)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (projectsError) {
    return { data: [], error: projectsError.message };
  }

  const projects = (projectsData ?? []) as ProjectRow[];
  if (projects.length === 0) {
    return { data: [], error: null };
  }

  const projectIds = projects.map((project) => project.id);
  const { data: invoicesData, error: invoicesError } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false });

  if (invoicesError) {
    return { data: [], error: invoicesError.message };
  }

  const invoices = (invoicesData ?? []) as InvoiceRow[];
  const invoiceIds = invoices.map((invoice) => invoice.id);
  let milestones: MilestoneRow[] = [];

  if (invoiceIds.length > 0) {
    const { data: milestonesData, error: milestonesError } = await supabase
      .from("invoice_milestones")
      .select("*")
      .in("invoice_id", invoiceIds);

    if (milestonesError) {
      return { data: [], error: milestonesError.message };
    }

    milestones = (milestonesData ?? []) as MilestoneRow[];
  }

  const invoicesByProject = new Map<string, InvoiceRow[]>();
  invoices.forEach((invoice) => {
    if (!invoice.project_id) return;
    const list = invoicesByProject.get(invoice.project_id) ?? [];
    list.push(invoice);
    invoicesByProject.set(invoice.project_id, list);
  });

  const milestonesByProject = new Map<string, MilestoneRow[]>();
  milestones.forEach((milestone) => {
    const invoice = invoices.find((item) => item.id === milestone.invoice_id);
    if (!invoice?.project_id) return;
    const list = milestonesByProject.get(invoice.project_id) ?? [];
    list.push(milestone);
    milestonesByProject.set(invoice.project_id, list);
  });

  const data = projects.map((project) => {
    const projectInvoices = invoicesByProject.get(project.id) ?? [];
    const projectMilestones = milestonesByProject.get(project.id) ?? [];

    return {
      project,
      invoices: projectInvoices,
      milestones: projectMilestones,
      metrics: getProjectMetrics(project, projectInvoices, projectMilestones),
    };
  });

  return { data, error: null };
}
