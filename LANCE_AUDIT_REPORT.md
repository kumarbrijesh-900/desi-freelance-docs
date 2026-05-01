# LANCE AUDIT REPORT

## Section 1: Git history since April 30, 2026
bdc4ded | 2026-05-01 | fix(ui): resolve Next.js regexp syntax error and finalize settlement UI
2869116 | 2026-04-30 | feat(settlement): implement mark as settled action and update metrics
f74dea5 | 2026-04-30 | feat(editor): surface client MSA proposal notes in the editor UI
6f7282e | 2026-04-30 | feat(notifications): wire agency notifications for MSA updates and add header badge
2c4270e | 2026-04-30 | feat(share): implement client MSA proposal submission flow
a884f17 | 2026-04-30 | feat(share): implement client-side MSA acceptance modal
dd14e8a | 2026-04-30 | feat(share): build public read-only invoice route via share token
0af30aa | 2026-04-30 | feat(dashboard): add confirmation step before deleting invoices
53c813a | 2026-04-30 | ui(dashboard): make invoice rows fully clickable and ensure mobile action visibility
dc39c19 | 2026-04-30 | feat(dashboard): replace placeholder metrics with actionable invoice data
f5b9dec | 2026-04-30 | chore(editor): remove development console logs from invoice editor
08bd392 | 2026-04-30 | fix(validation): implement standard GSTIN validation and update error messages
e3a9e61 | 2026-04-30 | fix(invoices): standardize invoice number format to INV-YYYY-NNN and remove legacy DRAFT- placeholders
132c2b8 | 2026-04-30 | fix(invoices): generate invoice numbers from Supabase to prevent duplicates

## Section 2: File-level change summary since April 30
 app/invoices/page.tsx                           | 199 ++++++++++-------
 app/share/[token]/page.tsx                      | 208 +++++++++++++++++
 components/NotificationBell.tsx                 |   4 +-
 components/invoice/InvoiceEditorPage.tsx        | 125 +++++------
 components/invoice/ShareLinkModal.tsx           |   4 +
 components/invoice/share/MSAAcceptanceModal.tsx | 283 ++++++++++++++++++++++++
 lib/gstin-parser.ts                             |   2 +-
 lib/identifier-classifier.ts                    |   4 +-
 lib/invoice-validation.ts                       |   5 +-
 lib/supabase/invoices.ts                        |  55 ++++-
 supabase/functions/parse-brief/postprocess.ts   |   2 +-
 11 files changed, 730 insertions(+), 161 deletions(-)

## Section 3: Current Supabase schema snapshot
Schema introspection not available — please paste from Supabase Dashboard

### Reconstructed Table Definitions (from migrations and code)
- **user_profiles**: id (UUID), user_id (UUID), agency_name (TEXT), address (TEXT), city (TEXT), pin_code (TEXT), state (TEXT), gstin (TEXT), pan (TEXT), logo_url (TEXT), signature_url (TEXT), qr_code_url (TEXT), gst_registration_status (TEXT), lut_availability (TEXT), lut_number (TEXT), bank_name (TEXT), account_name (TEXT), account_number (TEXT), ifsc_code (TEXT), bank_address (TEXT), swift_bic_code (TEXT), iban_routing_code (TEXT), msa_payment_terms_days (INTEGER), msa_late_fee_rate (NUMERIC), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ).
- **clients**: id (UUID), user_id (UUID), client_name (TEXT), client_email (TEXT), client_address (TEXT), city (TEXT), state (TEXT), gstin (TEXT), client_location (TEXT), sez_status (TEXT), client_currency (TEXT), msa_payment_terms_days (INTEGER), msa_late_fee_rate (NUMERIC), msa_notes_boilerplate (TEXT), invoice_count (INTEGER), last_invoiced_at (TIMESTAMPTZ), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ).
- **client_msas**: id (UUID), client_id (UUID, FK), user_id (UUID), title (TEXT), content (TEXT), status (TEXT), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ).
- **invoices**: id (UUID), user_id (UUID), invoice_number (TEXT), form_data (JSONB), status (TEXT), share_token (TEXT), shared_at (TIMESTAMPTZ), shared_to_email (TEXT), template_id (TEXT), msa_id (UUID, FK), msa_response (TEXT), msa_status (TEXT), msa_responded_at (TIMESTAMPTZ), client_msa_note (TEXT), is_rcm_enabled (BOOLEAN), applied_payment_terms (TEXT), applied_late_fee_rate (NUMERIC), applied_license_type (TEXT), has_addendum (BOOLEAN), due_date (TIMESTAMPTZ), payment_terms_days (INTEGER), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ).
- **invoice_milestones**: id (UUID), invoice_id (UUID, FK), user_id (UUID), description (TEXT), status (TEXT), created_at (TIMESTAMPTZ).
- **invoice_line_items**: id (UUID), milestone_id (UUID, FK), user_id (UUID), description (TEXT), qty (NUMERIC), rate (NUMERIC), amount (NUMERIC), order_index (INTEGER).
- **notifications**: id (UUID), user_id (UUID), invoice_id (UUID, FK), type (TEXT), title (TEXT), message (TEXT), is_read (BOOLEAN), created_at (TIMESTAMPTZ).
- **read_receipts**: id (UUID), invoice_id (UUID, FK), viewed_at (TIMESTAMPTZ), viewer_ua (TEXT), viewer_ip (TEXT).
- **faqs**: id (UUID), category (TEXT), question (TEXT), answer (TEXT), is_published (BOOLEAN), display_order (INTEGER), created_at (TIMESTAMPTZ).
- **user_feedback**: id (UUID), user_id (UUID, FK), type (TEXT), message (TEXT), status (TEXT), created_at (TIMESTAMPTZ).

