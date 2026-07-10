import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { computeSettlementTiming } from "./timing";

export type LifecycleStep = {
  id: string;
  kind: 'draft' | 'finalize' | 'send' | 'msa_proposed' | 'msa_revision' | 'msa_accepted' | 'milestone_fired' | 'milestone_settled' | 'milestone_cancelled' | 'project_complete';
  label: string;
  date?: string;
  meta?: { email?: string; timing?: 'early' | 'on_time' | 'late' | 'overdue'; days_diff?: number; note?: string };
  status: 'completed' | 'active' | 'pending';
};

export function computeProjectLifecycle(project: ProjectWithInvoices): LifecycleStep[] {
  const steps: LifecycleStep[] = [];

  // 1. Identify the master invoice (parent_invoice_id IS NULL or missing)
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);
  if (!master) {
    return steps; // Cannot compute lifecycle without a master invoice
  }

  const masterStatus = (master.status || '').toLowerCase();

  // Helper to add steps easily, default to pending
  const addStep = (
    kind: LifecycleStep['kind'],
    label: string,
    isCompleted: boolean,
    date?: string | null,
    meta?: LifecycleStep['meta'],
    forceStatus?: LifecycleStep['status']
  ) => {
    steps.push({
      id: `${kind}-${steps.length}`,
      kind,
      label,
      date: date || undefined,
      meta,
      status: forceStatus || (isCompleted ? 'completed' : 'pending')
    });
  };

  // Step 1: Drafted
  const isDraftCompleted = true; // since master invoice exists
  addStep('draft', 'Drafted', isDraftCompleted, master.created_at);

  // Step 2: Finalize
  const isFinalizeCompleted = ['finalized', 'partial', 'settled', 'live', 'sent'].includes(masterStatus) || !!master.shared_at;
  // Use updated_at or shared_at as a proxy for finalize date if available, otherwise just complete without date
  addStep('finalize', `Invoice ${master.invoice_number} finalized`, isFinalizeCompleted, isFinalizeCompleted ? (master.shared_at || master.updated_at) : null);

  // Step 3: Send
  const isSentCompleted = !!master.shared_at;
  addStep('send', 'Sent to client', isSentCompleted, master.shared_at, { email: master.shared_to_email || undefined });

  // Step 4: MSA proposed
  const msaStatus = (master.msa_status || '').toLowerCase();
  const isMsaProposed = ['proposed', 'accepted'].includes(msaStatus);
  const msaProposedDate = (master as any).msa_responded_at || master.shared_at;

  if (isSentCompleted) {
    addStep('msa_proposed', 'MSA proposed', isMsaProposed, isMsaProposed ? msaProposedDate : null);
  } else {
    addStep('msa_proposed', 'MSA proposed', false);
  }

  // Step 5: MSA revision (conditional)
  if (msaStatus === 'proposed' && master.client_msa_note) {
    addStep('msa_revision', 'Revision requested', false, (master as any).msa_responded_at, { note: master.client_msa_note }, 'active');
  }

  // Step 6: MSA accepted
  const isMsaAccepted = msaStatus === 'accepted';
  const msaAcceptedDate = (master as any).msa_accepted_at || project.project.msa_accepted_at;
  addStep('msa_accepted', 'MSA accepted', isMsaAccepted, isMsaAccepted ? msaAcceptedDate : null);

  // Filter out cancelled milestones from the core order unless they need rendering
  // Actually, we render cancelled milestones, but they don't count towards "project complete"
  const milestones = [...project.milestones].filter(m =>
    project.invoices.find(inv => inv.id === m.invoice_id && !(inv as any).parent_invoice_id)
  ).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  let allNonCancelledSettled = true;
  let hasValidMilestones = false;

  milestones.forEach((m, idx) => {
    // Determine title, suppress "Milestone N"
    let title = m.title || `Milestone ${idx + 1}`;
    const genericRegex = /^Milestone \d+$/i;
    if (genericRegex.test(title)) {
      title = `M${idx + 1}`;
    } else {
      title = `M${idx + 1} ${title}`;
    }

    const milestoneStatus = (m.status || '').toLowerCase();

    if (milestoneStatus === 'cancelled') {
      addStep('milestone_cancelled', `${title} cancelled`, true, m.updated_at);
      return;
    }

    hasValidMilestones = true;

    // Fired step
    // Fired = this milestone's invoice went out. M1's invoice IS the master,
    // so sending the master is M1's fire event. Later milestones fire via
    // their child invoice, trigger_status='fired', or settlement.
    const hasChildInvoice = project.invoices.some(inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (m.order_index ?? 0) + 1);
    const isFirstMilestone = (m.order_index ?? idx) === 0;
    const firedViaMasterSend = isFirstMilestone && !!master.shared_at;
    const isSettled = milestoneStatus === 'settled';
    const isFired = firedViaMasterSend || hasChildInvoice || m.trigger_status === 'fired' || isSettled;

    if (isFired) {
      addStep('milestone_fired', `${title} fired`, true, firedViaMasterSend ? master.shared_at : (m.trigger_date || m.updated_at));
    } else {
      if (m.trigger_mode === 'scheduled' && m.trigger_status === 'pending') {
        // active scheduled
        addStep('milestone_fired', `${title} scheduled · fires ${m.trigger_date ? new Date(m.trigger_date).toLocaleDateString('en-IN') : 'soon'}`, false, null, undefined, 'active');
      } else {
        addStep('milestone_fired', `${title} fires`, false);
      }
    }

    // Settled step
    if (!isSettled) {
      allNonCancelledSettled = false;
    }

    let timingMeta = undefined;
    if (isSettled) {
      // Find the child invoice due date if it exists, otherwise fall back to master due_date or something
      const childInvoice = project.invoices.find(inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (m.order_index ?? 0) + 1);
      const dueDate = childInvoice?.due_date || master.due_date;
      const timing = computeSettlementTiming((m as any).settled_at || m.updated_at, dueDate);
      if (timing) {
        timingMeta = { timing: timing.kind, days_diff: timing.days_diff };
      }
      addStep('milestone_settled', `${title} settled`, true, (m as any).settled_at || m.updated_at, timingMeta);
    } else {
      addStep('milestone_settled', `${title} settled`, false);
    }
  });

  if (hasValidMilestones) {
    addStep('project_complete', 'Project complete', allNonCancelledSettled, allNonCancelledSettled ? master.updated_at : null);
  }

  // Set the first pending step to active, IF there isn't already an active step (like msa_revision or scheduled)
  const hasActive = steps.some(s => s.status === 'active');
  if (!hasActive) {
    const firstPending = steps.find(s => s.status === 'pending');
    if (firstPending) {
      firstPending.status = 'active';
    } else if (steps.length > 0) {
      // If no pending and no active, set the last one to active
      steps[steps.length - 1].status = 'active';
    }
  }

  return steps;
}
