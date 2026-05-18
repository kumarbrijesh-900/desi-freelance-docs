"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { supabase, getClientSessionUser } from "@/lib/supabase/client";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { MotionReveal } from "@/components/ui/motion-primitives";

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
  const router = useRouter();

  // Client-side UX Interactive States
  const [filterType, setFilterType] = useState<"all" | "outstanding" | "settled" | "overdue" | "due_this_week">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"receivable" | "collected" | "name" | "health">("receivable");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

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

  function formatIndian(num: number): string {
    if (!num) return "0";
    return num.toLocaleString("en-IN");
  }

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

        // 4. Get all invoice_milestones for the user's invoices
        const invoiceIds = invoices.map((inv) => inv.id);
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
        const invoicesWithMilestones = invoices.map((inv: any) => {
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
            if (statusLower !== "settled" && dueDateStr) {
              const due = new Date(dueDateStr);
              due.setHours(0, 0, 0, 0);
              return due >= todayVal;
            }
            return false;
          })
          .map((inv: any) => {
            const dueDateStr = inv.due_date || inv.form_data?.meta?.dueDate;
            const due = new Date(dueDateStr);
            due.setHours(0, 0, 0, 0);
            const diffTime = due.getTime() - todayVal.getTime();
            const daysUntilDue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            return {
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              clientName: inv.form_data?.client?.clientName || "Client",
              dueDate: dueDateStr,
              daysUntilDue,
              totalAmount: inv.totalAmount,
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

  // Find the first overdue invoice
  const firstOverdueInvoice = clientsHealth
    .flatMap((c) => c.invoices)
    .find((inv) => {
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

  const firstOverdueClient = clientsHealth.find((c) =>
    c.invoices.some((inv) => inv.id === firstOverdueInvoice?.id)
  )?.clientName || "Client";

  // 1. Filtered and Sorted clients list based on active filters
  const filteredAndSortedClients = clientsHealth
    .filter((client) => {
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
              <h1 className="text-2xl font-black text-[#111118] m-0 font-syne antialiased">
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
            <div
              onClick={() => setFilterType(filterType === "outstanding" ? "all" : "outstanding")}
              className={cn(
                "relative border-2 border-[#111118] bg-[#FFFBE6] p-4 shadow-[var(--brutal-shadow-md)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-lg)] transition-all cursor-pointer select-none",
                filterType === "outstanding" && "ring-4 ring-[#111118] bg-[#FFF8CC]"
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
              <p className="text-[26px] font-black text-[#111118] tracking-[-0.02em] mt-0.5 font-syne antialiased">
                ₹{formatIndian(metrics.outstanding)}
              </p>
              <p className="text-[12px] text-[color:var(--text-muted)]">
                across {metrics.outstandingCount} invoices
              </p>
            </div>

            {/* Card 2: Settled */}
            <div
              onClick={() => setFilterType(filterType === "settled" ? "all" : "settled")}
              className={cn(
                "relative border-2 border-[#111118] bg-white p-4 shadow-[var(--brutal-shadow-sm)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-md)] transition-all cursor-pointer select-none",
                filterType === "settled" && "ring-4 ring-[#111118] bg-[#EBFDF9]"
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
              <p className="text-[22px] font-black text-[#111118] mt-0.5 font-syne antialiased">
                ₹{formatIndian(metrics.settled)}
              </p>
              <p className="text-[12px] text-[#00967D] font-semibold">
                {metrics.settledCount} settled
              </p>
            </div>

            {/* Card 3: Overdue */}
            <div
              onClick={() => setFilterType(filterType === "overdue" ? "all" : "overdue")}
              className={cn(
                "relative border-2 border-[#111118] bg-white p-4 shadow-[var(--brutal-shadow-sm)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-md)] transition-all cursor-pointer select-none",
                filterType === "overdue" && "ring-4 ring-[#111118] bg-[#FFF5F2]"
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
              <p className="text-[22px] font-black text-[#FF5C00] mt-0.5 font-syne antialiased">
                ₹{formatIndian(metrics.overdue)}
              </p>
              <p className="text-[12px] text-[#FF5C00] font-semibold">
                {metrics.overdueCount} invoices
              </p>
            </div>

            {/* Card 4: Due this week */}
            <div
              onClick={() => setFilterType(filterType === "due_this_week" ? "all" : "due_this_week")}
              className={cn(
                "relative border-2 border-[#111118] bg-white p-4 shadow-[var(--brutal-shadow-sm)] hover:-translate-y-1 hover:translate-x-0.5 hover:shadow-[var(--brutal-shadow-md)] transition-all cursor-pointer select-none",
                filterType === "due_this_week" && "ring-4 ring-[#111118] bg-[#F7FFD6]"
              )}
              style={{ transform: "rotate(0.4deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#BEFF00] border-2 border-[#111118]"></div>
              {filterType === "due_this_week" && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#BEFF00] rounded-full border border-[#111118] animate-pulse"></div>
              )}
              <p className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.12em] mt-1 uppercase">
                DUE THIS WEEK
              </p>
              <p className="text-[22px] font-black text-[#111118] mt-0.5 font-syne antialiased">
                ₹{formatIndian(metrics.dueThisWeek)}
              </p>
              <p className="text-[12px] text-[#FF5C00] font-semibold">
                {metrics.dueThisWeekCount} invoices
              </p>
            </div>
          </div>

          {/* SECTION 3: ACTION NEEDED (conditional) */}
          {metrics.overdueCount > 0 && firstOverdueInvoice && (
            <div
              className="border-2 border-[#FF5C00] bg-[#FFF0EC] p-4 shadow-[3px_3px_0_#FF5C00] mb-6"
              style={{ transform: "rotate(0.2deg)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-[18px] h-[18px] bg-[#FF5C00] border-[1.5px] border-[#111118] flex items-center justify-center text-[12px] text-white font-black">
                  !
                </div>
                <p className="text-[12px] font-bold text-[#CC4A00] tracking-[0.08em] uppercase">
                  ACTION NEEDED
                </p>
              </div>
              <p className="text-[14px] text-[#111118] font-medium">
                {firstOverdueInvoice.invoiceNumber} for {firstOverdueClient} is
                overdue. Send a payment reminder?
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    alert(`Reminder nudge triggered for ${firstOverdueInvoice.invoiceNumber}`);
                    console.log(`Nudge sent for invoice ${firstOverdueInvoice.id}`);
                  }}
                  className="bg-[#FF5C00] text-white border-2 border-[#111118] px-4 py-1.5 text-[12px] font-bold shadow-[var(--brutal-shadow-sm)] cursor-pointer uppercase font-syne"
                >
                  Send Nudge
                </button>
                <button className="bg-white text-[#111118] border-2 border-[#111118] px-4 py-1.5 text-[12px] font-bold cursor-pointer uppercase font-syne">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: CLIENT LEDGER */}
          <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] mb-6 overflow-x-auto">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-[#111118] bg-[#F5F5F0] flex flex-wrap justify-between items-center gap-2">
              <p className="text-[13px] font-bold text-[#111118] tracking-[0.08em]">CLIENT LEDGER</p>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#00DCB4] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Settled</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#BEFF00] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Live</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#FF5C00] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Overdue</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#8B5CF6] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Draft</span></div>
              </div>
            </div>

            {/* Search & Sort Controls Strip */}
            <div className="px-4 py-2.5 border-b-2 border-[#111118] bg-[#F8F8F4] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
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

            {/* Table */}
            <table className="w-full min-w-[700px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b-2 border-[#111118] bg-[#F8F8F4]">
                  <th className="text-left px-4 py-2 text-[11px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">Client</th>
                  <th className="text-left px-4 py-2 text-[11px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">Invoices</th>
                  <th className="text-left px-4 py-2 text-[11px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">Stages</th>
                  <th className="text-right px-4 py-2 text-[11px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">Receivable</th>
                  <th className="text-right px-4 py-2 text-[11px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">Collected</th>
                  <th className="text-center px-4 py-2 text-[11px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">Health</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedClients.map((client) => (
                  <tr
                    key={client.clientId}
                    className={cn(
                      "border-b border-[color:var(--border-subtle)] hover:bg-[#F9F9F6] transition-colors",
                      client.health === "overdue" && "bg-[#FFF5F2] hover:bg-[#FFF2EE]"
                    )}
                  >
                    {/* Client name + city */}
                    <td className="px-4 py-3 align-top">
                      <p className="text-[13px] font-bold text-[#111118] m-0">{client.clientName}</p>
                      <p className="text-[12px] text-[color:var(--text-muted)] m-0">{client.clientCity || ""}</p>
                    </td>

                    {/* Invoice numbers stacked */}
                    <td className="px-4 py-3 align-top">
                      {client.invoices.map((inv) => (
                        <p
                          key={inv.id}
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-[12px] font-bold text-[#111118] m-0 leading-relaxed cursor-pointer hover:underline hover:text-[#FF5C00] transition-colors select-none"
                        >
                          {inv.invoiceNumber}
                        </p>
                      ))}
                    </td>

                    {/* Milestone stage bars - one row per invoice */}
                    <td className="px-4 py-3 align-top">
                      {client.invoices.map((inv) => (
                        <div key={inv.id} className="flex gap-[3px] items-center mb-1 last:mb-0">
                          {inv.milestones.length > 0 ? (
                            <>
                              {inv.milestones.map((m, mi) => {
                                const s = (m.status || "").toLowerCase();
                                const bg = s === "settled" ? "#00DCB4"
                                  : s === "overdue" ? "#FF5C00"
                                  : ["live", "sent", "finalized"].includes(s) ? "#BEFF00"
                                  : s === "draft" ? "#8B5CF6"
                                  : "#E0E0E0";
                                
                                const mainServiceType = inv.lineItems?.[0]?.description || "General Services";
                                let authIcon = "📜";
                                let authLabel = "Global MSA";
                                let authDesc = "Using default agency-wide terms.";
                                if (inv.has_addendum) {
                                  authIcon = "⚡";
                                  authLabel = "Project Addendum";
                                  authDesc = "Active project overrides.";
                                } else if (inv.msa_id) {
                                  authIcon = "🤝";
                                  authLabel = "Client MSA";
                                  authDesc = "Linked to Client Agreement.";
                                }

                                return (
                                  <div
                                    key={mi}
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="relative group cursor-pointer"
                                  >
                                    <div
                                      className="w-[28px] h-[8px] border border-[#111118] hover:scale-110 hover:scale-y-125 transition-transform"
                                      style={{ background: bg }}
                                    ></div>

                                    {/* Tooltip */}
                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 w-64 bg-[#FFFBE6] border-2 border-[#111118] p-3 text-[12px] shadow-[3px_3px_0_#111118] text-left text-[#111118] pointer-events-none select-none">
                                      <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#FFFBE6] border-b-2 border-r-2 border-[#111118] rotate-45"></div>
                                      <p className="font-bold text-[12px] border-b border-[#111118] pb-1 uppercase tracking-wider flex justify-between items-center">
                                        <span>M{mi + 1}: {m.title}</span>
                                        <span className="text-[9px] px-1 py-0.5 border border-[#111118] bg-[#BEFF00] font-black">
                                          {s}
                                        </span>
                                      </p>
                                      <div className="mt-2 space-y-1">
                                        <p className="text-[11px]"><span className="font-bold text-[color:var(--text-muted)] uppercase">Amount:</span> <span className="font-bold">₹{formatIndian(m.amount)}</span></p>
                                        <p className="text-[11px] truncate"><span className="font-bold text-[color:var(--text-muted)] uppercase">Item Type:</span> <span className="font-semibold">{mainServiceType}</span></p>
                                        <div className="mt-1.5 pt-1.5 border-t border-dashed border-[#111118]/40">
                                          <p className="text-[11px] font-bold flex items-center gap-1">
                                            <span>{authIcon}</span>
                                            <span>{authLabel}</span>
                                          </p>
                                          <p className="text-[10px] text-[color:var(--text-muted)] leading-tight mt-0.5">{authDesc}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <span className="text-[11px] text-[color:var(--text-muted)] ml-1.5 whitespace-nowrap select-none">
                                {inv.milestones.map((m, mi) => {
                                  const s = (m.status || "").toLowerCase();
                                  const icon = s === "settled" ? "✓" : s === "overdue" ? "⚠" : "●";
                                  return `M${mi + 1}${icon}`;
                                }).join(" ")}
                              </span>
                            </>
                          ) : (
                            <>
                              {(() => {
                                const mainServiceType = inv.lineItems?.[0]?.description || "General Services";
                                let authIcon = "📜";
                                let authLabel = "Global MSA";
                                let authDesc = "Using default agency-wide terms.";
                                if (inv.has_addendum) {
                                  authIcon = "⚡";
                                  authLabel = "Project Addendum";
                                  authDesc = "Active project overrides.";
                                } else if (inv.msa_id) {
                                  authIcon = "🤝";
                                  authLabel = "Client MSA";
                                  authDesc = "Linked to Client Agreement.";
                                }
                                const isDraft = (inv.status || "").toLowerCase() === "draft";

                                return (
                                  <div
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="relative group cursor-pointer"
                                  >
                                    <div
                                      className="w-[28px] h-[8px] border border-[#111118] hover:scale-110 hover:scale-y-125 transition-transform"
                                      style={{ background: isDraft ? "#8B5CF6" : "#E0E0E0" }}
                                    ></div>

                                    {/* Tooltip */}
                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 w-64 bg-[#FFFBE6] border-2 border-[#111118] p-3 text-[12px] shadow-[3px_3px_0_#111118] text-left text-[#111118] pointer-events-none select-none">
                                      <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#FFFBE6] border-b-2 border-r-2 border-[#111118] rotate-45"></div>
                                      <p className="font-bold text-[12px] border-b border-[#111118] pb-1 uppercase tracking-wider flex justify-between items-center">
                                        <span>{inv.invoiceNumber}</span>
                                        <span className="text-[9px] px-1 py-0.5 border border-[#111118] bg-[#BEFF00] font-black">
                                          {inv.status}
                                        </span>
                                      </p>
                                      <div className="mt-2 space-y-1">
                                        <p className="text-[11px]"><span className="font-bold text-[color:var(--text-muted)] uppercase">Amount:</span> <span className="font-bold">₹{formatIndian(inv.totalAmount)}</span></p>
                                        <p className="text-[11px] truncate"><span className="font-bold text-[color:var(--text-muted)] uppercase">Item Type:</span> <span className="font-semibold">{mainServiceType}</span></p>
                                        <div className="mt-1.5 pt-1.5 border-t border-dashed border-[#111118]/40">
                                          <p className="text-[11px] font-bold flex items-center gap-1">
                                            <span>{authIcon}</span>
                                            <span>{authLabel}</span>
                                          </p>
                                          <p className="text-[10px] text-[color:var(--text-muted)] leading-tight mt-0.5">{authDesc}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                              <span className="text-[11px] text-[color:var(--text-muted)] ml-1.5 whitespace-nowrap select-none">{(inv.status || "").toLowerCase() === "draft" ? "Draft" : "Pending"}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </td>

                    {/* Receivable */}
                    <td className={cn("px-4 py-3 text-right align-top text-[14px] font-bold", client.health === "overdue" ? "text-[#FF5C00]" : "text-[#111118]")}>
                      ₹{formatIndian(client.totalOwed)}
                    </td>

                    {/* Collected */}
                    <td className={cn("px-4 py-3 text-right align-top text-[14px] font-bold", client.totalCollected > 0 ? "text-[#00967D]" : "text-[color:var(--text-muted)]")}>
                      ₹{formatIndian(client.totalCollected)}
                    </td>

                    {/* Health */}
                    <td className="px-4 py-3 text-center align-top">
                      <span className={cn(
                        "text-[11px] font-bold px-3 py-1 border-[1.5px] border-[#111118] inline-block",
                        client.health === "good" && "bg-[#E0FFF7] text-[#006B52]",
                        client.health === "overdue" && "bg-[#FF5C00] text-white",
                        client.health === "clear" && "bg-[#E0FFF7] text-[#006B52]",
                        client.health === "draft" && "bg-[#F0EAFF] text-[#5530DB]"
                      )}>
                        {client.health === "good" ? "GOOD" : client.health === "overdue" ? "LATE" : client.health === "clear" ? "CLEAR" : "DRAFT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
                Showing {filteredAndSortedClients.length} of {clientsHealth.length} clients · {filteredAndSortedClients.reduce((sum, c) => sum + c.invoices.length, 0)} invoices
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
                      <p className="text-[12px] text-[color:var(--text-muted)]">
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
                  deadlines.slice(0, 5).map((d) => (
                    <div
                      key={d.id}
                      className="px-3 py-2 border-b border-[color:var(--border-subtle)] flex justify-between items-center"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-[#111118]">
                          {d.invoiceNumber}
                        </p>
                        <p className="text-[12px] text-[color:var(--text-muted)]">
                          {d.clientName} · ₹{formatIndian(d.totalAmount)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-bold px-[6px] py-[1px] border-[1.5px] border-[#111118]",
                          d.daysUntilDue <= 3
                            ? "bg-[#FFF0EC] text-[#FF5C00]"
                            : "bg-[#F8F8F4] text-[color:var(--text-muted)]"
                        )}
                      >
                        {d.daysUntilDue} DAYS
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-[12px] text-[color:var(--text-muted)]">
                    No upcoming deadlines.
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
              {/* Quick Copy Link Button */}
              <button
                onClick={() => {
                  if (selectedInvoice.shareToken) {
                    const link = `${window.location.origin}/share/${selectedInvoice.shareToken}`;
                    navigator.clipboard.writeText(link);
                    alert("Share link copied to clipboard!");
                  } else {
                    alert("This invoice draft has no share token generated yet.");
                  }
                }}
                className="w-full bg-[#BEFF00] text-[#111118] border-2 border-[#111118] py-2.5 text-[12px] font-bold shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all cursor-pointer uppercase font-syne"
              >
                📋 Copy Payment Link
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`/share/${selectedInvoice.shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center bg-white text-[#111118] border-2 border-[#111118] py-2 text-[12px] font-bold shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all uppercase font-syne"
                >
                  👁 View Live
                </a>

                <button
                  onClick={() => {
                    alert(`Reminder nudge triggered for ${selectedInvoice.invoiceNumber}`);
                  }}
                  className="bg-[#FF5C00] text-white border-2 border-[#111118] py-2 text-[12px] font-bold shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all cursor-pointer uppercase font-syne"
                >
                  ⚡ Send Nudge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
