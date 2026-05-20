import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
