"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { appPageContainerClass, appPageShellClass } from "@/lib/layout-foundation";
import { getAllProjectsWithInvoices, ProjectWithInvoices } from "@/lib/supabase/projects";
import { ProjectRail } from "@/components/dashboard/ProjectRail";
import { LifecycleStepper } from "@/components/dashboard/LifecycleStepper";
import { ActiveDrilldown } from "@/components/dashboard/ActiveDrilldown";
import { ProjectInvoicesLedger } from "@/components/dashboard/ProjectInvoicesLedger";
import { computeProjectLifecycle } from "@/lib/lifecycle/computeProjectLifecycle";
import { computeActiveDrilldown, DrilldownState } from "@/lib/lifecycle/computeActiveDrilldown";

type TriggerMode = "immediate" | "scheduled" | "cancelled";

type SettlementChoice = {
  invoiceId: string;
  projectId: string;
  milestoneNumber: number;
  milestoneTitle: string;
  triggerMode: TriggerMode;
  triggerDate: string;
};

function dateInputValue(daysFromToday = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("project");

  const [projects, setProjects] = useState<ProjectWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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
      triggerDate: dateInputValue(),
    });
  };

  const confirmSettlement = async () => {
    if (!settlementChoice) return;

    const body: Record<string, unknown> = {
      invoice_id: settlementChoice.invoiceId,
      project_id: settlementChoice.projectId,
      trigger_mode: settlementChoice.triggerMode,
    };

    if (settlementChoice.triggerMode === "scheduled") {
      if (!settlementChoice.triggerDate) return;
      body.trigger_date = dateInputToIso(settlementChoice.triggerDate);
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

    setActionMessage(`M${settlementChoice.milestoneNumber} marked settled.`);
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
      <main className={`${appPageContainerClass} max-w-none px-0 py-0 flex-1 flex h-[calc(100vh-64px)] overflow-hidden`}>

        {/* Left Rail */}
        <ProjectRail
          projects={projects}
          selectedProjectId={projectId || undefined}
          onNewInvoice={() => router.push('/invoice/new')}
        />

        {/* Right Content */}
        <div className="flex-1 bg-[#FAFAF5] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex h-full items-center justify-center font-extrabold tracking-wide text-neutral-400">
              Loading projects…
            </div>
          ) : selectedProject ? (
            <div className="flex flex-col min-h-full">
              {/* Vertical layout per spec */}
              <LifecycleStepper steps={computeProjectLifecycle(selectedProject)} />

              <ActiveDrilldown
                state={drilldownState}
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
            <div className="flex h-full flex-col items-center justify-center bg-white border-2 border-black m-8 shadow-[8px_8px_0_#000]">
              <div className="text-4xl font-black mb-4 tracking-tighter">Select a project</div>
              <p className="text-neutral-500 font-bold tracking-wide">
                Or click + New invoice to start
              </p>
            </div>
          )}
        </div>
      </main>

      {actionMessage && (
        <div className="fixed bottom-5 right-5 z-50 border-2 border-black bg-white px-4 py-3 text-sm font-bold shadow-[4px_4px_0_#000]">
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

      {settlementChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[480px] border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_#000]">
            <div className="mb-1 text-lg font-black uppercase tracking-wide">
              Settle M{settlementChoice.milestoneNumber}?
            </div>
            <div className="mb-4 text-sm font-medium text-neutral-600">
              What happens to the next milestone after {settlementChoice.milestoneTitle}?
            </div>

            <div className="flex flex-col gap-3">
              {[
                { value: "immediate", title: "Send next milestone invoice now", copy: "Next invoice generated and emailed immediately." },
                { value: "scheduled", title: "Schedule for later", copy: "Next invoice generated and emailed on the chosen date." },
                { value: "cancelled", title: "Close project — no more milestones", copy: "Remaining milestones are cancelled. No invoices generated." },
              ].map(option => (
                <label
                  key={option.value}
                  className="flex cursor-pointer gap-3 border-2 border-black bg-white p-3 hover:bg-[#FAF7F2]"
                >
                  <input
                    type="radio"
                    name="triggerMode"
                    value={option.value}
                    checked={settlementChoice.triggerMode === option.value}
                    onChange={() => setSettlementChoice(choice => choice ? { ...choice, triggerMode: option.value as TriggerMode } : choice)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-extrabold uppercase tracking-wide">{option.title}</span>
                    <span className="block text-xs font-medium text-neutral-600">{option.copy}</span>
                  </span>
                </label>
              ))}
            </div>

            {settlementChoice.triggerMode === "scheduled" && (
              <input
                type="date"
                min={dateInputValue(0)}
                value={settlementChoice.triggerDate}
                onChange={event => setSettlementChoice(choice => choice ? { ...choice, triggerDate: event.target.value } : choice)}
                className="mt-4 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold"
              />
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettlementChoice(null)}
                className="border-2 border-black bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSettlement}
                disabled={settlementChoice.triggerMode === "scheduled" && !settlementChoice.triggerDate}
                className="border-[3px] border-black bg-[#D4FF00] px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-[4px_4px_0_#000] disabled:opacity-50"
              >
                Confirm
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
