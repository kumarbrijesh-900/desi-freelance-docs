import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SharedMsaPreviewContent from "@/components/invoice/share/SharedMsaPreviewContent";
import { mergeInvoiceFormData } from "@/types/invoice";
import { loadMsaForSharedInvoice } from "@/lib/supabase/invoices";

export default async function ClientPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    redirect("/login");
  }
  
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error || !invoice) {
    notFound();
  }
  
  if (sessionData.session.user.id !== invoice.user_id) {
    redirect("/dashboard");
  }
  
  let msaData = null;
  let isChildInvoice = false;
  let parentMsaAcceptedOn = null;
  let msaStatus = invoice.msa_response || "accepted";
  
  if (invoice.parent_invoice_id) {
    isChildInvoice = true;
    msaStatus = "accepted";
    
    const { data: parentInvoice } = await supabase
      .from("invoices")
      .select("msa_responded_at")
      .eq("id", invoice.parent_invoice_id)
      .single();
      
    if (parentInvoice?.msa_responded_at) {
      parentMsaAcceptedOn = new Date(parentInvoice.msa_responded_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } else {
    if (msaStatus === "pending" && invoice.msa_id) {
      const msa = await loadMsaForSharedInvoice(invoice.id, invoice.msa_id);
      if (msa) {
        msaData = msa;
      }
    }
  }
  
  const formData = mergeInvoiceFormData(invoice.form_data);
  const isMsaPending = msaStatus === "pending";
  
  return (
    <SharedMsaPreviewContent
      invoice={{
        id: invoice.id,
        formData,
        templateId: invoice.template_id || "classic",
        invoiceNumber: invoice.invoice_number || "",
        isChildInvoice,
        parentMsaAcceptedOn,
        isMsaPending,
      }}
      msaTerms={msaData}
      addendum={{
        paymentTerms: formData.meta?.paymentTerms ? `Net ${formData.meta.paymentTerms}` : undefined,
        notes: formData.payment?.notes
      }}
      mode="agency-preview"
    />
  );
}
