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
  alternativeAction: { label: string } | null;
}

export interface InvoiceLockInput {
  status?: string | null;        // invoice.status, lowercase comparison
  msaStatus?: string | null;     // invoice.msa_status, lowercase comparison
  sharedToEmail?: string | null; // null/empty if never shared
  clientMsaNote?: string | null; // populated when client used Propose Changes
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

  // 1. Settled or paid (invoice complete)
  if (status === 'settled' || status === 'paid') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'invoice-settled',
      reason: 'Invoice cycle complete — read-only archive.',
      alternativeAction: { label: 'Duplicate Invoice' },
    };
  }

  // 2. Partially settled milestones
  if (status === 'partial_settled') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'invoice-partial',
      reason: 'Invoice partially settled — some milestones complete, others pending. Read-only archive.',
      alternativeAction: { label: 'Download PDF' },
    };
  }

  // 3. Project cancelled
  if (status === 'cancelled') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'invoice-cancelled',
      reason: 'Project cancelled — read-only archive.',
      alternativeAction: { label: 'Reactivate Invoice' },
    };
  }

  // 4. Terms accepted by client (MSA accepted)
  if (msaStatus === 'accepted') {
    return {
      isReadOnly: true,
      canShare: false,
      state: 'msa-accepted',
      reason: 'Terms accepted by client — invoice is locked.',
      alternativeAction: { label: 'Download PDF' },
    };
  }

  // 5. Client proposed changes
  if (msaStatus === 'proposed' && clientMsaNote.trim() !== '') {
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
      alternativeAction: { label: 'Resend Email' },
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
