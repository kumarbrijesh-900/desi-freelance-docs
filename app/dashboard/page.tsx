"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { supabase, getClientSessionUser } from "@/lib/supabase/client";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { cancelInvoice } from "@/lib/supabase/invoices";
import {
  announceInvoiceDataChanged,
  INVOICE_DATA_CHANGED_EVENT,
  INVOICE_DATA_CHANGED_STORAGE_KEY,
} from "@/lib/invoice-events";
import { trackedOnly, offlineOnly } from "@/lib/invoice-channel-helpers";
import { getInvoiceLockState, type LockState } from "@/lib/invoice-lock-state";
import {
  CalendarClock,
  CheckCircle2,
  Landmark,
  ReceiptText,
  Send,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import ProjectTimeline from "@/components/project/ProjectTimeline";

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
    project_id?: string | null;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    dueDate: string;
    milestones: Array<{
      id?: string;
      title: string;
      status: string;
      amount: number;
      orderIndex: number;
      order_index?: number;
    }>;
    has_addendum?: boolean;
    msa_id?: string | null;
    lineItems?: Array<any>;
    /** Canonical milestone line items from form_data.milestones — used for descriptions */
    formDataMilestones?: Array<{
      id: string;
      title: string;
      status: string;
      lineItems: Array<{
        id: string;
        type: string;
        description: string;
        qty: number | string;
        rate: number | string;
        rateUnit: string;
      }>;
    }>;
    applied_payment_terms?: string | null;
    applied_late_fee_rate?: number | null;
    applied_late_fee_unit?: string | null;
    applied_license_type?: string | null;
    clientMsaNote?: string | null;
    shareToken?: string | null;
    clientName?: string;
    form_data?: any;
    due_date?: string | null;
    msaStatus?: string | null;
    sharedToEmail?: string | null;
    sharedAt?: string | null;
    projectMsaAcceptedAt?: string | null;
    projectStatus?: string | null;
  }>;
  totalOwed: number;
  totalCollected: number;
  health: "good" | "overdue" | "clear" | "draft";
}

interface ProjectHealth {
  projectId: string;
  projectName: string;
  projectDescription: string;
  clientId: string | null;
  clientName: string;
  clientCity: string;
  invoices: Array<{
    id: string;
    project_id?: string | null;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    dueDate: string;
    milestones: Array<{
      id?: string;
      title: string;
      status: string;
      amount: number;
      orderIndex: number;
      order_index?: number;
    }>;
    has_addendum?: boolean;
    msa_id?: string | null;
    lineItems?: Array<any>;
    /** Canonical milestone line items from form_data.milestones — used for descriptions */
    formDataMilestones?: Array<{
      id: string;
      title: string;
      status: string;
      lineItems: Array<{
        id: string;
        type: string;
        description: string;
        qty: number | string;
        rate: number | string;
        rateUnit: string;
      }>;
    }>;
    applied_payment_terms?: string | null;
    applied_late_fee_rate?: number | null;
    applied_late_fee_unit?: string | null;
    applied_license_type?: string | null;
    clientMsaNote?: string | null;
    shareToken?: string | null;
    clientName?: string;
    form_data?: any;
    due_date?: string | null;
    msaStatus?: string | null;
    sharedToEmail?: string | null;
    sharedAt?: string | null;
    projectMsaAcceptedAt?: string | null;
    projectStatus?: string | null;
  }>;
  totalOwed: number;
  totalCollected: number;
  health: "good" | "overdue" | "clear" | "draft";
}

type DashboardInvoice = ClientHealth["invoices"][0];

const CANONICAL_BADGE_STYLES: Record<LockState, { label: string; className: string; style?: CSSProperties }> = {
  editable: {
    label: "DRAFT",
    className: "border-[#D4D2CC] bg-transparent text-[#6B6660]",
  },
  "client-proposed": {
    label: "REVISION REQUESTED",
    className: "border-[#111118] bg-[#FFB35F] text-[#111118]",
  },
  "awaiting-client": {
    label: "AWAITING CLIENT",
    className: "border-[#111118] bg-[#FFE08A] text-[#111118]",
  },
  "msa-accepted": {
    label: "LOCKED",
    className: "border-[#111118] bg-[#FBE5E5] text-[#111118]",
  },
  "invoice-settled": {
    label: "SETTLED",
    className: "border-[#111118] bg-[#00DCB4] text-[#111118]",
  },
  "invoice-partial": {
    label: "PARTIALLY SETTLED",
    className: "border-[#111118] text-[#111118]",
    style: { background: "linear-gradient(90deg, #00DCB4 0 50%, #FFB35F 50% 100%)" },
  },
  "invoice-cancelled": {
    label: "CANCELLED",
    className: "border-[#111118] bg-[#D4D2CC] text-[#111118]",
  },
};

function getDashboardInvoiceState(invoice: DashboardInvoice): LockState {
  return getInvoiceLockState({
    status: invoice.status,
    msaStatus: invoice.msaStatus,
    sharedToEmail: invoice.sharedToEmail,
    clientMsaNote: invoice.clientMsaNote,
    projectMsaAcceptedAt: invoice.projectMsaAcceptedAt,
    projectStatus: invoice.projectStatus,
  }).state;
}

function CanonicalInvoiceStateBadge({ invoice }: { invoice: DashboardInvoice }) {
  const badge = CANONICAL_BADGE_STYLES[getDashboardInvoiceState(invoice)];
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]",
        badge.className,
      )}
      style={badge.style}
    >
      {badge.label}
    </span>
  );
}

interface ProjectActionState {
  label: string;
  detail: string;
  actionLabel: string;
  tone: "danger" | "warning" | "active" | "success" | "neutral" | "draft";
  priority: number;
  invoice?: DashboardInvoice;
  actionHref?: string;
  nudgeTone?: "initial" | "polite" | "firm" | "final";
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

function parsePaymentTermsDays(termsStr?: string | number | null): number {
  if (!termsStr) return 15;
  if (typeof termsStr === "number") return Number.isFinite(termsStr) ? termsStr : 15;
  const lower = termsStr.toLowerCase();
  if (lower.includes("30")) return 30;
  if (lower.includes("45")) return 45;
  if (lower.includes("60")) return 60;
  if (lower.includes("7")) return 7;
  if (lower.includes("10")) return 10;
  return 15;
}

function isReceivableStatus(status: string) {
  return ["finalized", "sent", "partial", "saved"].includes(status.toLowerCase());
}

function getDaysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

type MilestoneTriggerMode = "immediate" | "scheduled" | "cancelled";

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultScheduleDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toDateInputValue(date);
}

function dateInputToIso(dateValue: string): string {
  return new Date(`${dateValue}T09:00:00`).toISOString();
}

function getProjectProgress(project: ProjectHealth): number {
  const total = project.totalCollected + project.totalOwed;
  if (total <= 0) {
    const hasOnlyDrafts = project.invoices.length > 0 && project.invoices.every(inv => inv.status.toLowerCase() === "draft");
    if (hasOnlyDrafts) return 0;
    return project.invoices.length > 0 ? 100 : 0;
  }
  return Math.min(100, Math.max(0, Math.round((project.totalCollected / total) * 100)));
}

function getProjectOpenInvoiceCount(project: ProjectHealth): number {
  return project.invoices.filter((inv) => {
    const status = inv.status.toLowerCase();
    return status !== "settled" && status !== "cancelled";
  }).length;
}

function getProjectActionState(project: ProjectHealth): ProjectActionState {
  const openInvoices = project.invoices.filter((inv) => {
    const status = inv.status.toLowerCase();
    return status !== "settled" && status !== "cancelled";
  });

  const revisionInvoice = openInvoices.find(
    (inv) => inv.msaStatus?.toLowerCase() === "proposed" && inv.clientMsaNote
  );
  if (revisionInvoice) {
    return {
      label: "Revision requested",
      detail: `${revisionInvoice.invoiceNumber} has client edits waiting.`,
      actionLabel: "Update addendum",
      actionHref: `/invoice/new?id=${revisionInvoice.id}&restore=1&step=payment`,
      tone: "danger",
      priority: 1,
      invoice: revisionInvoice,
    };
  }

  const overdueInvoice = openInvoices.find((inv) => {
    const status = inv.status.toLowerCase();
    const daysUntil = getDaysUntil(inv.dueDate);
    return isReceivableStatus(status) && daysUntil !== null && daysUntil < 0;
  });
  if (overdueInvoice) {
    const daysPast = Math.abs(getDaysUntil(overdueInvoice.dueDate) ?? 0);
    return {
      label: "Payment overdue",
      detail: `${overdueInvoice.invoiceNumber} is ${daysPast} ${daysPast === 1 ? "day" : "days"} late.`,
      actionLabel: daysPast > 30 ? "Send final notice" : daysPast > 7 ? "Send firm reminder" : "Send payment nudge",
      nudgeTone: daysPast > 30 ? "final" : daysPast > 7 ? "firm" : "polite",
      tone: "danger",
      priority: 2,
      invoice: overdueInvoice,
    };
  }

  const dueSoonInvoice = openInvoices.find((inv) => {
    const status = inv.status.toLowerCase();
    const daysUntil = getDaysUntil(inv.dueDate);
    return isReceivableStatus(status) && daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;
  });
  if (dueSoonInvoice) {
    const daysUntil = getDaysUntil(dueSoonInvoice.dueDate) ?? 0;
    return {
      label: daysUntil === 0 ? "Due today" : "Due soon",
      detail: `${dueSoonInvoice.invoiceNumber} is due ${daysUntil === 0 ? "today" : `in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`}.`,
      actionLabel: "Send reminder",
      nudgeTone: "polite",
      tone: "warning",
      priority: 3,
      invoice: dueSoonInvoice,
    };
  }

  const pendingMsaInvoice = openInvoices.find(
    (inv) => inv.msaStatus?.toLowerCase() === "pending" && inv.sharedToEmail
  );
  if (pendingMsaInvoice) {
    return {
      label: "Awaiting signature",
      detail: `${pendingMsaInvoice.invoiceNumber} is with ${pendingMsaInvoice.sharedToEmail}.`,
      actionLabel: "Resend invoice",
      nudgeTone: "initial",
      tone: "warning",
      priority: 4,
      invoice: pendingMsaInvoice,
    };
  }

  const draftInvoice = openInvoices.find((inv) => inv.status.toLowerCase() === "draft");
  if (draftInvoice) {
    return {
      label: "Draft pipeline",
      detail: `${draftInvoice.invoiceNumber} has not been sent yet.`,
      actionLabel: "Finalize draft",
      actionHref: `/invoice/new?id=${draftInvoice.id}&restore=1`,
      tone: "draft",
      priority: 5,
      invoice: draftInvoice,
    };
  }

  const activeInvoice = openInvoices.find((inv) => isReceivableStatus(inv.status));
  if (activeInvoice) {
    return {
      label: "Active receivable",
      detail: `${activeInvoice.invoiceNumber} is live with payment pending.`,
      actionLabel: "Review invoice",
      tone: "active",
      priority: 6,
      invoice: activeInvoice,
    };
  }

  if (project.invoices.length === 0) {
    return {
      label: "Ready to bill",
      detail: "No invoices have been linked to this project yet.",
      actionLabel: "Create invoice",
      actionHref: "/invoice/new",
      tone: "neutral",
      priority: 7,
    };
  }

  return {
    label: "Complete",
    detail: "All linked invoices are settled.",
    actionLabel: "Review record",
    tone: "success",
    priority: 99,
    invoice: project.invoices[0],
  };
}