## Section 4: Routes inventory
| Path | Purpose | Auth |
|---|---|---|
| `/clients/[id]` | Detailed view and editor for a specific client profile. | Auth-protected |
| `/clients` | Directory of all saved clients with filtering and search. | Auth-protected |
| `/privacy` | Public-facing privacy policy and data protection terms. | Public |
| `/invoices` | Central dashboard for managing, searching, and filtering invoices. | Auth-protected |
| `/terms` | Public-facing terms of service for the Lance platform. | Public |
| `/internal/design-system` | Developer sandbox for previewing UI components and tokens. | Public |
| `/profile` | Agency profile management, payment defaults, and branding. | Auth-protected |
| `/support` | Help center and bug reporting interface for users. | Public |
| `/sandbox` | Experimental area for testing new features and components. | Public |
| `/view/[token]` | Legacy public invoice viewer (REMOVED - superseded by share/[token]). | Public |
| `/` | Landing page and main application entry point. | Public |
| `/login` | User authentication and registration interface. | Public |
| `/onboarding` | Guided setup for new users to configure their agency profile. | Auth-protected |
| `/invoice/new` | Primary invoice creation and editing environment. | Auth-protected |
| `/invoice/preview` | Live, compliant preview of the current invoice draft. | Auth-protected |
| `/share/[token]` | Shareable client link with MSA gating and acceptance flow. | Public |

## Section 5: Key file metrics
| File | Lines | Last Modified |
|---|---|---|
| `components/invoice/InvoiceEditorPage.tsx` | 2603 | May 1 12:00:14 2026 |
| `components/invoice/DeliverablesSection.tsx` | 607 | May 1 11:46:33 2026 |
| `components/invoice/AgencyDetailsSection.tsx` | 637 | May 1 11:29:48 2026 |
| `components/invoice/ClientDetailsSection.tsx` | 590 | Apr 29 01:32:33 2026 |
| `components/invoice/TermsPaymentSection.tsx` | 606 | May 1 11:29:48 2026 |
| `components/invoice/InvoiceMetaSection.tsx` | 170 | Apr 29 00:29:46 2026 |
| `components/invoice/TotalsTaxesSection.tsx` | 479 | Apr 27 03:10:50 2026 |
| `components/invoice/BriefIntakeCard.tsx` | 405 | May 1 11:29:48 2026 |
| `components/invoice/BriefSummaryModal.tsx` | 546 | May 1 11:46:33 2026 |
| `components/invoice/ShareLinkModal.tsx` | 499 | May 1 11:29:48 2026 |
| `components/invoice/ConversionModal.tsx` | 101 | May 1 11:29:48 2026 |
| `components/invoice/SettlementModal.tsx` | 113 | May 1 11:46:33 2026 |
| `components/invoice/TemplatePicker.tsx` | 315 | May 1 11:29:48 2026 |
| `app/invoice/new/page.tsx` | 42 | Apr 27 22:50:48 2026 |
| `app/invoice/preview/page.tsx` | 811 | May 1 11:46:33 2026 |
| `lib/supabase/invoices.ts` | 856 | May 1 11:46:33 2026 |
| `lib/supabase/clients.ts` | 256 | Apr 28 22:17:29 2026 |
| `lib/supabase/profiles.ts` | 259 | May 1 11:46:33 2026 |
| `types/invoice.ts` | 435 | May 1 11:46:33 2026 |
| `lib/invoice-validation.ts` | 369 | May 1 11:46:33 2026 |
| `lib/invoice-calculations.ts` | 55 | May 1 11:46:33 2026 |

## Section 6: New files created since April 30

