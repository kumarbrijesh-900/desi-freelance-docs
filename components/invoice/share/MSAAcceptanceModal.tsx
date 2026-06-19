"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon, CheckCircleIcon } from "@/components/ui/app-icons";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

interface MSAAcceptanceModalProps {
  invoiceNumber: string;
  agencyName: string;
  msaTitle: string;
  msaContent: string;
  paymentTerms?: string;
  addendumNotes?: string;
  isSubmitting: boolean;
  msaStatus?: string;
  msaResponseText?: string | null;
  onAccept: () => void | Promise<void>;
  onPropose?: (note: string) => Promise<void>;
  previewMode?: boolean;
  onClosePreview?: () => void;
}

type ModalMode = "view" | "propose" | "success";

export default function MSAAcceptanceModal({
  invoiceNumber,
  agencyName,
  msaTitle,
  msaContent,
  paymentTerms,
  addendumNotes,
  isSubmitting,
  msaStatus,
  msaResponseText,
  onAccept,
  onPropose,
  previewMode = false,
  onClosePreview,
}: MSAAcceptanceModalProps) {
  const params = useParams();
  const token = params?.token as string;
  
  const [mode, setMode] = useState<ModalMode>(
    msaStatus === "proposed" || msaStatus === "REVISION ASKED" ? "success" : "view"
  );
  const [proposalText, setProposalText] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleSubmitProposal = async () => {
    const trimmedNote = proposalText.trim();
    if (!trimmedNote || !token) {
      setActionError("Add a short note describing what should change.");
      return;
    }
    
    setIsSubmittingProposal(true);
    setActionError("");
    try {
      if (onPropose) {
        await onPropose(trimmedNote);
        setMode("success");
      } else {
        // Execute update and select ID/User ID for notification insertion
        const { data: inv, error } = await supabase
          .from("invoices")
          .update({
            client_msa_note: trimmedNote,
            msa_status: 'proposed',
            msa_responded_at: new Date().toISOString()
          })
          .eq("share_token", token)
          .select("id, user_id")
          .single();

        if (error) {
          console.error("PROPOSAL_SUBMIT_ERROR:", error);
          setActionError("Failed to submit proposal. Please try again.");
        } else {
          // Trigger Freelancer Notification
          if (inv) {
            await supabase.from("notifications").insert({
              user_id: inv.user_id,
              invoice_id: inv.id,
              type: 'msa_negotiating',
              title: 'New MSA Proposal',
              message: `Client proposed new terms: "${trimmedNote}"`,
              is_read: false
            });
          }
          setMode("success");
        }
      }
    } catch (err) {
      console.error("PROPOSAL_ERROR:", err);
      setActionError(err instanceof Error ? err.message : "Failed to submit proposal. Please try again.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleAcceptTerms = async () => {
    setActionError("");
    try {
      await onAccept();
    } catch (err) {
      console.error("ACCEPT_TERMS_ERROR:", err);
      setActionError(err instanceof Error ? err.message : "Failed to accept terms. Please try again.");
    }
  };

  if (mode === "success") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 py-6">
        <MotionReveal preset="fade-up" className="w-full max-w-md">
          <div className="rounded-[var(--radius-soft)] border border-soft bg-white p-8 text-center shadow-[var(--brutal-shadow-md)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-soft bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]">
              <CheckCircleIcon className="h-8 w-8" />
            </div>
            <h2 className="font-syne text-xl font-bold text-[color:var(--color-ink)]">
              Proposal submitted
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink)]">
              Your counter-proposal for <strong>Invoice #{invoiceNumber}</strong> has been sent to {agencyName}. They will review your feedback and get back to you soon.
            </p>
            {msaResponseText && (
              <div className="mt-4 p-4 border-l-4 border-soft bg-[color:var(--color-paper)] text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)] mb-2">
                  Client Note
                </p>
                <p className="text-[13px] font-normal text-[color:var(--color-ink)] italic whitespace-pre-wrap">
                  &quot;{msaResponseText}&quot;
                </p>
              </div>
            )}
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-ink-2)] italic">
              This invoice will remain locked until terms are finalized.
            </p>
            {previewMode && onClosePreview && (
              <div className="mt-6 border-t-2 border-soft pt-6">
                <div className="border border-soft bg-[#f6ecd6] px-4 py-3 shadow-[var(--brutal-shadow-md)] mb-4 text-left">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--color-ochre-deep)] mb-1">
                    Preview mode
                  </h3>
                  <p className="text-[11px] font-medium text-[color:var(--color-ochre-deep)]">
                    This is the &quot;Proposal submitted&quot; screen your client sees.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="w-full border border-soft bg-white px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[color:var(--color-ink)] shadow-[var(--brutal-shadow-md)] hover:bg-[color:var(--color-paper-2)] transition-all"
                >
                  Close Preview
                </button>
              </div>
            )}
          </div>
        </MotionReveal>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
      <MotionReveal preset="fade-up" className="w-full max-w-2xl my-auto">
        <div className="relative rounded-[var(--radius-soft)] border border-soft bg-white shadow-[var(--brutal-shadow-md)] overflow-hidden">
          {previewMode && onClosePreview && (
            <button
              type="button"
              onClick={onClosePreview}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-[10px] border border-soft bg-[color:var(--color-ochre)] text-white hover:brightness-105 transition-colors"
              aria-label="Close Preview"
            >
              <span className="text-2xl font-bold leading-none mb-1">×</span>
            </button>
          )}
          {/* Header */}
          <div className="border-b border-soft bg-[color:var(--color-paper)] px-6 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[color:var(--color-acid)] text-[color:var(--color-acc-ink)]">
                <DocumentSparkIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-syne text-xl font-bold text-[color:var(--color-ink)]">
                  {mode === "propose" ? "Propose New Terms" : "Action Required: Review Terms"}
                </h1>
                <p className="text-sm text-[color:var(--color-ink)]">
                  Invoice #{invoiceNumber} from <strong>{agencyName}</strong>
                </p>
              </div>
            </div>
          </div>
          
          {msaStatus === "pending" && msaResponseText && 
           !['pending', 'accepted', 'rejected', 'proposed', 'negotiating'].includes(msaResponseText.toLowerCase()) && 
           mode === "view" && (
            <div className="border-b border-soft bg-[#e4f1ea] px-6 py-4 sm:px-8 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#c7e4d4] bg-white text-[#157a54]">
                <DocumentSparkIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#157a54]">Revised Terms</p>
                <p className="mt-1 text-sm font-bold text-[color:var(--color-ink)]">
                  The freelancer has updated the terms in response to your feedback:
                </p>
                <div className="mt-2 border-l-2 border-[#157a54] pl-3 py-1">
                  <p className="text-[13px] italic text-[color:var(--color-ink)] opacity-80">&quot;{msaResponseText}&quot;</p>
                </div>
              </div>
            </div>
          )}


          <div className="grid border-b border-soft bg-white sm:grid-cols-3">
            <div className="border-b border-soft p-4 sm:border-b-0 sm:border-r">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#c7e4d4] bg-[#e4f1ea] text-[#157a54]">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">Step 1</p>
                  <p className="mt-1 text-[12px] font-bold text-[color:var(--color-ink)]">Review agreement</p>
                </div>
              </div>
            </div>
            <div className="border-b border-soft p-4 sm:border-b-0 sm:border-r">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#cadbd6] bg-[#e3ecea] text-[#3c6e63]">
                  <CreditCard className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">Step 2</p>
                  <p className="mt-1 text-[12px] font-bold text-[color:var(--color-ink)]">{paymentTerms || "Confirm payment terms"}</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-soft bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
                  <FileText className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">Step 3</p>
                  <p className="mt-1 text-[12px] font-bold text-[color:var(--color-ink)]">Accept or request changes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Content / Proposal Form */}
          <div className="px-6 py-6 sm:px-8">
            {mode === "view" ? (
              <div className="space-y-6">
                {/* MSA Body */}
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-ink-2)] mb-3">
                    Master Service Agreement
                  </h2>
                  <div className="rounded-[var(--radius-box)] border border-soft bg-[color:var(--color-paper)] p-5">
                    <h3 className="font-syne text-[15px] font-bold text-[color:var(--color-ink)] mb-2">
                      {msaTitle}
                    </h3>
                    <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide text-[13px] leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap">
                      {msaContent}
                    </div>
                  </div>
                </div>

                {/* Addendum Section */}
                {(paymentTerms || addendumNotes) && (
                  <div className="rounded-[var(--radius-soft)] border border-[#ecd9b0] bg-[#f6ecd6] p-5 shadow-[var(--brutal-shadow-sm)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-[color:var(--color-ochre)] text-[10px] font-bold text-white">
                        !
                      </span>
                      <div>
                        <h3 className="font-syne text-sm font-bold text-[color:var(--color-ochre-deep)]">
                          Project-specific addendum
                        </h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-ochre-deep)]">
                          These specific terms override the Master Agreement for this invoice only.
                        </p>
                        <ul className="mt-3 space-y-2">
                          {paymentTerms && (
                            <li className="flex items-center gap-2 text-[12px] font-normal text-[color:var(--color-ink)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-ochre)] shrink-0" />
                              Payment terms: <span className="font-bold">{paymentTerms}</span>
                            </li>
                          )}
                          {addendumNotes && (
                            <li className="flex items-start gap-2 text-[12px] font-normal text-[color:var(--color-ink)]">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-ochre)] shrink-0" />
                              <span>Additional notes: <span className="font-bold">{addendumNotes}</span></span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)] mb-2">
                    Describe your proposed changes
                  </label>
                  <textarea
                    autoFocus
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    placeholder="e.g. 'I would like to request Net 30 payment terms instead of Net 15...'"
                    className="w-full h-40 rounded-[12px] border border-soft bg-white p-4 text-sm outline-none transition-colors resize-none app-focus-ring"
                  />
                </div>
                <p className="text-xs text-[color:var(--color-ink-2)] italic">
                  Submitting a proposal will notify the freelancer to review and potentially reissue the invoice with updated terms.
                </p>
              </div>
            )}

            {actionError && (
              <div className="mt-5 flex items-start gap-2 rounded-[12px] border border-[#e0b9a6] bg-[#f7e4dc] px-4 py-3" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-coral)]" strokeWidth={2.5} />
                <p className="text-[12px] font-bold leading-5 text-[color:var(--color-coral)]">
                  {actionError}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-6 py-6 sm:px-8">
            {previewMode ? (
              <div className="flex flex-col gap-5">
                <div className="rounded-[var(--radius-soft)] border border-[#ecd9b0] bg-[#f6ecd6] px-6 py-5">
                  <h3 className="font-syne text-lg font-bold text-[color:var(--color-ochre-deep)] mb-1">
                    Preview mode
                  </h3>
                  <p className="text-sm font-normal text-[color:var(--color-ochre-deep)]">
                    This is what your client sees when they open the link from their email. You cannot accept on their behalf.
                  </p>
                </div>
                {onClosePreview && (
                  <button
                    type="button"
                    onClick={onClosePreview}
                    className="self-center rounded-full border border-soft bg-white px-8 py-3 text-sm font-bold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-paper-2)]"
                  >
                    Close preview
                  </button>
                )}
              </div>
            ) : mode === "view" ? (
              <>
                <p className="mb-5 text-xs leading-relaxed text-[color:var(--color-ink-2)]">
                  By clicking &quot;Accept terms&quot;, you are electronically signing the Master Service Agreement and the project addendum for this engagement.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {onPropose && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setMode("propose")}
                      className="flex-1 min-w-[160px] rounded-full border border-soft bg-white px-6 py-2.5 text-sm font-bold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-paper-2)] inline-flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                      Propose changes
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleAcceptTerms}
                    className="flex-[2] min-w-[160px] rounded-full border border-acid bg-acid px-6 py-2.5 text-sm font-bold text-[color:var(--color-acc-ink)] transition-colors hover:bg-[color:var(--color-acid-2)] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {!isSubmitting && <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />}
                    {isSubmitting ? "Processing…" : "Accept terms"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  disabled={isSubmittingProposal}
                  onClick={() => {
                    setMode("view");
                    setProposalText("");
                  }}
                  className="flex-1 min-w-[160px] rounded-full border border-soft bg-white px-6 py-2.5 text-sm font-bold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-paper-2)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingProposal || !proposalText.trim()}
                  onClick={handleSubmitProposal}
                  className="flex-[2] min-w-[160px] rounded-full border border-acid bg-acid px-6 py-2.5 text-sm font-bold text-[color:var(--color-acc-ink)] transition-colors hover:bg-[color:var(--color-acid-2)] disabled:opacity-50"
                >
                  {isSubmittingProposal ? "Submitting…" : "Submit proposal"}
                </button>
              </div>
            )}
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
