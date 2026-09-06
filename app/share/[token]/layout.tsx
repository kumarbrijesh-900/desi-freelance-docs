import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  // Share tokens must never be indexed — the URL is the only credential.
  const base: Metadata = { robots: { index: false, follow: false, nocache: true } };

  try {
    const { token } = await params;
    const supabase = await createClient();
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number, form_data")
      .eq("share_token", token)
      .single();

    if (!data) return { ...base, title: "Invoice · Lance" };

    const agency =
      ((data.form_data as any)?.agency?.agencyName || "").trim() || "your collaborator";
    const number = (data.invoice_number || "Invoice").trim();

    // Deliberately NO amount, NO client name and NO line items. The page gates
    // invoice detail behind MSA acceptance; a link preview must not undo that
    // gate, and previews render to anyone the link is forwarded to.
    const title = `${number} from ${agency}`;
    const description = "Review the terms and accept to view this invoice.";

    return {
      ...base,
      title,
      description,
      openGraph: { title, description, type: "website" },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return { ...base, title: "Invoice · Lance" };
  }
}

export default async function SharePageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, user_id")
      .eq("share_token", token)
      .single();

    if (invoice && sessionData.session.user.id === invoice.user_id) {
      redirect(`/invoice/${invoice.id}/client-preview`);
    }
  }

  return <>{children}</>;
}