const PROJECT_ACTION_TONE_CLASSES: Record<ProjectActionState["tone"], string> = {
  danger: "bg-[#FFF0EC] text-[#C2410C]",
  warning: "bg-[#FFFBE6] text-[#B45309]",
  active: "bg-[#E0F3FF] text-[#164E63]",
  success: "bg-[#EBFDF9] text-[#007A63]",
  neutral: "bg-[#F5F5F0] text-[#555]",
  draft: "bg-[#F0EAFF] text-[#5530DB]",
};

const PROJECT_ACTION_BORDER_CLASSES: Record<ProjectActionState["tone"], string> = {
  danger: "border-[#FF5C00]",
  warning: "border-[#F59E0B]",
  active: "border-[#0EA5E9]",
  success: "border-[#00A884]",
  neutral: "border-[#111118]",
  draft: "border-[#8B5CF6]",
};

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
  const [projectsHealth, setProjectsHealth] = useState<ProjectHealth[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [offlineInvoicesCount, setOfflineInvoicesCount] = useState(0);
  const router = useRouter();

  // Client-side UX Interactive States
  const [filterType, setFilterType] = useState<"all" | "outstanding" | "settled" | "overdue" | "due_this_week">("all");
  const [ledgerView, setLedgerView] = useState<"project" | "client" | "invoice">("project");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"receivable" | "collected" | "name" | "health">("receivable");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [settlementModal, setSettlementModal] = useState<{
    milestoneIndex: number;
    triggerMode: MilestoneTriggerMode;
    triggerDate: string;
  } | null>(null);
  const [expandedClientIds, setExpandedClientIds] = useState<string[]>([]);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<string[]>([]);

  const toggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  const toggleClientExpand = useCallback((clientId: string) => {
    setExpandedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [refreshNonce, setRefreshNonce] = useState(0);

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
        if (settlementModal) {
          setSettlementModal(null);
          return;
        }
        setSelectedInvoice(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settlementModal]);

  // Detect mobile for default-expanded accordions
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const refreshDashboard = () => setRefreshNonce((value) => value + 1);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === INVOICE_DATA_CHANGED_STORAGE_KEY) {
        refreshDashboard();
      }
    };
    const handleVisibility = () => {
      if (!document.hidden) {
        refreshDashboard();
      }
    };

    window.addEventListener(INVOICE_DATA_CHANGED_EVENT, refreshDashboard);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(INVOICE_DATA_CHANGED_EVENT, refreshDashboard);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  function formatIndian(num: number): string {
    if (!num) return "0";
    return num.toLocaleString("en-IN");
  }

  function formatDashboardDate(dateStr?: string | null): string {
    if (!dateStr) return "Not set";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const openSettlementModal = (miIndex: number) => {
    if (!selectedInvoice) return;
    const milestones = selectedInvoice.milestones || [];
    const nextIndex = miIndex + 1;
    const hasNext = nextIndex < milestones.length;

    if (!hasNext) {
      void handleSettleMilestone(miIndex, { triggerMode: "cancelled" });
      return;
    }

    setSettlementModal({
      milestoneIndex: miIndex,
      triggerMode: "scheduled",
      triggerDate: getDefaultScheduleDate(),
    });
  };

  const handleSettleMilestone = async (
    miIndex: number,
    options: { triggerMode: MilestoneTriggerMode; triggerDate?: string },
  ) => {
    if (!selectedInvoice) return;
    try {
      const activeM = selectedInvoice.milestones[miIndex];
      if (!activeM) return;

      const nextIndex = miIndex + 1;
      const hasNext = nextIndex < selectedInvoice.milestones.length;
      const nextM = hasNext ? selectedInvoice.milestones[nextIndex] : null;
      const triggerMode = hasNext ? options.triggerMode : "cancelled";
      const triggerDate =
        triggerMode === "scheduled" && options.triggerDate
          ? dateInputToIso(options.triggerDate)
          : undefined;

      const response = await fetch("/api/invoice/trigger-next-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          project_id: selectedInvoice.project_id ?? null,
          trigger_mode: triggerMode,
          trigger_date: triggerDate,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.error) {
        showAlert(
          "Settlement Error",
          payload?.error || payload?.reason || "Could not settle this milestone.",
          "error",
        );
        return;
      }

      if (triggerMode === "immediate") {
        showAlert(
          "Milestone Settled",
          `Milestone ${miIndex + 1} settled. M${nextIndex + 1} (${nextM?.title || "next milestone"}) invoice was generated and sent.`,
          "success",
        );
      } else if (triggerMode === "scheduled") {
        showAlert(
          "Milestone Scheduled",
          `Milestone ${miIndex + 1} settled. M${nextIndex + 1} (${nextM?.title || "next milestone"}) will be generated on ${formatDashboardDate(payload?.trigger_date || triggerDate)}.`,
          "success",
        );
      } else {
        showAlert(
          hasNext ? "Project Closed" : "Invoice Settled",
          hasNext
            ? `Milestone ${miIndex + 1} settled. Remaining milestones were cancelled.`
            : `Final milestone settled. Invoice ${selectedInvoice.invoiceNumber} is fully paid.`,
          "success",
        );
      }

      announceInvoiceDataChanged({
        invoiceId: selectedInvoice.id,
        action: "dashboard_milestone_settled",
      });
      setRefreshNonce((value) => value + 1);
      setSelectedInvoice(null);
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

        // 5b. Get all projects for this user
        const { data: projectsData } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id);
        const projectsList = projectsData || [];

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
          let invMilestones = milestones
            .filter((m: any) => m.invoice_id === inv.id)
            .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((m: any) => ({
              title: m.title || "Untitled",
              status: (m.status || "pending").toLowerCase(),
              amount: Number(m.amount || 0),
              id: m.id,
              orderIndex: m.order_index ?? 0,
              order_index: m.order_index ?? 0,
            }));

          // Fallback to form_data.milestones if DB milestones is empty
          if (invMilestones.length === 0 && inv.form_data?.milestones?.length > 0) {
            invMilestones = inv.form_data.milestones.map((m: any, idx: number) => ({
              title: m.title || `Milestone ${idx + 1}`,
              status: (m.status || "pending").toLowerCase(),
              amount: Number(m.amount || 0),
              id: m.id || `temp-${idx}`,
              orderIndex: idx,
              order_index: idx,
            }));
          }

          let totalAmount = 0;
          if (invMilestones.length > 0) {
            totalAmount = invMilestones.reduce((s, m) => s + m.amount, 0);
          } else {
            const items = inv.form_data?.lineItems ?? [];
            totalAmount = items.reduce((s: number, i: any) => s + Number(i.qty ?? 0) * Number(i.rate ?? 0), 0);
          }
          const linkedProject = projectsList.find((project: any) => project.id === inv.project_id);

          return {
            ...inv,
            milestones: invMilestones,
            totalAmount,
            invoiceNumber: inv.invoice_number,
            clientName: inv.form_data?.client?.clientName || "Client",
            dueDate: inv.due_date || inv.form_data?.meta?.dueDate || "",
            projectMsaAcceptedAt: linkedProject?.msa_accepted_at ?? null,
            projectStatus: linkedProject?.status ?? null,
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
          const dueDateStr = inv.due_date || inv.form_data?.meta?.dueDate;
          let isOverdue = false;
          let isDueThisWeek = false;

          if (dueDateStr) {
            const due = new Date(dueDateStr);
            due.setHours(0, 0, 0, 0);
            if (due < todayVal) {
              isOverdue = true;
            } else if (due >= todayVal && due <= todayPlus7Val) {
              isDueThisWeek = true;
            }
          }

          if (inv.milestones && inv.milestones.length > 0) {
            let hasOutstandingMilestones = false;
            let hasOverdueMilestones = false;
            let hasDueThisWeekMilestones = false;

            inv.milestones.forEach((m: any) => {
              const mStatus = (m.status || "").toLowerCase();
              const mAmount = Number(m.amount || 0);

              if (mStatus === "settled") {
                settled += mAmount;
              } else if (isReceivableStatus(statusLower)) {
                outstanding += mAmount;
                hasOutstandingMilestones = true;
                if (isOverdue) {
                  overdue += mAmount;
                  hasOverdueMilestones = true;
                }
                if (isDueThisWeek) {
                  dueThisWeek += mAmount;
                  hasDueThisWeekMilestones = true;
                }
              }
            });

            if (hasOutstandingMilestones) outstandingCount++;
            if (hasOverdueMilestones) overdueCount++;
            if (hasDueThisWeekMilestones) dueThisWeekCount++;
            if (statusLower === "settled") {
              settledCount++;
            }
          } else {
            // Fallback for invoices without milestones (legacy/offline/line-item)
            const totalAmount = inv.totalAmount;

            // Outstanding receivables include partially paid milestone invoices.
            if (isReceivableStatus(statusLower)) {
              outstanding += totalAmount;
              outstandingCount++;
            }

            // Settled
            if (statusLower === "settled") {
              settled += totalAmount;
              settledCount++;
            }

            // Overdue receivables
            if (isReceivableStatus(statusLower) && isOverdue) {
              overdue += totalAmount;
              overdueCount++;
            }

            // Due this week
            if (statusLower !== "settled" && isDueThisWeek) {
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

        // Group invoices — include draft invoices in the Client Ledger but exclude their amounts from owed/collected until finalized/sent
        invoicesWithMilestones.forEach((inv: any) => {
          const invClientName = inv.form_data?.client?.clientName?.trim();
          if (!invClientName) return;

          const statusLower = inv.status.toLowerCase();

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
          const isSettled = statusLower === "settled";

          clientHealth.invoices.push({
            id: inv.id,
            project_id: inv.project_id,
            invoiceNumber: inv.invoice_number,
            status: inv.status,
            totalAmount: inv.totalAmount,
            dueDate: inv.due_date || inv.form_data?.meta?.dueDate || "",
            milestones: inv.milestones || [],
            formDataMilestones: inv.form_data?.milestones || [],
            has_addendum: inv.has_addendum || inv.form_data?.meta?.hasAddendum || false,
            msa_id: inv.msa_id,
            lineItems: inv.form_data?.lineItems || [],
            applied_payment_terms: inv.applied_payment_terms,
            applied_late_fee_rate: inv.applied_late_fee_rate,
            applied_late_fee_unit: inv.applied_late_fee_unit,
            applied_license_type: inv.applied_license_type,
            clientMsaNote: inv.client_msa_note,
            shareToken: inv.share_token,
            clientName: clientHealth.clientName,
            form_data: inv.form_data,
            due_date: inv.due_date,
            msaStatus: inv.msa_status,
            sharedToEmail: inv.shared_to_email,
            sharedAt: inv.shared_at,
            projectMsaAcceptedAt: inv.projectMsaAcceptedAt,
            projectStatus: inv.projectStatus,
          });

          if (inv.milestones && inv.milestones.length > 0) {
            inv.milestones.forEach((m: any) => {
              const mStatus = (m.status || "").toLowerCase();
              const mAmount = Number(m.amount || 0);
              if (mStatus === "settled") {
                clientHealth.totalCollected += mAmount;
              } else if (statusLower !== "cancelled" && statusLower !== "draft") {
                clientHealth.totalOwed += mAmount;
              }
            });
          } else {
            if (isSettled) {
              clientHealth.totalCollected += inv.totalAmount;
            } else if (statusLower !== "cancelled" && statusLower !== "draft") {
              clientHealth.totalOwed += inv.totalAmount;
            }
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

            if (isReceivableStatus(statusLower)) {
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

        // --- Compute Project Health ---
        const projectsMap = new Map<string, ProjectHealth>();

        // Initialize with all fetched projects
        projectsList.forEach((pj: any) => {
          const matchedClient = clientsList.find((cl: any) => cl.id === pj.client_id);
          projectsMap.set(pj.id, {
            projectId: pj.id,
            projectName: pj.name,
            projectDescription: pj.description || "",
            clientId: pj.client_id,
            clientName: matchedClient?.client_name || "Unknown Client",
            clientCity: matchedClient?.city || matchedClient?.client_address || "",
            invoices: [],
            totalOwed: 0,
            totalCollected: 0,
            health: "clear",
          });
        });

        // Group invoices under projects — include drafts but exclude their amounts from owed/collected until finalized/sent
        invoicesWithMilestones.forEach((inv: any) => {
          const invClientName = inv.form_data?.client?.clientName?.trim();
          if (!invClientName) return;

          const statusLower = inv.status.toLowerCase();

          let matchedClient = clientsList.find(
            (cl: any) => cl.client_name.trim().toLowerCase() === invClientName.toLowerCase()
          );

          let matchedProjectId = inv.project_id;
          
          if (!matchedProjectId) {
            // Find a project that has name = "${invClientName} General Engagements"
            matchedProjectId = `pseudo-project-${invClientName.toLowerCase().replace(/\s+/g, "-")}`;
            if (!projectsMap.has(matchedProjectId)) {
              projectsMap.set(matchedProjectId, {
                projectId: matchedProjectId,
                projectName: `${inv.form_data?.client?.clientName || invClientName} General Engagements`,
                projectDescription: "Automatically grouped non-project engagements",
                clientId: matchedClient?.id || null,
                clientName: inv.form_data?.client?.clientName || invClientName,
                clientCity: inv.form_data?.client?.clientCity || "",
                invoices: [],
                totalOwed: 0,
                totalCollected: 0,
                health: "clear",
              });
            }
          }

          const projectHealth = projectsMap.get(matchedProjectId);
          if (projectHealth) {
            const isSettled = statusLower === "settled";

            projectHealth.invoices.push({
              id: inv.id,
              project_id: inv.project_id,
              invoiceNumber: inv.invoice_number,
              status: inv.status,
              totalAmount: inv.totalAmount,
              dueDate: inv.due_date || inv.form_data?.meta?.dueDate || "",
              milestones: inv.milestones || [],
              formDataMilestones: inv.form_data?.milestones || [],
              has_addendum: inv.has_addendum || inv.form_data?.meta?.hasAddendum || false,
              msa_id: inv.msa_id,
              lineItems: inv.form_data?.lineItems || [],
              applied_payment_terms: inv.applied_payment_terms,
              applied_late_fee_rate: inv.applied_late_fee_rate,
              applied_late_fee_unit: inv.applied_late_fee_unit,
              applied_license_type: inv.applied_license_type,
              clientMsaNote: inv.client_msa_note,
              shareToken: inv.share_token,
              clientName: projectHealth.clientName,
              form_data: inv.form_data,
              due_date: inv.due_date,
              msaStatus: inv.msa_status,
              sharedToEmail: inv.shared_to_email,
              sharedAt: inv.shared_at,
              projectMsaAcceptedAt: inv.projectMsaAcceptedAt,
              projectStatus: inv.projectStatus,
            });

            if (inv.milestones && inv.milestones.length > 0) {
              inv.milestones.forEach((m: any) => {
                const mStatus = (m.status || "").toLowerCase();
                const mAmount = Number(m.amount || 0);
                if (mStatus === "settled") {
                  projectHealth.totalCollected += mAmount;
                } else if (statusLower !== "cancelled" && statusLower !== "draft") {
                  projectHealth.totalOwed += mAmount;
                }
              });
            } else {
              if (isSettled) {
                projectHealth.totalCollected += inv.totalAmount;
              } else if (statusLower !== "cancelled" && statusLower !== "draft") {
                projectHealth.totalOwed += inv.totalAmount;
              }
            }
          }
        });

        // Calculate project health property
        projectsMap.forEach((proj) => {
          if (proj.invoices.length === 0) {
            proj.health = "clear";
            return;
          }

          let hasOverdue = false;
          let allSettled = true;
          let allDraft = true;

          proj.invoices.forEach((inv) => {
            const statusLower = inv.status.toLowerCase();
            const isSettled = statusLower === "settled";
            const isDraft = statusLower === "draft";

            if (!isSettled) {
              allSettled = false;
            }
            if (!isDraft) {
              allDraft = false;
            }

            if (isReceivableStatus(statusLower)) {
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
            proj.health = "overdue";
          } else if (allSettled) {
            proj.health = "clear";
          } else if (allDraft) {
            proj.health = "draft";
          } else {
            proj.health = "good";
          }
        });

        setProjectsHealth(Array.from(projectsMap.values()));

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
  }, [router, refreshNonce]);

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

  // ─── WHAT NEEDS ATTENTION: Derive actionable invoices ───
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
        if (isReceivableStatus(status) && inv.dueDate) {
          const due = new Date(inv.dueDate);
          due.setHours(0, 0, 0, 0);
          const daysPast = Math.ceil((today.getTime() - due.getTime()) / 86400000);
          if (daysPast > 0) {
            cards.push({ type: "past_due", priority: 2, invoice: inv, client, daysPast });
            return;
          }
        }

        // Priority 3: Due Soon (within 3 days)
        if (isReceivableStatus(status) && inv.dueDate) {
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

    return cards.sort((a, b) => a.priority - b.priority);
  }, [clientsHealth, dismissedCards]);

  const portfolioAtRisk = useMemo(() => {
    const riskInvoices = new Map<string, number>();

    clientsHealth.forEach((client) => {
      client.invoices.forEach((inv) => {
        const status = inv.status.toLowerCase();
        const daysUntil = getDaysUntil(inv.dueDate);
        const isOverdue = isReceivableStatus(status) && daysUntil !== null && daysUntil < 0;
        const isRevisionBlocked = inv.msaStatus?.toLowerCase() === "proposed" && Boolean(inv.clientMsaNote);

        if (!isOverdue && !isRevisionBlocked) return;

        const openAmount = inv.milestones?.length
          ? inv.milestones.reduce((sum, milestone) => {
              const milestoneStatus = (milestone.status || "").toLowerCase();
              return milestoneStatus === "settled" ? sum : sum + Number(milestone.amount || 0);
            }, 0)
          : Number(inv.totalAmount || 0);

        riskInvoices.set(inv.id, openAmount);
      });
    });

    return Array.from(riskInvoices.values()).reduce((sum, amount) => sum + amount, 0);
  }, [clientsHealth]);

  // ─── Attention Action Handlers ───
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
      announceInvoiceDataChanged({ invoiceId: inv.id, action: "project_cancelled" });
      setRefreshNonce((value) => value + 1);
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
    if (inv.has_addendum) return `/invoice/new?id=${inv.id}&restore=1&step=payment`;
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
    if (daysPast > 30) return "Send Final Notice";
    if (daysPast > 7) return "Send Firm Reminder";
    return "Send Payment Nudge";
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
          (inv) => isReceivableStatus(inv.status)
        );
      }

      if (filterType === "settled") {
        // Collected: client has at least one settled invoice or total collected > 0
        return client.invoices.some((inv) => inv.status.toLowerCase() === "settled") || client.totalCollected > 0;
      }

      if (filterType === "overdue") {
        return client.health === "overdue" || client.invoices.some((inv) => {
          const statusLower = inv.status.toLowerCase();
          if (isReceivableStatus(statusLower) && inv.dueDate) {
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

  const filteredAndSortedProjects = projectsHealth
    .filter((project) => {
      // Hide projects with zero invoices unless explicitly searching for them
      if (project.invoices.length === 0 && !searchTerm) return false;

      // Project search query matching name, description, client name or client city
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = project.projectName?.toLowerCase().includes(query);
        const matchesDesc = project.projectDescription?.toLowerCase().includes(query);
        const matchesClient = project.clientName?.toLowerCase().includes(query);
        const matchesCity = project.clientCity?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesClient && !matchesCity) return false;
      }

      // Card active filter types
      if (filterType === "all") return true;

      if (filterType === "outstanding") {
        return project.invoices.some((inv) => isReceivableStatus(inv.status));
      }

      if (filterType === "settled") {
        return project.invoices.some((inv) => inv.status.toLowerCase() === "settled") || project.totalCollected > 0;
      }

      if (filterType === "overdue") {
        return project.health === "overdue" || project.invoices.some((inv) => {
          const statusLower = inv.status.toLowerCase();
          if (isReceivableStatus(statusLower) && inv.dueDate) {
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

        return project.invoices.some((inv) => {
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
        return a.projectName.localeCompare(b.projectName);
      }
      if (sortBy === "health") {
        const actionA = getProjectActionState(a);
        const actionB = getProjectActionState(b);
        if (actionA.priority !== actionB.priority) return actionA.priority - actionB.priority;
        return b.totalOwed - a.totalOwed;
      }
      return 0;
    });

  const filteredAndSortedInvoices = (() => {
    let invoices: any[] = [];
    filteredAndSortedClients.forEach(client => {
      client.invoices.forEach(inv => {
        invoices.push({ ...inv, clientName: client.clientName, clientCity: client.clientCity, clientId: client.clientId });
      });
    });

    return invoices.filter(inv => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const matchesClient = inv.clientName?.toLowerCase().includes(query) || inv.clientCity?.toLowerCase().includes(query);
        const matchesInv = inv.invoiceNumber?.toLowerCase().includes(query);
        if (!matchesClient && !matchesInv) return false;
      }

      const statusLower = (inv.status || "").toLowerCase();
      
      if (filterType === "all") return true;
      if (filterType === "outstanding") return isReceivableStatus(statusLower);
      if (filterType === "settled") return statusLower === "settled";
      if (filterType === "overdue") {
        if (!isReceivableStatus(statusLower)) return false;
        if (!inv.dueDate) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const due = new Date(inv.dueDate); due.setHours(0,0,0,0);
        return due < today;
      }
      if (filterType === "due_this_week") {
        if (statusLower === "settled" || !inv.dueDate) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); nextWeek.setHours(23,59,59,999);
        const due = new Date(inv.dueDate); due.setHours(0,0,0,0);
        return due >= today && due <= nextWeek;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "receivable") return b.totalAmount - a.totalAmount;
      if (sortBy === "name") return a.clientName.localeCompare(b.clientName);
      if (sortBy === "health") {
        const getHealthScore = (i: any) => {
           const s = i.status.toLowerCase();
           if (s === "settled") return 3;
           if (i.dueDate && new Date(i.dueDate) < new Date()) return 0; // overdue
           return 1; // live/pending
        };
        return getHealthScore(a) - getHealthScore(b);
      }
      if (sortBy === "collected") return b.totalAmount - a.totalAmount; 
      return 0;
    });
  })();

  const visibleAttentionCards = actionableInvoices.slice(0, 3);
  const hiddenAttentionCount = Math.max(actionableInvoices.length - visibleAttentionCards.length, 0);
  const pulseSparkValues = [metrics.outstanding, metrics.settled, portfolioAtRisk];
  const pulseSparkMax = Math.max(...pulseSparkValues, 1);
  const pulseSparkPoints = pulseSparkValues
    .map((value, index) => `${index * 50},${36 - (value / pulseSparkMax) * 28}`)
    .join(" ");

  try {
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

          {/* SECTION 1: WHAT NEEDS ATTENTION */}
          <section className="py-6 border-b-2 border-[#111118]">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 text-[13px] font-black uppercase tracking-[0.12em] text-[#111118]">
                  What Needs Attention
                </p>
                <p className="m-0 mt-1 text-[12px] font-bold text-[color:var(--text-muted)]">
                  One deduplicated action per invoice.
                </p>
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {actionableInvoices.length} {actionableInvoices.length === 1 ? "action" : "actions"}
              </span>
            </div>

            {visibleAttentionCards.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {visibleAttentionCards.map((card) => {
                  const { type, invoice: inv, client, daysPast, daysUntil } = card;
                  const sentAgo = inv.sharedAt ? timeAgo(inv.sharedAt) : null;
                  const actionLabel =
                    type === "msa_revision"
                      ? "REVISION REQUESTED"
                      : type === "past_due"
                      ? "PAYMENT OVERDUE"
                      : type === "due_soon"
                      ? "PAYMENT DUE SOON"
                      : type === "msa_pending"
                      ? "AWAITING CLIENT"
                      : "DRAFT NOT SENT";
                  const context =
                    type === "msa_revision" && inv.clientMsaNote
                      ? `Client note: "${inv.clientMsaNote}"`
                      : type === "past_due"
                      ? `Due on ${inv.dueDate}. ${daysPast ?? 0} ${(daysPast ?? 0) === 1 ? "day" : "days"} overdue.`
                      : type === "due_soon"
                      ? `Due on ${inv.dueDate}. ${daysUntil ?? 0} ${(daysUntil ?? 0) === 1 ? "day" : "days"} left.`
                      : type === "msa_pending"
                      ? `Sent to ${inv.sharedToEmail}${sentAgo ? ` (${sentAgo})` : ""}.`
                      : "Invoice created but not yet sent.";

                  return (
                    <article
                      key={inv.id}
                      className="flex min-h-[188px] flex-col justify-between border-[3px] border-[#111118] bg-white p-4 shadow-[4px_4px_0_#000]"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="border-2 border-[#111118] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#111118]">
                            {actionLabel}
                          </span>
                          <button
                            type="button"
                            aria-label={`Dismiss ${inv.invoiceNumber} action`}
                            onClick={() => handleDismissCard(inv.id)}
                            className="h-7 w-7 border-2 border-[#111118] bg-white text-[13px] font-black text-[#111118] shadow-[2px_2px_0_#111118] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111118]"
                          >
                            x
                          </button>
                        </div>
                        <h2 className="m-0 mt-4 text-[18px] font-black leading-tight text-[#111118]">
                          {inv.invoiceNumber}
                        </h2>
                        <p className="m-0 mt-1 text-[12px] font-black uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                          {client.clientName}
                        </p>
                        <p className="m-0 mt-3 text-[13px] font-bold leading-5 text-[#111118]">
                          {context}
                        </p>
                      </div>

                      <div className="mt-4">
                        {type === "msa_revision" ? (
                          <Link
                            href={getMsaEditLink(inv, client)}
                            className="inline-flex w-full justify-center border-2 border-[#111118] bg-[#111118] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#D4FF00] shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5"
                          >
                            {getMsaEditLabel(inv, client)}
                          </Link>
                        ) : type === "past_due" ? (
                          <button
                            type="button"
                            onClick={() => handleNudge(inv, getNudgeTone(daysPast))}
                            className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#111118] bg-[#111118] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#D4FF00] shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5"
                          >
                            <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {getNudgeLabel(daysPast)}
                          </button>
                        ) : type === "due_soon" ? (
                          <button
                            type="button"
                            onClick={() => handleNudge(inv, "polite")}
                            className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#111118] bg-[#111118] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#D4FF00] shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5"
                          >
                            <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Send reminder
                          </button>
                        ) : type === "msa_pending" ? (
                          <button
                            type="button"
                            onClick={() => handleNudge(inv, "initial")}
                            className="inline-flex w-full justify-center border-2 border-[#111118] bg-[#111118] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#D4FF00] shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5"
                          >
                            Resend invoice
                          </button>
                        ) : (
                          <Link
                            href={`/invoice/new?id=${inv.id}&restore=1`}
                            className="inline-flex w-full justify-center border-2 border-[#111118] bg-[#111118] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#D4FF00] shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5"
                          >
                            Finalize draft
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="border-[3px] border-[#111118] bg-white p-5 text-center shadow-[4px_4px_0_#000]">
                <p className="m-0 text-[14px] font-black uppercase tracking-[0.1em] text-[#111118]">
                  No open dashboard actions
                </p>
                <p className="m-0 mt-1 text-[12px] font-bold text-[color:var(--text-muted)]">
                  The ledger remains available for review and settlement work.
                </p>
              </div>
            )}

            {hiddenAttentionCount > 0 && (
              <a
                href="#project-ledger"
                onClick={() => {
                  setLedgerView("invoice");
                  setFilterType("all");
                  setSortBy("health");
                }}
                className="mt-3 inline-flex text-[12px] font-black uppercase tracking-[0.12em] text-[#111118] underline decoration-2 underline-offset-4"
              >
                {hiddenAttentionCount} more →
              </a>
            )}
          </section>

          {/* SECTION 2: PORTFOLIO PULSE */}
          <section className="py-6">
            <div className="border-[3px] border-[#111118] bg-[#111118] text-white shadow-[4px_4px_0_#000]">
              <div className="grid grid-cols-1 divide-y-2 divide-white/20 lg:grid-cols-[1fr_1fr_1fr_180px] lg:divide-x-2 lg:divide-y-0">
                <button
                  type="button"
                  onClick={() => {
                    setLedgerView("invoice");
                    setFilterType("outstanding");
                  }}
                  className="group p-5 text-left transition-colors hover:text-[#D4FF00]"
                >
                  <p className="m-0 text-[11px] font-black uppercase tracking-[0.16em] text-white/55 group-hover:text-[#D4FF00]">
                    Outstanding
                  </p>
                  <p className="m-0 mt-2 text-[26px] font-black font-syne">₹{formatIndian(metrics.outstanding)}</p>
                  <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">
                    {metrics.outstandingCount} {metrics.outstandingCount === 1 ? "invoice" : "invoices"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLedgerView("invoice");
                    setFilterType("settled");
                  }}
                  className="group p-5 text-left transition-colors hover:text-[#D4FF00]"
                >
                  <p className="m-0 text-[11px] font-black uppercase tracking-[0.16em] text-white/55 group-hover:text-[#D4FF00]">
                    Collected
                  </p>
                  <p className="m-0 mt-2 text-[26px] font-black font-syne">₹{formatIndian(metrics.settled)}</p>
                  <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">
                    {metrics.settledCount} {metrics.settledCount === 1 ? "invoice" : "invoices"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLedgerView("project");
                    setFilterType("all");
                    setSortBy("health");
                  }}
                  className="group p-5 text-left transition-colors hover:text-[#D4FF00]"
                >
                  <p className="m-0 text-[11px] font-black uppercase tracking-[0.16em] text-white/55 group-hover:text-[#D4FF00]">
                    At Risk
                  </p>
                  <p className="m-0 mt-2 text-[26px] font-black font-syne">₹{formatIndian(portfolioAtRisk)}</p>
                  <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">
                    Overdue + revision-blocked
                  </p>
                </button>
                <div className="flex items-center p-5">
                  <svg
                    viewBox="0 0 100 40"
                    role="img"
                    aria-label="Portfolio pulse sparkline"
                    className="h-16 w-full"
                  >
                    <polyline
                      points={pulseSparkPoints}
                      fill="none"
                      stroke="#D4FF00"
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      strokeWidth="4"
                    />
                    {pulseSparkValues.map((value, index) => (
                      <rect
                        key={`${value}-${index}`}
                        x={index * 50 - 2}
                        y={36 - (value / pulseSparkMax) * 28 - 2}
                        width="4"
                        height="4"
                        fill="#FFFFFF"
                      />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: PROJECT LEDGER */}
          <div id="project-ledger" className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] mb-6">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-[#111118] bg-[#F5F5F0] flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-4">
	                <p className="text-[13px] font-bold text-[#111118] tracking-[0.08em]">
	                  PROJECT LEDGER
                </p>
                <div className="flex border-2 border-[#111118] overflow-hidden shadow-[2px_2px_0_#111118]">
                  <button
                    onClick={() => setLedgerView("project")}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      ledgerView === "project" ? "bg-[#111118] text-white" : "bg-white text-[#111118] hover:bg-[#F5F5F0]"
                    }`}
                  >
                    By Project
                  </button>
                  <button
                    onClick={() => setLedgerView("client")}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors border-l-2 border-[#111118] ${
                      ledgerView === "client" ? "bg-[#111118] text-white" : "bg-white text-[#111118] hover:bg-[#F5F5F0]"
                    }`}
                  >
                    By Client
                  </button>
                  <button
                    onClick={() => setLedgerView("invoice")}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors border-l-2 border-[#111118] ${
                      ledgerView === "invoice" ? "bg-[#111118] text-white" : "bg-white text-[#111118] hover:bg-[#F5F5F0]"
                    }`}
                  >
                    By Invoice
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex gap-4 flex-wrap items-center">
                <span className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase mr-1">MILESTONE KEY:</span>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#00DCB4] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Settled</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#BEFF00] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Live</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#FF5C00] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Overdue</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2 bg-[#E0E0E0] border border-[#111118]"></div><span className="text-[12px] font-semibold text-[#111118]">Pending</span></div>
              </div>
            </div>

            {/* Search & Sort Controls Strip */}
            <div className="px-4 py-2.5 border-b-2 border-[#111118] bg-[#F8F8F4] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
              {/* Active filter display */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-bold text-[#111118] uppercase tracking-[0.05em]">Filter:</span>
                <span className={cn(
                  "text-[11px] font-bold px-2.5 py-1 border-2 border-[#111118] uppercase shadow-[2px_2px_0_#111118]",
                  filterType === "all" ? "bg-[#E0F3FF] text-[#111118]" :
                  filterType === "outstanding" ? "bg-[#FFF8CC] text-[#111118]" :
                  filterType === "settled" ? "bg-[#EBFDF9] text-[#00967D]" :
                  filterType === "overdue" ? "bg-[#FFF5F2] text-[#FF5C00]" :
                  "bg-[#F7FFD6] text-[#111118]"
                )}>
                  {filterType === "all" ? (ledgerView === "project" ? "All Projects" : ledgerView === "client" ? "All Clients" : "All Invoices") : filterType.replace(/_/g, " ")}
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
                    placeholder={ledgerView === "project" ? "Search project, client, desc..." : "Search client or city..."}
                    className="px-2.5 py-1 text-[12px] font-bold text-[#111118] placeholder-[#888] bg-white border-2 border-[#111118] shadow-[2px_2px_0_#111118] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#111118] transition-all w-full sm:w-44"
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
                    className="px-2 py-1 text-[12px] font-bold text-[#111118] bg-white border-2 border-[#111118] shadow-[2px_2px_0_#111118] focus:outline-none cursor-pointer"
                  >
                    <option value="receivable">Receivable (High-Low)</option>
                    <option value="collected">Collected (High-Low)</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="health">Health Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Render View Based on Toggle */}
            <div className="space-y-6 bg-[#F5F5F0] p-4 sm:p-6 border-b-2 border-[#111118]">
              {ledgerView === "project" ? (
                <>
                  {/* PROJECT VIEW LOGIC */}
                  {filteredAndSortedProjects.map((project) => {
                    const allMilestones = project.invoices.flatMap(inv => inv.milestones);
                    const projectMilestones = project.invoices.flatMap((inv) => {
                      return inv.milestones.map((m: any) => ({
                        id: m.id,
                        title: m.title || "Untitled",
                        order_index: m.order_index ?? m.orderIndex ?? 0,
                        status: m.status,
                        amount: m.amount || 0,
                        due_date: inv.dueDate || inv.due_date || "",
                        invoice_id: inv.id,
                        invoice_number: inv.invoiceNumber || "",
                      }));
                    });
                    const settledMilestoneCount = allMilestones.filter((milestone) => (milestone.status || "").toLowerCase() === "settled").length;
                    const projectMilestoneProgress = allMilestones.length > 0
                      ? Math.round((settledMilestoneCount / allMilestones.length) * 100)
                      : 0;
                    const isCollapsed = !collapsedProjectIds.includes(project.projectId);
                    const projectAction = getProjectActionState(project);

                    return (
                      <div key={project.projectId} className="border-2 border-[#111118] bg-white shadow-[4px_4px_0_#111118] flex flex-col transition-all hover:shadow-[6px_6px_0_#111118] hover:-translate-y-[2px]">
                        
                        {/* Header: Project Summary */}
                        <div 
                          onClick={() => toggleProjectCollapse(project.projectId)}
                          className="p-4 sm:p-5 border-b-2 border-[#111118] bg-white cursor-pointer select-none group"
                        >
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
	                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <span className={cn("mt-1 h-5 w-5 shrink-0 border-2 bg-white shadow-[2px_2px_0_#111118]", PROJECT_ACTION_BORDER_CLASSES[projectAction.tone])} />
                                <h3 className="text-[18px] sm:text-[22px] font-black text-[#111118] tracking-normal m-0 leading-tight group-hover:text-[#FF5C00] transition-colors">
                                  {project.projectName}
                                </h3>
                                <span className="text-[14px] text-[color:var(--text-muted)] font-black transition-transform group-hover:translate-y-[1px]">
                                  {isCollapsed ? "▼" : "▲"}
                                </span>
                              </div>
                              {project.projectDescription && (
                                <p className="text-[12px] font-medium text-[color:var(--text-muted)] italic m-0 mt-1.5 max-w-2xl leading-relaxed">
                                  {project.projectDescription}
                                </p>
                              )}
                              <p className="text-[11px] font-bold text-[#888] m-0 mt-2 uppercase tracking-widest">
                                Client: <span className="text-[#111118]">{project.clientName}</span> {project.clientCity ? `(${project.clientCity})` : ""}
                              </p>
	                            </div>
	                            <div className="text-left lg:text-right flex flex-row lg:flex-col items-center lg:items-end gap-3 lg:gap-1.5 shrink-0">
	                              {projectAction.invoice && <CanonicalInvoiceStateBadge invoice={projectAction.invoice} />}
	                              <span className="border-2 border-[#111118] bg-[#F8F8F4] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#111118] shadow-[2px_2px_0_#111118]">
	                                {settledMilestoneCount}/{allMilestones.length || 0} milestones
	                              </span>
	                            </div>
	                          </div>

	                          <div className="mb-4 w-full" onClick={(e) => e.stopPropagation()}>
	                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
	                              <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
	                                Milestone progress
	                              </p>
	                              <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-[#111118]">
	                                {projectMilestoneProgress}% · {settledMilestoneCount}/{allMilestones.length || 0} settled
	                              </p>
	                            </div>
	                            <ProjectTimeline milestones={projectMilestones} />
	                          </div>

                          <div className={cn(
                            "mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-2 p-3",
                            PROJECT_ACTION_BORDER_CLASSES[projectAction.tone],
                            PROJECT_ACTION_TONE_CLASSES[projectAction.tone]
                          )}>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] m-0 opacity-70">Next action</p>
                              <p className="text-[13px] font-black text-[#111118] m-0 mt-0.5">{projectAction.detail}</p>
	                        </div>
                            {projectAction.actionHref ? (
                              <Link
                                href={projectAction.actionHref}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex justify-center border-2 border-[#111118] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#111118] shadow-[2px_2px_0_#111118] hover:-translate-y-0.5 transition-all"
                              >
                                {projectAction.actionLabel}
                              </Link>
                            ) : projectAction.invoice ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (projectAction.nudgeTone && projectAction.invoice) {
                                    void handleNudge(projectAction.invoice, projectAction.nudgeTone);
                                    return;
                                  }
                                  setSelectedInvoice(projectAction.invoice);
                                }}
                                className="inline-flex justify-center border-2 border-[#111118] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#111118] shadow-[2px_2px_0_#111118] hover:-translate-y-0.5 transition-all"
                              >
                                {projectAction.actionLabel}
                              </button>
                            ) : null}
                          </div>

	                        </div>

                        {/* Body: Invoices list under the project */}
                        {!isCollapsed && (
                          <div className="bg-[#FAFAF6] p-4 sm:p-5 flex flex-col gap-6 border-t-2 border-[#111118]">
                            {project.invoices.length > 0 ? (
                              project.invoices.map((inv) => {
                                const msaLower = (inv.msaStatus || "").toLowerCase();
                                const isProposed = msaLower === "proposed";
                                
                                return (
                                  <div key={inv.id} className="flex flex-col gap-3">
                                    {/* Invoice Context Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[#111118]/20 pb-2">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
	                                          className="text-[13px] sm:text-[15px] font-black text-[#111118] uppercase tracking-wider hover:text-[#FF5C00] transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center group"
	                                        >
	                                          {inv.invoiceNumber} <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
	                                        </button>
	                                        <CanonicalInvoiceStateBadge invoice={inv} />
	                                      </div>
                                      <span className="text-[14px] font-black text-[#111118] font-syne">₹{formatIndian(inv.totalAmount)}</span>
                                    </div>

                                    {/* Client Note & Action Button */}
                                    {isProposed && inv.clientMsaNote && (
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full bg-[#FFFBE6] border-2 border-[#B45309] p-3 shadow-[2px_2px_0_#B45309]">
                                        <div className="flex-1">
                                          <p className="text-[10px] font-black text-[#B45309] uppercase tracking-wider m-0 mb-1 flex items-center gap-1.5">
                                            <span className="text-[12px]">⚠️</span> Client Note
                                          </p>
                                          <p className="text-[12px] text-[#B45309] m-0 italic font-medium leading-relaxed">&quot;{inv.clientMsaNote}&quot;</p>
                                        </div>
                                        <Link
                                          href={`/invoice/new?id=${inv.id}&restore=1&step=payment`}
                                          className="shrink-0 flex items-center justify-center px-4 py-2 text-[12px] font-black text-[#111118] bg-[#BEFF00] border-2 border-[#111118] shadow-[2px_2px_0_#111118] hover:shadow-[4px_4px_0_#111118] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all uppercase tracking-wider min-h-[44px]"
                                        >
                                          UPDATE ADDENDUM →
                                        </Link>
                                      </div>
                                    )}

                                    {/* Flattened Milestones inside this project invoice */}
                                    <div className="flex flex-col gap-4 mt-1">
                                      {inv.milestones.length > 0 ? (
                                        inv.milestones.map((m, mi) => {
                                          const s = (m.status || "").toLowerCase();
                                          const isPending =
                                            s === "pending" ||
                                            s === "live" ||
                                            s === "overdue" ||
                                            s === "sent" ||
                                            s === "partial" ||
                                            s === "saved";
                                          const statusBg = s === "settled" ? "#00DCB4" : s === "overdue" ? "#FF5C00" : ["live", "sent", "finalized", "partial", "saved"].includes(s) ? "#BEFF00" : "#E0E0E0";
                                          const title = m.title || "(No Milestone Title)";
                                          
                                          const formMilestone = inv.formDataMilestones?.[m.orderIndex];
                                          const milestoneLineItems = formMilestone?.lineItems || [];
                                          
                                          let dueDateText = "Upcoming";
                                          let isPastDue = false;
                                          if (s === "settled") dueDateText = "Settled ✓";
                                          else if (isPending) {
                                            if (inv.dueDate) {
                                              const diffDays = Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                              if (diffDays < 0) { isPastDue = true; dueDateText = `${Math.abs(diffDays)} days past due`; }
                                              else if (diffDays === 0) dueDateText = "Due today";
                                              else dueDateText = `${diffDays} days till due`;
                                            } else dueDateText = "Pending";
                                          }

                                          let effectiveAmount = m.amount;
                                          if (effectiveAmount === 0 && milestoneLineItems.length > 0) {
                                            effectiveAmount = milestoneLineItems.reduce((s: number, li: any) => s + Number(li.qty || 0) * Number(li.rate || 0), 0);
                                          }

                                          return (
                                            <div key={mi} className="flex flex-col gap-1.5">
                                              <div className="flex justify-between items-start gap-3">
                                                <div className="flex items-start gap-2.5">
                                                  <div className="w-[14px] h-[14px] border-2 border-[#111118] shrink-0 mt-[2px] flex items-center justify-center shadow-[1px_1px_0_#111118]" style={{ backgroundColor: statusBg }} />
                                                  <div>
                                                    <span className="text-[13px] font-black text-[#111118] uppercase tracking-tight">{title}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className={cn("text-[10px] font-bold uppercase", isPastDue ? "text-[#FF5C00]" : "text-[#888]")}>{dueDateText}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <span className="text-[12px] font-bold text-[#111118]">₹{formatIndian(effectiveAmount)}</span>
                                              </div>
                                              
                                              {/* Line Items */}
                                              {milestoneLineItems.length > 0 && (
                                                <div className="pl-[26px] flex flex-col gap-1 text-[11px] font-medium text-[#555]">
                                                  {milestoneLineItems.map((li: any, liIdx: number) => (
                                                    <div key={liIdx} className="flex items-start gap-1">
                                                      <span className="text-[#888] mt-[-1px]">↳</span>
                                                      <span>{li.description || li.type || "Deliverable"} <span className="opacity-70">({li.qty} {li.rateUnit?.replace("per-", "") || "unit"} @ ₹{formatIndian(Number(li.rate || 0))})</span></span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="text-[11px] font-bold text-[#888] uppercase italic pl-[26px]">Standard Invoice (No detailed milestones)</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[12px] text-center font-bold text-[color:var(--text-muted)] py-4">No active invoices grouped under this project.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : ledgerView === "client" ? (
                <>
                  {/* CLIENT VIEW LOGIC */}
              {filteredAndSortedClients.map((client) => {
                const allMilestones = client.invoices.flatMap(inv => inv.milestones);
                const sparkTotal = allMilestones.reduce((sum, m) => {
                  let amount = m.amount || 0;
                  if (amount === 0) {
                    const parentInv = client.invoices.find(i => i.milestones.some(pm => pm.orderIndex === m.orderIndex));
                    if (parentInv?.formDataMilestones?.[m.orderIndex]) {
                      amount = (parentInv.formDataMilestones[m.orderIndex].lineItems || []).reduce((s: number, li: any) => s + Number(li.qty || 0) * Number(li.rate || 0), 0);
                    }
                  }
                  return sum + amount;
                }, 0) || 1;

                return (
                  <div key={client.clientId} className="border-2 border-[#111118] bg-white shadow-[4px_4px_0_#111118] flex flex-col transition-all hover:shadow-[6px_6px_0_#111118] hover:-translate-y-[2px]">
                    
                    {/* Header: Summary */}
                    <div className="p-4 sm:p-5 border-b-2 border-[#111118] bg-white">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5">
                        <div>
                          <h3 className="text-[20px] sm:text-[24px] font-black text-[#111118] uppercase tracking-wider m-0 leading-tight">{client.clientName}</h3>
                          {client.clientCity && <p className="text-[12px] font-bold text-[#888] m-0 mt-1 uppercase tracking-widest">{client.clientCity}</p>}
                        </div>
                        <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                          <p className={cn("text-[20px] sm:text-[24px] font-black font-syne m-0", client.health === "overdue" ? "text-[#FF5C00]" : "text-[#111118]")}>
                            ₹{formatIndian(client.totalOwed)}
                          </p>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-1 border-2 border-[#111118] uppercase tracking-wider shadow-[2px_2px_0_#111118]",
                            client.health === "good" && "bg-[#E0FFF7] text-[#006B52]",
                            client.health === "overdue" && "bg-[#FFF0EC] text-[#FF5C00]",
                            client.health === "clear" && "bg-[#EBFDF9] text-[#00967D]",
                            client.health === "draft" && "bg-[#F0EAFF] text-[#5530DB]"
                          )}>
                            {client.health === "good" ? "GOOD" : client.health === "overdue" ? "LATE" : client.health === "clear" ? "CLEAR" : "DRAFT"}
                          </span>
                        </div>
                      </div>

                      {/* Milestone Progress Bar */}
                      {allMilestones.length > 0 ? (
                        <div className="w-full flex flex-col gap-1.5">
                          <div className="w-full h-[14px] border-2 border-[#111118] flex overflow-hidden shadow-[2px_2px_0_#111118]">
                            {allMilestones.map((m, i) => {
                              const s = (m.status || "").toLowerCase();
                              const bg = s === "settled" ? "#00DCB4" : s === "overdue" ? "#FF5C00" : ["live", "sent", "finalized", "partial", "saved"].includes(s) ? "#BEFF00" : "#E0E0E0";
                              
                              let effectiveAmount = m.amount;
                              if (effectiveAmount === 0) {
                                const parentInv = client.invoices.find(inv => inv.milestones.some(pm => pm.orderIndex === m.orderIndex));
                                if (parentInv?.formDataMilestones?.[m.orderIndex]) {
                                  effectiveAmount = (parentInv.formDataMilestones[m.orderIndex].lineItems || []).reduce((s: number, li: any) => s + Number(li.qty || 0) * Number(li.rate || 0), 0);
                                }
                              }
                              const widthPct = Math.max((effectiveAmount / sparkTotal) * 100, 2);
                              return (
                                <div key={i} style={{ width: `${widthPct}%`, backgroundColor: bg }} className="h-full border-r-2 border-[#111118] last:border-r-0" />
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-[#888] uppercase tracking-widest mt-1">
                            <span>0%</span>
                            <span>Timeline</span>
                            <span>100%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-[14px] border-2 border-[#111118] bg-[#E0E0E0] shadow-[2px_2px_0_#111118]" />
                      )}
                    </div>

                    {/* Body: Invoice Feed */}
                    <div className="bg-[#FAFAF6] p-4 sm:p-5 flex flex-col gap-6">
                      {client.invoices.map((inv) => {
                        const msaLower = (inv.msaStatus || "").toLowerCase();
                        const isProposed = msaLower === "proposed";
                        
                        return (
                          <div key={inv.id} className="flex flex-col gap-3">
                            {/* Invoice Context Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[#111118]/20 pb-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
	                                  className="text-[13px] sm:text-[15px] font-black text-[#111118] uppercase tracking-wider hover:text-[#FF5C00] transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center group"
	                                >
	                                  {inv.invoiceNumber} <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
	                                </button>
	                                <CanonicalInvoiceStateBadge invoice={inv} />
	                              </div>
                              <span className="text-[14px] font-black text-[#111118] font-syne">₹{formatIndian(inv.totalAmount)}</span>
                            </div>

                            {/* Client Note & Action Button (Gestalt Proximity & Fitts Law) */}
                            {isProposed && inv.clientMsaNote && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full bg-[#FFFBE6] border-2 border-[#B45309] p-3 shadow-[2px_2px_0_#B45309]">
                                <div className="flex-1">
                                  <p className="text-[10px] font-black text-[#B45309] uppercase tracking-wider m-0 mb-1 flex items-center gap-1.5">
                                    <span className="text-[12px]">⚠️</span> Client Note
                                  </p>
                                  <p className="text-[12px] text-[#B45309] m-0 italic font-medium leading-relaxed">&quot;{inv.clientMsaNote}&quot;</p>
                                </div>
                                <Link
                                  href={`/invoice/new?id=${inv.id}&restore=1&step=payment`}
                                  className="shrink-0 flex items-center justify-center px-4 py-2 text-[12px] font-black text-[#111118] bg-[#BEFF00] border-2 border-[#111118] shadow-[2px_2px_0_#111118] hover:shadow-[4px_4px_0_#111118] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all uppercase tracking-wider min-h-[44px]"
                                >
                                  UPDATE ADDENDUM →
                                </Link>
                              </div>
                            )}

                            {/* Flattened Milestones with subtle line items */}
                            <div className="flex flex-col gap-4 mt-1">
                              {inv.milestones.length > 0 ? (
                                inv.milestones.map((m, mi) => {
                                  const s = (m.status || "").toLowerCase();
                                  const isPending =
                                    s === "pending" ||
                                    s === "live" ||
                                    s === "overdue" ||
                                    s === "sent" ||
                                    s === "partial" ||
                                    s === "saved";
                                  const statusBg = s === "settled" ? "#00DCB4" : s === "overdue" ? "#FF5C00" : ["live", "sent", "finalized", "partial", "saved"].includes(s) ? "#BEFF00" : "#E0E0E0";
                                  const title = m.title || "(No Milestone Title)";
                                  
                                  const formMilestone = inv.formDataMilestones?.[m.orderIndex];
                                  const milestoneLineItems = formMilestone?.lineItems || [];
                                  
                                  let dueDateText = "Upcoming";
                                  let isPastDue = false;
                                  if (s === "settled") dueDateText = "Settled ✓";
                                  else if (isPending) {
                                    if (inv.dueDate) {
                                      const diffDays = Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                      if (diffDays < 0) { isPastDue = true; dueDateText = `${Math.abs(diffDays)} days past due`; }
                                      else if (diffDays === 0) dueDateText = "Due today";
                                      else dueDateText = `${diffDays} days till due`;
                                    } else dueDateText = "Pending";
                                  }

                                  let effectiveAmount = m.amount;
                                  if (effectiveAmount === 0 && milestoneLineItems.length > 0) {
                                    effectiveAmount = milestoneLineItems.reduce((s: number, li: any) => s + Number(li.qty || 0) * Number(li.rate || 0), 0);
                                  }

                                  return (
                                    <div key={mi} className="flex flex-col gap-1.5">
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex items-start gap-2.5">
                                          <div className="w-[14px] h-[14px] border-2 border-[#111118] shrink-0 mt-[2px] flex items-center justify-center shadow-[1px_1px_0_#111118]" style={{ backgroundColor: statusBg }} />
                                          <div>
                                            <span className="text-[13px] font-black text-[#111118] uppercase tracking-tight">{title}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className={cn("text-[10px] font-bold uppercase", isPastDue ? "text-[#FF5C00]" : "text-[#888]")}>{dueDateText}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <span className="text-[12px] font-bold text-[#111118]">₹{formatIndian(effectiveAmount)}</span>
                                      </div>
                                      
                                      {/* Line Items (Indented, subtly styled) */}
                                      {milestoneLineItems.length > 0 && (
                                        <div className="pl-[26px] flex flex-col gap-1 text-[11px] font-medium text-[#555]">
                                          {milestoneLineItems.map((li: any, liIdx: number) => (
                                            <div key={liIdx} className="flex items-start gap-1">
                                              <span className="text-[#888] mt-[-1px]">↳</span>
                                              <span>{li.description || li.type || "Deliverable"} <span className="opacity-70">({li.qty} {li.rateUnit?.replace("per-", "") || "unit"} @ ₹{formatIndian(Number(li.rate || 0))})</span></span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-[11px] font-bold text-[#888] uppercase italic pl-[26px]">Standard Invoice (No detailed milestones)</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
                </>
              ) : (
                <>
                  {/* INVOICE VIEW LOGIC */}
                  {filteredAndSortedInvoices.map((inv) => {
                    const msaLower = (inv.msaStatus || "").toLowerCase();
                    const isProposed = msaLower === "proposed";
                    const allMilestones = inv.milestones || [];
                    const sparkTotal = inv.totalAmount || 1;
                    
                    return (
                      <div key={inv.id} className="border-2 border-[#111118] bg-white shadow-[4px_4px_0_#111118] flex flex-col transition-all hover:shadow-[6px_6px_0_#111118] hover:-translate-y-[2px]">
                        
                        {/* Header: Invoice Summary */}
                        <div className="p-4 sm:p-5 border-b-2 border-[#111118] bg-white">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5">
                            <div>
                              <div className="flex items-center gap-3 flex-wrap mb-1">
                                <Link
                                  href={`/invoice/${inv.id}/client-preview`}
                                  className="text-[20px] sm:text-[24px] font-black text-[#111118] uppercase tracking-wider m-0 leading-tight hover:text-[#FF5C00] transition-colors"
                                >
	                                  {inv.invoiceNumber} <span className="text-[16px]">↗</span>
	                                </Link>
	                              </div>
                              <p className="text-[12px] font-bold text-[#888] m-0 mt-1 uppercase tracking-widest">{inv.clientName} {inv.clientCity ? `· ${inv.clientCity}` : ''}</p>
                            </div>
                            <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
	                              <p className={`text-[20px] sm:text-[24px] font-black font-syne m-0 ${inv.status.toLowerCase() === 'sent' && new Date(inv.dueDate) < new Date() ? 'text-[#FF5C00]' : 'text-[#111118]'}`}>
	                                ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(inv.totalAmount)}
	                              </p>
	                              <CanonicalInvoiceStateBadge invoice={inv} />
                            </div>
                          </div>

                          {/* Milestone Progress Bar */}
                          {allMilestones.length > 0 ? (
                            <div className="w-full flex flex-col gap-1.5">
                              <div className="w-full h-[14px] border-2 border-[#111118] flex overflow-hidden shadow-[2px_2px_0_#111118]">
                                {allMilestones.map((m: any, i: number) => {
                                  const s = (m.status || "").toLowerCase();
                                  const bg = s === "settled" ? "#00DCB4" : s === "overdue" ? "#FF5C00" : ["live", "sent", "finalized", "partial", "saved"].includes(s) ? "#BEFF00" : "#E0E0E0";
                                  
                                  let effectiveAmount = m.amount;
                                  if (effectiveAmount === 0 && inv.formDataMilestones?.[m.orderIndex]) {
                                    effectiveAmount = (inv.formDataMilestones[m.orderIndex].lineItems || []).reduce((sum: number, li: any) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0);
                                  }
                                  const widthPct = Math.max((effectiveAmount / sparkTotal) * 100, 2);
                                  return (
                                    <div key={i} style={{ width: `${widthPct}%`, backgroundColor: bg }} className="h-full border-r-2 border-[#111118] last:border-r-0" />
                                  );
                                })}
                              </div>
                              <div className="flex justify-between text-[10px] font-bold text-[#888] uppercase tracking-widest mt-1">
                                <span>0%</span>
                                <span>Timeline</span>
                                <span>100%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-[14px] border-2 border-[#111118] bg-[#E0E0E0] shadow-[2px_2px_0_#111118]" />
                          )}
                        </div>

                        {/* Body: Milestone Details & Actions */}
                        <div className="bg-[#FAFAF6] p-4 sm:p-5 flex flex-col gap-6">
                          {/* Client Note & Action Button (Gestalt Proximity & Fitts Law) */}
                          {isProposed && inv.clientMsaNote && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full bg-[#FFFBE6] border-2 border-[#B45309] p-3 shadow-[2px_2px_0_#B45309]">
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-[#B45309] uppercase tracking-wider m-0 mb-1 flex items-center gap-1.5">
                                  <span className="text-[12px]">⚠️</span> Client Note
                                </p>
                                <p className="text-[12px] text-[#B45309] m-0 italic font-medium leading-relaxed">&quot;{inv.clientMsaNote}&quot;</p>
                              </div>
                              <Link
                                href={`/invoice/new?id=${inv.id}&restore=1&step=payment`}
                                className="shrink-0 flex items-center justify-center px-4 py-2 text-[12px] font-black text-[#111118] bg-[#BEFF00] border-2 border-[#111118] shadow-[2px_2px_0_#111118] hover:shadow-[4px_4px_0_#111118] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all uppercase tracking-wider min-h-[44px]"
                              >
                                UPDATE ADDENDUM →
                              </Link>
                            </div>
                          )}

                          {/* Flattened Milestones with subtle line items */}
                          <div className="flex flex-col gap-4">
                            {allMilestones.length > 0 ? (
                              allMilestones.map((m: any, mi: number) => {
                                const s = (m.status || "").toLowerCase();
                                const isPending =
                                  s === "pending" ||
                                  s === "live" ||
                                  s === "overdue" ||
                                  s === "sent" ||
                                  s === "partial" ||
                                  s === "saved";
                                const statusBg = s === "settled" ? "#00DCB4" : s === "overdue" ? "#FF5C00" : ["live", "sent", "finalized", "partial", "saved"].includes(s) ? "#BEFF00" : "#E0E0E0";
                                const title = m.title || "(No Milestone Title)";
                                
                                const formMilestone = inv.formDataMilestones?.[m.orderIndex];
                                const milestoneLineItems = formMilestone?.lineItems || [];
                                
                                let dueDateText = "Upcoming";
                                let isPastDue = false;
                                if (s === "settled") dueDateText = "Settled ✓";
                                else if (isPending) {
                                  if (inv.dueDate) {
                                    const diffDays = Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays < 0) { isPastDue = true; dueDateText = `${Math.abs(diffDays)} days past due`; }
                                    else if (diffDays === 0) dueDateText = "Due today";
                                    else dueDateText = `${diffDays} days till due`;
                                  } else dueDateText = "Pending";
                                }

                                let effectiveAmount = m.amount;
                                if (effectiveAmount === 0 && milestoneLineItems.length > 0) {
                                  effectiveAmount = milestoneLineItems.reduce((sum: number, li: any) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0);
                                }

                                return (
                                  <div key={mi} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-start gap-3">
                                      <div className="flex items-start gap-2.5">
                                        <div className="w-[14px] h-[14px] border-2 border-[#111118] shrink-0 mt-[2px] flex items-center justify-center shadow-[1px_1px_0_#111118]" style={{ backgroundColor: statusBg }} />
                                        <div>
                                          <span className="text-[13px] font-black text-[#111118] uppercase tracking-tight">{title}</span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] font-bold uppercase ${isPastDue ? "text-[#FF5C00]" : "text-[#888]"}`}>{dueDateText}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-[12px] font-bold text-[#111118]">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(effectiveAmount)}</span>
                                    </div>
                                    
                                    {milestoneLineItems.length > 0 && (
                                      <div className="pl-[26px] flex flex-col gap-1 text-[11px] font-medium text-[#555]">
                                        {milestoneLineItems.map((li: any, liIdx: number) => (
                                          <div key={liIdx} className="flex items-start gap-1">
                                            <span className="text-[#888] mt-[-1px]">↳</span>
                                            <span>{li.description || li.type || "Deliverable"} <span className="opacity-70">({li.qty} {li.rateUnit?.replace("per-", "") || "unit"} @ ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(li.rate || 0))})</span></span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[11px] font-bold text-[#888] uppercase italic pl-[26px]">Standard Invoice (No detailed milestones)</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            {/* Empty state */}
            {((ledgerView === "client" && filteredAndSortedClients.length === 0) ||
              (ledgerView === "project" && filteredAndSortedProjects.length === 0) ||
              (ledgerView === "invoice" && filteredAndSortedInvoices.length === 0)) && (
              <div className="px-4 py-8 text-center bg-white border-t border-[color:var(--border-subtle)]">
                <p className="text-[13px] text-[color:var(--text-muted)] font-bold uppercase tracking-wider">
                  {ledgerView === "project"
                    ? "No matching projects found."
                    : ledgerView === "client"
                    ? "No matching clients found."
                    : "No matching invoices found."}
                </p>
                <button
                  onClick={() => { setSearchTerm(""); setFilterType("all"); }}
                  className="mt-2 text-[12px] font-bold text-[#FF5C00] underline cursor-pointer hover:text-[#111118] select-none"
                >
                  Reset Filters & Search
                </button>
              </div>
            )}

	            {/* Footer */}
	            <div className="border-t-2 border-[#111118] px-4 py-3 bg-[#F8F8F4]">
	              <p className="text-[12px] font-bold text-[color:var(--text-muted)]">
	                {ledgerView === "project" ? (
	                  <>
	                    Showing {filteredAndSortedProjects.length} of {projectsHealth.length} {projectsHealth.length === 1 ? 'project' : 'projects'} · {(() => { const c = filteredAndSortedProjects.reduce((sum, p) => sum + p.invoices.length, 0); return `${c} ${c === 1 ? 'invoice' : 'invoices'}`; })()}
	                  </>
	                ) : ledgerView === "client" ? (
	                  <>
	                    Showing {filteredAndSortedClients.length} of {clientsHealth.length} {clientsHealth.length === 1 ? 'client' : 'clients'} · {(() => { const c = filteredAndSortedClients.reduce((sum, cl) => sum + cl.invoices.length, 0); return `${c} ${c === 1 ? 'invoice' : 'invoices'}`; })()}
	                  </>
	                ) : (
	                  <>
	                    Showing {filteredAndSortedInvoices.length} of {clientsHealth.reduce((sum, c) => sum + c.invoices.length, 0)} {clientsHealth.reduce((sum, c) => sum + c.invoices.length, 0) === 1 ? 'invoice' : 'invoices'}
	                  </>
	                )}
	              </p>
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
                    href={`/invoice/new?id=${selectedInvoice.id}&restore=1`}
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

              {/* Settlement checkpoint */}
              {(() => {
                const milestones = selectedInvoice.milestones || [];
                const activeMilestoneIndex = milestones.findIndex(
                  (m: any) => (m.status || "").toUpperCase() !== "SETTLED"
                );
                const activeMilestone = activeMilestoneIndex >= 0 ? milestones[activeMilestoneIndex] : null;
                const nextMilestone = activeMilestoneIndex >= 0 ? milestones[activeMilestoneIndex + 1] : null;
                const dueDateStr = selectedInvoice.dueDate || selectedInvoice.due_date || selectedInvoice.form_data?.meta?.dueDate;
                const daysUntilDue = getDaysUntil(dueDateStr);
                const netDays = parsePaymentTermsDays(
                  selectedInvoice.applied_payment_terms || selectedInvoice.form_data?.meta?.paymentTerms
                );
                const settlementAmount = activeMilestone
                  ? Number(activeMilestone.amount || 0)
                  : Number(selectedInvoice.totalAmount || 0);
                const dueTone =
                  daysUntilDue === null
                    ? "neutral"
                    : daysUntilDue < 0
                      ? "danger"
                      : daysUntilDue <= 3
                        ? "warning"
                        : "active";
                const dueCopy =
                  daysUntilDue === null
                    ? "Due date not set"
                    : daysUntilDue < 0
                      ? `${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "day" : "days"} overdue`
                      : daysUntilDue === 0
                        ? "Due today"
                        : `Due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`;
                const nextAction = activeMilestone
                  ? nextMilestone
                    ? `Mark M${activeMilestoneIndex + 1} paid, then M${activeMilestoneIndex + 2} starts with Net ${netDays}.`
                    : "Mark final milestone paid to close the invoice."
                  : "Invoice already has no open milestone.";

                return (
                  <div className="overflow-hidden border-2 border-[#111118] bg-white shadow-[2px_2px_0_#111118]">
                    <div className="flex items-center gap-2 border-b-2 border-[#111118] bg-[#EBFDF9] px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-[#007A63]" strokeWidth={2.5} />
                      <p className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-[#007A63]">
                        Settlement checkpoint
                      </p>
                    </div>
                    <div className="grid grid-cols-3 divide-x-2 divide-[#111118]">
                      <div className="p-3">
                        <div className="mb-2 flex h-7 w-7 items-center justify-center border-2 border-[#111118] bg-[#BEFF00] text-[#111118]">
                          <ReceiptText className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Clear</p>
                        <p className="m-0 mt-1 text-[13px] font-black text-[#111118]">₹{formatIndian(settlementAmount)}</p>
                      </div>
                      <div className="p-3">
                        <div className={cn(
                          "mb-2 flex h-7 w-7 items-center justify-center border-2 border-[#111118]",
                          dueTone === "danger" ? "bg-[#FFF0EC] text-[#C2410C]" :
                          dueTone === "warning" ? "bg-[#FFFBE6] text-[#B45309]" :
                          "bg-[#E0F3FF] text-[#164E63]"
                        )}>
                          <CalendarClock className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Timing</p>
                        <p className="m-0 mt-1 text-[12px] font-black leading-4 text-[#111118]">{dueCopy}</p>
                      </div>
                      <div className="p-3">
                        <div className="mb-2 flex h-7 w-7 items-center justify-center border-2 border-[#111118] bg-[#F0EAFF] text-[#5530DB]">
                          <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--text-muted)]">After</p>
                        <p className="m-0 mt-1 text-[12px] font-black leading-4 text-[#111118]">{nextAction}</p>
                      </div>
                    </div>
                    <div className="border-t-2 border-[#111118] bg-[#F8F8F4] px-3 py-2">
                      <p className="m-0 text-[11px] font-bold leading-5 text-[color:var(--text-secondary)]">
                        Confirm only after the payment is visible in your bank account.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Contract Authority & Terms */}
              <div className="border-2 border-[#111118] bg-[#FAFAD2] p-3 shadow-[2px_2px_0_#111118]">
                <p className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider uppercase mb-1">Contract Authority</p>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="flex h-6 w-6 items-center justify-center border-2 border-[#111118] bg-white text-[#111118]">
                    {selectedInvoice.has_addendum ? (
                      <ReceiptText className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : selectedInvoice.msa_id ? (
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <Landmark className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
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
                    <span className="font-semibold">
                      {selectedInvoice.applied_late_fee_rate != null
                        ? `${selectedInvoice.applied_late_fee_rate}% per ${selectedInvoice.applied_late_fee_unit || "month"}`
                        : "1.5% per month"}
                    </span>
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
                      const isLive = ["live", "sent", "finalized", "partial", "saved"].includes(s);

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
                const milestones = selectedInvoice.milestones || [];
                const activeMilestoneIndex = milestones
                  ? milestones.findIndex(
                      (m: any) => (m.status || "").toUpperCase() !== "SETTLED"
                    )
                  : -1;
                const activeMilestone = activeMilestoneIndex >= 0 ? milestones[activeMilestoneIndex] : null;
                const nextMilestone = activeMilestoneIndex >= 0 ? milestones[activeMilestoneIndex + 1] : null;
                const settlementAmount = activeMilestone
                  ? Number(activeMilestone.amount || 0)
                  : Number(selectedInvoice.totalAmount || 0);

                const dueDateStr = selectedInvoice.dueDate || selectedInvoice.due_date || selectedInvoice.form_data?.meta?.dueDate;
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
                    {milestones.length > 0 && activeMilestoneIndex !== -1 && (
                      <button
                        onClick={() => openSettlementModal(activeMilestoneIndex)}
                        className="inline-flex w-full items-center justify-center gap-2 bg-[#00DCB4] text-[#111118] border-2 border-[#111118] py-2.5 text-[12px] font-black shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all cursor-pointer uppercase font-syne"
                      >
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                        {nextMilestone
                          ? `Mark M${activeMilestoneIndex + 1} paid · ₹${formatIndian(settlementAmount)}`
                          : `Mark final paid · ₹${formatIndian(settlementAmount)}`}
                      </button>
                    )}

                    {/* Conditionally show Nudge */}
                    {showNudge && (
                      <button
                        onClick={() => {
                          showAlert("Nudge Sent", `Payment reminder triggered for ${selectedInvoice.invoiceNumber}.`, "success");
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 bg-[#FF5C00] text-white border-2 border-[#111118] py-2 text-[12px] font-bold shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118] transition-all cursor-pointer uppercase font-syne"
                      >
                        <Send className="h-4 w-4" strokeWidth={2.5} />
                        Send Nudge
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {settlementModal && selectedInvoice && (() => {
        const milestone = selectedInvoice.milestones?.[settlementModal.milestoneIndex];
        const nextIndex = settlementModal.milestoneIndex + 1;
        const todayValue = toDateInputValue(new Date());
        const scheduleDateInvalid =
          settlementModal.triggerMode === "scheduled" &&
          (!settlementModal.triggerDate || settlementModal.triggerDate < todayValue);
        const optionRowClass = (mode: MilestoneTriggerMode) => cn(
          "flex cursor-pointer items-start gap-3 border-2 border-black p-3 transition-colors hover:bg-[#FAF7F2]",
          settlementModal.triggerMode === mode ? "bg-[#FAF7F2]" : "bg-white",
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSettlementModal(null)}
          >
            <div
              className="w-full max-w-[480px] border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_#000]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b-2 border-black pb-3">
                <h2 className="m-0 text-lg font-black uppercase tracking-wide text-[#111118]">
                  Settle Milestone {milestone?.title || `M${settlementModal.milestoneIndex + 1}`}?
                </h2>
                <p className="m-0 mt-1 text-sm font-medium text-neutral-600">
                  What happens to the next milestone?
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <label className={optionRowClass("immediate")}>
                  <input
                    type="radio"
                    name="milestone-trigger-mode"
                    value="immediate"
                    checked={settlementModal.triggerMode === "immediate"}
                    onChange={() =>
                      setSettlementModal((prev) =>
                        prev ? { ...prev, triggerMode: "immediate" } : prev
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#111118]"
                  />
                  <span>
                    <span className="block text-[13px] font-black uppercase text-[#111118]">
                      Send next milestone invoice now
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-neutral-600">
                      M{nextIndex + 1} invoice generated and emailed immediately
                    </span>
                  </span>
                </label>

                <label className={optionRowClass("scheduled")}>
                  <input
                    type="radio"
                    name="milestone-trigger-mode"
                    value="scheduled"
                    checked={settlementModal.triggerMode === "scheduled"}
                    onChange={() =>
                      setSettlementModal((prev) =>
                        prev ? { ...prev, triggerMode: "scheduled" } : prev
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#111118]"
                  />
                  <span className="flex-1">
                    <span className="block text-[13px] font-black uppercase text-[#111118]">
                      Schedule for later
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-neutral-600">
                      M{nextIndex + 1} invoice generated and emailed on the chosen date
                    </span>
                    {settlementModal.triggerMode === "scheduled" && (
                      <input
                        type="date"
                        min={todayValue}
                        value={settlementModal.triggerDate}
                        onChange={(event) =>
                          setSettlementModal((prev) =>
                            prev ? { ...prev, triggerDate: event.target.value } : prev
                          )
                        }
                        className="mt-3 w-full border-2 border-black bg-white px-3 py-2 text-[13px] font-bold text-[#111118] outline-none focus:bg-[#FAF7F2]"
                      />
                    )}
                  </span>
                </label>

                <label className={optionRowClass("cancelled")}>
                  <input
                    type="radio"
                    name="milestone-trigger-mode"
                    value="cancelled"
                    checked={settlementModal.triggerMode === "cancelled"}
                    onChange={() =>
                      setSettlementModal((prev) =>
                        prev ? { ...prev, triggerMode: "cancelled" } : prev
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#111118]"
                  />
                  <span>
                    <span className="block text-[13px] font-black uppercase text-[#111118]">
                      Close project — no more milestones
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-neutral-600">
                      Remaining milestones soft-cancelled. No invoices generated.
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettlementModal(null)}
                  className="border-2 border-black bg-white px-4 py-2 text-[12px] font-black uppercase text-[#111118] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={scheduleDateInvalid}
                  onClick={() => {
                    if (scheduleDateInvalid) return;
                    const { milestoneIndex, triggerMode, triggerDate } = settlementModal;
                    setSettlementModal(null);
                    void handleSettleMilestone(milestoneIndex, { triggerMode, triggerDate });
                  }}
                  className="border-[3px] border-black bg-[#D4FF00] px-4 py-2 text-[12px] font-black uppercase text-[#111118] shadow-[4px_4px_0_#000] disabled:cursor-not-allowed disabled:bg-[#D4D2CC] disabled:text-[#6B6660] disabled:shadow-none"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
  } catch (err: any) {
    console.error("RENDER ERROR:", err);
    return (
      <div className="p-8 bg-red-100 text-red-900 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Dashboard Render Error</h1>
        <pre className="whitespace-pre-wrap">{err.stack}</pre>
      </div>
    );
  }
}
