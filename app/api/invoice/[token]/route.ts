import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { mergeInvoiceFormData } from "@/types/invoice";

// We use the service role key to bypass RLS for strict gating control in the API layer
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
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
  const msaStatus = invoice.msa_status || invoice.msa_response || "PENDING";
  const hasMsaGate = Boolean(invoice.msa_id);
  const isAccepted = msaStatus === "ACCEPTED";

  let formData = mergeInvoiceFormData(invoice.form_data);

  // 3. Strip sensitive data if gate is active and not accepted
  const isGated = hasMsaGate && !isAccepted;
  
  if (isGated) {
    // Strip financials
    formData.lineItems = [];
    
    // Strip notes/license
    if (formData.payment) {
        formData.payment.notes = "";
        if (formData.payment.license) {
            formData.payment.license.isLicenseIncluded = false;
        }
    }

    // Explicitly construct safe return payload (Zero-Trust)
    return NextResponse.json({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      share_token: invoice.share_token,
      status: invoice.status,
      msa_id: invoice.msa_id,
      msa_status: msaStatus,
      form_data: formData,
      is_gated: true
    });
  }

  // 4. Return full payload for accepted MSAs
  return NextResponse.json({
    ...invoice,
    form_data: formData,
    is_gated: false
  });
}
