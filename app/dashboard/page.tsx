"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatProjectedDate } from "@/lib/lifecycle/timing";
import { ProjectRail } from "@/components/dashboard/ProjectRail";
import { LifecycleStepper } from "@/components/dashboard/LifecycleStepper";
import { ActiveDrilldown, formatInr } from "@/components/dashboard/ActiveDrilldown";
import { CloseProjectModal } from "@/components/dashboard/CloseProjectModal";
import { ProjectInvoicesLedger } from "@/components/dashboard/ProjectInvoicesLedger";
import { Sticker } from "@/components/ui/Sticker";
import { Marker } from "@/components/ui/Marker";
import { computeProjectLifecycle } from "@/lib/lifecycle/computeProjectLifecycle";
import { computeActiveDrilldown, DrilldownState } from "@/lib/lifecycle/computeActiveDrilldown";
import { dateInputToMilestoneTriggerIso, formatDateInputValue } from "@/lib/milestone-trigger-date";
import { computeInvoiceTax } from "@/lib/invoice-tax";

type TriggerMode = "immediate" | "scheduled" | "cancelled";

type SettlementChoice = {
  invoiceId: string;
  projectId: string;
  milestoneNumber: number;
  milestoneTitle: string;
  triggerMode: TriggerMode;
  triggerDate: string;
  tdsPercent: number;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatTimingLabel(value?: string | null): string {
  if (!value) return "Date not set";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "Date not set";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Due today";
  if (diffDays > 0) return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  const overdueDays = Math.abs(diffDays);
  return `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
}

function normalizeLateFeeUnit(unit?: string | null): string {
  const value = (unit || "month").toLowerCase();
  if (value === "daily") return "day";
  if (value === "weekly") return "week";
  if (value === "monthly") return "month";
  if (value === "annually" || value === "yearly") return "year";
  return value;
}

function getPaymentTermsLabel(invoice: Record<string, any> | null): string {
  if (!invoice) return "Net 20 days";
  if (invoice.applied_payment_terms) return String(invoice.applied_payment_terms);

  const days =
    invoice.payment_terms_days ??
    invoice.form_data?.meta?.paymentTerms ??
    invoice.form_data?.agency?.msaPaymentTermsDays ??
    invoice.form_data?.client?.msaPaymentTermsDays;

  if (days === 0) return "Due on Receipt";
  if (days != null && days !== "") return `Net ${days} days`;
  return "Net 20 days";
}

function getLateFeeLabel(invoice: Record<string, any> | null): string {
  if (!invoice) return "1.5% per month";
  const rate =
    invoice.applied_late_fee_rate ??
    invoice.form_data?.agency?.msaLateFeeRate ??
    invoice.form_data?.client?.msaLateFeeRate ??
    1.5;
  const unit = normalizeLateFeeUnit(
    invoice.applied_late_fee_unit ??
    invoice.form_data?.agency?.msaLateFeeUnit ??
    invoice.form_data?.client?.msaLateFeeUnit,
  );

  return `${rate}% per ${unit}`;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("project");

  const [projects, setProjects] = useState<ProjectWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [projectClosureData, setProjectClosureData] = useState<{ projectName: string; cost: string } | null>(null);
  const [closeProjectFor, setCloseProjectFor] = useState<{ id: string; name: string } | null>(null);
  const [settlementChoice, setSettlementChoice] = useState<SettlementChoice | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllProjectsWithInvoices();
    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (projects.length === 0 || didInitRef.current) return;
    didInitRef.current = true;
    if (!projectId) {
      router.replace(`/dashboard?project=${projects[0].project.id}`);
    }
  }, [projects, projectId, router]);

  const selectedProject = projectId ? projects.find(p => p.project.id === projectId) : null;
  const drilldownState = useMemo(
    () => selectedProject ? computeActiveDrilldown(selectedProject) : null,
    [selectedProject]
  );

  const dueSoonAlerts = useMemo(() => {
    const alerts: { projectId: string; projectName: string; milestoneNumber: number; milestoneTitle: string; dueDays: number }[] = [];
    for (const p of projects) {
      const d = computeActiveDrilldown(p);
      if (d?.primary_action === 'mark_settled' && d.invoice?.due_date && d.milestone) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due = new Date(d.invoice.due_date); due.setHours(0, 0, 0, 0);
        const dueDays = Math.round((due.getTime() - today.getTime()) / 86400000);
        if (dueDays <= 2) {
          alerts.push({
            projectId: p.project.id,
            projectName: p.project.name,
            milestoneNumber: (d.milestone.order_index ?? 0) + 1,
            milestoneTitle: d.milestone.title || `Milestone ${(d.milestone.order_index ?? 0) + 1}`,
            dueDays,
          });
        }
      }
    }
    return alerts.sort((a, b) => a.dueDays - b.dueDays);
  }, [projects]);

  const getMasterInvoice = useCallback(() => {
    return selectedProject?.invoices.find(invoice => !(invoice as any).parent_invoice_id) ?? null;
  }, [selectedProject]);

  const handleSendNow = async (state: DrilldownState | null) => {
    if (!state?.milestone?.id) return;
    const response = await fetch("/api/invoice/scheduled-milestone-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_now", milestone_id: state.milestone.id }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionMessage(payload.error || payload.reason || "Could not send the scheduled milestone.");
      return;
    }

    setActionMessage(`M${(state.milestone.order_index ?? 0) + 1} invoice sent.`);
    await loadProjects();
  };

  const handleMarkSettled = (state: DrilldownState | null) => {
    if (!selectedProject || !state?.milestone) {
      setActionMessage("Could not find an active milestone to settle.");
      return;
    }
    const masterInvoice = getMasterInvoice();
    if (!masterInvoice) {
      setActionMessage("Could not find the master invoice for this project.");
      return;
    }

    setSettlementChoice({
      invoiceId: masterInvoice.id,
      projectId: selectedProject.project.id,
      milestoneNumber: (state.milestone.order_index ?? 0) + 1,
      milestoneTitle: state.milestone.title || `Milestone ${(state.milestone.order_index ?? 0) + 1}`,
      triggerMode: "scheduled",
      triggerDate: formatDateInputValue(7),
      tdsPercent: 0,
    });
  };

  const confirmSettlement = async () => {
    if (!settlementChoice) return;

    const body: Record<string, unknown> = {
      invoice_id: settlementChoice.invoiceId,
      project_id: isUuid(settlementChoice.projectId) ? settlementChoice.projectId : null,
      trigger_mode: settlementChoice.triggerMode,
    };

    const masterInvoice = getMasterInvoice();
    const settlementMilestones = selectedProject?.milestones
      .filter(milestone => milestone.invoice_id === masterInvoice?.id)
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) ?? [];
    const nextMilestone = settlementMilestones.find(
      milestone => (milestone.order_index ?? 0) + 1 === settlementChoice.milestoneNumber + 1,
    ) ?? null;
    const isProjectClosing = settlementChoice.triggerMode === "cancelled" || !nextMilestone;

    const currentSettlingMilestone = settlementMilestones.find(
      milestone => (milestone.order_index ?? 0) + 1 === settlementChoice.milestoneNumber,
    ) ?? null;
    body.tds_amount = Math.round((Number(currentSettlingMilestone?.amount || 0) * (settlementChoice.tdsPercent || 0)) / 100);

    if (settlementChoice.triggerMode === "scheduled") {
      if (!settlementChoice.triggerDate) return;
      body.trigger_date = dateInputToMilestoneTriggerIso(settlementChoice.triggerDate);
    }

    const response = await fetch("/api/invoice/trigger-next-milestone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionMessage(payload.error || payload.reason || "Could not settle this milestone.");
      return;
    }

    if (isProjectClosing) {
      setProjectClosureData({
        projectName: selectedProject?.project.name || "Project",
        cost: formatInr(selectedProject?.metrics.billed || 0),
      });
    } else {
      setActionMessage(`M${settlementChoice.milestoneNumber} marked settled.`);
    }

    setSettlementChoice(null);
    await loadProjects();
  };

  const handleResend = async (state: DrilldownState | null) => {
    if (!state?.invoice) return;
    const clientEmail = state.invoice.shared_to_email || state.invoice.form_data?.client?.clientEmail;
    if (!clientEmail) {
      setActionMessage("No client email found for this invoice.");
      return;
    }

    // NUDGE CLIENT uses the dedicated reminder endpoint (no share lock-state gate).
    const response = await fetch("/api/invoice/nudge-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: state.invoice.id }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionMessage(payload.error || payload.reason || "Could not send the reminder.");
      return;
    }

    setActionMessage("Reminder sent to client.");
    await loadProjects();
  };

  const handleCloseProject = async (reason: string, notifyClient: boolean) => {
    if (!closeProjectFor) return;
    const projectName = closeProjectFor.name;
    const response = await fetch("/api/project/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: closeProjectFor.id, reason, notify_client: notifyClient }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionMessage(payload.error || payload.reason || "Could not close the project.");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setActionMessage(
      payload.notified ? `${projectName} closed. The client was notified.` : `${projectName} closed.`,
    );
    setCloseProjectFor(null);
    await loadProjects();
  };

  const handleEdit = (state: DrilldownState | null, step?: string) => {
    if (!state?.invoice) return;
    const stepParam = step ? `&step=${step}` : "";
    router.push(`/invoice/new?id=${state.invoice.id}&restore=1${stepParam}`);
  };

  const handlePreview = (state: DrilldownState | null) => {
    if (!state?.invoice) return;
    router.push(`/invoice/preview?id=${state.invoice.id}`);
  };

  return (
    <div className={appPageShellClass}>
      <AppHeader />
      <h1 className="sr-only">Dashboard</h1>
      <main className={`${appPageContainerClass} max-w-none px-0 py-0 flex-1 flex h-[calc(100vh-64px)] overflow-hidden`}>

        {/* Left Rail */}
        <ProjectRail
          projects={projects}
          selectedProjectId={projectId || undefined}
          onNewInvoice={() => router.push('/invoice/new?fresh=1')}
        />

        {/* Right Content */}
        <div className={`${selectedProject ? "block" : "hidden md:block"} flex-1 bg-paper-2 overflow-y-auto no-scrollbar`}>
          {loading ? (
            <div className="flex h-full items-center justify-center font-extrabold tracking-wide text-neutral-400">
              Loading projects…
            </div>
          ) : selectedProject ? (
            <div className="flex flex-col min-h-full p-8 md:p-10 relative overflow-x-hidden">
              <button
                onClick={() => router.replace('/dashboard')}
                className="md:hidden mb-4 self-start inline-flex items-center gap-1.5 border border-soft rounded-[11px] bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-ink shadow-[var(--brutal-shadow-sm)] active:translate-y-[2px] active:shadow-none"
              >
                ← Projects
              </button>
              {dueSoonAlerts.length > 0 && (
                <div className="mb-6 rounded-[14px] border border-soft bg-acc-soft shadow-[var(--elev-1)]">
                  <div className="px-4 py-2 border-b border-soft text-[10px] font-extrabold uppercase tracking-widest text-ink flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center bg-[#D85A30] text-acc-ink text-[10px] font-black">!</span>
                    PAYMENTS DUE SOON · {dueSoonAlerts.length}
                  </div>
                  <div className="divide-y divide-ink/15">
                    {dueSoonAlerts.map(a => {
                      const timing = a.dueDays < 0
                        ? `OVERDUE BY ${Math.abs(a.dueDays)} DAY${Math.abs(a.dueDays) === 1 ? '' : 'S'}`
                        : a.dueDays === 0 ? 'DUE TODAY'
                        : `DUE IN ${a.dueDays} DAY${a.dueDays === 1 ? '' : 'S'}`;
                      return (
                        <button key={a.projectId} onClick={() => router.replace(`/dashboard?project=${a.projectId}`)} className="w-full text-left px-4 py-2.5 hover:bg-paper-2 transition-colors flex items-center justify-between gap-3">
                          <span className="text-[12px] font-bold text-ink truncate">{a.projectName} · M{a.milestoneNumber} {a.milestoneTitle}</span>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D85A30] shrink-0">{timing} · NUDGE AVAILABLE</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Title Section */}
              <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start mb-6">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3 items-center whitespace-nowrap">
                    <div className="px-3 py-1 bg-acid text-acc-ink text-[10px] font-extrabold uppercase tracking-widest border border-soft rounded-full shadow-[var(--elev-0)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-acc-ink rounded-full animate-pulse" /> LIVE</div>
                    <div className="px-3 py-1 bg-white text-ink text-[10px] font-extrabold uppercase tracking-widest border border-soft rounded-full shadow-[var(--elev-0)]">
                      {drilldownState?.milestone ? `M${(drilldownState.milestone.order_index ?? 0) + 1} OF ${selectedProject.milestones.length}` : `${selectedProject.milestones.length} MILESTONES`}
                    </div>
                    {(() => {
                      const master = getMasterInvoice();
                      const invNum = master?.invoice_number;
                      if (!invNum) return null;
                      return (
                        <div className="px-3 py-1 bg-white text-ink text-[10px] font-extrabold uppercase tracking-widest border border-soft rounded-full shadow-[var(--elev-0)]">
                          {invNum}
                        </div>
                      );
                    })()}
                  </div>
                  <h1 className="font-display font-black text-[56px] leading-[1.05] tracking-tight mb-2 text-ink max-w-[800px]">
                    {selectedProject.project.name}
                  </h1>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">
                    CLIENT · {selectedProject.project.client?.client_name || "Unknown"} · {selectedProject.project.client?.city || "Unknown"}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="px-4 py-2 border-2 border-transparent hover:border-ink hover:bg-paper-2 font-extrabold text-[11px] uppercase tracking-widest transition-all">
                    ⤓ EXPORT
                  </button>


                </div>
              </div>

              {/* 3-card stat strip — Project total is the ink hero */}
              <div className="flex flex-wrap gap-4 mb-7">
                {[
                  { label: "Project total", val: formatInr(selectedProject.metrics.billed), sub: `${selectedProject.milestones.length} milestones`, hero: true, tone: "ink" },
                  { label: "Collected", val: formatInr(selectedProject.metrics.collected), sub: `${selectedProject.milestones.filter(m => (m.status || '').toLowerCase() === 'settled').length} settled`, hero: false, tone: "green" },
                  { label: "In flight", val: formatInr(selectedProject.metrics.outstanding), sub: drilldownState?.milestone ? `M${(drilldownState.milestone.order_index ?? 0) + 1} active` : "0 active", hero: false, tone: "ochre" }
                ].map((s, i) => {
                  const cardTone = s.hero ? 'flex-[1.5] bg-acid text-acc-ink' : s.tone === 'green' ? 'flex-1 bg-[#e9f1ea] text-ink' : s.tone === 'ochre' ? 'flex-1 bg-[#f7edd6] text-ink' : 'flex-1 bg-paper text-ink';
                  const valTone = s.tone === 'green' ? 'text-[color:var(--color-grass)]' : s.tone === 'ochre' ? 'text-[color:var(--color-ochre-deep)]' : '';
                  return (
                  <div key={i} className={`p-5 rounded-[14px] border border-soft shadow-[var(--elev-1)] ${cardTone}`}>
                    <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-1 ${s.hero ? 'opacity-70' : 'opacity-85'}`}>{s.label}</div>
                    <div className={`font-black mb-1 ${s.hero ? 'text-[34px] leading-none' : 'text-2xl'} ${s.hero ? '' : valTone}`}>{s.val}</div>
                    <div className={`text-[11px] font-extrabold uppercase tracking-widest ${s.hero ? 'opacity-70' : 'opacity-75'}`}>{s.sub}</div>
                  </div>
                  );
                })}
              </div>

              {/* Vertical layout per spec */}
              <LifecycleStepper project={selectedProject} />

              <ActiveDrilldown
                state={drilldownState}
                invoiceIds={selectedProject?.invoices.map(i => i.id) || []}
                onSendNow={() => handleSendNow(drilldownState)}
                onMarkSettled={() => handleMarkSettled(drilldownState)}
                onResend={() => handleResend(drilldownState)}
                onFinalize={() => handleEdit(drilldownState)}
                onReviewRevision={() => handleEdit(drilldownState, "payment")}
                onPreview={() => handlePreview(drilldownState)}
                onCloseProject={() => selectedProject && setCloseProjectFor({ id: selectedProject.project.id, name: selectedProject.project.name })}
              />

              <ProjectInvoicesLedger project={selectedProject} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-white border border-soft rounded-[16px] m-8 shadow-[var(--brutal-shadow-lg)]">
              <div className="text-4xl font-black mb-4 tracking-tighter">Select a project</div>
              <p className="text-neutral-500 font-bold tracking-wide">
                Or click + New invoice to start
              </p>
            </div>
          )}
        </div>
      </main>

      {actionMessage && (
        <div className="fixed bottom-5 right-5 z-50 border border-soft rounded-[14px] bg-white px-4 py-3 text-sm font-bold shadow-[var(--brutal-shadow-md)]">
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="mr-3 font-black"
          >
            ×
          </button>
          {actionMessage}
        </div>
      )}

      {settlementChoice && (() => {
        const masterInvoice = getMasterInvoice();
        const settlementMilestones = selectedProject?.milestones
          .filter(milestone => milestone.invoice_id === masterInvoice?.id)
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) ?? [];
        const currentMilestone = settlementMilestones.find(
          milestone => (milestone.order_index ?? 0) + 1 === settlementChoice.milestoneNumber,
        ) ?? null;
        const nextMilestone = settlementMilestones.find(
          milestone => (milestone.order_index ?? 0) + 1 === settlementChoice.milestoneNumber + 1,
        ) ?? null;
        const nextMilestoneNumber = nextMilestone ? (nextMilestone.order_index ?? 0) + 1 : settlementChoice.milestoneNumber + 1;
        const milestoneAmount = Number(currentMilestone?.amount || 0);
        const taxBreakdown = masterInvoice?.form_data
          ? computeInvoiceTax(masterInvoice.form_data as any, milestoneAmount)
          : null;
        const settlementAmount = taxBreakdown ? taxBreakdown.totalPayable : milestoneAmount;
        const tdsPercent = settlementChoice.tdsPercent || 0;
        const tdsAmount = Math.round((milestoneAmount * tdsPercent) / 100);
        const netReceived = settlementAmount - tdsAmount;
        const taxLabel = taxBreakdown ? taxBreakdown.label : "Tax";
        const settlementChildInvoice = selectedProject?.invoices.find(
          inv =>
            inv.parent_invoice_id === masterInvoice?.id &&
            inv.milestone_index === settlementChoice.milestoneNumber,
        ) ?? null;
        const timingSource =
          settlementChildInvoice?.due_date ||
          currentMilestone?.due_date ||
          masterInvoice?.due_date;
        const hasProjectAddendum = Boolean(selectedProject?.project.project_addendum_text || masterInvoice?.has_addendum);
        const contractTitle = hasProjectAddendum ? "Project addendum" : "Global agency terms";
        const contractCopy = hasProjectAddendum
          ? "Active project-specific overrides are applied for this invoice's milestones, payment timeline, and late-fee guidelines."
          : "Default agency terms are applied for this invoice's milestones, payment timeline, and late-fee guidelines.";
        const afterCopy =
          settlementChoice.triggerMode === "immediate"
            ? nextMilestone
              ? `M${nextMilestoneNumber} starts and invoice sends now.`
              : "Project closes after this final settlement."
            : settlementChoice.triggerMode === "scheduled"
              ? nextMilestone
                ? `M${nextMilestoneNumber} starts on ${formatProjectedDate(settlementChoice.triggerDate)}.`
                : "Project closes after this final settlement."
              : "Remaining milestones are soft-cancelled.";
        const scheduleDateInvalid = settlementChoice.triggerMode === "scheduled" && !settlementChoice.triggerDate;
        const optionRowClass = (mode: TriggerMode) =>
          `flex cursor-pointer items-start gap-3 rounded-[var(--radius-box)] border p-3 ${settlementChoice.triggerMode === mode ? "border-[#bcd2c5] bg-acc-soft" : "border-soft bg-white hover:bg-[color:var(--color-paper-2)]"
          }`;

        return (
          <div
            className="fixed inset-0 z-[120] bg-black/40"
            onClick={() => setSettlementChoice(null)}
          >
            <aside
              className="absolute right-0 top-0 flex h-full w-full max-w-[620px] flex-col border-l-4 border-[color:var(--color-acid)] bg-[color:var(--color-paper-2)] shadow-[var(--brutal-shadow-md)]"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-soft bg-[color:var(--color-paper)] px-5 py-4">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                    Settlement drawer
                  </div>
                  <h2 className="mt-1 font-syne text-2xl font-bold tracking-tight text-[color:var(--color-ink)]">
                    Settle M{settlementChoice.milestoneNumber}?
                  </h2>
                  <p className="mt-1 text-sm font-bold text-[color:var(--color-ink-2)]">
                    {settlementChoice.milestoneTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettlementChoice(null)}
                  className="rounded-[10px] border border-soft bg-[color:var(--color-paper-2)] px-3 py-1 text-xl font-bold leading-none text-ink transition-colors hover:bg-white"
                  aria-label="Close settlement drawer"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <section className="rounded-[var(--radius-soft)] border border-soft bg-white shadow-[var(--brutal-shadow-sm)]">
                  <div className="border-b border-soft px-4 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                      Settlement checkpoint
                    </div>
                  </div>
                  <div className="grid grid-cols-1 border-b border-soft sm:grid-cols-3">
                    <div className="border-b border-soft px-4 py-3 sm:border-b-0 sm:border-r">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                        Clear ({taxLabel})
                      </div>
                      <div className="mt-1 font-syne text-xl font-bold text-[color:var(--color-ink)] tabular-nums">
                        {formatInr(settlementAmount)}
                      </div>
                    </div>
                    <div className="border-b border-soft px-4 py-3 sm:border-b-0 sm:border-r">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                        Timing
                      </div>
                      <div className="mt-1 text-sm font-bold text-[color:var(--color-ink)]">
                        {formatTimingLabel(timingSource)}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                        After
                      </div>
                      <div className="mt-1 text-sm font-bold text-[color:var(--color-ink)]">
                        {afterCopy}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-soft px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="tds-percent-input" className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                        TDS deducted by client
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="tds-percent-input"
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={tdsPercent === 0 ? "" : tdsPercent}
                          placeholder="0"
                          onChange={event => {
                            const next = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                            setSettlementChoice(choice => (choice ? { ...choice, tdsPercent: next } : choice));
                          }}
                          className="h-9 w-16 rounded-[10px] border border-soft bg-white px-2 text-right text-sm font-semibold tabular-nums outline-none app-focus-ring"
                        />
                        <span className="text-sm font-bold text-[color:var(--color-ink-2)]">%</span>
                      </div>
                    </div>
                    {tdsPercent > 0 && (
                      <div className="mt-3 space-y-1 border-t border-dashed border-[#cfc4ab] pt-2">
                        <div className="flex items-center justify-between text-xs text-[color:var(--color-ink-2)]">
                          <span>TDS on {formatInr(milestoneAmount)} base (−{tdsPercent}%)</span>
                          <span className="tabular-nums">−{formatInr(tdsAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[color:var(--color-ink)]">Net you&apos;ll receive</span>
                          <span className="font-syne text-lg font-bold tabular-nums text-[color:var(--color-ink)]">{formatInr(netReceived)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t border-soft px-4 py-3 text-sm font-bold text-[color:var(--color-ink)]">
                    <span className="h-2 w-2 flex-none rounded-full bg-[color:var(--color-ochre)]" />
                    Confirm only after the payment is visible in your bank account.
                  </div>
                </section>

                <section className="mt-5 rounded-[var(--radius-soft)] border border-[#d2e0d2] bg-acc-soft p-4 shadow-[var(--brutal-shadow-sm)]">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-sky)]">
                    Contract authority
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[#cfe0db] bg-white font-syne text-base font-bold text-[color:var(--color-acid)]">
                      §
                    </div>
                    <div className="font-syne text-base font-bold text-[color:var(--color-ink)]">
                      {contractTitle}
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-normal leading-relaxed text-[color:var(--color-ink-2)]">
                    {contractCopy}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-dashed border-[#b9cabf] pt-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-bold text-[color:var(--color-sky)]">Payment:</span>{" "}
                      <span className="font-bold text-[color:var(--color-ink)]">{getPaymentTermsLabel(masterInvoice as any)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[color:var(--color-sky)]">Late Fee:</span>{" "}
                      <span className="font-bold text-[color:var(--color-ink)]">{getLateFeeLabel(masterInvoice as any)}</span>
                    </div>
                  </div>
                </section>

                <section className="mt-5 rounded-[var(--radius-soft)] border border-soft bg-white p-4 shadow-[var(--brutal-shadow-sm)]">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                    Milestone progress checklist
                  </div>
                  {settlementMilestones.length > 0 ? (
                    <div className="relative ml-3 mt-4 border-l border-[color:var(--color-strong)] pl-5">
                      {settlementMilestones.map(milestone => {
                        const milestoneNumber = (milestone.order_index ?? 0) + 1;
                        const status = (milestone.status || "pending").toLowerCase();
                        const isCurrent = milestoneNumber === settlementChoice.milestoneNumber;
                        const isSettled = status === "settled";
                        const isCancelled = status === "cancelled";
                        const statusLabel = isCurrent
                          ? "settling"
                          : isSettled
                            ? "settled"
                            : isCancelled
                              ? "cancelled"
                              : status;
                        const markerClass = isSettled
                          ? "bg-[#e4f1ea] text-[#157a54] border-[#c7e4d4]"
                          : isCurrent
                            ? "bg-acid text-acc-ink border-acid"
                            : isCancelled
                              ? "bg-soft border-soft"
                              : "border-dashed border-[#c9bb9d] text-[color:var(--color-ink-3)]";
                        const statusPillClass = isSettled
                          ? "bg-[#e4f1ea] text-[#157a54] border-[#c7e4d4]"
                          : isCurrent
                            ? "bg-acid text-acc-ink border-acid"
                            : isCancelled
                              ? "bg-soft text-[color:var(--color-ink-2)] border-soft line-through"
                              : "bg-transparent text-[#8c8270] border-[#c9bb9d] border-dashed";

                        return (
                          <div key={milestone.id} className="relative pb-5 last:pb-0">
                            <div className={`absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${markerClass}`}>
                              {isSettled ? "✓" : isCurrent ? "●" : ""}
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-syne text-sm font-semibold text-[color:var(--color-ink)]">
                                  M{milestoneNumber}: {milestone.title || `Milestone ${milestoneNumber}`}
                                </div>
                                <div className="mt-1 text-sm font-bold text-[color:var(--color-ink-2)]">
                                  {formatInr(Number(milestone.amount || 0))}
                                </div>
                              </div>
                              <span className={`flex-none rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusPillClass}`}>
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[var(--radius-box)] border border-dashed border-soft bg-[color:var(--color-paper-2)] p-3 text-sm font-bold text-[color:var(--color-ink-2)]">
                      No milestone checklist found for this invoice.
                    </div>
                  )}
                </section>

                <fieldset className="mt-5 rounded-[var(--radius-soft)] border border-soft bg-white p-4 shadow-[var(--brutal-shadow-sm)]">
                  <legend className="px-2 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                    What happens next?
                  </legend>
                  <div className="mt-2 flex flex-col gap-3">
                    {[
                      {
                        value: "immediate" as const,
                        title: "Send next milestone invoice now",
                        copy: nextMilestone
                          ? `M${nextMilestoneNumber} invoice generated and emailed immediately.`
                          : "No next milestone exists; the project will close.",
                      },
                      {
                        value: "scheduled" as const,
                        title: "Schedule for later",
                        copy: nextMilestone
                          ? `M${nextMilestoneNumber} invoice generated and emailed on the chosen date.`
                          : "No next milestone exists; the project will close.",
                      },
                      {
                        value: "cancelled" as const,
                        title: "Close project — no more milestones",
                        copy: "Remaining milestones are soft-cancelled. No invoices generated.",
                      },
                    ].map(option => (
                      <label key={option.value} className={optionRowClass(option.value)}>
                        <input
                          type="radio"
                          name="triggerMode"
                          value={option.value}
                          checked={settlementChoice.triggerMode === option.value}
                          onChange={() => setSettlementChoice(choice => choice ? { ...choice, triggerMode: option.value } : choice)}
                          className="mt-1 h-4 w-4 accent-[#1e3d33]"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-bold text-[color:var(--color-ink)]">{option.title}</span>
                          <span className="mt-0.5 block text-xs font-medium text-[color:var(--color-ink-2)]">{option.copy}</span>
                          {option.value === "scheduled" && settlementChoice.triggerMode === "scheduled" && (
                            <input
                              type="date"
                              min={formatDateInputValue(0)}
                              value={settlementChoice.triggerDate}
                              onChange={event => setSettlementChoice(choice => choice ? { ...choice, triggerDate: event.target.value } : choice)}
                              className="mt-3 w-full rounded-[10px] border border-soft bg-white px-3 py-2 text-sm font-semibold outline-none app-focus-ring"
                            />
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end gap-2 border-t border-soft bg-[color:var(--color-paper)] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSettlementChoice(null)}
                  className="rounded-full border border-soft bg-white px-5 py-2.5 text-xs font-bold tracking-wide transition-colors hover:bg-[color:var(--color-paper-2)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSettlement}
                  disabled={scheduleDateInvalid}
                  className="rounded-full border border-acid bg-acid text-acc-ink px-5 py-2.5 text-xs font-bold tracking-wide shadow-[var(--brutal-shadow-sm)] transition-colors hover:bg-[color:var(--color-acid-2)] disabled:cursor-not-allowed disabled:border-soft disabled:bg-soft disabled:text-ink/50 disabled:shadow-none"
                >
                  Confirm settlement
                </button>
              </div>
            </aside>
          </div>
        );
      })()}

      <CloseProjectModal
        isOpen={!!closeProjectFor}
        projectName={closeProjectFor?.name || "this project"}
        onClose={() => setCloseProjectFor(null)}
        onConfirm={handleCloseProject}
      />

      {/* ── Project Closure Delight Modal ── */}
      {projectClosureData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[480px] border border-soft rounded-[16px] bg-white shadow-[var(--brutal-shadow-lg)] overflow-hidden">
            {/* Header Area */}
            <div className="relative overflow-hidden bg-acid px-8 py-10 text-center">
              {/* Confetti / Delight elements (static CSS representation) */}
              <div className="absolute left-4 top-4 text-4xl">✨</div>
              <div className="absolute bottom-4 right-4 text-4xl">🎉</div>
              <div className="absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.1)_100%)] mix-blend-overlay"></div>
              
              <div className="relative z-10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-ink bg-white shadow-[var(--brutal-shadow-md)]">
                <span className="text-4xl text-acid">✓</span>
              </div>
              <h2 className="relative z-10 text-3xl font-black uppercase tracking-tight text-white drop-shadow-[var(--brutal-shadow-sm)]">
                Project Complete!
              </h2>
            </div>
            
            {/* Body Area */}
            <div className="px-8 py-6">
              <div className="text-center text-sm font-bold text-neutral-700">
                You successfully closed all milestones for
              </div>
              <div className="mt-2 text-center text-xl font-black uppercase text-[color:var(--color-ink)]">
                {projectClosureData.projectName}
              </div>
              
              <div className="my-6 border-y-2 border-dashed border-neutral-300 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-neutral-500">
                    Total Billed
                  </span>
                  <span className="text-2xl font-black text-acid drop-shadow-[var(--brutal-shadow-sm)]">
                    {projectClosureData.cost}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setProjectClosureData(null)}
                className="w-full border border-soft rounded-[11px] bg-ink py-4 text-[13px] font-black uppercase tracking-widest text-white shadow-[var(--brutal-shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--brutal-shadow-lg)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                Awesome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className={appPageShellClass}>
        <AppHeader />
        <main className={`${appPageContainerClass} max-w-none px-0 py-0 flex-1 flex h-[calc(100vh-64px)] items-center justify-center`}>
          <div className="font-extrabold tracking-wide text-neutral-400">Loading dashboard…</div>
        </main>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