### Group: app/share/[token]
#### app/share/[token]/page.tsx
```tsx
\"use client\";

import { use, useEffect, useState } from \"react\";
import { supabase } from \"@/lib/supabase/client\";
import { mergeInvoiceFormData, type InvoiceFormData } from \"@/types/invoice\";
import TemplateRenderer from \"@/lib/templates/renderer\";
import { MotionReveal } from \"@/components/ui/motion-primitives\";
import { DocumentSparkIcon } from \"@/components/ui/app-icons\";
import { getAppButtonClass, cn } from \"@/lib/ui-foundation\";
import { PrinterIcon } from \"@/components/ui/app-icons\";
import MSAAcceptanceModal from \"@/components/invoice/share/MSAAcceptanceModal\";
import { loadMsaForSharedInvoice } from \"@/lib/supabase/invoices\";

export default function PublicInvoiceSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [formData, setFormData] = useState<InvoiceFormData | null>(null);
  const [templateId, setTemplateId] = useState(\"classic\");
  const [invoiceNumber, setInvoiceNumber] = useState(\"\");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // MSA Gate state
  const [msaStatus, setMsaStatus] = useState<string>(\"ACCEPTED\");
  const [msaData, setMsaData] = useState<{ title: string; content: string } | null>(null);
  const [isSubmittingMsa, setIsSubmittingMsa] = useState(false);

  useEffect(() => {
    async function loadInvoice() {
      try {
        // Fetch invoice using the public/anon client as requested
        const { data, error } = await supabase
          .from(\"invoices\")
          .select(\"*\")
          .eq(\"share_token\", token)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        const fd = mergeInvoiceFormData(data.form_data);
        setFormData(fd);
        setTemplateId(data.template_id || \"classic\");
        setInvoiceNumber(data.invoice_number || \"\");
        
        // Evaluate legal status
        const currentMsaStatus = data.msa_status || data.msa_response || \"ACCEPTED\";
        setMsaStatus(currentMsaStatus);

        // Load MSA content if pending
        if (currentMsaStatus === \"PENDING\" && data.msa_id) {
          const msa = await loadMsaForSharedInvoice(data.id, data.msa_id);
          if (msa) setMsaData(msa);
        }
      } catch (err) {
        console.error(\"LOAD_ERROR:\", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [token]);

  const handleAcceptMsa = async () => {
    setIsSubmittingMsa(true);
    try {
      // Direct update as requested by the prompt instructions
      const { error } = await supabase
        .from(\"invoices\")
        .update({ 
          msa_status: 'ACCEPTED', 
          msa_accepted_at: new Date().toISOString() 
        })
        .eq(\"share_token\", token);

      if (error) {
        console.error(\"Supabase Update Error:\", error);
        alert(\"Failed to accept terms. Please try again.\");
        return;
      }

      // Success: Reveal the invoice
      setMsaStatus(\"ACCEPTED\");
    } catch (err) {
      console.error(\"ACCEPT_ERROR:\", err);
      alert(\"An unexpected error occurred.\");
    } finally {
      setIsSubmittingMsa(false);
    }
  };

  const handleProposeChanges = () => {
    alert(\"Coming next: You will be able to propose changes to these terms.\");
  };

  if (loading) {
    return (
      <main className=\"flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)]\">
        <MotionReveal preset=\"fade-up\">
          <div className=\"flex items-center gap-3 rounded-xl border border-[color:var(--border-default)] bg-white p-6 shadow-lg\">
            <span className=\"inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]\">
              <DocumentSparkIcon className=\"h-5 w-5 text-[color:var(--text-secondary)]\" />
            </span>
            <p className=\"text-sm font-semibold text-[color:var(--text-primary)]\">
              Loading invoice…
            </p>
          </div>
        </MotionReveal>
      </main>
    );
  }

  if (notFound || !formData) {
    return (
      <main className=\"flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)]\">
        <MotionReveal preset=\"fade-up\">
          <div className=\"mx-4 max-w-md rounded-xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-lg\">
            <h1 className=\"text-xl font-bold text-[color:var(--text-primary)]\">
              Invoice Not Found
            </h1>
            <p className=\"mt-2 text-sm text-[color:var(--text-secondary)]\">
              Invoice not found or link expired.
            </p>
          </div>
        </MotionReveal>
      </main>
    );
  }

  const isMsaPending = msaStatus === \"PENDING\";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { background: white !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .invoice-sheet { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <main className=\"min-h-screen bg-[color:var(--bg-canvas)] px-4 py-8 md:px-6 md:py-12 print:bg-white print:p-0\">
        <div className={cn(
          \"mx-auto mb-10 flex max-w-[210mm] items-center justify-between print:hidden\",
          isMsaPending && \"opacity-20 pointer-events-none\"
        )}>
          <div className=\"flex items-center gap-2\">
            <span className=\"flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]\">
              L
            </span>
            <span className=\"text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]\">
              Lance
            </span>
          </div>
          <button
            type=\"button\"
            onClick={() => window.print()}
            className={getAppButtonClass({ variant: \"secondary\", size: \"sm\" })}
          >
            <PrinterIcon className=\"h-4 w-4\" />
            Print / Save PDF
          </button>
        </div>

        {/* Read-only Invoice Sheet */}
        <div className={cn(
          \"relative transition-all duration-500\",
          isMsaPending && \"blur-2xl pointer-events-none select-none opacity-40 scale-[0.98]\"
        )}>
          <MotionReveal
            className=\"invoice-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-[color:var(--border-default)] bg-white px-5 py-5 shadow-[var(--app-floating-shadow)] sm:px-7 sm:py-6 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none mb-12\"
            preset=\"scale-in\"
          >
            <TemplateRenderer formData={formData} templateId={templateId} />
          </MotionReveal>
        </div>

        <p className={cn(
          \"mx-auto text-center text-xs text-[color:var(--text-muted)] print:hidden\",
          isMsaPending && \"opacity-0\"
        )}>
          Invoice #{invoiceNumber} • Read-only client view
        </p>

        {isMsaPending && msaData && (
          <MSAAcceptanceModal
            invoiceNumber={invoiceNumber}
            agencyName={formData.agency?.agencyName || \"The Freelancer\"}
            msaTitle={msaData.title}
            msaContent={msaData.content}
            paymentTerms={formData.meta?.paymentTerms ? `Net ${formData.meta.paymentTerms}` : undefined}
            addendumNotes={formData.payment?.notes}
            isSubmitting={isSubmittingMsa}
            onAccept={handleAcceptMsa}
            onPropose={handleProposeChanges}
          />
        )}
      </main>
    </>
  );
}
```

