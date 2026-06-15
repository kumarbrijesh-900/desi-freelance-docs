"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { Search } from "lucide-react";

type FilterMode = "ALL" | "ACTIVE" | "AT RISK" | "AWAITING CLIENT" | "COMPLETE";

export function ProjectRail({
  projects,
  selectedProjectId,
  onNewInvoice,
}: {
  projects: ProjectWithInvoices[];
  selectedProjectId?: string;
  onNewInvoice: () => void;
}) {
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [search, setSearch] = useState("");

  const filters: FilterMode[] = ["ALL", "ACTIVE", "AT RISK", "AWAITING CLIENT", "COMPLETE"];

  // Helper to compute attention dot
  const getAttentionDot = (p: ProjectWithInvoices): string | null => {
    const master = p.invoices.find(inv => !(inv as any).parent_invoice_id);
    if (!master) return null;

    const msaStatus = (master.msa_status || "").toLowerCase();

    // coral #FF6B5C dot if: msa_status='proposed' AND client_msa_note IS NOT NULL (revision)
    if (msaStatus === "proposed" && master.client_msa_note) return "#D85A30";

    // amber #BA7517 dot if: shared_at IS NOT NULL AND msa_status='pending' AND days_since_share > 3
    if (master.shared_at && msaStatus === "pending") {
      const days = (Date.now() - new Date(master.shared_at).getTime()) / 86400000;
      if (days > 3) return "#BA7517";
    }

    // coral dot if: any milestone has trigger_status='failed' OR ((status='LIVE' OR status='PENDING') AND due_date < now())
    const hasFailed = p.milestones.some(m => (m as any).trigger_status === "failed");
    const isPastDue = p.milestones.some(m => {
      const status = (m.status || "").toUpperCase();
      const dueDate = (m as any).due_date || master.due_date;
      return (status === "LIVE" || status === "PENDING") && dueDate && new Date(dueDate).getTime() < Date.now();
    });
    if (hasFailed || isPastDue) return "#D85A30";

    // gray dot if: status='draft' AND days_since_updated > 7
    if (!master.shared_at) { // Draft
      const updated = new Date(master.updated_at).getTime();
      const days = (Date.now() - updated) / 86400000;
      if (days > 7) return "#a99e8c";
    }

    return null;
  };

  // Helper to get active milestone summary
  const getSummary = (p: ProjectWithInvoices): string => {
    const master = p.invoices.find(inv => !(inv as any).parent_invoice_id);
    if (!master) return "No master invoice";

    const msaStatus = (master.msa_status || "").toLowerCase();

    if (msaStatus === "proposed" && master.client_msa_note) {
      return "REVISION · Client requested changes";
    }

    if (!master.shared_at) {
      return "DRAFT · Not sent";
    }

    if (msaStatus === "pending") {
      return "AWAITING MSA ACCEPTANCE";
    }

    const activeMilestones = p.milestones
      .filter(m => p.invoices.find(inv => inv.id === m.invoice_id && !(inv as any).parent_invoice_id))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const live = activeMilestones.find(m => (m.status || "").toLowerCase() === "live");
    if (live) {
      const genericRegex = /^Milestone \d+$/i;
      const title = live.title || `Milestone ${live.order_index! + 1}`;
      const shortTitle = genericRegex.test(title) ? `M${live.order_index! + 1}` : `M${live.order_index! + 1} ${title}`;
      return `LIVE · ${shortTitle}`;
    }

    const allSettled = activeMilestones.every(m => (m.status || "").toLowerCase() === "settled" || (m.status || "").toLowerCase() === "cancelled");
    if (activeMilestones.length > 0 && allSettled) {
      return "COMPLETE";
    }

    return "ACTIVE";
  };

  const filtered = projects.filter(p => {
    if (search && !p.project.name.toLowerCase().includes(search.toLowerCase()) && !(p.project.client?.client_name || "").toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    const dot = getAttentionDot(p);
    const summary = getSummary(p);

    switch (filter) {
      case "ACTIVE": return summary.startsWith("LIVE") || summary.startsWith("DRAFT");
      case "AT RISK": return dot === "#FF6B5C";
      case "AWAITING CLIENT": return summary.startsWith("AWAITING") || summary.startsWith("REVISION");
      case "COMPLETE": return summary === "COMPLETE";
      default: return true;
    }
  }).sort((a, b) => {
    // max updated_at across project invoices and milestones
    const aDates = [a.project.updated_at, ...a.invoices.map(i => i.updated_at), ...a.milestones.map(m => m.updated_at || m.created_at || "")]
      .filter(Boolean).map(d => new Date(d as string).getTime());
    const bDates = [b.project.updated_at, ...b.invoices.map(i => i.updated_at), ...b.milestones.map(m => m.updated_at || m.created_at || "")]
      .filter(Boolean).map(d => new Date(d as string).getTime());

    const aMax = Math.max(...aDates);
    const bMax = Math.max(...bDates);
    return bMax - aMax;
  });

  return (
    <div className={`${selectedProjectId ? "hidden md:flex" : "flex"} flex-col h-full bg-white border-r-2 border-black w-full md:w-[240px] shrink-0`}>
      <div className="p-4 flex flex-col gap-4">
        <div className="text-[11px] uppercase tracking-wide font-bold">PROJECTS · {projects.length}</div>

        <button
          onClick={onNewInvoice}
          className="w-full bg-acid text-acc-ink border-2 border-black shadow-[3px_3px_0_#111118] font-extrabold uppercase tracking-wide py-2 active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all"
        >
          + NEW INVOICE
        </button>
      </div>

      <div className="px-4 flex flex-wrap gap-2 pb-2 border-b-2 border-black">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-2 py-1 text-[10px] uppercase font-bold tracking-wide border
              ${filter === f ? "bg-black text-white border-black" : "bg-transparent text-neutral-600 border-transparent hover:border-black"}
            `}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-black app-focus-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-neutral-500">No projects found.</div>
        ) : (
          filtered.map(p => {
            const isSelected = p.project.id === selectedProjectId;
            const dot = getAttentionDot(p);
            const summary = getSummary(p);

            return (
              <Link
                key={p.project.id}
                href={`/dashboard?project=${p.project.id}`}
                className={`block min-h-[90px] p-4 pl-5 border-b-2 border-black relative cursor-pointer transition-all
                  ${isSelected ? "bg-ink shadow-[4px_4px_0_var(--color-acid)] z-10 border-y-[3px] border-black scale-[1.02] -mr-[2px]" : "bg-paper hover:bg-neutral-50"}
                `}
              >
                {/* 10px colored left stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-[10px] border-r-[1.5px] border-black ${
                  summary.startsWith("DRAFT") ? "bg-soft" :
                  summary === "COMPLETE" ? "bg-forest" :
                  summary.startsWith("REVISION") ? "bg-coral" :
                  summary.startsWith("LIVE") ? "bg-acid" :
                  summary.startsWith("ACTIVE") ? "bg-strong" :
                  "bg-butter"
                }`} />

                {dot && (
                  <div 
                    className="absolute top-4 right-3 w-[10px] h-[10px] rounded-full border border-black shadow-[1px_1px_0_#111118] animate-pulse" 
                    style={{ backgroundColor: dot }} 
                  />
                )}

                <div className="flex flex-col h-full justify-between pl-1">
                  <div className="mb-2">
                    <div className={`text-[12px] font-extrabold uppercase tracking-tight truncate w-[90%] mb-1 ${isSelected ? "text-white" : "text-ink"}`} title={p.project.name}>
                      {p.project.name}
                    </div>
                    <div className={`text-[10px] uppercase tracking-wide truncate ${isSelected ? "text-neutral-300" : "text-ink/70"}`} title={`${p.project.client?.client_name || "Unknown Client"} ${p.project.client?.city ? `· ${p.project.client.city}` : ""}`}>
                      {p.project.client?.client_name || "Unknown Client"} {p.project.client?.city ? `· ${p.project.client.city}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 border-2 rounded-full ${isSelected ? 'border-white shadow-[2px_2px_0_#FFF]' : 'border-ink shadow-[2px_2px_0_var(--color-ink)]'} ${
                      summary.startsWith("DRAFT") ? "bg-soft text-ink" :
                      summary === "COMPLETE" ? "bg-forest text-acc-ink" :
                      summary.startsWith("REVISION") ? "bg-coral text-white" :
                      summary.startsWith("LIVE") ? "bg-acid text-acc-ink" :
                      summary.startsWith("ACTIVE") ? "bg-strong text-ink" :
                      "bg-butter text-ink"
                    }`}>
                      {summary}
                    </div>
                    {isSelected && <div className="text-acid font-black text-sm pr-2">→</div>}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
