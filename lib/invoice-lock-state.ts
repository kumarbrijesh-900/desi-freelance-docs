export type LockState =
  | 'editable'
  | 'awaiting-client'
  | 'client-proposed'
  | 'msa-accepted'
  | 'invoice-settled'
  | 'invoice-partial'
  | 'invoice-cancelled';

export interface InvoiceLockState {
  isReadOnly: boolean;
  canShare: boolean;
  state: LockState;
  /** One-line plain-English explanation suitable for banner copy */
  reason: string;
  /** Suggested next action when share is disabled; null when canShare is true or no obvious alternative */
  alternativeAction: {
    label: string;
    intent: 'download' | 'resend' | 'duplicate' | 'reactivate' | 'preview';
  } | null;
}

export interface InvoiceLockInput {
  status?: string | null;        // invoice.status, lowercase comparison
  msaStatus?: string | null;     // invoice.msa_status, lowercase comparison
  sharedToEmail?: string | null; // null/empty if never shared
  clientMsaNote?: string | null; // populated when client used Propose Changes
  projectMsaAcceptedAt?: string | null; // DEPRECATED, no longer read - removed in the follow-up commit
  /**
   * Status of the MSA that GOVERNS this invoice - its own if a master, its
   * master's if a child. Resolve with resolveGoverningMsaStatus in
   * lib/invoice-msa.ts. Do not pass the row's own msa_status here: on a child
   * that value is permanently 'pending'.
   */
  governingMsaStatus?: string | null;
  projectStatus?: string | null;        // populated with parent project status
}

/**
 * pure-function helper to determine invoice read-only and sharing locks.
 * 
 * Note on parserDocumentId (Editor Lifecycle):
 * In components/invoice/InvoiceEditorPage.tsx, lines 853-865 check `if (!parserDocumentId) return false;`
 * to bypass read-only mode for brand new unsaved local-only drafts. Since this is an editor-internal
 * UI lifecycle state and a database-persisted row will always exist for backend operations (e.g. share API),
 * this helper accepts intentional divergence for new drafts, allowing the editor to manage local-only drafts.
 */
export function getInvoiceLockState(input: InvoiceLockInput): InvoiceLockState {
  const status = input.status?.toLowerCase() || '';
  const msaStatus = input.msaStatus?.toLowerCase() || '';
  const sharedToEmail = input.sharedToEmail || '';
  const clientMsaNote = input.clientMsaNote || '';
  const governingMsaStatus = input.governingMsaStatus?.toLowerCase() || '';
  const projectStatus = input.projectStatus?.toLowerCase() || '';

  // 1. Settled or paid (invoice complete)
  if (status === 'settled' || status === 'paid') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'invoice-settled',
      reason: 'Invoice cycle complete — read-only archive.',
      alternativeAction: { label: 'Duplicate Invoice', intent: 'duplicate' },
    };
  }

  // 2. Partially settled milestones
  if (status === 'partial_settled' || status === 'partial') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'invoice-partial',
      reason: 'Invoice partially settled — some milestones complete, others pending. Read-only archive.',
      alternativeAction: { label: 'Download PDF', intent: 'download' },
    };
  }

  // 3. Project cancelled
  if (status === 'cancelled' || projectStatus === 'cancelled') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'invoice-cancelled',
      reason: 'Project cancelled — read-only archive.',
      alternativeAction: { label: 'Reactivate Invoice', intent: 'reactivate' },
    };
  }

  // 4. Terms accepted by client.
  //
  // governingMsaStatus is the authority. A child's own msa_status is
  // permanently 'pending', so this rule never once fired for a milestone
  // invoice. msaStatus is kept as a second disjunct on purpose: it means this
  // change can only ever lock MORE than before, never less, even if a caller
  // resolves the governing status wrongly. On a read-only guard over money
  // documents a redundant condition is cheaper than an unlock.
  if (governingMsaStatus === 'accepted' || msaStatus === 'accepted') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'msa-accepted',
      reason: msaStatus === 'accepted'
        ? 'Terms accepted by client — invoice is locked.'
        : 'Terms accepted on the master invoice — this milestone invoice is locked.',
      alternativeAction: { label: 'Download PDF', intent: 'download' },
    };
  }

  // 5. Client proposed changes
  if (msaStatus === 'proposed') {
    return {
      isReadOnly: false,
      canShare: true,
      state: 'client-proposed',
      reason: 'Client proposed changes — apply note and reissue with updated terms.',
      alternativeAction: null,
    };
  }

  // 6. Shared to client, awaiting response
  if (sharedToEmail !== '' && msaStatus === 'pending') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'awaiting-client',
      reason: 'Awaiting client response — sharing again would duplicate the email.',
      alternativeAction: { label: 'Resend Email', intent: 'resend' },
    };
  }

  // 7. Otherwise, default editable
  return {
    isReadOnly: false,
    canShare: true,
    state: 'editable',
    reason: 'Invoice is editable — share to send to client.',
    alternativeAction: null,
  };
}
