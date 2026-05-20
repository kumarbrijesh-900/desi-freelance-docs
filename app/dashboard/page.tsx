"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { supabase, getClientSessionUser } from "@/lib/supabase/client";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { markInvoiceSettled, cancelInvoice } from "@/lib/supabase/invoices";
import { trackedOnly, offlineOnly } from "@/lib/invoice-channel-helpers";

interface DashboardMetrics {
  outstanding: number;
  outstandingCount: number;
  settled: number;
  settledCount: number;
  overdue: number;
  overdueCount: number;
  dueThisWeek: number;
  dueThisWeekCount: number;
}

interface ClientHealth {
  clientId: string;
  clientName: string;
  clientCity: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    dueDate: string;
    milestones: Array<{
      title: string;
      status: string;
      amount: number;
      orderIndex: number;
    }>;
    has_addendum?: boolean;
    msa_id?: string | null;
    lineItems?: Array<any>;
    applied_payment_terms?: string | null;
    applied_late_fee_rate?: number | null;
    applied_license_type?: string | null;
    clientMsaNote?: string | null;
    shareToken?: string | null;
    clientName?: string;
    msaStatus?: string | null;
    sharedToEmail?: string | null;
    sharedAt?: string | null;
  }>;
  totalOwed: number;
  totalCollected: number;
  health: "good" | "overdue" | "clear" | "draft";
}

interface ActivityItem {
  id: string;
  action: string;
  entityLabel: string;
  detail: string;
  createdAt: string;
}

interface UpcomingDeadline {
  id: string;
  invoiceNumber: string;
  clientName: string;
  dueDate: string;
  daysUntilDue: number;
  totalAmount: number;
  nextMilestoneTitle?: string | null;
  nextMilestoneAmount?: number | null;
  rawInvoice: any;
}

