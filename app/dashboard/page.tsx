"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { ProjectRail } from "@/components/dashboard/ProjectRail";
import { LifecycleStepper } from "@/components/dashboard/LifecycleStepper";
import { ActiveDrilldown, formatInr } from "@/components/dashboard/ActiveDrilldown";
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
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDrawerDate(value?: string | null): string {
  if (!value) return "Not set";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      router.replace(`/dashboard?project=${projects[0].project.id}`);
    }
  }, [projects, projectId, router]);

  const selectedProject = projectId ? projects.find(p => p.project.id === projectId) : null;
  const drilldownState = useMemo(
    () => selectedProject ? computeActiveDrilldown(selectedProject) : null,
    [selectedProject]
  );

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
    if (!selectedProject || !state?.milestone) return;
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

    const response = await fetch("/api/share-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: state.invoice.id, clientEmail, tone: "polite" }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionMessage(payload.error || payload.reason || "Could not resend this invoice.");
      return;
    }

    setActionMessage("Invoice resent to client.");
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
        <div className="flex-1 bg-[#FAFAF5] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex h-full items-center justify-center font-extrabold tracking-wide text-neutral-400">
              Loading projects…
            </div>
          ) : selectedProject ? (
            <div className="flex flex-col min-h-full p-8 md:p-10 relative overflow-x-hidden">
              {/* Title Section */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex gap-2 mb-3 items-center">
                    <div className="px-3 py-1 bg-grass text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse" /> LIVE</div>
                    <div className="px-3 py-1 bg-sky text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">
                      {drilldownState?.milestone ? `M${(drilldownState.milestone.order_index ?? 0) + 1} OF ${selectedProject.milestones.length}` : `${selectedProject.milestones.length} MILESTONES`}
                    </div>
                    {(() => {
                      const master = getMasterInvoice();
                      const invNum = master?.invoice_number;
                      if (!invNum) return null;
                      return (
                        <div className="px-3 py-1 bg-white text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]">
                          {invNum}
                        </div>
                      );
                    })()}
                  </div>
                  <h1 className="font-display font-black text-[56px] leading-[1.05] tracking-tight mb-2 text-ink max-w-[800px]">
                    <Marker tone="rose">{selectedProject.project.name}</Marker>
                  </h1>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">
                    CLIENT · {selectedProject.project.client?.client_name || "Unknown"} · {selectedProject.project.client?.city || "Unknown"}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="px-4 py-2 border-2 border-transparent hover:border-ink hover:bg-paper-2 font-extrabold text-[11px] uppercase tracking-widest transition-all">
                    ⤓ EXPORT
                  </button>
                  <button className="px-4 py-2 border-2 border-transparent hover:border-ink hover:bg-paper-2 font-extrabold text-[11px] uppercase tracking-widest transition-all">
                    ⋯
                  </button>
                  {drilldownState?.milestone && (
                    <button className="px-4 py-2 bg-grass text-white border-2 border-ink font-extrabold text-[11px] uppercase tracking-widest shadow-[3px_3px_0_var(--color-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all" onClick={() => handleSendNow(drilldownState)}>
                      FINALIZE M{(drilldownState.milestone.order_index ?? 0) + 1} →
                    </button>
                  )}
                </div>
              </div>

              {/* 4-card stat strip */}
              <div className="flex gap-4 mb-7">
                {[
                  { label: "Project total", val: formatInr(selectedProject.metrics.billed), sub: `${selectedProject.milestones.length} milestones`, bg: "bg-paper", fg: "text-ink", shadow: "none" },
                  { label: "Collected", val: formatInr(selectedProject.metrics.collected), sub: `${selectedProject.milestones.filter(m => m.status === 'settled').length} settled`, bg: "bg-grass", fg: "text-white", shadow: "shadow-[4px_4px_0_var(--color-rule)]" },
                  { label: "In flight", val: formatInr(selectedProject.metrics.outstanding), sub: drilldownState?.milestone ? `M${(drilldownState.milestone.order_index ?? 0) + 1} active` : "0 active", bg: "bg-acid", fg: "text-ink", shadow: "shadow-[4px_4px_0_var(--color-rule)]" },
                  { label: "At risk", val: "₹0", sub: "—", bg: "bg-paper", fg: "text-ink", shadow: "none" }
                ].map((s, i) => (
                  <div key={i} className={`flex-1 p-4 ${s.bg} ${s.fg} border-2 border-ink ${s.shadow}`}>
                    <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-85 mb-1">{s.label}</div>
                    <div className="text-2xl font-black mb-1">{s.val}</div>
                    <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-75">{s.sub}</div>
                  </div>
                ))}
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
              />

              <ProjectInvoicesLedger project={selectedProject} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-white border-2 border-black m-8 shadow-[8px_8px_0_#111118]">
              <div className="text-4xl font-black mb-4 tracking-tighter">Select a project</div>
              <p className="text-neutral-500 font-bold tracking-wide">
                Or click + New invoice to start
              </p>
            </div>
          )}
        </div>
      </main>

      {actionMessage && (
        <div className="fixed bottom-5 right-5 z-50 border-2 border-black bg-white px-4 py-3 text-sm font-bold shadow-[4px_4px_0_#111118]">
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
        const taxLabel = taxBreakdown ? taxBreakdown.label : "Tax";
        const timingSource = currentMilestone?.trigger_date || masterInvoice?.due_date;
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
                ? `M${nextMilestoneNumber} starts on ${formatDrawerDate(settlementChoice.triggerDate)}.`
                : "Project closes after this final settlement."
              : "Remaining milestones are soft-cancelled.";
        const scheduleDateInvalid = settlementChoice.triggerMode === "scheduled" && !settlementChoice.triggerDate;
        const optionRowClass = (mode: TriggerMode) =>
          `flex cursor-pointer items-start gap-3 border-2 border-black p-3 hover:bg-[#FAF7F2] ${settlementChoice.triggerMode === mode ? "bg-[#FAF7F2]" : "bg-white"
          }`;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setSettlementChoice(null)}
          >
            <aside
              className="absolute right-0 top-0 flex h-full w-full max-w-[620px] flex-col border-l-[3px] border-black bg-white shadow-[-4px_0_0_#111118]"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b-[3px] border-black bg-[#FAF7F2] px-5 py-4">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-600">
                    Settlement drawer
                  </div>
                  <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-[#111118]">
                    Settle M{settlementChoice.milestoneNumber}?
                  </h2>
                  <p className="mt-1 text-sm font-bold text-neutral-600">
                    {settlementChoice.milestoneTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettlementChoice(null)}
                  className="border-2 border-black bg-[#FF6B35] px-3 py-1 text-xl font-black leading-none text-white shadow-[3px_3px_0_#111118]"
                  aria-label="Close settlement drawer"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <section className="border-[3px] border-black bg-white shadow-[4px_4px_0_#111118]">
                  <div className="border-b-2 border-black px-4 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-600">
                      Settlement checkpoint
                    </div>
                  </div>
                  <div className="grid grid-cols-1 border-b-2 border-black sm:grid-cols-3">
                    <div className="border-b-2 border-black px-4 py-3 sm:border-b-0 sm:border-r-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                        Clear ({taxLabel})
                      </div>
                      <div className="mt-1 text-xl font-black text-[#111118]">
                        {formatInr(settlementAmount)}
                      </div>
                    </div>
                    <div className="border-b-2 border-black px-4 py-3 sm:border-b-0 sm:border-r-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                        Timing
                      </div>
                      <div className="mt-1 text-sm font-black text-[#111118]">
                        {formatTimingLabel(timingSource)}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                        After
                      </div>
                      <div className="mt-1 text-sm font-black text-[#111118]">
                        {afterCopy}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-sm font-extrabold text-[#111118]">
                    Confirm only after the payment is visible in your bank account.
                  </div>
                </section>

                <section className="mt-5 border-[3px] border-black bg-[#FFFBE6] p-4 shadow-[4px_4px_0_#111118]">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-600">
                    Contract authority
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-sm font-black">
                      §
                    </div>
                    <div className="text-base font-black uppercase text-[#111118]">
                      {contractTitle}
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-normal leading-relaxed text-neutral-700">
                    {contractCopy}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-dashed border-black/40 pt-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-extrabold text-neutral-600">Payment:</span>{" "}
                      <span className="font-black text-[#111118]">{getPaymentTermsLabel(masterInvoice as any)}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-neutral-600">Late Fee:</span>{" "}
                      <span className="font-black text-[#111118]">{getLateFeeLabel(masterInvoice as any)}</span>
                    </div>
                  </div>
                </section>

                <section className="mt-5 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_#111118]">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-600">
                    Milestone progress checklist
                  </div>
                  {settlementMilestones.length > 0 ? (
                    <div className="relative ml-3 mt-4 border-l-2 border-black pl-5">
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
                          ? "bg-[#00DCB4]"
                          : isCurrent
                            ? "bg-[color:var(--color-lime-warm)]"
                            : isCancelled
                              ? "bg-[#D4D2CC]"
                              : "bg-white border-dashed";

                        return (
                          <div key={milestone.id} className="relative pb-5 last:pb-0">
                            <div className={`absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center border-2 border-black text-[10px] font-black ${markerClass}`}>
                              {isSettled ? "✓" : isCurrent ? "●" : ""}
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-black uppercase text-[#111118]">
                                  M{milestoneNumber}: {milestone.title || `Milestone ${milestoneNumber}`}
                                </div>
                                <div className="mt-1 text-sm font-bold text-neutral-600">
                                  {formatInr(Number(milestone.amount || 0))}
                                </div>
                              </div>
                              <span className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#111118]">
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 border-2 border-dashed border-neutral-400 bg-[#FAF7F2] p-3 text-sm font-bold text-neutral-600">
                      No milestone checklist found for this invoice.
                    </div>
                  )}
                </section>

                <fieldset className="mt-5 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_#111118]">
                  <legend className="px-2 text-[11px] font-extrabold uppercase tracking-widest text-neutral-600">
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
                          className="mt-1 h-4 w-4 accent-black"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-extrabold uppercase tracking-wide">{option.title}</span>
                          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-600">{option.copy}</span>
                          {option.value === "scheduled" && settlementChoice.triggerMode === "scheduled" && (
                            <input
                              type="date"
                              min={formatDateInputValue(0)}
                              value={settlementChoice.triggerDate}
                              onChange={event => setSettlementChoice(choice => choice ? { ...choice, triggerDate: event.target.value } : choice)}
                              className="mt-3 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold outline-none ] app-focus-ring"
                            />
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end gap-2 border-t-[3px] border-black bg-[#FAF7F2] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSettlementChoice(null)}
                  className="border-2 border-black bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[3px_3px_0_#111118] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSettlement}
                  disabled={scheduleDateInvalid}
                  className="border-[3px] border-black bg-[color:var(--color-lime-warm)] px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[4px_4px_0_#111118] disabled:cursor-not-allowed disabled:bg-[#D4D2CC] disabled:text-neutral-600 disabled:shadow-none"
                >
                  Confirm settlement
                </button>
              </div>
            </aside>
          </div>
        );
      })()}

      {/* ── Project Closure Delight Modal ── */}
      {projectClosureData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[480px] border-[3px] border-black bg-white shadow-[8px_8px_0_#111118]">
            {/* Header Area */}
            <div className="relative overflow-hidden bg-grass px-8 py-10 text-center">
              {/* Confetti / Delight elements (static CSS representation) */}
              <div className="absolute left-4 top-4 text-4xl">✨</div>
              <div className="absolute bottom-4 right-4 text-4xl">🎉</div>
              <div className="absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.1)_100%)] mix-blend-overlay"></div>
              
              <div className="relative z-10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-white shadow-[4px_4px_0_#111118]">
                <span className="text-4xl text-grass">✓</span>
              </div>
              <h2 className="relative z-10 text-3xl font-black uppercase tracking-tight text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                Project Complete!
              </h2>
            </div>
            
            {/* Body Area */}
            <div className="px-8 py-6">
              <div className="text-center text-sm font-bold text-neutral-700">
                You successfully closed all milestones for
              </div>
              <div className="mt-2 text-center text-xl font-black uppercase text-[#111118]">
                {projectClosureData.projectName}
              </div>
              
              <div className="my-6 border-y-2 border-dashed border-neutral-300 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-neutral-500">
                    Total Billed
                  </span>
                  <span className="text-2xl font-black text-grass drop-shadow-[1px_1px_0_rgba(0,0,0,0.2)]">
                    {projectClosureData.cost}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setProjectClosureData(null)}
                className="w-full border-[3px] border-black bg-[#111118] py-4 text-[13px] font-black uppercase tracking-widest text-white shadow-[4px_4px_0_#FF6B35] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#FF6B35] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
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
