import { supabase } from "./client";
import { getCurrentUserId } from "./invoices";

export interface Notification {
  id: string;
  user_id: string;
  invoice_id: string | null;
  type: "invoice_sent" | "invoice_viewed" | "msa_accepted" | "msa_rejected" | "msa_negotiating";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  // Joined invoice status for filtering
  invoices?: {
    status: string;
    invoice_number: string;
  } | null;
}

/** 
 * Fetch live notifications.
 * Filters out notifications for invoices that are already 'settled'.
 */
export async function listLiveNotifications(): Promise<{
  data: Notification[];
  error: string | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { data: [], error: "Not authenticated" };

  // We fetch notifications and join with invoices to check status
  const { data, error } = await supabase
    .from("notifications")
    .select(`
      *,
      invoices:invoice_id (
        status,
        invoice_number
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  // Filter: Keep if no associated invoice OR if associated invoice is NOT settled
  // EXCEPTION: Always keep 'invoice_settled' type as it's the confirmation of completion.
  const filtered = (data ?? []).filter((n: any) => {
    if (n.type === "invoice_settled") return true;
    if (!n.invoices) return true; // Keep general notifications
    return n.invoices.status !== "settled";
  });

  return { data: filtered as Notification[], error: null };
}

/** Mark a specific notification as read */
export async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

/** Mark all as read for current user */
export async function markAllAsRead(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}
