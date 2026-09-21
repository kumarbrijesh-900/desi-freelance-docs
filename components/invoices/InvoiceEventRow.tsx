"use client";

import { isInvoiceOverdue, isInvoiceUnanswered } from "@/lib/lifecycle/timing";

export function getStatusInfo(invoiceStatus: string, msaStatus: string | null, hasClientMsaNote: boolean, wasShared: boolean = false, derivedOverdue: boolean = false, derivedUnanswered: boolean = false) {
  const status = (invoiceStatus || '').toLowerCase();
  const msa = (msaStatus || '').toLowerCase();

  // Return side (left stripe color) and pill details
  if (status === 'cancelled') return { side: 'bg-rule', pill: 'bg-rule text-ink line-through', label: 'cancelled' };
  // Reachable via derivedOverdue: nothing writes status='overdue'. Ranked above
  // settled/partial deliberately — the predicate already excludes settled rows,
  // so this can never mask a paid invoice.
  if (status === 'overdue' || derivedOverdue) return { side: 'bg-overdue', pill: 'bg-overdue text-acc-ink shadow-none', label: 'overdue' };
  if (status === 'settled') return { side: 'bg-grass', pill: 'bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)] shadow-none', label: 'settled' };
  if (status === 'partial') return { side: 'bg-lav', pill: 'bg-[color:var(--state-neutral-bg)] text-[color:var(--state-neutral-text)] shadow-none', label: 'partial' };
  if (msa === 'proposed' && hasClientMsaNote) return { side: 'bg-coral', pill: 'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger-text)] shadow-none', label: 'revision' };
  // Above both 'awaiting' branches: an unanswered invoice IS awaiting, but
  // saying only that hides that it has been awaiting for months.
  if (derivedUnanswered) return { side: 'bg-strong', pill: 'bg-[color:var(--color-soft)] text-[color:var(--color-ink-2)] border border-[color:var(--color-strong)] shadow-none', label: 'unanswered' };
  if (msa === 'accepted' && status !== 'settled' && status !== 'live' && status !== 'finalized') return { side: 'bg-sky', pill: 'bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)] shadow-none', label: 'locked' };
  if (msa === 'proposed') return { side: 'bg-butter', pill: 'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)] shadow-none', label: 'awaiting' };
  if (msa === 'pending' && status === 'finalized') return { side: 'bg-butter', pill: 'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)] shadow-none', label: 'awaiting' };
  if (status === 'finalized' || status === 'sent' || status === 'live') return { side: 'bg-acid', pill: 'bg-acid text-acc-ink shadow-none', label: 'live' };
  if (status === 'complete') return { side: 'bg-forest', pill: 'bg-forest text-acc-ink shadow-none', label: 'complete' };
  if (status === 'draft' && wasShared) return { side: 'bg-butter', pill: 'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)] shadow-none', label: 'awaiting' };
  if (status === 'draft') return { side: 'bg-butter', pill: 'bg-transparent text-ink border-2 border-rule border-dashed', label: 'draft' };
  return { side: 'bg-rule', pill: 'bg-rule text-ink', label: status };
}

export function isInvoiceRowDeletable(
  invoice: any,
  masterMsaStatus?: string | null,
  hasClientMsaNote?: boolean,
) {
  const info = getStatusInfo(invoice?.status || "draft", masterMsaStatus || null, !!hasClientMsaNote, !!invoice?.shared_at, isInvoiceOverdue(invoice as any, masterMsaStatus), isInvoiceUnanswered(invoice as any, masterMsaStatus));
  return info.label === "draft" || info.label === "live";
}
