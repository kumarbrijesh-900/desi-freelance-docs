export type SettlementTiming = 'early' | 'on_time' | 'late' | 'overdue';

export function computeSettlementTiming(
  settled_at: string | null,
  due_date: string | null
): { kind: SettlementTiming; days_diff: number; label: string } | null {
  if (!due_date) return null;

  const due = new Date(due_date);
  // normalize due to end of day if it has no time component to give benefit of doubt
  due.setUTCHours(23, 59, 59, 999);

  if (settled_at) {
    const settled = new Date(settled_at);
    // Difference in whole days
    const diffTime = settled.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // diffDays < 0 means settled before due date
    // diffDays > 0 means settled after due date

    if (diffDays <= -3) {
      return { kind: 'early', days_diff: diffDays, label: `${Math.abs(diffDays)}d early` };
    } else if (diffDays >= 3) {
      return { kind: 'late', days_diff: diffDays, label: `${diffDays}d late` };
    } else {
      return { kind: 'on_time', days_diff: diffDays, label: 'on time' };
    }
  } else {
    // Not settled yet
    const diffTime = Date.now() - due.getTime();
    if (diffTime > 0) {
      return { kind: 'overdue', days_diff: Math.floor(diffTime / (1000 * 60 * 60 * 24)), label: 'overdue' };
    }
    return null;
  }
}

/**
 * Derived overdue. Deliberately NOT a stored status: a stored flag goes stale
 * the moment a due date is edited and depends on the cron having run. This is
 * a pure function of the row, so it is correct even if the cron never fires.
 * Status set is kept identical to AWAITING_PAYMENT in the check-invoices cron
 * — both exclude PARTIAL for the same reason — so the
 * badge and the reminder loop can never disagree.
 */
export function isInvoiceOverdue(invoice: {
  is_offline?: boolean | null;
  status?: string | null;
  due_date?: string | null;
  settled_at?: string | null;
}, masterMsaStatus: string | null | undefined): boolean {
  if (!invoice?.due_date) return false;
  if (invoice.settled_at) return false;

  const status = (invoice.status || "").toLowerCase();
  // PARTIAL is deliberately excluded. A master only becomes PARTIAL after its
  // own milestone settles, so its billed amount has been received; the money
  // still outstanding sits on child invoices, which are "finalized" and carry
  // their own due dates. Including PARTIAL here reports collected money as
  // overdue AND double-counts the live milestone against its own child.
  if (!["finalized", "live"].includes(status)) return false;

  // Terms must be agreed before an invoice can be overdue. The MSA is what
  // establishes the due date and the late fee; you cannot be past due on
  // terms nobody accepted. Child invoices inherit the master's MSA state,
  // so callers must pass the MASTER status, never the row's own.
  // Offline invoices are agreed out of band and are exempt.
  const termsAgreed =
    invoice.is_offline === true ||
    (masterMsaStatus || "").toLowerCase() === "accepted";
  if (!termsAgreed) return false;

  const due = new Date(invoice.due_date);
  if (Number.isNaN(due.getTime())) return false;
  // same end-of-day benefit-of-doubt as computeSettlementTiming
  due.setUTCHours(23, 59, 59, 999);
  return Date.now() > due.getTime();
}

/**
 * Shared, never accepted, and old enough that silence is the answer.
 *
 * Mutually exclusive with isInvoiceOverdue by construction: that requires the
 * master MSA to be "accepted", this requires "pending". They can never both
 * be true for the same invoice.
 *
 * "pending" ONLY — "proposed" and "rejected" both mean the client responded,
 * which is a different problem with a different action.
 */
export const UNANSWERED_AFTER_DAYS = 7;

export function isInvoiceUnanswered(
  invoice: {
    status?: string | null;
    shared_at?: string | null;
    settled_at?: string | null;
    is_offline?: boolean | null;
  },
  masterMsaStatus: string | null | undefined,
): boolean {
  if (!invoice?.shared_at) return false;
  if (invoice.settled_at) return false;
  if (invoice.is_offline === true) return false;

  const status = (invoice.status || "").toLowerCase();
  if (status === "settled" || status === "cancelled" || status === "draft") return false;

  if ((masterMsaStatus || "").toLowerCase() !== "pending") return false;

  const shared = new Date(invoice.shared_at);
  if (Number.isNaN(shared.getTime())) return false;
  const days = (Date.now() - shared.getTime()) / 86400000;
  return days >= UNANSWERED_AFTER_DAYS;
}

export function projectNextMilestoneDate(
  previous_settled_at: string | null,
  payment_terms_days: number | null
): string | null {
  if (!previous_settled_at || payment_terms_days == null || payment_terms_days < 0) return null;
  const prevDate = new Date(previous_settled_at);
  prevDate.setDate(prevDate.getDate() + payment_terms_days);
  return prevDate.toISOString();
}

export function formatTimingPill(timing: SettlementTiming, days_diff?: number): string {
  const absDays = Math.abs(days_diff ?? 0);
  switch (timing) {
    case 'early':   return `${absDays}d early`;
    case 'on_time': return 'on time';
    case 'late':    return `${absDays}d late`;
    case 'overdue': return `${absDays}d overdue`;
  }
}

export function formatProjectedDate(value?: string | null): string {
  if (!value) return "Not set";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}

export function nextMilestoneStartLabel(m: { trigger_mode?: string | null; trigger_date?: string | null }): string {
  if (m.trigger_mode === 'scheduled' && m.trigger_date) return `STARTS ${formatProjectedDate(m.trigger_date)}`;
  return 'STARTS ON SETTLE';
}
