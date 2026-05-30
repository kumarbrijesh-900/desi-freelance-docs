import { ProjectWithInvoices, InvoiceRow, MilestoneRow } from "@/lib/supabase/projects";

export type InvoiceContext = InvoiceRow;
export type MilestoneContext = MilestoneRow;
export type LineItem = {
  name?: string;
  description: string;
  qty?: number | string;
  rate?: number | string;
  rateUnit?: string;
  type?: string;
};

export type DrilldownState = {
  invoice: InvoiceContext | null;
  milestone: MilestoneContext | null;
  items: LineItem[];
  primary_action: 'send_now' | 'mark_settled' | 'resend' | 'finalize' | 'review_revision' | 'review_only';
};

export function computeActiveDrilldown(project: ProjectWithInvoices): DrilldownState {
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);

  if (!master) {
    return {
      invoice: null,
      milestone: null,
      items: [],
      primary_action: 'review_only',
    };
  }

  const activeMilestones = project.milestones
    .filter(m => project.invoices.find(inv => inv.id === m.invoice_id && !(inv as any).parent_invoice_id))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  let activeMilestone: MilestoneContext | null = null;
  let primaryAction: DrilldownState['primary_action'] = 'review_only';

  const msaStatus = (master.msa_status || '').toLowerCase();
  const isDraft = !master.shared_at;

  const scheduledPending = activeMilestones.find(m => m.trigger_mode === 'scheduled' && m.trigger_status === 'pending');
  const firstLive = activeMilestones.find((m, idx) =>
    (m.status || '').toLowerCase() === 'live' && idx < activeMilestones.length - 1
  );

  if (isDraft) {
    activeMilestone = activeMilestones.find(m => (m.status || '').toLowerCase() === 'pending') || activeMilestones[0] || null;
    primaryAction = 'finalize';
  } else if (scheduledPending) {
    activeMilestone = scheduledPending;
    primaryAction = 'send_now';
  } else if (msaStatus === 'proposed' && master.client_msa_note) {
    activeMilestone = null;
    primaryAction = 'review_revision';
  } else if ((msaStatus === 'pending' || msaStatus === 'proposed') && master.shared_at) {
    activeMilestone = null;
    primaryAction = 'resend';
  } else if (firstLive) {
    activeMilestone = firstLive;
    primaryAction = 'mark_settled';
  } else {
    // Past negotiation (e.g. MSA accepted) but no milestone is LIVE yet.
    // Active = the FIRST non-settled milestone, never the last.
    const ordered = [...activeMilestones].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const firstUnsettled = ordered.find(m => (m.status || '').toLowerCase() !== 'settled');
    if (firstUnsettled) {
      activeMilestone = firstUnsettled;
      primaryAction = 'mark_settled';
    } else {
      activeMilestone = ordered[ordered.length - 1] || null;
      primaryAction = 'review_only';
    }
  }

  // Determine which invoice to return
  let relevantInvoice = master;
  if (activeMilestone) {
    const childInvoice = project.invoices.find(
      inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (activeMilestone?.order_index ?? 0) + 1
    );
    if (childInvoice) {
      relevantInvoice = childInvoice;
    }
  }

  // Extract items
  let items: LineItem[] = [];
  if (activeMilestone) {
    // Try to get line items from master.form_data.milestones
    const formMilestones = master.form_data?.milestones || [];
    const formMilestone = formMilestones.find((m: any, idx: number) => idx === activeMilestone?.order_index);
    if (formMilestone && (formMilestone.lineItems || formMilestone.line_items)) {
      items = formMilestone.lineItems || formMilestone.line_items;
    } else if (master.form_data?.lineItems && activeMilestones.length === 1) {
      // Single milestone fallback
      items = master.form_data.lineItems;
    }
  } else {
    items = master.form_data?.lineItems || [];
  }

  // Filter out empty items
  items = items.filter(item => {
    const q = Number(item.qty || 0);
    const r = Number(item.rate || 0);
    return !(q === 0 && r === 0);
  });

  return {
    invoice: relevantInvoice,
    milestone: activeMilestone,
    items,
    primary_action: primaryAction,
  };
}
