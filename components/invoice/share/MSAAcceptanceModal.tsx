import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon, CheckCircleIcon } from "@/components/ui/app-icons";
import { getAppButtonClass } from "@/lib/ui-foundation";

interface MSAAcceptanceModalProps {
  invoiceNumber: string;
  agencyName: string;
  msaTitle: string;
  msaContent: string;
  paymentTerms?: string;
  addendumNotes?: string;
  isSubmitting: boolean;
  onAccept: () => void;
  onPropose?: () => void;
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
  onAccept,
  onPropose,
}: MSAAcceptanceModalProps) {
  const params = useParams();
  const token = params?.token as string;
  
  const [mode, setMode] = useState<ModalMode>("view");
  const [proposalText, setProposalText] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const handleSubmitProposal = async () => {
    if (!proposalText.trim() || !token) return;
    
    setIsSubmittingProposal(true);
    try {
      // Execute update and select ID/User ID for notification insertion
      const { data: inv, error } = await supabase
        .from("invoices")
        .update({
          msa_status: 'proposed',
          msa_response: proposalText,
          msa_responded_at: new Date().toISOString()
        })
        .eq("share_token", token)
        .select("id, user_id")
        .single();

      if (error) {
        console.error("PROPOSAL_SUBMIT_ERROR:", error);
        alert("Failed to submit proposal. Please try again.");
      } else {
        // Trigger Freelancer Notification
        if (inv) {
          await supabase.from("notifications").insert({
            user_id: inv.user_id,
            invoice_id: inv.id,
            type: 'msa_negotiating',
            title: 'New MSA Proposal',
            message: `Client proposed new terms: "${proposalText}"`,
            is_read: false
          });
        }
        setMode("success");
      }
    } catch (err) {
      console.error("PROPOSAL_ERROR:", err);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  if (mode === "success") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 py-6">
        <MotionReveal preset="fade-up" className="w-full max-w-md">
          <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-8 text-center shadow-[var(--brutal-shadow-lg)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]">
              <CheckCircleIcon className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
              Proposal Submitted
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-secondary)]">
              Your counter-proposal for <strong>Invoice #{invoiceNumber}</strong> has been sent to {agencyName}. They will review your feedback and get back to you soon.
            </p>
            <p className="mt-4 text-xs font-medium text-[color:var(--text-muted)] italic">
              This invoice will remain locked until terms are finalized.
            </p>
          </div>
        </MotionReveal>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
      <MotionReveal preset="fade-up" className="w-full max-w-2xl my-auto">
        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white shadow-[var(--brutal-shadow-lg)] overflow-hidden">
          {/* Header */}
          <div className="border-b border-[color:var(--border-subtle)] bg-gradient-to-r from-[color:var(--color-lime-50)] to-white px-6 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-lime-100)] text-[color:var(--color-lime-700)]">
                <DocumentSparkIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
                  {mode === "propose" ? "Propose New Terms" : "Action Required: Review Terms"}
                </h1>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Invoice #{invoiceNumber} from <strong>{agencyName}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Legal Content / Proposal Form */}
          <div className="px-6 py-6 sm:px-8">
            {mode === "view" ? (
              <div className="space-y-6">
                {/* MSA Body */}
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)] mb-3">
                    Master Service Agreement
                  </h2>
                  <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] p-5">
                    <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-2">
                      {msaTitle}
                    </h3>
                    <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide text-[13px] leading-relaxed text-[color:var(--text-secondary)] whitespace-pre-wrap">
                      {msaContent}
                    </div>
                  </div>
                </div>

                {/* Addendum Section */}
                {(paymentTerms || addendumNotes) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800">
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
                            <li className="flex items-center gap-2 text-[12px] font-medium text-amber-900">
                              <span className="h-1 w-1 rounded-full bg-amber-400" />
                              Payment Terms: <span className="font-bold underline decoration-amber-300 underline-offset-2">{paymentTerms}</span>
                            </li>
                          )}
                          {addendumNotes && (
                            <li className="flex items-start gap-2 text-[12px] font-medium text-amber-900">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-2">
                    Describe your proposed changes
                  </label>
                  <textarea
                    autoFocus
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    placeholder="e.g. 'I would like to request Net 30 payment terms instead of Net 15...'"
                    className="w-full h-40 border border-[color:var(--border-default)] bg-white p-4 text-sm focus:border-[color:var(--color-lime-500)] outline-none transition-colors resize-none shadow-inner"
                  />
                </div>
                <p className="text-xs text-[color:var(--text-muted)] italic">
                  Submitting a proposal will notify the freelancer to review and potentially reissue the invoice with updated terms.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] px-6 py-6 sm:px-8">
            {mode === "view" ? (
              <>
                <p className="mb-5 text-xs leading-relaxed text-[color:var(--text-muted)]">
                  By clicking &quot;Accept Terms&quot;, you are electronically signing the Master Service Agreement and the Project Addendum for this engagement.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={async () => {
                      // Integrated Accept logic with Notifications
                      const { data: inv, error } = await supabase
                        .from("invoices")
                        .update({ 
                          msa_status: 'accepted', 
                          msa_accepted_at: new Date().toISOString() 
                        })
                        .eq("share_token", token)
                        .select("id, user_id")
                        .single();

                      if (error) {
                        console.error("Supabase Update Error:", error);
                        alert("Failed to accept terms. Please try again.");
                        return;
                      }

                      // Trigger Freelancer Notification
                      if (inv) {
                        await supabase.from("notifications").insert({
                          user_id: inv.user_id,
                          invoice_id: inv.id,
                          type: 'msa_accepted',
                          title: 'MSA Accepted',
                          message: 'The client has accepted the terms for this invoice.',
                          is_read: false
                        });
                      }

                      onAccept();
                    }}
                    className={`flex-[2] min-w-[160px] ${getAppButtonClass({ variant: "primary", size: "md" })}`}
                  >
                    {isSubmitting ? "Processing…" : "Accept Terms"}
                  </button>
                  {onPropose && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={onPropose}
                      className={`flex-1 min-w-[160px] ${getAppButtonClass({ variant: "ghost", size: "md" })}`}
                    >
                      Propose Changes
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  disabled={isSubmittingProposal || !proposalText.trim()}
                  onClick={handleSubmitProposal}
                  className={`flex-[2] min-w-[160px] ${getAppButtonClass({ variant: "primary", size: "md" })}`}
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
                  className={`flex-1 min-w-[160px] ${getAppButtonClass({ variant: "ghost", size: "md" })}`}
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
