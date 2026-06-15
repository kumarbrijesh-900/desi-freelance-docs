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
          <div className="border border-soft bg-white p-8 text-center shadow-[var(--brutal-shadow-md)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-soft bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]">
              <CheckCircleIcon className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-[color:var(--color-ink)]">
              Proposal Submitted
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink)]">
              Your counter-proposal for <strong>Invoice #{invoiceNumber}</strong> has been sent to {agencyName}. They will review your feedback and get back to you soon.
            </p>
            {msaResponseText && (
              <div className="mt-4 p-4 border-l-4 border-soft bg-[color:var(--color-paper)] text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)] mb-2">
                  Client Note
                </p>
                <p className="text-[13px] font-normal text-[#111118] italic whitespace-pre-wrap">
                  &quot;{msaResponseText}&quot;
                </p>
              </div>
            )}
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-ink-2)] italic">
              This invoice will remain locked until terms are finalized.
            </p>
            {previewMode && onClosePreview && (
              <div className="mt-6 border-t-2 border-soft pt-6">
                <div className="border border-soft bg-[#FFD700] px-4 py-3 shadow-[var(--brutal-shadow-md)] mb-4 text-left">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#111118] mb-1">
                    PREVIEW MODE
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#111118]">
                    This is the &quot;Proposal Submitted&quot; screen your client sees.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="w-full border border-soft bg-white px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[#111118] shadow-[var(--brutal-shadow-md)] hover:bg-gray-50 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
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
        <div className="relative border border-soft bg-white shadow-[var(--brutal-shadow-md)] overflow-hidden">
          {previewMode && onClosePreview && (
            <button
              type="button"
              onClick={onClosePreview}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center border border-soft bg-[#FF5C00] text-white hover:brightness-110 shadow-[var(--brutal-shadow-md)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              aria-label="Close Preview"
            >
              <span className="text-2xl font-bold leading-none mb-1">×</span>
            </button>
          )}
          {/* Header */}
          <div className="border-b-2 border-soft bg-[#FFFBE6] px-6 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center border border-soft bg-[color:var(--color-lime-warm)] text-[#111118]">
                <DocumentSparkIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[color:var(--color-ink)]">
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
            <div className="border-b-2 border-soft bg-[#EBFDF9] px-6 py-4 sm:px-8 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-soft bg-white text-[#007A63]">
                <DocumentSparkIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#007A63]">Revised Terms</p>
                <p className="mt-1 text-sm font-bold text-[#111118]">
                  The freelancer has updated the terms in response to your feedback:
                </p>
                <div className="mt-2 border-l-2 border-[#007A63] pl-3 py-1">
                  <p className="text-[13px] italic text-[#111118] opacity-80">&quot;{msaResponseText}&quot;</p>
                </div>
              </div>
            </div>
          )}


          <div className="grid border-b-2 border-soft bg-white sm:grid-cols-3">
            <div className="border-b-2 border-soft p-4 sm:border-b-0 sm:border-r-2">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-soft bg-[#EBFDF9] text-[#007A63]">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">Step 1</p>
                  <p className="mt-1 text-[12px] font-black text-[#111118]">Review agreement</p>
                </div>
              </div>
            </div>
            <div className="border-b-2 border-soft p-4 sm:border-b-0 sm:border-r-2">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-soft bg-[#E0F3FF] text-[#164E63]">
                  <CreditCard className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">Step 2</p>
                  <p className="mt-1 text-[12px] font-black text-[#111118]">{paymentTerms || "Confirm payment terms"}</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-soft bg-[#F5F5F0] text-[#111118]">
                  <FileText className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">Step 3</p>
                  <p className="mt-1 text-[12px] font-black text-[#111118]">Accept or request changes</p>
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
                  <div className="border border-soft bg-[color:var(--color-paper)] p-5">
                    <h3 className="text-sm font-bold text-[color:var(--color-ink)] mb-2">
                      {msaTitle}
                    </h3>
                    <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide text-[13px] leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap">
                      {msaContent}
                    </div>
                  </div>
                </div>

                {/* Addendum Section */}
                {(paymentTerms || addendumNotes) && (
                  <div className="border-2 border-[#FF5C00] bg-[#FFF0EC] p-5 shadow-[var(--brutal-shadow-sm)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-soft bg-amber-200 text-[10px] font-bold text-amber-800">
                        !
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-amber-900">
                          Project-Specific Addendum
                        </h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-amber-800">
                          These specific terms override the Master Agreement for this invoice only.
                        </p>
                        <ul className="mt-3 space-y-2">
                          {paymentTerms && (
                            <li className="flex items-center gap-2 text-[12px] font-normal text-amber-900">
                              <span className="h-1.5 w-1.5 border border-soft bg-amber-400 shrink-0" />
                              Payment Terms: <span className="font-bold underline decoration-amber-300 underline-offset-2">{paymentTerms}</span>
                            </li>
                          )}
                          {addendumNotes && (
                            <li className="flex items-start gap-2 text-[12px] font-normal text-amber-900">
                              <span className="mt-1.5 h-1.5 w-1.5 border border-soft bg-amber-400 shrink-0" />
                              <span>Additional Notes: <span className="font-bold">{addendumNotes}</span></span>
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
                    className="w-full h-40 border border-soft bg-white p-4 text-sm outline-none transition-colors )] resize-none app-focus-ring"
                  />
                </div>
                <p className="text-xs text-[color:var(--color-ink-2)] italic">
                  Submitting a proposal will notify the freelancer to review and potentially reissue the invoice with updated terms.
                </p>
              </div>
            )}

            {actionError && (
              <div className="mt-5 flex items-start gap-2 border-2 border-[#FF5C00] bg-[#FFF0EC] px-4 py-3" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C2410C]" strokeWidth={2.5} />
                <p className="text-[12px] font-bold leading-5 text-[#C2410C]">
                  {actionError}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-[color:var(--color-soft)] bg-[color:var(--color-paper)] px-6 py-6 sm:px-8">
            {previewMode ? (
              <div className="flex flex-col gap-5">
                <div className="border-4 border-soft bg-[#FFD700] px-6 py-5 shadow-[var(--brutal-shadow-lg)]">
                  <h3 className="text-lg font-black uppercase tracking-wider text-[#111118] mb-1">
                    PREVIEW MODE
                  </h3>
                  <p className="text-sm font-normal text-[#111118]">
                    This is what your client sees when they open the link from their email. You cannot accept on their behalf.
                  </p>
                </div>
                {onClosePreview && (
                  <button
                    type="button"
                    onClick={onClosePreview}
                    className="self-center border border-soft bg-white px-8 py-3 text-sm font-bold uppercase tracking-wider text-[#111118] shadow-[var(--brutal-shadow-md)] hover:bg-gray-50 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    Close Preview
                  </button>
                )}
              </div>
            ) : mode === "view" ? (
              <>
                <p className="mb-5 text-xs leading-relaxed text-[color:var(--color-ink-2)]">
                  By clicking &quot;Accept Terms&quot;, you are electronically signing the Master Service Agreement and the Project Addendum for this engagement.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleAcceptTerms}
                    className="flex-[2] min-w-[160px] border border-soft bg-[color:var(--color-lime-warm)] px-6 py-2.5 text-sm font-bold text-[#111118] uppercase transition-all hover:brightness-105 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {!isSubmitting && <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />}
                    {isSubmitting ? "Processing…" : "Accept Terms"}
                  </button>
                  {onPropose && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setMode("propose")}
                      className="flex-1 min-w-[160px] border border-soft bg-white px-6 py-2.5 text-sm font-bold text-[#111118] transition-all hover:bg-[color:var(--color-paper)] inline-flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                      Propose Changes
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  disabled={isSubmittingProposal || !proposalText.trim()}
                  onClick={handleSubmitProposal}
                  className="flex-[2] min-w-[160px] border border-soft bg-[color:var(--color-lime-warm)] px-6 py-2.5 text-sm font-bold text-[#111118] uppercase transition-all hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmittingProposal ? "Submitting…" : "Submit Proposal"}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingProposal}
                  onClick={() => {
                    setMode("view");
                    setProposalText("");
                  }}
                  className="flex-1 min-w-[160px] border border-soft bg-white px-6 py-2.5 text-sm font-bold text-[#111118] transition-all hover:bg-[color:var(--color-paper)]"
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
