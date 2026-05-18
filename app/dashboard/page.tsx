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

        // 6. Get recent activity
        try {
          const { data: activityData } = await supabase
            .from("activity_log")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);

          const mappedActivity = (activityData || []).map((item: any) => ({
            id: item.id,
            action: item.action || "",
            entityLabel: item.entity_label || item.action || "Activity",
            detail: item.detail || "",
            createdAt: item.created_at || new Date().toISOString(),
          }));
          setActivity(mappedActivity);
        } catch (err) {
          console.warn("activity_log fetch failed or table doesn't exist:", err);
          setActivity([]);
        }

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
              className="relative border-2 border-[#111118] bg-[#FFFBE6] p-4 shadow-[var(--brutal-shadow-md)]"
              style={{ transform: "rotate(-0.5deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FF5C00] border-2 border-[#111118]"></div>
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
              className="relative border-2 border-[#111118] bg-white p-4 shadow-[var(--brutal-shadow-sm)]"
              style={{ transform: "rotate(0.6deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00DCB4] border-2 border-[#111118]"></div>
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
              className="relative border-2 border-[#111118] bg-white p-4 shadow-[var(--brutal-shadow-sm)]"
              style={{ transform: "rotate(-0.3deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FF5C00] border-2 border-[#111118]"></div>
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
              className="relative border-2 border-[#111118] bg-white p-4 shadow-[var(--brutal-shadow-sm)]"
              style={{ transform: "rotate(0.4deg)" }}
            >
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#BEFF00] border-2 border-[#111118]"></div>
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
          <div className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] mb-6">
            {/* Header */}
            <div className="px-4 py-2 border-b-2 border-[#111118] bg-[#111118] flex justify-between items-center">
              <p className="text-[12px] font-bold text-[#BEFF00] tracking-[0.12em] uppercase">
                CLIENT LEDGER
              </p>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-[5px] bg-[#00DCB4]"></div>
                  <span className="text-[11px] text-[#888]">Settled</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-[5px] bg-[#BEFF00]"></div>
                  <span className="text-[11px] text-[#888]">Live</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-[5px] bg-[#FF5C00]"></div>
                  <span className="text-[11px] text-[#888]">Overdue</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-[5px] bg-[#8B5CF6]"></div>
                  <span className="text-[11px] text-[#888]">Draft</span>
                </div>
              </div>
            </div>

            {/* Column headers - hidden on mobile */}
            <div className="hidden sm:grid grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_0.6fr] px-3 py-2 border-b border-[color:var(--border-subtle)] bg-[#F8F8F4]">
              <span className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">
                CLIENT
              </span>
              <span className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] uppercase">
                MILESTONES
              </span>
              <span className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] text-right uppercase">
                OWED
              </span>
              <span className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] text-right uppercase">
                COLLECTED
              </span>
              <span className="text-[12px] font-bold text-[color:var(--text-muted)] tracking-[0.1em] text-center uppercase">
                HEALTH
              </span>
            </div>

            {/* Client rows */}
            {clientsHealth.map((client) => (
              <div
                key={client.clientId}
                className={cn(
                  "grid grid-cols-1 sm:grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr_0.6fr] px-3 py-3 border-b border-[color:var(--border-subtle)] items-center gap-2 sm:gap-0",
                  client.health === "overdue" && "bg-[#FFF8F5]"
                )}
              >
                {/* Client name */}
                <div>
                  <p className="text-[13px] sm:text-[14px] font-bold text-[#111118]">
                    {client.clientName}
                  </p>
                  <p className="text-[11px] sm:text-[12px] text-[color:var(--text-muted)] truncate max-w-full">
                    {client.invoices.length <= 3
                      ? client.invoices.map(inv => inv.invoiceNumber).join(" · ")
                      : client.invoices.slice(0, 3).map(inv => inv.invoiceNumber).join(" · ") + ` +${client.invoices.length - 3} more`
                    }
                  </p>
                </div>

                {/* Milestone bars */}
                <div className="flex flex-col gap-1">
                  {client.invoices.map((inv) => (
                    <div key={inv.id} className="flex gap-[2px] items-center">
                      {inv.milestones.length > 0 ? (
                        inv.milestones.map((m, mi) => {
                          const statusLower = m.status.toLowerCase();
                          let barClass = "w-[32px] h-[10px] border border-[#111118]";
                          if (statusLower === "settled") barClass += " bg-[#00DCB4]";
                          else if (statusLower === "overdue") barClass += " bg-[#FF5C00]";
                          else if (statusLower === "live" || statusLower === "sent" || statusLower === "finalized") barClass += " bg-[#BEFF00]";
                          else if (statusLower === "draft") barClass += " bg-[#8B5CF6]";
                          else barClass = "w-[32px] h-[10px] bg-[#E0E0E0] border border-[#ccc]";

                          return (
                            <div
                              key={mi}
                              className={barClass}
                            ></div>
                          );
                        })
                      ) : (
                        <div className="w-[32px] h-[10px] border border-[#111118] bg-[#8B5CF6]"></div>
                      )}
                      <span className="text-[11px] sm:text-[12px] font-semibold text-[color:var(--text-muted)] ml-1">
                        {inv.milestones.length > 0
                          ? inv.milestones
                              .map(
                                (m, mi) =>
                                  `M${mi + 1}${
                                    m.status.toLowerCase() === "settled"
                                      ? "✓"
                                      : m.status.toLowerCase() === "overdue"
                                        ? "⚠"
                                        : "●"
                                  }`
                              )
                              .join(" ")
                          : "Draft"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Owed */}
                <p
                  className={cn(
                    "text-[13px] sm:text-[14px] font-bold text-right",
                    client.health === "overdue" ? "text-[#FF5C00]" : "text-[#111118]"
                  )}
                >
                  ₹{formatIndian(client.totalOwed)}
                </p>

                {/* Collected */}
                <p
                  className={cn(
                    "text-[13px] sm:text-[14px] font-bold text-right",
                    client.totalCollected > 0
                      ? "text-[#00967D]"
                      : "text-[color:var(--text-muted)]"
                  )}
                >
                  ₹{formatIndian(client.totalCollected)}
                </p>

                {/* Health badge */}
                <div className="text-center">
                  <span
                    className={cn(
                      "text-[11px] sm:text-[12px] font-bold px-3 py-1 border-[1.5px] border-[#111118] inline-block",
                      client.health === "good" && "bg-[#E0FFF7] text-[#006B52]",
                      client.health === "overdue" && "bg-[#FF5C00] text-white",
                      client.health === "clear" && "bg-[#E0FFF7] text-[#006B52]",
                      client.health === "draft" && "bg-[#F0EAFF] text-[#5530DB]"
                    )}
                  >
                    {client.health === "good"
                      ? "GOOD"
                      : client.health === "overdue"
                        ? "LATE"
                        : client.health === "clear"
                          ? "CLEAR"
                          : "DRAFT"}
                  </span>
                </div>
              </div>
            ))}

            {/* Empty state if no clients */}
            {clientsHealth.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[color:var(--text-muted)]">
                  No client data yet. Create your first invoice to get started.
                </p>
              </div>
            )}
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
                        item.action.toLowerCase().includes("created") && "bg-[#BEFF00]",
                        item.action.toLowerCase().includes("settled") && "bg-[#00DCB4]",
                        item.action.toLowerCase().includes("accepted") && "bg-[#00DCB4]",
                        item.action.toLowerCase().includes("viewed") && "bg-[#8B5CF6]",
                        item.action.toLowerCase().includes("sent") && "bg-[#BEFF00]",
                        item.action.toLowerCase().includes("overdue") && "bg-[#FF5C00]"
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
                  className="flex justify-between items-center px-3 py-2 border-b border-[color:var(--border-subtle)] text-[13px] font-semibold text-[#111118] hover:bg-[#F5F5F0] transition-colors"
                >
                  Create invoice <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
                <Link
                  href="/clients"
                  className="flex justify-between items-center px-3 py-2 border-b border-[color:var(--border-subtle)] text-[13px] font-semibold text-[#111118] hover:bg-[#F5F5F0] transition-colors"
                >
                  Manage clients <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
                <Link
                  href="/invoices"
                  className="flex justify-between items-center px-3 py-2 border-b border-[color:var(--border-subtle)] text-[13px] font-semibold text-[#111118] hover:bg-[#F5F5F0] transition-colors"
                >
                  All invoices <span className="text-[color:var(--text-muted)]">→</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex justify-between items-center px-3 py-2 text-[13px] font-semibold text-[#111118] hover:bg-[#F5F5F0] transition-colors"
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
    </div>
  );
}
