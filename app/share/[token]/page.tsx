"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { mergeInvoiceFormData, type InvoiceFormData } from "@/types/invoice";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { DocumentSparkIcon } from "@/components/ui/app-icons";
import { loadMsaForSharedInvoice } from "@/lib/supabase/invoices";
import SharedMsaPreviewContent from "@/components/invoice/share/SharedMsaPreviewContent";

export default function PublicInvoiceSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [formData, setFormData] = useState<InvoiceFormData | null>(null);
  const [templateId, setTemplateId] = useState("classic");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // MSA Gate state
  const [msaStatus, setMsaStatus] = useState<string>("pending");
  const [msaData, setMsaData] = useState<{ title: string; content: string } | null>(null);
  const [isSubmittingMsa, setIsSubmittingMsa] = useState(false);
  const [isChildInvoice, setIsChildInvoice] = useState(false);
  const [parentMsaAcceptedOn, setParentMsaAcceptedOn] = useState<string | null>(null);
  const [msaResponse, setMsaResponse] = useState<string | null>(null);
  const [showAcceptedToast, setShowAcceptedToast] = useState(false);
  const [showProposedToast, setShowProposedToast] = useState(false);

  useEffect(() => {
    async function loadInvoice() {
      try {
        // Fetch invoice using the public/anon client as requested
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("share_token", token)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        const fd = mergeInvoiceFormData(data.form_data);
        setFormData(fd);
        setTemplateId(data.template_id || "classic");
        setInvoiceNumber(data.invoice_number || "");
        setInvoiceId(data.id || "");
        
        // Check if this is a child milestone invoice
        if (data.parent_invoice_id) {
          // Child invoice: skip MSA gate, look up when parent MSA was accepted
          setIsChildInvoice(true);
          setMsaStatus("accepted");

          // Fetch parent invoice's msa_responded_at for the banner
          const { data: parentInvoice } = await supabase
            .from("invoices")
            .select("msa_responded_at, milestone_index")
            .eq("id", data.parent_invoice_id)
            .single();

          if (parentInvoice?.msa_responded_at) {
            const acceptedDate = new Date(parentInvoice.msa_responded_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            setParentMsaAcceptedOn(acceptedDate);
          }
        } else {
          // Standard invoice: normal MSA gate flow
          const currentMsaStatus = data.msa_status || "pending";
          const currentMsaResponse = data.msa_response || null;
          setMsaStatus(currentMsaStatus);
          setMsaResponse(currentMsaResponse);

          // Load MSA content if pending
          if (currentMsaStatus === "pending" && data.msa_id) {
            const msa = await loadMsaForSharedInvoice(data.id, data.msa_id);
            if (msa) setMsaData(msa);
          }
        }
      } catch (err) {
        console.error("LOAD_ERROR:", err);
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
      const { data: inv, error } = await supabase
        .from("invoices")
        .update({ 
          msa_response: 'accepted',
          msa_status: 'accepted',
          msa_responded_at: new Date().toISOString(),
          msa_accepted_at: new Date().toISOString(),
        })
        .eq("share_token", token)
        .select("id, user_id")
        .single();

      if (error) {
        console.error("Supabase Update Error:", error);
        throw new Error("Failed to accept terms. Please try again.");
      }

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

      // Success: Reveal the invoice
      setMsaStatus("accepted");
      setMsaResponse("accepted");
      setShowAcceptedToast(true);
    } catch (err) {
      console.error("ACCEPT_ERROR:", err);
      throw err;
    } finally {
      setIsSubmittingMsa(false);
    }
  };

  const handleProposeMsaChanges = async (note: string) => {
    try {
      const { data: inv, error } = await supabase
        .from("invoices")
        .update({
          client_msa_note: note.trim(),
          msa_status: 'proposed',
          msa_responded_at: new Date().toISOString(),
        })
        .eq("share_token", token)
        .select("id, user_id")
        .single();

      if (error) {
        console.error("Supabase Update Error:", error);
        throw new Error("Failed to submit proposal. Please try again.");
      }

      // Trigger Freelancer Notification
      if (inv) {
        await supabase.from("notifications").insert({
          user_id: inv.user_id,
          invoice_id: inv.id,
          type: 'msa_negotiating',
          title: 'New MSA Proposal',
          message: `Client proposed new terms: "${note.trim()}"`,
          is_read: false
        });
      }

      setMsaStatus("proposed");
      setMsaResponse(note.trim());
      setShowProposedToast(true);
    } catch (err) {
      console.error("PROPOSE_ERROR:", err);
      throw err;
    }
  };

  useEffect(() => {
    if (!showAcceptedToast) return;
    const timer = setTimeout(() => setShowAcceptedToast(false), 4000);
    return () => clearTimeout(timer);
  }, [showAcceptedToast]);

  useEffect(() => {
    if (showProposedToast) {
      const timer = setTimeout(() => setShowProposedToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showProposedToast]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-paper)]">
        <MotionReveal preset="fade-up">
          <div className="flex items-center gap-3 border border-[color:var(--color-ink)] bg-white p-6 shadow-lg">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-soft)] bg-[color:var(--color-paper)]">
              <DocumentSparkIcon className="h-5 w-5 text-[color:var(--color-ink)]" />
            </span>
            <p className="text-sm font-bold text-[color:var(--color-ink)]">
              Loading invoice…
            </p>
          </div>
        </MotionReveal>
      </main>
    );
  }

  if (notFound || !formData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-paper)]">
        <MotionReveal preset="fade-up">
          <div className="mx-4 max-w-md border border-[color:var(--color-ink)] bg-white p-8 text-center shadow-lg">
            <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--color-ink)] sm:text-[32px]">
              Invoice Not Found
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-ink)]">
              Invoice not found or link expired.
            </p>
          </div>
        </MotionReveal>
      </main>
    );
  }

  return (
    <>
      <SharedMsaPreviewContent
        invoice={{
          id: invoiceId,
          formData,
          templateId,
          invoiceNumber,
          isChildInvoice,
          parentMsaAcceptedOn,
          msaStatus,
          msaResponse,
        }}
        msaTerms={msaData}
        addendum={{
          paymentTerms: formData.meta?.paymentTerms ? `Net ${formData.meta.paymentTerms}` : undefined,
          notes: formData.payment?.notes
        }}
        mode="client"
        onAcceptClick={handleAcceptMsa}
        isSubmittingMsa={isSubmittingMsa}
        onProposeChanges={handleProposeMsaChanges}
      />

      {showAcceptedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5 border border-green-200 bg-green-50 px-5 py-3 shadow-lg">
            <span className="text-green-600 text-base">✓</span>
            <p className="text-sm font-bold text-green-800">
              Terms accepted — invoice is now active
            </p>
          </div>
        </div>
      )}

      {showProposedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5 border-2 border-[#111118] bg-[#FFD700] px-5 py-3 shadow-[var(--brutal-shadow-md)]">
            <span className="text-[#111118] font-bold text-base">✓</span>
            <p className="text-sm font-bold text-[#111118]">
              Proposal sent — waiting for the freelancer to review your changes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