function parsePaymentTermsDays(termsStr?: string | null): number {
  if (!termsStr) return 15;
  const lower = termsStr.toLowerCase();
  if (lower.includes("30")) return 30;
  if (lower.includes("45")) return 45;
  if (lower.includes("60")) return 60;
  if (lower.includes("7")) return 7;
  if (lower.includes("10")) return 10;
  return 15;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    outstanding: 0,
    outstandingCount: 0,
    settled: 0,
    settledCount: 0,
    overdue: 0,
    overdueCount: 0,
    dueThisWeek: 0,
    dueThisWeekCount: 0,
  });
  const [clientsHealth, setClientsHealth] = useState<ClientHealth[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [offlineInvoicesCount, setOfflineInvoicesCount] = useState(0);
  const router = useRouter();

  // Client-side UX Interactive States
  const [filterType, setFilterType] = useState<"all" | "outstanding" | "settled" | "overdue" | "due_this_week">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"receivable" | "collected" | "name" | "health">("receivable");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());

  // --- Modal System ---
  interface ModalState {
    open: boolean;
    title: string;
    message: string;
    tone: "success" | "error" | "warning" | "info";
    type: "alert" | "confirm";
    confirmLabel?: string;
    cancelLabel?: string;
  }
  const [modal, setModal] = useState<ModalState>({
    open: false, title: "", message: "", tone: "info", type: "alert",
  });
  const modalResolveRef = useRef<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((title: string, message: string, tone: ModalState["tone"] = "info") => {
    setModal({ open: true, title, message, tone, type: "alert" });
  }, []);

  const showConfirm = useCallback((title: string, message: string, tone: ModalState["tone"] = "warning", confirmLabel = "Confirm", cancelLabel = "Cancel"): Promise<boolean> => {
    return new Promise((resolve) => {
      modalResolveRef.current = resolve;
      setModal({ open: true, title, message, tone, type: "confirm", confirmLabel, cancelLabel });
    });
  }, []);

  const handleModalClose = useCallback((confirmed: boolean) => {
    setModal(prev => ({ ...prev, open: false }));
    if (modalResolveRef.current) {
      modalResolveRef.current(confirmed);
      modalResolveRef.current = null;
    }
  }, []);

  // Close drawer on ESC key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedInvoice(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Detect mobile for default-expanded accordions
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function formatIndian(num: number): string {
    if (!num) return "0";
    return num.toLocaleString("en-IN");
  }

  const handleSettleMilestone = async (miIndex: number) => {
    if (!selectedInvoice) return;
    try {
      const activeM = selectedInvoice.milestones[miIndex];
      if (!activeM) return;

      const confirmText = miIndex < selectedInvoice.milestones.length - 1
        ? `Settle Milestone ${miIndex + 1} (${activeM.title}) and start Milestone ${miIndex + 2}?`
        : `Settle the final milestone (${activeM.title}) and fully complete this invoice?`;

      const confirmed = await showConfirm("Settle Milestone", confirmText, "warning", "Settle", "Cancel");
      if (!confirmed) return;

      // 1. Settle current milestone in database
      const { error: settleErr } = await supabase
        .from("invoice_milestones")
        .update({ status: "SETTLED" })
        .eq("invoice_id", selectedInvoice.id)
        .eq("order_index", miIndex);

      if (settleErr) {
        showAlert("Settlement Error", `Error settling milestone: ${settleErr.message}`, "error");
        return;
      }

      const nextIndex = miIndex + 1;
      const hasNext = nextIndex < selectedInvoice.milestones.length;

      if (hasNext) {
        // 2. Start next milestone
        const nextM = selectedInvoice.milestones[nextIndex];
        
        // Calculate new due date based on Today + Net Days
        const netDays = parsePaymentTermsDays(selectedInvoice.applied_payment_terms || selectedInvoice.form_data?.payment?.paymentTerms);
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + netDays);
        const newDueDateIso = newDueDate.toISOString().split("T")[0]; // YYYY-MM-DD

        // Update next milestone status to LIVE
        const { error: nextErr } = await supabase
          .from("invoice_milestones")
          .update({ status: "LIVE" })
          .eq("invoice_id", selectedInvoice.id)
          .eq("order_index", nextIndex);

        if (nextErr) {
          showAlert("Milestone Error", `Error starting next milestone: ${nextErr.message}`, "error");
          return;
        }

        // Update invoice overall due_date and form_data payload
        const updatedFormData = {
          ...selectedInvoice.form_data,
          meta: {
            ...(selectedInvoice.form_data?.meta || {}),
            dueDate: newDueDateIso,
          },
          milestones: (selectedInvoice.form_data?.milestones || []).map((m: any, idx: number) => {
            if (idx === miIndex) return { ...m, status: "SETTLED" };
            if (idx === nextIndex) return { ...m, status: "LIVE" };
            return m;
          }),
        };

        const { error: invErr } = await supabase
          .from("invoices")
          .update({
            due_date: newDueDateIso,
            status: "PARTIAL",
            form_data: updatedFormData as any,
          })
          .eq("id", selectedInvoice.id);

        if (invErr) {
          showAlert("Update Error", `Error updating invoice due date: ${invErr.message}`, "error");
          return;
        }

        // Create notification
        const { data: userSession } = await supabase.auth.getSession();
        const userId = userSession?.session?.user?.id;
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            invoice_id: selectedInvoice.id,
            type: "milestone_settled",
            title: "Milestone Paid & Next Started",
            message: `Milestone ${miIndex + 1} settled. Milestone ${nextIndex + 1} ("${nextM.title}") is now LIVE and due on ${newDueDateIso} (calculated as today + ${netDays} days terms).`,
            is_read: false,
          });
        }

        showAlert("Milestone Settled", `Milestone ${miIndex + 1} settled! Milestone ${nextIndex + 1} is now LIVE with due date ${newDueDateIso} (Net ${netDays} days).`, "success");
      } else {
        // Settle entire invoice
        const updatedFormData = {
          ...selectedInvoice.form_data,
          milestones: (selectedInvoice.form_data?.milestones || []).map((m: any) => ({ ...m, status: "SETTLED" })),
        };

        const { error: invErr } = await supabase
          .from("invoices")
          .update({
            status: "SETTLED",
            settled_at: new Date().toISOString(),
            form_data: updatedFormData as any,
          })
          .eq("id", selectedInvoice.id);

        if (invErr) {
          showAlert("Settlement Error", `Error settling invoice: ${invErr.message}`, "error");
          return;
        }

        // Create notification
        const { data: userSession } = await supabase.auth.getSession();
        const userId = userSession?.session?.user?.id;
        if (userId) {
          await supabase.from("notifications").insert({
            user_id: userId,
            invoice_id: selectedInvoice.id,
            type: "invoice_settled",
            title: "Invoice Fully Settled",
            message: `All milestones settled! Invoice ${selectedInvoice.invoiceNumber} is fully paid.`,
            is_read: false,
          });
        }

        showAlert("Invoice Settled", `All milestones settled! Invoice ${selectedInvoice.invoiceNumber} is fully paid.`, "success");
      }

      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      showAlert("Error", "An unexpected error occurred during milestone settlement.", "error");
    }
  };

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "yesterday";
    return `${diffDays}d ago`;
  }

  useEffect(() => {
    async function initDashboard() {
      // 1. Check auth
      const user = await getClientSessionUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // 2. Get user profile from user_profiles table to get agency_name for greeting
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("agency_name")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profileData?.agency_name) {
          setUserName(profileData.agency_name);
        } else if (user.email) {
          // Fallback to name from email
          setUserName(user.email.split("@")[0]);
        }

        // 3. Get all invoices for this user
        const { data: invoicesData, error: invoicesError } = await supabase
          .from("invoices")
          .select("*")
          .eq("user_id", user.id);

        if (invoicesError) throw invoicesError;
        const invoices = invoicesData || [];

        const trackedInvoices = ((invoices ?? [])
          .map(inv => ({ ...inv, isOffline: inv.is_offline }))
          .filter(trackedOnly) as unknown as typeof invoices);
        
        const offlineCount = (invoices ?? [])
          .map(inv => ({ ...inv, isOffline: inv.is_offline }))
          .filter(offlineOnly).length;
        setOfflineInvoicesCount(offlineCount);

        // 4. Get all invoice_milestones for the user's invoices
        const invoiceIds = trackedInvoices.map((inv) => inv.id);
        let milestones: any[] = [];
        if (invoiceIds.length > 0) {
          const { data: milestonesData } = await supabase
            .from("invoice_milestones")
            .select("*")
            .in("invoice_id", invoiceIds);
          milestones = milestonesData || [];
        }

        // 5. Get all clients for this user
        const { data: clientsData } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id);
        const clientsList = clientsData || [];

        // 6. Get recent activity (unified with notifications for milestones)
        let combinedActivityList: ActivityItem[] = [];
        try {
          const { data: activityData } = await supabase
            .from("activity_log")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (activityData && activityData.length > 0) {
            combinedActivityList.push(
              ...activityData.map((item: any) => ({
                id: item.id,
                action: item.action || "",
                entityLabel: item.entity_label || item.action || "Activity",
                detail: item.detail || "",
                createdAt: item.created_at || new Date().toISOString(),
              }))
            );
          }
        } catch (err) {
          console.warn("activity_log fetch failed or table doesn't exist:", err);
        }

        try {
          const { data: notifData } = await supabase
            .from("notifications")
            .select(`
              *,
              invoices:invoice_id (
                invoice_number
              )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (notifData && notifData.length > 0) {
            combinedActivityList.push(
              ...notifData.map((item: any) => ({
                id: item.id,
                action: item.type || "",
                entityLabel: item.title || "Milestone Update",
                detail: `${item.message}${
                  item.invoices?.invoice_number ? ` (${item.invoices.invoice_number})` : ""
                }`,
                createdAt: item.created_at || new Date().toISOString(),
              }))
            );
          }
        } catch (err) {
          console.warn("notifications fetch failed or table doesn't exist:", err);
        }

        // Sort unified activities chronologically in descending order, slice to top 6 items
        combinedActivityList.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setActivity(combinedActivityList.slice(0, 6));

        // --- Attach Milestones to Invoices & Compute Total Amount ---
        const invoicesWithMilestones = trackedInvoices.map((inv: any) => {
          const invMilestones = milestones
            .filter((m: any) => m.invoice_id === inv.id)
            .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((m: any) => ({
              title: m.title || "Untitled",
              status: (m.status || "pending").toLowerCase(),
              amount: Number(m.amount || 0),
              orderIndex: m.order_index ?? 0,
            }));

          let totalAmount = 0;
          if (invMilestones.length > 0) {
            totalAmount = invMilestones.reduce((s, m) => s + m.amount, 0);
          } else {
            const items = inv.form_data?.lineItems ?? [];
            totalAmount = items.reduce((s: number, i: any) => s + Number(i.qty ?? 0) * Number(i.rate ?? 0), 0);
          }

          return {
            ...inv,
            milestones: invMilestones,
            totalAmount,
          };
        });

        // --- Compute Metrics ---
        let outstanding = 0;
        let outstandingCount = 0;
        let settled = 0;
        let settledCount = 0;
        let overdue = 0;
        let overdueCount = 0;
        let dueThisWeek = 0;
        let dueThisWeekCount = 0;

        const todayVal = new Date();
        todayVal.setHours(0, 0, 0, 0);

        const todayPlus7Val = new Date();
        todayPlus7Val.setDate(todayPlus7Val.getDate() + 7);
        todayPlus7Val.setHours(23, 59, 59, 999);

        invoicesWithMilestones.forEach((inv: any) => {
          const statusLower = inv.status.toLowerCase();
          if (statusLower === "cancelled") return; // Skip cancelled invoices from metrics
          const totalAmount = inv.totalAmount;
          const dueDateStr = inv.due_date || inv.form_data?.meta?.dueDate;
          let isOverdue = false;

          if (dueDateStr) {
            const due = new Date(dueDateStr);
            due.setHours(0, 0, 0, 0);
            if (due < todayVal) {
              isOverdue = true;
            }
          }

          // Outstanding (finalized or sent, not settled)
          if (statusLower === "finalized" || statusLower === "sent") {
            outstanding += totalAmount;
            outstandingCount++;
          }

          // Settled
          if (statusLower === "settled") {
            settled += totalAmount;
            settledCount++;
          }

          // Overdue (sent status and isOverdue)
          if (statusLower === "sent" && isOverdue) {
            overdue += totalAmount;
            overdueCount++;
          }

          // Due this week
          if (statusLower !== "settled" && dueDateStr) {
            const due = new Date(dueDateStr);
            due.setHours(0, 0, 0, 0);
            if (due >= todayVal && due <= todayPlus7Val) {
              dueThisWeek += totalAmount;
              dueThisWeekCount++;
            }
          }
        });

        setMetrics({
          outstanding,
          outstandingCount,
          settled,
          settledCount,
          overdue,
          overdueCount,
          dueThisWeek,
          dueThisWeekCount,
        });

        // --- Compute Client Health ---
        const clientsMap = new Map<string, ClientHealth>();

        // Initialize with all fetched clients
        clientsList.forEach((cl: any) => {
          clientsMap.set(cl.id, {
            clientId: cl.id,
            clientName: cl.client_name,
            clientCity: cl.city || cl.client_address || "",
            invoices: [],
            totalOwed: 0,
            totalCollected: 0,
            health: "clear",
          });
        });

        // Group invoices
        invoicesWithMilestones.forEach((inv: any) => {
          const invClientName = inv.form_data?.client?.clientName?.trim();
          if (!invClientName) return;

          let matchedClient = clientsList.find(
            (cl: any) => cl.client_name.trim().toLowerCase() === invClientName.toLowerCase()
          );

          let clientId = matchedClient?.id;
          if (!clientId) {
            clientId = `pseudo-${invClientName}`;
            if (!clientsMap.has(clientId)) {
              clientsMap.set(clientId, {
                clientId,
                clientName: inv.form_data?.client?.clientName,
                clientCity: inv.form_data?.client?.clientCity || "",
                invoices: [],
                totalOwed: 0,
                totalCollected: 0,
                health: "clear",
              });
            }
          }

          const clientHealth = clientsMap.get(clientId)!;
          const isSettled = inv.status.toLowerCase() === "settled";

          clientHealth.invoices.push({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            status: inv.status,
            totalAmount: inv.totalAmount,
            dueDate: inv.due_date || inv.form_data?.meta?.dueDate || "",
            milestones: inv.milestones || [],
            has_addendum: inv.has_addendum || inv.form_data?.meta?.hasAddendum || false,
            msa_id: inv.msa_id,
            lineItems: inv.form_data?.lineItems || [],
            applied_payment_terms: inv.applied_payment_terms,
            applied_late_fee_rate: inv.applied_late_fee_rate,
            applied_license_type: inv.applied_license_type,
            clientMsaNote: inv.client_msa_note,
            shareToken: inv.share_token,
            clientName: clientHealth.clientName,
            msaStatus: inv.msa_status,
            sharedToEmail: inv.shared_to_email,
            sharedAt: inv.shared_at,
          });

          if (isSettled) {
            clientHealth.totalCollected += inv.totalAmount;
          } else {
            clientHealth.totalOwed += inv.totalAmount;
          }
        });

        // Calculate health property
        clientsMap.forEach((client) => {
          if (client.invoices.length === 0) {
            client.health = "clear";
            return;
          }

          let hasOverdue = false;
          let allSettled = true;
          let allDraft = true;

          client.invoices.forEach((inv) => {
            const statusLower = inv.status.toLowerCase();
            const isSettled = statusLower === "settled";
            const isDraft = statusLower === "draft";

            if (!isSettled) {
              allSettled = false;
            }
            if (!isDraft) {
              allDraft = false;
            }

            if (statusLower === "sent" || statusLower === "finalized") {
              if (inv.dueDate) {
                const due = new Date(inv.dueDate);
                due.setHours(0, 0, 0, 0);
                if (due < todayVal) {
                  hasOverdue = true;
                }
              }
            }
          });

          if (hasOverdue) {
            client.health = "overdue";
          } else if (allSettled) {
            client.health = "clear";
          } else if (allDraft) {
            client.health = "draft";
          } else {
            client.health = "good";
          }
        });

        setClientsHealth(Array.from(clientsMap.values()));

        // --- Compute Upcoming Deadlines ---
        const upcomingDeadlinesList: UpcomingDeadline[] = invoicesWithMilestones
          .filter((inv: any) => {
            const statusLower = inv.status.toLowerCase();
            const dueDateStr = inv.due_date || inv.form_data?.meta?.dueDate;
            return statusLower !== "settled" && dueDateStr;
          })
          .map((inv: any) => {
            const dueDateStr = inv.due_date || inv.form_data?.meta?.dueDate;
            const due = new Date(dueDateStr);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.round((due.getTime() - todayVal.getTime()) / (1000 * 60 * 60 * 24));

            const firstPendingMilestone = inv.milestones?.find(
              (m: any) => (m.status || "").toLowerCase() !== "settled"
            );

            let displayTitle = null;
            if (firstPendingMilestone) {
              const orderIndex = firstPendingMilestone.order_index ?? inv.milestones.indexOf(firstPendingMilestone);
              const rawTitle = firstPendingMilestone.title || "";
              const hasPrefix = /^(m|milestone)\s*\d+/i.test(rawTitle);
              displayTitle = hasPrefix ? rawTitle : `M${orderIndex + 1}: ${rawTitle}`;
            }

            return {
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              clientName: inv.form_data?.client?.clientName || "Client",
              dueDate: dueDateStr,
              daysUntilDue: diffDays,
              totalAmount: inv.totalAmount || inv.form_data?.totals?.total || 0,
              nextMilestoneTitle: displayTitle,
              nextMilestoneAmount: firstPendingMilestone ? firstPendingMilestone.amount : null,
              rawInvoice: inv,
            };
          })
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);

        setDeadlines(upcomingDeadlinesList);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [router]);

  // Handle automatic selection of invoice from URL parameter
  useEffect(() => {
    if (!loading && clientsHealth.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const invoiceIdParam = params.get("invoiceId");
      if (invoiceIdParam) {
        const invToSelect = clientsHealth.flatMap(c => c.invoices).find(inv => inv.id === invoiceIdParam);
        if (invToSelect) {
          setSelectedInvoice(invToSelect);
          // Remove the query param so it doesn't persist on reloads
          window.history.replaceState(null, '', '/dashboard');
        }
      }
    }
  }, [loading, clientsHealth]);

  // ─── INVOICE COMMAND CENTER: Derive actionable invoices ───
  interface ActionCard {
    type: "msa_revision" | "past_due" | "due_soon" | "msa_pending" | "draft";
    priority: number;
    invoice: ClientHealth["invoices"][0];
    client: ClientHealth;
    daysPast?: number;
    daysUntil?: number;
  }

  const actionableInvoices = useMemo(() => {
    const cards: ActionCard[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    clientsHealth.forEach((client) => {
      client.invoices.forEach((inv) => {
        const status = inv.status.toLowerCase();
        if (status === "settled" || status === "cancelled") return;
        if (dismissedCards.has(inv.id)) return;

        // Priority 1: MSA Revision Requested
        if (inv.msaStatus === "proposed" && inv.clientMsaNote) {
          cards.push({ type: "msa_revision", priority: 1, invoice: inv, client });
          return;
        }

        // Priority 2: Past Due
        if (status === "finalized" && inv.dueDate) {
          const due = new Date(inv.dueDate);
          due.setHours(0, 0, 0, 0);
          const daysPast = Math.ceil((today.getTime() - due.getTime()) / 86400000);
          if (daysPast > 0) {
            cards.push({ type: "past_due", priority: 2, invoice: inv, client, daysPast });
            return;
          }
        }

        // Priority 3: Due Soon (within 3 days)
        if (status === "finalized" && inv.dueDate) {
          const due = new Date(inv.dueDate);
          due.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000);
          if (daysUntil >= 0 && daysUntil <= 3) {
            cards.push({ type: "due_soon", priority: 3, invoice: inv, client, daysUntil });
            return;
          }
        }

        // Priority 4: MSA Pending
        if (inv.msaStatus === "pending" && inv.sharedToEmail) {
          cards.push({ type: "msa_pending", priority: 4, invoice: inv, client });
          return;
        }

        // Priority 5: Draft
        if (status === "draft") {
          cards.push({ type: "draft", priority: 5, invoice: inv, client });
        }
      });
    });

    return cards.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }, [clientsHealth, dismissedCards]);

  // ─── Command Center Action Handlers ───
  const handleNudge = async (inv: ClientHealth["invoices"][0], tone: "initial" | "polite" | "firm" | "final" = "polite") => {
    if (!inv.sharedToEmail || !inv.shareToken) {
      showAlert("Cannot Send", "This invoice hasn't been shared yet. Share it first from the invoice wizard.", "warning");
      return;
    }
    try {
      const res = await fetch("/api/share-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: inv.id, clientEmail: inv.sharedToEmail, tone }),
      });
      if (!res.ok) {
        const err = await res.json();
        showAlert("Nudge Failed", err.error || "Failed to send reminder.", "error");
        return;
      }
      showAlert("Reminder Sent", `${tone === "final" ? "Final notice" : tone === "firm" ? "Firm reminder" : "Polite reminder"} sent to ${inv.sharedToEmail}.`, "success");
    } catch (err) {
      showAlert("Error", "Failed to send reminder. Please try again.", "error");
    }
  };

  const handleCancelProject = async (inv: ClientHealth["invoices"][0]) => {
    const confirmed = await showConfirm(
      "Close Project",
      `Are you sure you want to cancel ${inv.invoiceNumber}? This will mark it as cancelled and remove it from your active pipeline.`,
      "warning",
      "Yes, Close Project",
      "Keep Open",
    );
    if (!confirmed) return;
    try {
      await cancelInvoice(inv.id);
      // Update local state in-place
      setClientsHealth((prev) =>
        prev.map((c) => ({
          ...c,
          invoices: c.invoices.map((i) =>
            i.id === inv.id ? { ...i, status: "cancelled" } : i
          ),
          totalOwed: c.invoices.reduce((sum, i) => {
            if (i.id === inv.id) return sum; // cancelled, skip
            const s = i.status.toLowerCase();
            return s !== "settled" && s !== "cancelled" ? sum + i.totalAmount : sum;
          }, 0),
        }))
      );
      if (selectedInvoice?.id === inv.id) setSelectedInvoice(null);
      showAlert("Project Closed", `${inv.invoiceNumber} has been cancelled.`, "success");
    } catch (err) {
      showAlert("Error", "Failed to cancel project. Please try again.", "error");
    }
  };

  const handleDismissCard = (invId: string) => {
    setDismissedCards((prev) => new Set(prev).add(invId));
  };

  // Smart MSA edit link
  const getMsaEditLink = (inv: ClientHealth["invoices"][0], client: ClientHealth) => {
    if (inv.has_addendum) return `/invoice/edit/${inv.id}`;
    if (!client.clientId.startsWith("pseudo-")) return `/clients/${client.clientId}`;
    return "/profile";
  };

  const getMsaEditLabel = (inv: ClientHealth["invoices"][0], client: ClientHealth) => {
    if (inv.has_addendum) return "Update Addendum →";
    if (!client.clientId.startsWith("pseudo-")) return "Edit Client MSA →";
    return "Edit Global MSA →";
  };

  const getNudgeTone = (daysPast?: number): "polite" | "firm" | "final" => {
    if (!daysPast) return "polite";
    if (daysPast > 30) return "final";
    if (daysPast > 7) return "firm";
    return "polite";
  };

  const getNudgeLabel = (daysPast?: number): string => {
    if (!daysPast) return "Send Polite Reminder";
    if (daysPast > 30) return "⚡ Send Final Notice";
    if (daysPast > 7) return "Send Firm Reminder";
    return "⚡ Send Payment Nudge";
  };

  if (loading) {
    return (
      <div className={appPageShellClass}>
        <AppHeader />
        <main className={cn(appPageContainerClass, "py-12 flex justify-center items-center")}>
          <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            Loading dashboard...
          </div>
        </main>
      </div>
    );
  }

  // 1. Filtered and Sorted clients list based on active filters
  const filteredAndSortedClients = clientsHealth
    .filter((client) => {
      // Hide clients with zero invoices unless explicitly searching for them
      if (client.invoices.length === 0 && !searchTerm) return false;

      // Client search query matching name or city
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = client.clientName?.toLowerCase().includes(query);
        const matchesCity = client.clientCity?.toLowerCase().includes(query);
        if (!matchesName && !matchesCity) return false;
      }

      // Card active filter types
      if (filterType === "all") return true;

      if (filterType === "outstanding") {
        return client.invoices.some(
          (inv) => inv.status.toLowerCase() === "sent" || inv.status.toLowerCase() === "finalized"
        );
      }

      if (filterType === "settled") {
        // MONEY IN (Settled): client has at least one settled invoice or total collected > 0
        return client.invoices.some((inv) => inv.status.toLowerCase() === "settled") || client.totalCollected > 0;
      }

      if (filterType === "overdue") {
        return client.health === "overdue" || client.invoices.some((inv) => {
          const statusLower = inv.status.toLowerCase();
          if ((statusLower === "sent" || statusLower === "finalized") && inv.dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(inv.dueDate);
            due.setHours(0, 0, 0, 0);
            return due < today;
          }
          return false;
        });
      }

      if (filterType === "due_this_week") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        return client.invoices.some((inv) => {
          if (inv.status.toLowerCase() === "settled") return false;
          if (!inv.dueDate) return false;
          const due = new Date(inv.dueDate);
          due.setHours(0, 0, 0, 0);
          return due >= today && due <= nextWeek;
        });
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "receivable") {
        return b.totalOwed - a.totalOwed;
      }
      if (sortBy === "collected") {
        return b.totalCollected - a.totalCollected;
      }
      if (sortBy === "name") {
        return a.clientName.localeCompare(b.clientName);
      }
      if (sortBy === "health") {
        const healthOrder: Record<string, number> = { overdue: 0, good: 1, clear: 2, draft: 3 };
        const orderA = healthOrder[a.health.toLowerCase()] ?? 9;
        const orderB = healthOrder[b.health.toLowerCase()] ?? 9;
        return orderA - orderB;
      }
      return 0;
    });

  return (
    <div className={appPageShellClass}>
      <AppHeader />
      <main
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 31px, #e8e8e2 31px, #e8e8e2 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #e8e8e2 31px, #e8e8e2 32px)",
          backgroundSize: "32px 32px",
        }}
        className={cn(appPageContainerClass, "py-0")}
      >
        <MotionReveal preset="fade-up">
          {/* SECTION 1: GREETING STRIP */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6 border-b-2 border-[#111118]">
            <div>
              <h1 className="text-2xl font-black text-[#111118] m-0 antialiased">
                {getGreeting()}, {userName || "there"}
              </h1>
              <p className="text-[13px] text-[color:var(--text-muted)] mt-1">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <Link
              href="/invoice/new"
              className="inline-flex items-center gap-2 border-2 border-[#111118] bg-[#BEFF00] px-6 py-3 text-[13px] font-bold uppercase text-[#111118] shadow-[var(--brutal-shadow-md)] hover:shadow-[var(--brutal-shadow-lg)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all font-syne"
            >
              + New Invoice
            </Link>
          </div>

          {/* SECTION 2: PINNED METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-6">
            {/* Card 1: Outstanding - hero card */}
            {(() => { const isZero = metrics.outstanding === 0; return (
            <div
              onClick={() => setFilterType(filterType === "outstanding" ? "all" : "outstanding")}
              className={cn(
                "relative border-2 border-[#111118] p-4 transition-all select-none",
                isZero && filterType !== "outstanding"
                  ? "bg-[#F8F8F4] opacity-60 cursor-default"
                  : "bg-[#FFFBE6] shadow-[var(--brutal-shadow-md)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-lg)] cursor-pointer",
                filterType === "outstanding" && "ring-4 ring-[#111118] bg-[#FFF8CC] !opacity-100"
              )}
              style={{ transform: "rotate(-0.5deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FF5C00] border-2 border-[#111118]"></div>
              {filterType === "outstanding" && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FF5C00] rounded-full border border-[#111118] animate-pulse"></div>
              )}
              <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] mt-1 uppercase">
                THEY OWE YOU
              </p>
              <p className={cn("text-[26px] tracking-[-0.02em] mt-0.5 font-syne antialiased", isZero ? "font-semibold text-[color:var(--text-muted)]" : "font-black text-[#111118]")}>
                ₹{formatIndian(metrics.outstanding)}
              </p>
              <p className="text-[12px] text-[color:var(--text-muted)]">
                across {metrics.outstandingCount} {metrics.outstandingCount === 1 ? 'invoice' : 'invoices'}
              </p>
            </div>
            ); })()}

            {/* Card 2: Settled */}
            {(() => { const isZero = metrics.settled === 0; return (
            <div
              onClick={() => setFilterType(filterType === "settled" ? "all" : "settled")}
              className={cn(
                "relative border-2 border-[#111118] p-4 transition-all select-none",
                isZero && filterType !== "settled"
                  ? "bg-[#F8F8F4] opacity-60 cursor-default"
                  : "bg-white shadow-[var(--brutal-shadow-sm)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-md)] cursor-pointer",
                filterType === "settled" && "ring-4 ring-[#111118] bg-[#EBFDF9] !opacity-100"
              )}
              style={{ transform: "rotate(0.6deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00DCB4] border-2 border-[#111118]"></div>
              {filterType === "settled" && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#00DCB4] rounded-full border border-[#111118] animate-pulse"></div>
              )}
              <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] mt-1 uppercase">
                MONEY IN
              </p>
              <p className={cn("text-[22px] mt-0.5 font-syne antialiased", isZero ? "font-semibold text-[color:var(--text-muted)]" : "font-black text-[#111118]")}>
                ₹{formatIndian(metrics.settled)}
              </p>
              <p className={cn("text-[12px] font-semibold", isZero ? "text-[color:var(--text-muted)]" : "text-[#00967D]")}>
                {metrics.settledCount} settled
              </p>
            </div>
            ); })()}

            {/* Card 3: Overdue */}
            {(() => { const isZero = metrics.overdue === 0; return (
            <div
              onClick={() => setFilterType(filterType === "overdue" ? "all" : "overdue")}
              className={cn(
                "relative border-2 border-[#111118] p-4 transition-all select-none",
                isZero && filterType !== "overdue"
                  ? "bg-[#F8F8F4] opacity-60 cursor-default"
                  : "bg-white shadow-[var(--brutal-shadow-sm)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-md)] cursor-pointer",
                filterType === "overdue" && "ring-4 ring-[#111118] bg-[#FFF5F2] !opacity-100"
              )}
              style={{ transform: "rotate(-0.3deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FF5C00] border-2 border-[#111118]"></div>
              {filterType === "overdue" && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FF5C00] rounded-full border border-[#111118] animate-pulse"></div>
              )}
              <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] mt-1 uppercase">
                OVERDUE
              </p>
              <p className={cn("text-[22px] mt-0.5 font-syne antialiased", isZero ? "font-semibold text-[color:var(--text-muted)]" : "font-black text-[#FF5C00]")}>
                ₹{formatIndian(metrics.overdue)}
              </p>
              <p className={cn("text-[12px] font-semibold", isZero ? "text-[color:var(--text-muted)]" : "text-[#FF5C00]")}>
                {metrics.overdueCount} {metrics.overdueCount === 1 ? 'invoice' : 'invoices'}
              </p>
            </div>
            ); })()}

            {/* Card 4: Due this week */}
            {(() => { const isZero = metrics.dueThisWeek === 0; return (
            <div
              onClick={() => setFilterType(filterType === "due_this_week" ? "all" : "due_this_week")}
              className={cn(
                "relative border-2 border-[#111118] p-4 transition-all select-none",
                isZero && filterType !== "due_this_week"
                  ? "bg-[#F8F8F4] opacity-60 cursor-default"
                  : "bg-white shadow-[var(--brutal-shadow-sm)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-md)] cursor-pointer",
                filterType === "due_this_week" && "ring-4 ring-[#111118] bg-[#F7FFD6] !opacity-100"
              )}
              style={{ transform: "rotate(0.4deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FBBF24] border-2 border-[#111118]"></div>
              {filterType === "due_this_week" && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FBBF24] rounded-full border border-[#111118] animate-pulse"></div>
              )}
              <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] mt-1 uppercase">
                DUE THIS WEEK
              </p>
              <p className={cn("text-[22px] mt-0.5 font-syne antialiased", isZero ? "font-semibold text-[color:var(--text-muted)]" : "font-black text-[#111118]")}>
                ₹{formatIndian(metrics.dueThisWeek)}
              </p>
              <p className={cn("text-[12px] font-semibold", isZero ? "text-[color:var(--text-muted)]" : "text-[#FF5C00]")}>
                {metrics.dueThisWeekCount} {metrics.dueThisWeekCount === 1 ? 'invoice' : 'invoices'}
              </p>
            </div>
            ); })()}
          </div>

          {offlineInvoicesCount > 0 && (
            <div
              className="mt-3 mb-6 text-[11px] font-black uppercase tracking-wider"
              style={{ color: "#111118", opacity: 0.6 }}
            >
              {offlineInvoicesCount} {offlineInvoicesCount === 1 ? "invoice" : "invoices"} managed offline
              <a href="/invoices" className="ml-2 underline underline-offset-4">
                View list
              </a>
            </div>
          )}

          {/* SECTION 3: INVOICE COMMAND CENTER */}
          {actionableInvoices.length > 0 ? (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-[18px] h-[18px] bg-[#111118] border-[1.5px] border-[#111118] flex items-center justify-center text-[12px] text-[#BEFF00] font-black">
                  ⚡
                </div>
                <p className="text-[13px] font-bold text-[#111118] tracking-[0.08em] uppercase">
                  COMMAND CENTER
                </p>
                <span className="text-[11px] font-bold text-[color:var(--text-muted)] tracking-wider">
                  {actionableInvoices.length} {actionableInvoices.length === 1 ? "action" : "actions"} needed
                </span>
              </div>

              {actionableInvoices.map((card) => {
                const { type, invoice: inv, client, daysPast, daysUntil } = card;

                // Card style config per type
                const cardConfig = {
                  msa_revision: {
                    borderColor: "#FF5C00",
                    bgColor: "#FFF0EC",
                    badgeBg: "#FF5C00",
                    badgeText: "white",
                    badgeLabel: "⚡ MSA REVISION REQUESTED",
                    shadowColor: "#FF5C00",
                  },
                  past_due: {
                    borderColor: "#EF4444",
                    bgColor: "#FEF2F2",
                    badgeBg: "#EF4444",
                    badgeText: "white",
                    badgeLabel: `🔴 OVERDUE — ${daysPast} DAY${daysPast !== 1 ? "S" : ""} PAST DUE`,
                    shadowColor: "#EF4444",
                  },
                  due_soon: {
                    borderColor: "#F59E0B",
                    bgColor: "#FFFBEB",
                    badgeBg: "#F59E0B",
                    badgeText: "#111118",
                    badgeLabel: `⚠️ DUE IN ${daysUntil} DAY${daysUntil !== 1 ? "S" : ""}`,
                    shadowColor: "#F59E0B",
                  },
                  msa_pending: {
                    borderColor: "#EAB308",
                    bgColor: "#FEFCE8",
                    badgeBg: "#EAB308",
                    badgeText: "#111118",
                    badgeLabel: "⏳ AWAITING CLIENT RESPONSE",
                    shadowColor: "#EAB308",
                  },
                  draft: {
                    borderColor: "#8B5CF6",
                    bgColor: "#FAF5FF",
                    badgeBg: "#8B5CF6",
                    badgeText: "white",
                    badgeLabel: "📝 DRAFT — NOT SENT",
                    shadowColor: "#8B5CF6",
                  },
                };

                const cfg = cardConfig[type];
                const sentAgo = inv.sharedAt ? timeAgo(inv.sharedAt) : null;
                const isPastDueLong = type === "past_due" && (daysPast ?? 0) > 7;

                return (
                  <div
                    key={inv.id}
                    className="border-2 p-0 overflow-hidden transition-all duration-300"
                    style={{
                      borderColor: cfg.borderColor,
                      backgroundColor: cfg.bgColor,
                      boxShadow: `3px 3px 0 ${cfg.shadowColor}`,
                      animation: isPastDueLong ? "pulse 2s ease-in-out infinite" : undefined,
                    }}
                  >
                    {/* Badge strip */}
                    <div
                      className="px-4 py-2 flex items-center justify-between"
                      style={{ backgroundColor: cfg.badgeBg }}
                    >
                      <span
                        className="text-[11px] font-black tracking-[0.1em] uppercase"
                        style={{ color: cfg.badgeText }}
                      >
                        {cfg.badgeLabel}
                      </span>
                      <button
                        onClick={() => handleDismissCard(inv.id)}
                        className="text-[11px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                        style={{ color: cfg.badgeText }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Card body */}
                    <div className="px-4 py-3">
                      {/* Invoice identifier */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-[14px] font-black text-[#111118] font-syne">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[12px] font-semibold text-[color:var(--text-muted)]">
                          · {client.clientName}
                        </span>
                        <span className="text-[14px] font-bold text-[#111118] ml-auto font-syne">
                          ₹{formatIndian(inv.totalAmount)}
                        </span>
                      </div>

                      {/* Context line (type-specific) */}
                      {type === "msa_revision" && inv.clientMsaNote && (
                        <div className="border-l-4 border-[#FF5C00] bg-[#FFFBE6] pl-3 py-2 mb-3 text-[13px] text-[#111118] italic">
                          &ldquo;{inv.clientMsaNote}&rdquo;
                        </div>
                      )}
                      {type === "past_due" && (
                        <p className="text-[13px] text-[#111118] mb-3">
                          Due on {inv.dueDate}. <span className="font-bold text-[#EF4444]">{daysPast} days overdue.</span>
                        </p>
                      )}
                      {type === "due_soon" && (
                        <p className="text-[13px] text-[#111118] mb-3">
                          Due on {inv.dueDate}. Send a polite reminder?
                        </p>
                      )}
                      {type === "msa_pending" && (
                        <p className="text-[13px] text-[#111118] mb-3">
                          Sent to {inv.sharedToEmail}{sentAgo ? ` (${sentAgo})` : ""}. Client hasn&apos;t responded yet.
                        </p>
                      )}
                      {type === "draft" && (
                        <p className="text-[13px] text-[color:var(--text-muted)] mb-3">
                          Invoice created but not yet sent. Ready to finalize?
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* MSA Revision actions */}
                        {type === "msa_revision" && (
                          <>
                            <Link
                              href={getMsaEditLink(inv, client)}
                              className="bg-[#FF5C00] text-white border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                            >
                              {getMsaEditLabel(inv, client)}
                            </Link>
                            {inv.has_addendum && !client.clientId.startsWith("pseudo-") && (
                              <Link
                                href={`/clients/${client.clientId}`}
                                className="bg-white text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                              >
                                Edit Client MSA →
                              </Link>
                            )}
                            <button
                              onClick={() => handleCancelProject(inv)}
                              className="text-[11px] font-bold text-[#FF5C00] uppercase tracking-wider hover:underline cursor-pointer ml-auto"
                            >
                              Close Project
                            </button>
                          </>
                        )}

                        {/* Past Due actions */}
                        {type === "past_due" && (
                          <>
                            <button
                              onClick={() => handleNudge(inv, getNudgeTone(daysPast))}
                              className="bg-[#EF4444] text-white border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                            >
                              {getNudgeLabel(daysPast)}
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="bg-[#00DCB4] text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                            >
                              Mark Settled ✓
                            </button>
                            <button
                              onClick={() => handleCancelProject(inv)}
                              className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider hover:underline cursor-pointer ml-auto"
                            >
                              Close Project
                            </button>
                          </>
                        )}

                        {/* Due Soon actions */}
                        {type === "due_soon" && (
                          <>
                            <button
                              onClick={() => handleNudge(inv, "polite")}
                              className="bg-[#F59E0B] text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                            >
                              Send Polite Reminder 📨
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="bg-white text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] cursor-pointer uppercase font-syne"
                            >
                              Mark Settled ✓
                            </button>
                          </>
                        )}

                        {/* MSA Pending actions */}
                        {type === "msa_pending" && (
                          <>
                            <button
                              onClick={() => handleNudge(inv, "initial")}
                              className="bg-[#EAB308] text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                            >
                              Resend Invoice Email ↻
                            </button>
                            <Link
                              href={`/invoice/${inv.id}/client-preview`}
                              className="bg-white text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] cursor-pointer uppercase font-syne"
                            >
                              Preview as Client →
                            </Link>
                            <button
                              onClick={() => handleCancelProject(inv)}
                              className="text-[11px] font-bold text-[#EAB308] uppercase tracking-wider hover:underline cursor-pointer ml-auto"
                            >
                              Close Project
                            </button>
                          </>
                        )}

                        {/* Draft actions */}
                        {type === "draft" && (
                          <>
                            <Link
                              href={`/invoice/edit/${inv.id}`}
                              className="bg-[#8B5CF6] text-white border-2 border-[#111118] px-4 py-1.5 text-[11px] font-bold shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer uppercase font-syne"
                            >
                              Finalize & Send →
                            </Link>
                            <button
                              onClick={() => handleCancelProject(inv)}
                              className="text-[11px] font-bold text-[#8B5CF6] uppercase tracking-wider hover:underline cursor-pointer ml-auto"
                            >
                              Delete Draft
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="border-2 border-[#00DCB4] bg-[#EBFDF9] p-4 shadow-[3px_3px_0_#00DCB4] mb-6 text-center"
              style={{ transform: "rotate(0.2deg)" }}
            >
              <p className="text-[14px] font-bold text-[#111118] font-syne">
                🎉 All clear! No invoices need your attention right now.
              </p>
              <p className="text-[12px] text-[color:var(--text-muted)] mt-1">
                Your pipeline is healthy. Time for a coffee.
              </p>
            </div>
          )}

          {/* SECTION 4: CLIENT LEDGER */}
          <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] mb-6 overflow-x-auto">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-[#111118] bg-[#F5F5F0] flex flex-wrap justify-between items-center gap-2">
              <p className="text-[13px] font-bold text-[#111118] tracking-[0.08em]">CLIENT LEDGER</p>
              <div className="hidden sm:flex gap-4 flex-wrap items-center">
                <span className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase mr-1">MILESTONE KEY:</span>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#00DCB4] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Settled</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#BEFF00] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Live</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#FF5C00] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Overdue</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#8B5CF6] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Draft</span></div>
              </div>
            </div>

            {/* Search & Sort Controls Strip */}
            <div className="px-4 py-2.5 border-b-2 border-[#111118] bg-[#F8F8F4] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
              {/* Active filter display */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-bold text-[#111118] uppercase tracking-[0.05em]">Filter:</span>
                <span className={cn(
                  "text-[11px] font-bold px-2 py-0.5 border-2 border-[#111118] uppercase",
                  filterType === "all" ? "bg-[#E0F3FF] text-[#111118]" :
                  filterType === "outstanding" ? "bg-[#FFF8CC] text-[#111118]" :
                  filterType === "settled" ? "bg-[#EBFDF9] text-[#00967D]" :
                  filterType === "overdue" ? "bg-[#FFF5F2] text-[#FF5C00]" :
                  "bg-[#F7FFD6] text-[#111118]"
                )}>
                  {filterType === "all" ? "All Clients" : filterType.replace(/_/g, " ")}
                </span>
                {filterType !== "all" && (
                  <button
                    onClick={() => setFilterType("all")}
                    className="text-[11px] font-bold text-[#FF5C00] underline cursor-pointer hover:text-[#111118]"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Search and Sort controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search client or city..."
                    className="px-2.5 py-1 text-[12px] font-semibold text-[#111118] placeholder-[#888] bg-white border-2 border-[#111118] shadow-[1px_1px_0_#111118] focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[2px_2px_0_#111118] transition-all w-full sm:w-44"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 text-[12px] font-bold text-[#888] hover:text-[#111118]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#111118] uppercase shrink-0">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="px-1.5 py-1 text-[12px] font-bold text-[#111118] bg-white border-2 border-[#111118] shadow-[1px_1px_0_#111118] focus:outline-none cursor-pointer"
                  >
                    <option value="receivable">Receivable (High-Low)</option>
                    <option value="collected">Collected (High-Low)</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="health">Health Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Accordion List */}
            <div className="divide-y divide-[#111118]/15">
              {filteredAndSortedClients.map((client) => {
                const isExpanded = expandedClientId === client.clientId || isMobile;
                const allMilestones = client.invoices.flatMap(inv => inv.milestones);
                const sparkTotal = allMilestones.reduce((sum, m) => sum + (m.amount || 0), 0) || 1;

                // Count milestones by status for the summary text
                const statusCounts = allMilestones.reduce((acc, m) => {
                  const s = (m.status || "pending").toLowerCase();
                  if (s === "settled") acc.settled++;
                  else if (s === "overdue") acc.overdue++;
                  else if (["live", "sent", "finalized"].includes(s)) acc.live++;
                  else acc.pending++;
                  return acc;
                }, { settled: 0, live: 0, overdue: 0, pending: 0 });

                return (
                  <div key={client.clientId}>
                    {/* ── Collapsed Row ── */}
                    <div
                      onClick={() => !isMobile && setExpandedClientId(isExpanded ? null : client.clientId)}
                      className={cn(
                        "px-3 py-3 sm:px-4 flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-2 sm:gap-x-3 min-w-0 transition-colors select-none",
                        !isMobile && "cursor-pointer hover:bg-[#F9F9F6]",
                        client.health === "overdue" && "bg-[#FFF5F2] hover:bg-[#FFF2EE]",
                        isExpanded && !isMobile && "bg-[#F5F5F0]"
                      )}
                    >
                      {/* Chevron */}
                      <div className="hidden sm:flex shrink-0">
                        <div className={cn(
                          "w-[18px] h-[18px] border-2 border-[#111118] flex items-center justify-center text-[10px] font-black transition-transform duration-200",
                          isExpanded ? "bg-[#BEFF00] rotate-90" : "bg-white"
                        )}>
                          ▶
                        </div>
                      </div>

                      {/* Client name + city */}
                      <div className="min-w-0 flex-1 basis-0 sm:flex-none sm:basis-auto sm:max-w-[11rem] md:max-w-[13rem] lg:max-w-[15rem] xl:max-w-none">
                        <p className="text-[13px] font-bold text-[#111118] m-0 truncate">{client.clientName}</p>
                        <p className="text-[11px] text-[color:var(--text-muted)] m-0 mt-0.5 truncate">{client.clientCity || ""}</p>
                      </div>

                      {/* Invoice count badge */}
                      <span className="hidden sm:inline-flex items-center justify-center border-2 border-[#111118] bg-[#FFFBE6] px-2 py-0.5 text-[11px] font-black text-[#111118] shadow-[1px_1px_0_#111118] shrink-0">
                        {client.invoices.length} {client.invoices.length === 1 ? "inv" : "invs"}
                      </span>

                      {/* Spark Bar + milestone summary */}
                      <div className="hidden sm:flex flex-col gap-1 min-w-0 shrink lg:shrink-0">
                        {allMilestones.length > 0 ? (
                          <div className="w-[100px] h-[10px] border-2 border-[#111118] flex overflow-hidden shadow-[1px_1px_0_#111118]">
                            {allMilestones.map((m, i) => {
                              const s = (m.status || "").toLowerCase();
                              const bg = s === "settled" ? "#00DCB4"
                                : s === "overdue" ? "#FF5C00"
                                : ["live", "sent", "finalized"].includes(s) ? "#BEFF00"
                                : s === "draft" ? "#8B5CF6"
                                : "#E0E0E0";
                              const widthPct = Math.max((m.amount / sparkTotal) * 100, 3);
                              return (
                                <div
                                  key={i}
                                  style={{ width: `${widthPct}%`, backgroundColor: bg }}
                                  className="h-full border-r border-[#111118]/20 last:border-r-0"
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="w-[100px] h-[10px] border-2 border-[#111118] bg-[#E0E0E0] shadow-[1px_1px_0_#111118]" />
                        )}
                        <p className="text-[9px] text-[color:var(--text-muted)] font-bold m-0 max-lg:truncate max-lg:max-w-[6.5rem] lg:whitespace-nowrap">
                          {statusCounts.settled > 0 && <span className="text-[#00967D]">{statusCounts.settled} settled</span>}
                          {statusCounts.settled > 0 && (statusCounts.live > 0 || statusCounts.overdue > 0 || statusCounts.pending > 0) && " · "}
                          {statusCounts.live > 0 && <span className="text-[#4A7A00]">{statusCounts.live} live</span>}
                          {statusCounts.live > 0 && (statusCounts.overdue > 0 || statusCounts.pending > 0) && " · "}
                          {statusCounts.overdue > 0 && <span className="text-[#FF5C00]">{statusCounts.overdue} overdue</span>}
                          {statusCounts.overdue > 0 && statusCounts.pending > 0 && " · "}
                          {statusCounts.pending > 0 && <span>{statusCounts.pending} pending</span>}
                          {allMilestones.length === 0 && <span>No milestones</span>}
                        </p>
                      </div>

                      {/* Spacer to push amount + health right */}
                      <div className="hidden sm:block flex-1 min-w-2" />

                      {/* Receivable + health */}
                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                        <span className={cn("text-[13px] sm:text-[14px] font-bold font-syne tabular-nums whitespace-nowrap", client.health === "overdue" ? "text-[#FF5C00]" : "text-[#111118]")}>
                          ₹{formatIndian(client.totalOwed)}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 border-[1.5px] border-[#111118] uppercase tracking-wider shadow-[1px_1px_0_#111118]",
                          client.health === "good" && "bg-[#E0FFF7] text-[#006B52]",
                          client.health === "overdue" && "bg-[#FFF0EC] text-[#FF5C00]",
                          client.health === "clear" && "bg-[#EBFDF9] text-[#00967D]",
                          client.health === "draft" && "bg-[#F0EAFF] text-[#5530DB]"
                        )}>
                          {client.health === "good" ? "GOOD" : client.health === "overdue" ? "LATE" : client.health === "clear" ? "CLEAR" : "DRAFT"}
                        </span>
                      </div>
                    </div>

                    {/* ── Expanded Section ── */}
                    {isExpanded && (
                      <div className="border-t-2 border-[#111118]">
                        <div className={cn(
                          "border-l-4 bg-[#FAFAF6] px-4 py-4 sm:px-6",
                          client.health === "good" && "border-l-[#00DCB4]",
                          client.health === "overdue" && "border-l-[#FF5C00]",
                          client.health === "clear" && "border-l-[#00967D]",
                          client.health === "draft" && "border-l-[#8B5CF6]"
                        )}>
                          {/* Invoice cards */}
                          <div className="space-y-3">
                            {client.invoices.map((inv) => (
                              <div key={inv.id} className="border-2 border-[#111118] bg-white shadow-[2px_2px_0_#111118]">
                                {/* Invoice header */}
                                <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 px-3 py-2 border-b-2 border-[#111118] bg-[#F8F8F4]">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                                    className="min-w-0 flex-1 truncate text-left text-[12px] font-black text-[#111118] uppercase tracking-wider hover:text-[#FF5C00] transition-colors cursor-pointer bg-transparent border-none p-0"
                                  >
                                    {inv.invoiceNumber} →
                                  </button>
                                  <span className="shrink-0 text-[13px] font-black text-[#111118] font-syne tabular-nums whitespace-nowrap">₹{formatIndian(inv.totalAmount)}</span>
                                </div>

                                {/* Milestones */}
                                <div className="p-3">
                                  {inv.milestones.length > 0 ? (
                                    <div className="space-y-2">
                                      {inv.milestones.map((m, mi) => {
                                        const s = (m.status || "").toLowerCase();
                                        const isPending = s === "pending" || s === "live" || s === "overdue" || s === "sent";
                                        const bg = s === "settled" ? "#00DCB4"
                                          : s === "overdue" ? "#FF5C00"
                                          : ["live", "sent", "finalized"].includes(s) ? "#BEFF00"
                                          : s === "draft" ? "#8B5CF6"
                                          : "#E0E0E0";

                                        const title = m.title || "(No Milestone Title)";
                                        const items = inv.lineItems || [];
                                        const milestoneItems = items.filter((i: any) => i.milestone_index === m.orderIndex);

                                        // Due days calculation
                                        let dueDateText = "";
                                        let isPastDue = false;
                                        if (s === "settled") {
                                          dueDateText = "Settled";
                                        } else if (isPending) {
                                          const todayVal = new Date();
                                          const dueDateStr = inv.dueDate;
                                          if (dueDateStr) {
                                            const dueDateObj = new Date(dueDateStr);
                                            const diffDays = Math.ceil((dueDateObj.getTime() - todayVal.getTime()) / (1000 * 60 * 60 * 24));
                                            if (diffDays < 0) {
                                              isPastDue = true;
                                              dueDateText = `${Math.abs(diffDays)} days past due`;
                                            } else if (diffDays === 0) {
                                              dueDateText = "Due today";
                                            } else {
                                              dueDateText = `${diffDays} days till due`;
                                            }
                                          } else {
                                            dueDateText = "Pending";
                                          }
                                        } else {
                                          dueDateText = "Upcoming";
                                        }

                                        return (
                                          <div key={mi} className="border border-[#111118]/40 p-2 bg-[#FFFBE6] text-[11px] leading-relaxed">
                                            <div className="flex justify-between items-start border-b border-[#111118]/20 pb-1 mb-1">
                                              <span className="font-extrabold text-[#111118] truncate max-w-[70%]">{title}</span>
                                              <span className="text-[9px] font-black uppercase px-1 border border-[#111118]" style={{ backgroundColor: bg }}>
                                                {s}
                                              </span>
                                            </div>

                                            <div className="space-y-1 mt-1 text-[10px]">
                                              {milestoneItems.length > 0 ? (
                                                milestoneItems.map((li: any, liIdx: number) => (
                                                  <div key={liIdx} className="text-[#111118]/90">
                                                    <span className="font-bold">• {li.description || "No description"}</span>
                                                    <div className="text-[9px] text-[color:var(--text-muted)] pl-2">
                                                      {li.qty} {li.unit || 'unit'} @ ₹{formatIndian(li.rate || 0)} ({li.type || "General"})
                                                    </div>
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="text-[9px] text-[color:var(--text-muted)] italic pl-2">No description or line items provided</div>
                                              )}
                                            </div>

                                            <div className="border-t border-[#111118]/20 pt-1 mt-1 flex justify-between items-center text-[10px] font-semibold">
                                              <span className={isPastDue ? "text-[#FF5C00] font-black" : "text-[color:var(--text-muted)]"}>
                                                {dueDateText}
                                              </span>
                                              <span className="font-bold text-[#111118]">
                                                Total: ₹{formatIndian(m.amount)}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="border border-[#111118]/40 p-2 bg-[#FFFBE6] text-[10px] leading-relaxed">
                                      <div className="font-extrabold border-b border-[#111118]/20 pb-1 mb-1 uppercase">Standard Invoice</div>
                                      <div className="text-[color:var(--text-muted)]">
                                        Amount: ₹{formatIndian(inv.totalAmount)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Summary footer */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-[#111118]/30 pt-3">
                            <div className="flex gap-4 text-[12px]">
                              <span>
                                <span className="font-bold text-[color:var(--text-muted)] uppercase text-[10px] tracking-wider">Receivable: </span>
                                <span className={cn("font-black", client.health === "overdue" ? "text-[#FF5C00]" : "text-[#111118]")}>₹{formatIndian(client.totalOwed)}</span>
                              </span>
                              <span>
                                <span className="font-bold text-[color:var(--text-muted)] uppercase text-[10px] tracking-wider">Collected: </span>
                                <span className={cn("font-black", client.totalCollected > 0 ? "text-[#00967D]" : "text-[color:var(--text-muted)]")}>₹{formatIndian(client.totalCollected)}</span>
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {client.invoices.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedInvoice(client.invoices[0]); }}
                                  className="text-[10px] font-bold text-[color:var(--brand-indigo)] hover:underline uppercase tracking-wider cursor-pointer bg-transparent border-none p-0"
                                >
                                  View Details →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {filteredAndSortedClients.length === 0 && (
              <div className="px-4 py-8 text-center bg-white border-t border-[color:var(--border-subtle)]">
                <p className="text-[13px] text-[color:var(--text-muted)] font-bold uppercase tracking-wider">No matching clients found.</p>
                <button
                  onClick={() => { setSearchTerm(""); setFilterType("all"); }}
                  className="mt-2 text-[12px] font-bold text-[#FF5C00] underline cursor-pointer hover:text-[#111118] select-none"
                >
                  Reset Filters & Search
                </button>
              </div>
            )}

            {/* Footer with double border */}
            <div className="border-t-[3px] border-double border-[#111118] px-4 py-2 bg-[#F8F8F4] flex flex-wrap justify-between items-center gap-2">
              <p className="text-[12px] font-bold text-[color:var(--text-muted)]">
                Showing {filteredAndSortedClients.length} of {clientsHealth.length} {clientsHealth.length === 1 ? 'client' : 'clients'} · {(() => { const c = filteredAndSortedClients.reduce((sum, cl) => sum + cl.invoices.length, 0); return `${c} ${c === 1 ? 'invoice' : 'invoices'}`; })()}
              </p>
              <div className="flex gap-4 flex-wrap">
                <p className="text-[12px]">
                  <span className="text-[color:var(--text-muted)] font-bold">Total receivable:</span>{" "}
                  <span className="font-bold text-[#111118]">
                    ₹{formatIndian(filteredAndSortedClients.reduce((sum, c) => sum + c.totalOwed, 0))}
                  </span>
                </p>
                <p className="text-[12px]">
                  <span className="text-[color:var(--text-muted)] font-bold">Total collected:</span>{" "}
                  <span className="font-bold text-[#00967D]">
                    ₹{formatIndian(filteredAndSortedClients.reduce((sum, c) => sum + c.totalCollected, 0))}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 5: ACTIVITY + QUICK LINKS + DEADLINES */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 pb-8">
            {/* Activity feed */}
            <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)]">
              <div className="px-3 py-2 border-b-2 border-[#111118] bg-[#F8F8F4]">
                <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] uppercase">
                  RECENT ACTIVITY
                </p>
              </div>
              {activity.length > 0 ? (
                activity.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 border-b border-[color:var(--border-subtle)] flex gap-2 items-start"
                  >
                    <div
                      className={cn(
                        "w-[8px] h-[8px] border-[1.5px] border-[#111118] mt-1 shrink-0",
                        (item.action.toLowerCase().includes("created") || item.action.toLowerCase().includes("draft")) && "bg-[#BEFF00]",
                        (item.action.toLowerCase().includes("settled") || item.action.toLowerCase().includes("collected")) && "bg-[#00DCB4]",
                        item.action.toLowerCase().includes("accepted") && "bg-[#00DCB4]",
                        item.action.toLowerCase().includes("viewed") && "bg-[#8B5CF6]",
                        item.action.toLowerCase().includes("sent") && "bg-[#BEFF00]",
                        item.action.toLowerCase().includes("overdue") && "bg-[#FF5C00]",
                        item.action.toLowerCase().includes("negotiating") && "bg-[#FF9F0A]",
                        !item.action.toLowerCase().includes("created") &&
                          !item.action.toLowerCase().includes("draft") &&
                          !item.action.toLowerCase().includes("settled") &&
                          !item.action.toLowerCase().includes("collected") &&
                          !item.action.toLowerCase().includes("accepted") &&
                          !item.action.toLowerCase().includes("viewed") &&
                          !item.action.toLowerCase().includes("sent") &&
                          !item.action.toLowerCase().includes("overdue") &&
                          !item.action.toLowerCase().includes("negotiating") &&
                          "bg-[#EBFDF9]"
                      )}
                    ></div>
                    <div>
                      <p className="text-[13px] text-[#111118] font-medium">
                        {item.entityLabel}
                      </p>
                      <p className="text-[12px] text-[color:var(--text-muted)] truncate max-w-[320px] sm:max-w-none">
                        {item.detail} — {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-[12px] text-[color:var(--text-muted)]">
                  No activity yet. Create and send your first invoice.
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-3">
              {/* Quick links */}
              <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)]">
                <div className="px-3 py-2 border-b-2 border-[#111118] bg-[#F8F8F4]">
                  <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] uppercase">
                    QUICK LINKS
                  </p>
                </div>
                <Link
                  href="/invoice/new"
                  className="flex justify-between items-center px-3 py-2 border-b border-[color:var(--border-subtle)] text-[13px] font-bold text-[#111118] hover:bg-[#FFFBE6] hover:text-[#FF5C00] hover:translate-x-1 transition-all duration-150 select-none"
                >
                  Create invoice <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
                <Link
                  href="/clients"
                  className="flex justify-between items-center px-3 py-2 border-b border-[color:var(--border-subtle)] text-[13px] font-bold text-[#111118] hover:bg-[#FFFBE6] hover:text-[#FF5C00] hover:translate-x-1 transition-all duration-150 select-none"
                >
                  Manage clients <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
                <Link
                  href="/invoices"
                  className="flex justify-between items-center px-3 py-2 border-b border-[color:var(--border-subtle)] text-[13px] font-bold text-[#111118] hover:bg-[#FFFBE6] hover:text-[#FF5C00] hover:translate-x-1 transition-all duration-150 select-none"
                >
                  All invoices <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex justify-between items-center px-3 py-2 text-[13px] font-bold text-[#111118] hover:bg-[#FFFBE6] hover:text-[#FF5C00] hover:translate-x-1 transition-all duration-150 select-none"
                >
                  Profile settings <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
              </div>

              {/* Upcoming deadlines */}
              <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)]">
                <div className="px-3 py-2 border-b-2 border-[#111118] bg-[#F8F8F4]">
                  <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] uppercase">
                    UPCOMING
                  </p>
                </div>
                {deadlines.length > 0 ? (
                  deadlines.filter(d => d.daysUntilDue <= 21).slice(0, 5).map((d) => {
                    const formattedDueDate = new Date(d.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    const hasPassed = d.daysUntilDue <= 0;

                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedInvoice(d.rawInvoice)}
                        className="px-3 py-2.5 border-b border-[color:var(--border-subtle)] flex justify-between items-center cursor-pointer hover:bg-[#F9F9F6] active:bg-[#F0F0EB] transition-colors select-none group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[13px] font-bold text-[#111118] group-hover:text-[#FF5C00] transition-colors truncate">
                              {d.invoiceNumber}
                            </p>
                            {d.nextMilestoneTitle && (
                              <span className="text-[9px] px-1 py-0.5 border border-[#111118] bg-[#F0EAFF] text-[#5530DB] font-extrabold uppercase truncate max-w-[120px]">
                                {d.nextMilestoneTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[color:var(--text-muted)] font-medium mt-0.5 truncate">
                            {d.clientName} · <span className="font-bold text-[#111118]">₹{formatIndian(d.nextMilestoneAmount || d.totalAmount)}</span>
                            <span className="text-[10px] text-[color:var(--text-muted)] font-extrabold ml-1.5 whitespace-nowrap">
                              (Due {formattedDueDate} · {d.daysUntilDue > 0 ? `+${d.daysUntilDue}d` : `${d.daysUntilDue}d`})
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {hasPassed && (
                            <button
                              onClick={async () => {
                                try {
                                  const confirmed = await showConfirm("Settle Invoice", `Mark Invoice ${d.invoiceNumber} as fully paid/settled?`, "warning", "Settle", "Cancel");
                                  if (!confirmed) return;
                                  
                                  const { error } = await markInvoiceSettled(d.id);
                                  if (error) {
                                    showAlert("Settlement Error", `Failed to settle invoice: ${error}`, "error");
                                  } else {
                                    showAlert("Invoice Settled", `Invoice ${d.invoiceNumber} successfully marked as settled!`, "success");
                                    setTimeout(() => window.location.reload(), 1500);
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="bg-[#00DCB4] hover:bg-[#00c4a0] active:translate-y-[1px] text-[#111118] border-2 border-[#111118] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_#111118] cursor-pointer"
                            >
                              Mark Settled
                            </button>
                          )}
                          <span
                            className={cn(
                              "text-[10px] font-black px-2 py-0.5 border-[1.5px] border-[#111118] shadow-[1px_1px_0_#111118] uppercase tracking-wider",
                              d.daysUntilDue <= 0
                                ? "bg-[#FFF0EC] text-[#FF5C00]"
                                : d.daysUntilDue <= 3
                                ? "bg-[#FFFBE6] text-[#D97706]"
                                : d.daysUntilDue <= 7
                                ? "bg-[#F7FFD6] text-[#84CC16]"
                                : "bg-[#F0F0F0] text-[color:var(--text-muted)]"
                            )}
                          >
                            {d.daysUntilDue === 0 ? "TODAY" : d.daysUntilDue === 1 ? "TOMORROW" : d.daysUntilDue === -1 ? "YESTERDAY" : `${d.daysUntilDue} DAYS`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-center text-[12px] text-[color:var(--text-muted)]">
                    {deadlines.length > 0 ? "No urgent deadlines (all 21+ days out)." : "No upcoming deadlines."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </MotionReveal>
      </main>

      {/* SECTION 6: INVOICE SIDE-DRAWER DETAIL INSPECTOR */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 bg-[#111118]/60 backdrop-blur-[2px] z-50 flex justify-end"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="w-full sm:w-[440px] bg-white h-full border-l-4 border-[#111118] flex flex-col justify-between shadow-[-8px_0_0_#111118] relative animate-in slide-in-from-right duration-250 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b-2 border-[#111118] bg-[#F5F5F0] flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase m-0">INVOICE DETAIL</p>
                <h3 className="text-lg font-black text-[#111118] m-0 font-syne uppercase">{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 border-2 border-[#111118] bg-[#FF5C00] text-white flex items-center justify-center font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] shadow-[1px_1px_0_#111118] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-6">
              {/* Client summary */}
              <div>
                <p className="text-[11px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase mb-1">CLIENT</p>
                <p className="text-[15px] font-bold text-[#111118]">{selectedInvoice.clientName}</p>
                <div className="flex gap-3 mt-2">
                  <Link
                    href={`/invoice/edit/${selectedInvoice.id}`}
                    className="text-[11px] font-bold text-[color:var(--brand-indigo)] hover:underline uppercase tracking-wider"
                  >
                    Edit Invoice →
                  </Link>
                  <Link
                    href={`/invoice/${selectedInvoice.id}/client-preview`}
                    className="text-[11px] font-bold text-[color:var(--brand-indigo)] hover:underline uppercase tracking-wider"
                  >
                    Preview as Client →
                  </Link>
                </div>
              </div>

              {/* Quick Metrics Strip */}
              <div className="grid grid-cols-2 gap-2">
                <div className="border-2 border-[#111118] bg-[#FFFBE6] p-3 shadow-[2px_2px_0_#111118]">
                  <p className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase m-0">Total Value</p>
                  <p className="text-[18px] font-black text-[#111118] m-0 font-syne">₹{formatIndian(selectedInvoice.totalAmount)}</p>
                </div>
                <div className="border-2 border-[#111118] bg-[#FFFBE6] p-3 shadow-[2px_2px_0_#111118]">
                  <p className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase m-0">Due Date</p>
                  <p className="text-[13px] font-bold text-[#111118] mt-1 truncate">
                    {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Contract Authority & Terms */}
              <div className="border-2 border-[#111118] bg-[#FAFAD2] p-3 shadow-[2px_2px_0_#111118]">
                <p className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase mb-1">Contract Authority</p>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[14px]">
                    {selectedInvoice.has_addendum ? "⚡" : selectedInvoice.msa_id ? "🤝" : "📜"}
                  </span>
                  <span className="text-[12px] font-bold text-[#111118] uppercase">
                    {selectedInvoice.has_addendum ? "Project Addendum" : selectedInvoice.msa_id ? "Client MSA" : "Global MSA"}
                  </span>
                </div>
                <p className="text-[11px] text-[#111118]/80 leading-relaxed m-0">
                  {selectedInvoice.has_addendum
                    ? "Active project-specific overrides are applied for this invoice's milestones, payment timeline, and late-fee guidelines."
                    : selectedInvoice.msa_id
                    ? `Governed by the client's custom Master Service Agreement. Reference ID: ${selectedInvoice.msa_id}.`
                    : "Governed by the global default agency master terms and standard 30-day payment timelines."
                  }
                </p>

                {/* Displaying active variables like payment terms and late fees */}
                <div className="mt-2.5 pt-2 border-t border-dashed border-[#111118]/30 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="font-bold text-[color:var(--text-muted)]">Payment:</span>{" "}
                    <span className="font-semibold">{selectedInvoice.applied_payment_terms || "Net 30 days"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[color:var(--text-muted)]">Late Fee:</span>{" "}
                    <span className="font-semibold">{selectedInvoice.applied_late_fee_rate ? `${selectedInvoice.applied_late_fee_rate}% per month` : "1.5% per month"}</span>
                  </div>
                </div>
              </div>

              {/* Milestones checklist */}
              <div>
                <p className="text-[11px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase mb-3">Milestone Progress checklist</p>
                {selectedInvoice.milestones.length > 0 ? (
                  <div className="relative border-l-2 border-[#111118] ml-3 pl-4 space-y-4 py-1">
                    {selectedInvoice.milestones.map((m: any, mi: number) => {
                      const s = (m.status || "").toLowerCase();
                      const isSettled = s === "settled";
                      const isOverdue = s === "overdue";
                      const isLive = ["live", "sent", "finalized"].includes(s);

                      return (
                        <div key={mi} className="relative flex items-start gap-3">
                          {/* Interactive checkbox indicator */}
                          <div className="absolute -left-[25px] top-0.5">
                            {isSettled ? (
                              <div className="w-[18px] h-[18px] rounded-sm bg-[#00DCB4] border-2 border-[#111118] flex items-center justify-center text-[10px] text-black font-black shadow-[1px_1px_0_#111118]">
                                ✓
                              </div>
                            ) : isOverdue ? (
                              <div className="w-[18px] h-[18px] rounded-sm bg-[#FF5C00] border-2 border-[#111118] flex items-center justify-center text-[9px] text-white font-bold shadow-[1px_1px_0_#111118] animate-pulse">
                                !
                              </div>
                            ) : isLive ? (
                              <div className="w-[18px] h-[18px] rounded-sm bg-[#BEFF00] border-2 border-[#111118] flex items-center justify-center text-[9px] text-black font-black shadow-[1px_1px_0_#111118]">
                                ▶
                              </div>
                            ) : (
                              <div className="w-[18px] h-[18px] rounded-sm bg-white border-2 border-dashed border-[#888] shadow-none"></div>
                            )}
                          </div>

                          {/* Milestone content */}
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <p className="text-[12px] font-bold text-[#111118] m-0">
                                M{mi + 1}: {m.title}
                              </p>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 border border-[#111118] uppercase",
                                isSettled ? "bg-[#EBFDF9] text-[#00967D]" :
                                isOverdue ? "bg-[#FFF5F2] text-[#FF5C00]" :
                                isLive ? "bg-[#F7FFD6] text-[#111118]" :
                                "bg-white text-[color:var(--text-muted)] border-dashed border-[#888]"
                              )}>
                                {m.status || "Pending"}
                              </span>
                            </div>
                            <p className="text-[11px] text-[color:var(--text-muted)] m-0 mt-0.5 font-bold">₹{formatIndian(m.amount)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 border-2 border-dashed border-[#ccc] bg-[#FAFAD2]/30 text-center rounded">
                    <p className="text-[12px] text-[color:var(--text-muted)] m-0">This invoice has no milestone breakups.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Panel Footer */}
            <div className="p-4 border-t-2 border-[#111118] bg-[#F5F5F0] space-y-2">
              {(() => {
                const activeMilestoneIndex = selectedInvoice.milestones
                  ? selectedInvoice.milestones.findIndex(
                      (m: any) => (m.status || "").toUpperCase() !== "SETTLED"
                    )
                  : -1;

                const dueDateStr = selectedInvoice.due_date || selectedInvoice.form_data?.meta?.dueDate;
                let daysUntilDue = 999;
                if (dueDateStr) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const due = new Date(dueDateStr);
                  due.setHours(0, 0, 0, 0);
                  daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                }
                const showNudge = daysUntilDue <= 3;

                return (
                  <>
                    {/* Milestone settlement button */}
                    {selectedInvoice.milestones && selectedInvoice.milestones.length > 0 && activeMilestoneIndex !== -1 && (
                      <button
                        onClick={() => handleSettleMilestone(activeMilestoneIndex)}
                        className="w-full bg-[#00DCB4] text-[#111118] border-2 border-[#111118] py-2.5 text-[12px] font-black shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all cursor-pointer uppercase font-syne"
                      >
                        {activeMilestoneIndex < selectedInvoice.milestones.length - 1
                          ? `Settle Milestone-${activeMilestoneIndex + 1} & Start M${activeMilestoneIndex + 2}`
                          : "Settle Final Milestone"}
                      </button>
                    )}

                    {/* Conditionally show Nudge */}
                    {showNudge && (
                      <button
                        onClick={() => {
                          showAlert("Nudge Sent", `Payment reminder triggered for ${selectedInvoice.invoiceNumber}.`, "success");
                        }}
                        className="w-full bg-[#FF5C00] text-white border-2 border-[#111118] py-2 text-[12px] font-bold shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all cursor-pointer uppercase font-syne"
                      >
                        ⚡ Send Nudge
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* --- Neo-Brutalist Modal --- */}
      {modal.open && (
        <div
          className="fixed inset-0 bg-[#111118]/60 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4"
          onClick={() => handleModalClose(false)}
        >
          <div
            className="w-full max-w-[420px] bg-white border-4 border-[#111118] shadow-[6px_6px_0_#111118] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header stripe */}
            <div className={cn(
              "px-4 py-2.5 border-b-2 border-[#111118] flex items-center gap-2",
              modal.tone === "success" ? "bg-[#E0FFF7]" :
              modal.tone === "error" ? "bg-[#FFF0EC]" :
              modal.tone === "warning" ? "bg-[#FFFBE6]" :
              "bg-[#F5F5F0]"
            )}>
              <span className={cn(
                "w-5 h-5 border-2 border-[#111118] flex items-center justify-center text-[11px] font-black shrink-0",
                modal.tone === "success" ? "bg-[#00DCB4] text-black" :
                modal.tone === "error" ? "bg-[#FF5C00] text-white" :
                modal.tone === "warning" ? "bg-[#FBBF24] text-black" :
                "bg-[#111118] text-white"
              )}>
                {modal.tone === "success" ? "✓" : modal.tone === "error" ? "!" : modal.tone === "warning" ? "?" : "i"}
              </span>
              <p className="text-[13px] font-black text-[#111118] uppercase tracking-[0.06em] m-0">
                {modal.title}
              </p>
            </div>

            {/* Body */}
            <div className="px-4 py-4">
              <p className="text-[13px] text-[#111118] leading-relaxed m-0">
                {modal.message}
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t-2 border-[#111118] bg-[#F8F8F4] flex justify-end gap-2">
              {modal.type === "confirm" ? (
                <>
                  <button
                    onClick={() => handleModalClose(false)}
                    className="bg-white text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[12px] font-bold cursor-pointer uppercase font-syne shadow-[1px_1px_0_#111118] hover:shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                  >
                    {modal.cancelLabel || "Cancel"}
                  </button>
                  <button
                    onClick={() => handleModalClose(true)}
                    className={cn(
                      "border-2 border-[#111118] px-4 py-1.5 text-[12px] font-bold cursor-pointer uppercase font-syne shadow-[2px_2px_0_#111118] hover:shadow-[3px_3px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all",
                      modal.tone === "error" ? "bg-[#FF5C00] text-white" :
                      modal.tone === "warning" ? "bg-[#FBBF24] text-[#111118]" :
                      "bg-[#00DCB4] text-[#111118]"
                    )}
                  >
                    {modal.confirmLabel || "Confirm"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleModalClose(false)}
                  className={cn(
                    "border-2 border-[#111118] px-5 py-1.5 text-[12px] font-bold cursor-pointer uppercase font-syne shadow-[2px_2px_0_#111118] hover:shadow-[3px_3px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all",
                    modal.tone === "success" ? "bg-[#00DCB4] text-[#111118]" :
                    modal.tone === "error" ? "bg-[#FF5C00] text-white" :
                    "bg-[#111118] text-white"
                  )}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