### Group: components/invoice/share
#### components/invoice/share/MSAAcceptanceModal.tsx
```tsx
import { useState } from \"react\";
import { useParams } from \"next/navigation\";
import { supabase } from \"@/lib/supabase/client\";
import { MotionReveal } from \"@/components/ui/motion-primitives\";
import { DocumentSparkIcon, CheckCircleIcon } from \"@/components/ui/app-icons\";
import { getAppButtonClass } from \"@/lib/ui-foundation\";

interface MSAAcceptanceModalProps {
  invoiceNumber: string;
  agencyName: string;
  msaTitle: string;
  msaContent: string;
  paymentTerms?: string;
  addendumNotes?: string;
  isSubmitting: boolean;
  onAccept: () => void;
  onPropose: () => void;
}

type ModalMode = \"view\" | \"propose\" | \"success\";

export default function MSAAcceptanceModal({
  invoiceNumber,
  agencyName,
  msaTitle,
  msaContent,
  paymentTerms,
  addendumNotes,
  isSubmitting,
  onAccept,
}: MSAAcceptanceModalProps) {
  const params = useParams();
  const token = params?.token as string;
  
  const [mode, setMode] = useState<ModalMode>(\"view\");
  const [proposalText, setProposalText] = useState(\"\");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const handleSubmitProposal = async () => {
    if (!proposalText.trim() || !token) return;
    
    setIsSubmittingProposal(true);
    try {
      // Execute update and select ID/User ID for notification insertion
      const { data: inv, error } = await supabase
        .from(\"invoices\")
        .update({
          msa_status: 'PROPOSED',
          msa_response: proposalText,
          msa_responded_at: new Date().toISOString()
        })
        .eq(\"share_token\", token)
        .select(\"id, user_id\")
        .single();

      if (error) {
        console.error(\"PROPOSAL_SUBMIT_ERROR:\", error);
        alert(\"Failed to submit proposal. Please try again.\");
      } else {
        // Trigger Freelancer Notification
        if (inv) {
          await supabase.from(\"notifications\").insert({
            user_id: inv.user_id,
            invoice_id: inv.id,
            type: 'MSA_PROPOSED',
            title: 'New MSA Proposal',
            message: 'The client has proposed new terms.',
            is_read: false
          });
        }
        setMode(\"success\");
      }
    } catch (err) {
      console.error(\"PROPOSAL_ERROR:\", err);
      alert(\"An unexpected error occurred.\");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  if (mode === \"success\") {
    return (
      <div className=\"fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6\">
        <MotionReveal preset=\"fade-up\" className=\"w-full max-w-md\">
          <div className=\"rounded-2xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-2xl\">
            <div className=\"mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]\">
              <CheckCircleIcon className=\"h-8 w-8\" />
            </div>
            <h2 className=\"text-xl font-bold text-[color:var(--text-primary)]\">
              Proposal Submitted
            </h2>
            <p className=\"mt-3 text-sm leading-relaxed text-[color:var(--text-secondary)]\">
              Your counter-proposal for <strong>Invoice #{invoiceNumber}</strong> has been sent to {agencyName}. They will review your feedback and get back to you soon.
            </p>
            <p className=\"mt-4 text-xs font-medium text-[color:var(--text-muted)] italic\">
              This invoice will remain locked until terms are finalized.
            </p>
          </div>
        </MotionReveal>
      </div>
    );
  }

  return (
    <div className=\"fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6 overflow-y-auto\">
      <MotionReveal preset=\"fade-up\" className=\"w-full max-w-2xl my-auto\">
        <div className=\"rounded-2xl border border-[color:var(--border-default)] bg-white shadow-2xl overflow-hidden\">
          {/* Header */}
          <div className=\"border-b border-[color:var(--border-subtle)] bg-gradient-to-r from-[color:var(--color-lime-50)] to-white px-6 py-6 sm:px-8\">
            <div className=\"flex items-center gap-4\">
              <span className=\"flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-lime-100)] text-[color:var(--color-lime-700)]\">
                <DocumentSparkIcon className=\"h-6 w-6\" />
              </span>
              <div>
                <h1 className=\"text-xl font-bold text-[color:var(--text-primary)]\">
                  {mode === \"propose\" ? \"Propose New Terms\" : \"Action Required: Review Terms\"}
                </h1>
                <p className=\"text-sm text-[color:var(--text-secondary)]\">
                  Invoice #{invoiceNumber} from <strong>{agencyName}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Legal Content / Proposal Form */}
          <div className=\"px-6 py-6 sm:px-8\">
            {mode === \"view\" ? (
              <div className=\"space-y-6\">
                {/* MSA Body */}
                <div>
                  <h2 className=\"text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)] mb-3\">
                    Master Service Agreement
                  </h2>
                  <div className=\"rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-5\">
                    <h3 className=\"text-sm font-bold text-[color:var(--text-primary)] mb-2\">
                      {msaTitle}
                    </h3>
                    <div className=\"max-h-[300px] overflow-y-auto pr-2 scrollbar-hide text-[13px] leading-relaxed text-[color:var(--text-secondary)] whitespace-pre-wrap\">
                      {msaContent}
                    </div>
                  </div>
                </div>

                {/* Addendum Section */}
                {(paymentTerms || addendumNotes) && (
                  <div className=\"rounded-xl border border-amber-200 bg-amber-50 p-5\">
                    <div className=\"flex items-start gap-3\">
                      <span className=\"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800\">
                        !
                      </span>
                      <div>
                        <h3 className=\"text-sm font-bold text-amber-900\">
                          Project-Specific Addendum
                        </h3>
                        <p className=\"mt-1 text-[12px] leading-relaxed text-amber-800\">
                          These specific terms override the Master Agreement for this invoice only.
                        </p>
                        <ul className=\"mt-3 space-y-2\">
                          {paymentTerms && (
                            <li className=\"flex items-center gap-2 text-[12px] font-medium text-amber-900\">
                              <span className=\"h-1 w-1 rounded-full bg-amber-400\" />
                              Payment Terms: <span className=\"font-bold underline decoration-amber-300 underline-offset-2\">{paymentTerms}</span>
                            </li>
                          )}
                          {addendumNotes && (
                            <li className=\"flex items-start gap-2 text-[12px] font-medium text-amber-900\">
                              <span className=\"mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400\" />
                              <span>Additional Notes: <span className=\"font-bold\">{addendumNotes}</span></span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className=\"space-y-4\">
                <div>
                  <label className=\"block text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-2\">
                    Describe your proposed changes
                  </label>
                  <textarea
                    autoFocus
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    placeholder=\"e.g. 'I would like to request Net 30 payment terms instead of Net 15...'\"
                    className=\"w-full h-40 rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-sm focus:border-[color:var(--color-lime-500)] outline-none transition-colors resize-none shadow-inner\"
                  />
                </div>
                <p className=\"text-xs text-[color:var(--text-muted)] italic\">
                  Submitting a proposal will notify the freelancer to review and potentially reissue the invoice with updated terms.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className=\"border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-6 py-6 sm:px-8\">
            {mode === \"view\" ? (
              <>
                <p className=\"mb-5 text-xs leading-relaxed text-[color:var(--text-muted)]\">
                  By clicking &quot;Accept Terms&quot;, you are electronically signing the Master Service Agreement and the Project Addendum for this engagement.
                </p>
                <div className=\"flex flex-wrap items-center gap-4\">
                  <button
                    type=\"button\"
                    disabled={isSubmitting}
                    onClick={async () => {
                      // Integrated Accept logic with Notifications
                      const { data: inv, error } = await supabase
                        .from(\"invoices\")
                        .update({ 
                          msa_status: 'ACCEPTED', 
                          msa_accepted_at: new Date().toISOString() 
                        })
                        .eq(\"share_token\", token)
                        .select(\"id, user_id\")
                        .single();

                      if (error) {
                        console.error(\"Supabase Update Error:\", error);
                        alert(\"Failed to accept terms. Please try again.\");
                        return;
                      }

                      // Trigger Freelancer Notification
                      if (inv) {
                        await supabase.from(\"notifications\").insert({
                          user_id: inv.user_id,
                          invoice_id: inv.id,
                          type: 'MSA_ACCEPTED',
                          title: 'MSA Accepted',
                          message: 'The client has accepted the terms for this invoice.',
                          is_read: false
                        });
                      }

                      onAccept();
                    }}
                    className={`flex-[2] min-w-[160px] ${getAppButtonClass({ variant: \"primary\", size: \"md\" })}`}
                  >
                    {isSubmitting ? \"Processing…\" : \"Accept Terms\"}
                  </button>
                  <button
                    type=\"button\"
                    disabled={isSubmitting}
                    onClick={() => setMode(\"propose\")}
                    className={`flex-1 min-w-[160px] ${getAppButtonClass({ variant: \"ghost\", size: \"md\" })}`}
                  >
                    Propose Changes
                  </button>
                </div>
              </>
            ) : (
              <div className=\"flex flex-wrap items-center gap-4\">
                <button
                  type=\"button\"
                  disabled={isSubmittingProposal || !proposalText.trim()}
                  onClick={handleSubmitProposal}
                  className={`flex-[2] min-w-[160px] ${getAppButtonClass({ variant: \"primary\", size: \"md\" })}`}
                >
                  {isSubmittingProposal ? \"Submitting…\" : \"Submit Proposal\"}
                </button>
                <button
                  type=\"button\"
                  disabled={isSubmittingProposal}
                  onClick={() => {
                    setMode(\"view\");
                    setProposalText(\"\");
                  }}
                  className={`flex-1 min-w-[160px] ${getAppButtonClass({ variant: \"ghost\", size: \"md\" })}`}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
```

## Section 7: TODO and FIXME scan
No TODO, FIXME, XXX, HACK, @ts-ignore, or @ts-expect-error found in .ts/.tsx files.

## Section 8: Console.log scan
| Filename | Occurrences |
|---|---|
| components/faq/FaqSection.tsx | 1 |
| components/invoice/InvoiceEditorPage.tsx | 11 |
| components/invoice/ClientDetailsSection.tsx | 1 |
| components/invoice/ShareLinkModal.tsx | 1 |
| components/invoice/share/MSAAcceptanceModal.tsx | 3 |
| lib/upstash.ts | 1 |
| lib/ai-brief-extractor.ts | 3 |
| lib/supabase/profiles.ts | 6 |
| lib/supabase/invoices.ts | 5 |
| lib/invoice-brief-intake.ts | 1 |
| lib/interaction-feedback.ts | 1 |
| app/clients/page.tsx | 3 |
| app/profile/page.tsx | 3 |
| app/view/[token]/page.tsx | 0 (REMOVED) | May 1 13:30:00 2026 |
| app/api/msa-response/route.ts | 2 |
| app/api/brief-extract/route.ts | 1 |
| app/api/share-invoice/route.ts | 2 |
| app/api/cron/check-invoices/route.ts | 5 |
| app/api/invoice/request-milestone/route.ts | 1 |
| app/api/track-view/route.ts | 1 |
| app/onboarding/page.tsx | 1 |
| app/invoice/preview/page.tsx | 13 |
| app/share/[token]/page.tsx | 3 |

## Section 9: Current contents of types/invoice.ts
```tsx
import type { IndiaStateOption } from \"@/lib/india-state-options\";
import type {
  InternationalCountryOption,
  InternationalCurrencyCode,
} from \"@/lib/international-billing-options\";
import {
  invoiceAllowedUnitsByType,
  invoiceDefaultUnitByType,
} from \"@/lib/invoice-deliverables\";
import { normalizeInvoiceLineItemType } from \"@/lib/invoice-line-item-catalog\";
import {
  composeIndianAddress,
  evaluateStateSignals,
  hydrateIndianAddressFields,
} from \"@/lib/invoice-address\";
import { resolveLineItemSacCode } from \"@/lib/invoice-sac\";
import { derivePanFromGstin, getStateFromGstin } from \"@/lib/gstin-parser\";

export type InvoiceLineItemType =
  | \"Logo Design\"
  | \"Branding \u0026 Identity\"
  | \"Graphic Design\"
  | \"Illustration\"
  | \"UI/UX Design\"
  | \"Animation\"
  | \"Motion Graphics\"
  | \"Photography\"
  | \"Videography\"
  | \"Video Editing\"
  | \"Social Media Content\"
  | \"Packaging Design\"
  | \"Print Design\"
  | \"Infographics \u0026 Presentation Design\"
  | \"UI/UX\"
  | \"Social Media\"
  | \"Software Development\"
  | \"Animation/Video\"
  | \"Consulting\"
  | \"Other\";

export type InvoiceRateUnit =
  | \"per-deliverable\"
  | \"per-item\"
  | \"per-screen\"
  | \"per-hour\"
  | \"per-day\"
  | \"per-revision\"
  | \"per-concept\"
  | \"per-post\"
  | \"per-video\"
  | \"per-image\";

export type MilestoneStatus = \"PENDING\" | \"SETTLED\";

export interface InvoiceLineItem {
  id: string;
  type: InvoiceLineItemType;
  description: string;
  qty: number | string;
  rate: number | string;
  rateUnit: InvoiceRateUnit;
  sacCode?: string;
  // Milestone fields
  is_milestone_header?: boolean;
  milestone_group_id?: string;
  milestone_status?: MilestoneStatus;
  tds_amount?: number;
}

export interface AgencyDetails {
  agencyName: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pinCode: string;
  agencyState: IndiaStateOption | \"\";
  gstin: string;
  pan: string;
  logoUrl: string;
  gstRegistrationStatus: \"\" | \"registered\" | \"not-registered\";
  lutAvailability: \"\" | \"yes\" | \"no\";
  lutNumber: string;
  lutValidity: string;
  noLutTaxHandling: \"\" | \"add-igst\" | \"keep-zero-tax\";
  signatureUrl: string;
  profileLogoUrl?: string;
  // MSA Defaults
  msaPaymentTermsDays?: number;
  msaLateFeeRate?: number;
  msaLateFeeUnit?: \"monthly\" | \"annually\" | \"daily\";
  msaIpTriggerType?:
    | \"upon_full_payment\"
    | \"upon_signing\"
    | \"upon_delivery\"
    | \"proportional_transfer\"
    | \"retained_by_creator\";
  msaJurisdictionCity?: string;
  msaVersionLabel?: string;
  msaNotesBoilerplate?: string;
  msaLicenseType?: LicenseType | \"\";
}

export interface ClientDetails {
  clientName: string;
  clientAddress: string;
  clientAddressLine1: string;
  clientAddressLine2: string;
  clientCity: string;
  clientPinCode: string;
  clientPostalCode: string;
  clientEmail: string;
  clientState: IndiaStateOption | \"\";
  clientCountry: InternationalCountryOption | \"\";
  clientCurrency: InternationalCurrencyCode | \"\";
  clientGstin: string;
  clientLocation: \"domestic\" | \"international\";
  clientType?: \"agency\" | \"freelancer\";
  isClientSezUnit: \"\" | \"yes\" | \"no\" | \"not-sure\";
  // MSA Blueprint fields
  msaEffectiveDate?: string;
  msaPaymentTermsDays?: number;
  msaLateFeeRate?: number;
  msaLateFeeUnit?: \"monthly\" | \"annually\" | \"daily\";
  msaIpTriggerType?:
    | \"upon_full_payment\"
    | \"upon_signing\"
    | \"upon_delivery\"
    | \"proportional_transfer\"
    | \"retained_by_creator\";
  msaJurisdictionCity?: string;
  msaVersionLabel?: string;
  msaNotesBoilerplate?: string;
  msaLicenseType?: LicenseType | \"\";
}

export interface InvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: number;
  hasAddendum: boolean;
}

export interface TaxConfig {
  taxMode: \"none\" | \"gst\" | \"igst\";
  taxRate: number;
  isRcmEnabled: boolean;
}

export type InvoiceTaxType = \"CGST_SGST\" | \"IGST\" | \"NONE\";

export interface InvoiceTaxBreakdown {
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalTax: number;
  taxType: InvoiceTaxType;
}

export const LicenseTypeOptions = [
  { value: \"full-assignment\", label: \"Full Assignment (IP Transfer)\" },
  { value: \"exclusive-license\", label: \"Exclusive License (Time-bound)\" },
  { value: \"non-exclusive-license\", label: \"Non-Exclusive License\" },
];

export type LicenseType =
  | \"full-assignment\"
  | \"exclusive-license\"
  | \"non-exclusive-license\";

export interface LicenseDetails {
  isLicenseIncluded: boolean;
  licenseType: LicenseType | \"\";
  licenseDuration: string;
}

export interface PaymentDetails {
  license: LicenseDetails;
  notes: string;
  terms: string;
  paymentSettlementType: \"\" | \"forex\" | \"inr\" | \"unknown\";
  accountName: string;
  bankName: string;
  bankAddress: string;
  accountNumber: string;
  ifscCode: string;
  swiftBicCode: string;
  ibanRoutingCode: string;
  qrCodeUrl: string;
  profileQrUrl?: string;
}

export interface InvoiceFormData {
  agency: AgencyDetails;
  client: ClientDetails;
  meta: InvoiceMeta;
  lineItems: InvoiceLineItem[];
  tax: TaxConfig;
  payment: PaymentDetails;
}

export interface InvoiceComputedValues extends InvoiceTaxBreakdown {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  isRcmEnabled: boolean;
}

export type InvoiceStepperStep =
  | \"agency\"
  | \"client\"
  | \"deliverables\"
  | \"payment\"
  | \"meta\"
  | \"totals\";

export const defaultInvoiceFormData: InvoiceFormData = {
  agency: {
    agencyName: \"\",
    address: \"\",
    addressLine1: \"\",
    addressLine2: \"\",
    city: \"\",
    pinCode: \"\",
    agencyState: \"\",
    gstin: \"\",
    pan: \"\",
    logoUrl: \"\",
    gstRegistrationStatus: \"not-registered\",
    lutAvailability: \"\",
    lutNumber: \"\",
    lutValidity: \"\",
    noLutTaxHandling: \"\",
    signatureUrl: \"\",
  },
  client: {
    clientName: \"\",
    clientAddress: \"\",
    clientAddressLine1: \"\",
    clientAddressLine2: \"\",
    clientCity: \"\",
    clientPinCode: \"\",
    clientPostalCode: \"\",
    clientEmail: \"\",
    clientState: \"\",
    clientCountry: \"\",
    clientCurrency: \"\",
    clientGstin: \"\",
    clientLocation: \"domestic\",
    isClientSezUnit: \"\",
    msaPaymentTermsDays: 15,
    msaLateFeeRate: 1.5,
    msaLateFeeUnit: \"monthly\",
    msaIpTriggerType: \"upon_full_payment\",
    msaLicenseType: \"full-assignment\",
    msaJurisdictionCity: \"\",
  },
  meta: {
    invoiceNumber: \"\",
    invoiceDate: \"\",
    dueDate: \"\",
    paymentTerms: 15,
    hasAddendum: false,
  },
  lineItems: [
    {
      id: \"line-1\",
      type: \"UI/UX Design\",
      description: \"\",
      qty: 1,
      rate: 0,
      rateUnit: \"per-screen\",
      sacCode: resolveLineItemSacCode({
        type: \"UI/UX Design\",
        sacCode: \"\",
      }),
    },
  ],
  tax: {
    taxMode: \"gst\",
    taxRate: 18,
    isRcmEnabled: false,
  },
  payment: {
    license: {
      isLicenseIncluded: false,
      licenseType: \"\",
      licenseDuration: \"\",
    },
    notes: \"1.5% monthly late fee applies. Final files delivered after full payment.\",
    terms: \"\",
    paymentSettlementType: \"\",
    accountName: \"\",
    bankName: \"\",
    bankAddress: \"\",
    accountNumber: \"\",
    ifscCode: \"\",
    swiftBicCode: \"\",
    ibanRoutingCode: \"\",
    qrCodeUrl: \"\",
  },
};

function normalizeAgencyDetails(agency: AgencyDetails): AgencyDetails {
  const hydratedAddress = hydrateIndianAddressFields({
    addressLine1: agency.addressLine1,
    addressLine2: agency.addressLine2,
    city: agency.city,
    pinCode: agency.pinCode,
    legacyAddress: agency.address,
  });
  const gstinState = getStateFromGstin(agency.gstin);
  const derivedPan = derivePanFromGstin(agency.gstin);
  const stateSignals = evaluateStateSignals({
    manualState: agency.agencyState,
    city: hydratedAddress.city,
    pinCode: hydratedAddress.pinCode,
    gstinState,
    label: \"Agency state\",
  });
  const nextAgencyState =
    agency.agencyState ||
    (stateSignals.strongestState as IndiaStateOption | \"\") ||
    \"\";

  return {
    ...agency,
    ...hydratedAddress,
    agencyState: nextAgencyState,
    pan: agency.pan || derivedPan,
    address: composeIndianAddress({
      addressLine1: hydratedAddress.addressLine1,
      addressLine2: hydratedAddress.addressLine2,
      city: hydratedAddress.city,
      state: nextAgencyState,
      pinCode: hydratedAddress.pinCode,
    }),
  };
}

function normalizeClientDetails(client: ClientDetails): ClientDetails {
  if (client.clientLocation === \"international\") {
    return client;
  }

  const hydratedAddress = hydrateIndianAddressFields({
    addressLine1: client.clientAddressLine1,
    addressLine2: client.clientAddressLine2,
    city: client.clientCity,
    state: client.clientState,
    pinCode: client.clientPinCode,
    legacyAddress: client.clientAddress,
  });
  const gstinState = getStateFromGstin(client.clientGstin);
  const stateSignals = evaluateStateSignals({
    manualState: client.clientState,
    city: hydratedAddress.city,
    pinCode: hydratedAddress.pinCode,
    gstinState,
    label: \"Client state\",
  });
  const nextClientState =
    client.clientState ||
    (stateSignals.strongestState as IndiaStateOption | \"\") ||
    \"\";

  return {
    ...client,
    ...hydratedAddress,
    clientState: nextClientState,
    clientAddress: composeIndianAddress({
      addressLine1: hydratedAddress.addressLine1,
      addressLine2: hydratedAddress.addressLine2,
      city: hydratedAddress.city,
      state: nextClientState,
      pinCode: hydratedAddress.pinCode,
    }),
  };
}

export function mergeInvoiceFormData(
  value?: Partial<InvoiceFormData> | null
): InvoiceFormData {
  const defaultLineItem = defaultInvoiceFormData.lineItems[0];
  const normalizeLineItem = (
    item?: Partial<InvoiceLineItem> | null
  ): InvoiceLineItem => {
    const nextType =
      normalizeInvoiceLineItemType(item?.type) ?? defaultLineItem.type;
    const nextRateUnit = invoiceAllowedUnitsByType[nextType].includes(
      item?.rateUnit ?? defaultLineItem.rateUnit
    )
      ? (item?.rateUnit ?? defaultLineItem.rateUnit)
      : invoiceDefaultUnitByType[nextType];

    return {
      ...defaultLineItem,
      ...item,
      type: nextType,
      rateUnit: nextRateUnit,
      sacCode: resolveLineItemSacCode({
        type: nextType,
        sacCode: item?.sacCode,
      }),
    };
  };

  return {
    agency: normalizeAgencyDetails({
      ...defaultInvoiceFormData.agency,
      ...value?.agency,
      gstRegistrationStatus:
        value?.agency?.gstRegistrationStatus ||
        defaultInvoiceFormData.agency.gstRegistrationStatus,
    }),
    client: normalizeClientDetails({
      ...defaultInvoiceFormData.client,
      ...value?.client,
    }),
    meta: {
      ...defaultInvoiceFormData.meta,
      ...value?.meta,
    },
    lineItems: Array.isArray(value?.lineItems)
      ? value.lineItems.map((item) => normalizeLineItem(item))
      : defaultInvoiceFormData.lineItems.map((item) => normalizeLineItem(item)),
    tax: {
      ...defaultInvoiceFormData.tax,
      ...value?.tax,
    },
    payment: {
      ...defaultInvoiceFormData.payment,
      ...value?.payment,
      license: {
        ...defaultInvoiceFormData.payment.license,
        ...value?.payment?.license,
      },
    },
  };
}
```

## Section 10: Open questions for the reviewer
- **Column Redundancy**: The `invoices` table appears to have both `msa_response` and `msa_status` columns (as seen in `app/share/[token]/page.tsx:52` and `components/invoice/share/MSAAcceptanceModal.tsx:48`). These columns seem to track similar states ('ACCEPTED', 'PROPOSED', 'PENDING') which could lead to data inconsistency.
- **Large Component Debt**: `InvoiceEditorPage.tsx` has grown to over 2600 lines. It acts as a controller, state manager, and view for the entire editor flow. A major refactor into specialized hooks (e.g., `useInvoiceEditorState`, `useInvoiceAutofill`) and smaller sub-components is highly recommended.
- **Relational vs. JSONB State**: The system currently syncs milestone and line item data from the `form_data` JSONB into relational tables (`invoice_milestones`, `invoice_line_items`) in `lib/supabase/invoices.ts:224`. This duplication requires perfect synchronization; a failure in the sync logic would leave the relational tables out of date with the canonical JSONB state.
- **Auth Perimeter**: While the app has `onboarding` and `profile` routes, the main invoice editor (`/invoice/new`) allows some "anonymous draft" operations in `localStorage` before requiring cloud-save. This progressive profiling adds complexity to the bootstrap sequence in `InvoiceEditorPage.tsx`.
- **Missing Migrations**: Definitions for `invoice_milestones` and `invoice_line_items` were not found in the `supabase/migrations` folder, despite being heavily used in the Supabase service layer. They appear to have been created via the SQL editor or are defined in an untracked file.
