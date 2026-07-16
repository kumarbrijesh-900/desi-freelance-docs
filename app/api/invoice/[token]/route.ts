import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { mergeInvoiceFormData } from "@/types/invoice";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );

  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // 1. Fetch invoice from Supabase
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // 2. Enforce Legal Gating Logic
  // Statuses that require gating: PENDING, REVISION ASKED, NEGOTIATING
  const msaStatus = (invoice.msa_status || invoice.msa_response || "pending").toLowerCase();
  const hasMsaGate = Boolean(invoice.msa_id);
  const isAccepted = msaStatus === "ACCEPTED";

  let formData = mergeInvoiceFormData(invoice.form_data);

  // 3. Strip sensitive data if gate is active and not accepted
  if (hasMsaGate && !isAccepted) {
    // Strip line items
    formData.lineItems = [];
    
    // Strip notes/license if they contain sensitive contract info
    if (formData.payment) {
        formData.payment.notes = "";
        if (formData.payment.license) {
            formData.payment.license.isLicenseIncluded = false;
        }
    }
    
    // We keep the agency/client info and metadata (invoice number/date) 
    // to render the MSA context, but we empty the "meat" of the invoice.
  }

  return NextResponse.json({
    ...invoice,
    form_data: formData,
    is_gated: hasMsaGate && !isAccepted
  });
}
