"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatInr } from "../dashboard/ActiveDrilldown";
import { invoiceRowHref } from "@/lib/invoice-row-href";
import { getStatusInfo, isInvoiceRowDeletable } from "./InvoiceEventRow";

type Item = {
  invoice: any;
  isMaster: boolean;
  masterMsaStatus?: string | null;
  masterHasClientMsaNote?: boolean;
  masterInvoice?: any;
};

// Same total + fallbacks InvoiceEventRow uses, so amounts match everywhere.
function invoiceTotal(invoice: any): number {
  const milestoneIndex = Number(invoice.milestone_index);
  let total = Number(invoice.grand_total || 0);
  if (total === 0 && invoice.form_data?.totals?.total) {
    total = Number(invoice.form_data.totals.total);
  }
  if (total === 0 && invoice.form_data?.milestones) {
    const ms = invoice.form_data.milestones;
    if (Number.isFinite(milestoneIndex) && ms[milestoneIndex]) {
      total = (ms[milestoneIndex].lineItems || []).reduce((s: number, li: any) => s + (Number(li.qty || 0) * Number(li.rate || 0)), 0);
    } else {
      total = ms.reduce((s: number, m: any) => s + (m.lineItems || []).reduce((sum: number, li: any) => sum + (Number(li.qty || 0) * Number(li.rate || 0)), 0), 0);
    }
  }
  return total;
}

// E status pill (soft tint) per status label from getStatusInfo.
const PILL: Record<string, string> = {
  settled: "bg-[#e4f1ea] text-grass border border-[#c7e4d4]",
  complete: "bg-[#e4f1ea] text-acid border border-[#c7e4d4]",
  partial: "bg-[#f6ecd6] text-ochre-deep border border-[#ecd9b0]",
  awaiting: "bg-[#f6ecd6] text-ochre-deep border border-[#ecd9b0]",
  locked: "bg-[#e3ecea] text-teal border border-[#cadbd6]",
  live: "bg-acc-soft text-acid border border-[#cfe0cf]",
  revision: "bg-[#f7e4dc] text-coral border border-[#e0b9a6]",
  overdue: "bg-[#f7e4dc] text-coral border border-[#e0b9a6]",
  cancelled: "bg-paper-2 text-ink/40 line-through border border-soft",
  draft: "bg-transparent text-ink/50 border border-dashed border-strong",
};
const pillClass = (label: string) => PILL[label] || PILL.draft;
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ACCENT: Record<string, string> = {
  partial: "var(--color-ochre)",
  awaiting: "var(--color-gold)",
  complete: "var(--color-acid)",
  live: "var(--color-acid)",
  overdue: "var(--color-coral)",
  revision: "var(--color-coral)",
};

export function ProjectInvoiceGroup({
  projectName,
  clientName,
  projectId,
  items,
  selectedIds,
  onToggleSelect,
  onDelete,
}: {
  projectName?: string;
  clientName?: string;
  projectId?: string | null;
  items: Item[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const labels = items.map(it =>
    getStatusInfo(it.invoice.status || "draft", it.masterMsaStatus || null, !!it.masterHasClientMsaNote, !!it.invoice.shared_at).label
  );

  // Rolled-up status shown on the project header.
  const has = (l: string) => labels.includes(l);
  const allDone = labels.length > 0 && labels.every(l => l === "settled" || l === "complete");
  const roll =
    allDone ? { key: "complete", text: "Complete" }
    : has("overdue") ? { key: "overdue", text: "Overdue" }
    : has("revision") ? { key: "revision", text: "Needs review" }
    : has("awaiting") && !has("settled") ? { key: "awaiting", text: "Awaiting contract" }
    : has("settled") || has("partial") ? { key: "partial", text: "In progress" }
    : has("live") ? { key: "live", text: "Live" }
    : { key: labels[0] || "draft", text: cap(labels[0] || "draft") };

  const accent = ACCENT[roll.key] || "var(--color-strong)";

  // Milestone progress spine (heuristic): dots = milestone count, filled = settled invoices.
  const master = items[0]?.masterInvoice;
  const allMs: any[] = master?.form_data?.milestones || [];
  const msCount = Math.min(allMs.length || items.length, 6);
  let done = labels.filter(l => l === "settled" || l === "complete").length;
  if (items.some((it, i) => it.isMaster && labels[i] === "partial")) done += 1;
  done = Math.min(done, msCount);

  const projValue = items.reduce((s, it) => s + invoiceTotal(it.invoice), 0);
  const unlinked = !projectName;
  const pName = projectName || "Unlinked invoices";
  const cInitial = (clientName || "U").slice(0, 2).toUpperCase();

  return (
    <div className="bg-white border border-soft rounded-[16px] mb-4 overflow-hidden shadow-[0_12px_30px_-20px_rgba(30,61,51,0.4)]">
      {/* Project header (click to collapse) */}
      <div
        onClick={() => setExpanded(v => !v)}
        className="relative flex items-center gap-3 px-[18px] py-[15px] cursor-pointer select-none"
      >
        <span className="absolute left-0 top-3 bottom-3 w-[4px] rounded-r-[3px]" style={{ background: accent }} />
        <span className={`text-ink/40 text-[13px] w-[14px] shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}>▾</span>
        <div className="flex-1 min-w-0">
          <div className={`font-display font-bold text-[17px] leading-tight tracking-[-0.01em] truncate ${unlinked ? "text-ink-2" : "text-ink"}`}>{pName}</div>
          <div className="flex items-center gap-2 mt-1 text-[11.5px] text-ink-2 min-w-0">
            {!unlinked && (
              <span className="w-[18px] h-[18px] rounded-full grid place-items-center text-[8px] font-extrabold text-white shrink-0" style={{ background: accent }}>{cInitial}</span>
            )}
            {!unlinked && <span className="truncate">{clientName || "Unknown"}</span>}
            {!unlinked && <span className="text-ink/40 font-bold">·</span>}
            <span className="whitespace-nowrap">{items.length} {items.length === 1 ? "invoice" : "invoices"}</span>
            {msCount > 1 && (
              <>
                <span className="text-ink/40 font-bold">·</span>
                <span className="flex items-center shrink-0">
                  {Array.from({ length: msCount }).map((_, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className={`w-[14px] h-[2px] ${i <= done ? "bg-grass" : "bg-strong"}`} />}
                      <span className={`w-[9px] h-[9px] rounded-full shrink-0 ${i < done ? "bg-grass" : i === done ? "bg-acid" : "bg-white border-[1.5px] border-strong"}`} />
                    </React.Fragment>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-[5px] shrink-0 text-right">
          <span className={`inline-block rounded-full px-[9px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.07em] whitespace-nowrap ${pillClass(roll.key)}`}>{roll.text}</span>
          <div className="font-display font-bold text-[16px] text-ink tabular-nums">{formatInr(projValue)}<span className="block text-[9px] font-bold text-ink/50 uppercase tracking-[0.08em] mt-px">project value</span></div>
        </div>
      </div>

      {/* Nested invoices */}
      {expanded && (
        <div className="relative pl-[40px] pr-[18px] pb-[14px]">
          <div className="absolute left-[25px] top-0 bottom-5 w-px bg-soft" />
          {items.map((it, i) => {
            const inv = it.invoice;
            const label = labels[i];
            const tag = it.isMaster ? "Master · M1" : (Number.isFinite(Number(inv.milestone_index)) ? `M${Number(inv.milestone_index)} Billing` : "Milestone billing");
            const fd = inv.form_data || {};
            const ms0 = fd.milestones?.[0];
            const desc = ms0?.title || ms0?.name || fd.lineItems?.[0]?.description || fd.lineItems?.[0]?.title || ms0?.lineItems?.[0]?.description || ms0?.lineItems?.[0]?.title || "";
            const deletable = isInvoiceRowDeletable(inv, it.masterMsaStatus, it.masterHasClientMsaNote);
            const selected = selectedIds.has(inv.id);
            return (
              <Link
                key={inv.id}
                href={invoiceRowHref(inv.id, inv.status)}
                className="group relative flex items-center gap-3 px-[14px] py-[11px] mb-[7px] rounded-[11px] border border-soft bg-paper-2 hover:bg-white hover:shadow-[0_8px_20px_-14px_rgba(30,61,51,0.4)] transition-all"
              >
                <span className="absolute left-[-15px] top-1/2 w-[13px] h-px bg-soft" />
                <div
                  className="flex items-center shrink-0"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(inv.id); }}
                >
                  <input type="checkbox" checked={selected} readOnly className="w-4 h-4 border border-soft accent-ink cursor-pointer" />
                </div>
                <div className="w-[150px] shrink-0">
                  <div className="font-mono font-bold text-[12.5px] tracking-[-0.02em] text-ink">{inv.invoice_number || "DRAFT"}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink/50 mt-0.5">{tag}</div>
                </div>
                <div className="flex-1 min-w-0 text-[12px] text-ink-2 truncate">{desc}</div>
                <div className="w-[110px] shrink-0 text-right font-display font-bold text-[15px] text-ink tabular-nums">{formatInr(invoiceTotal(inv))}</div>
                <div className="w-[92px] shrink-0 flex justify-center">
                  <span className={`inline-block rounded-full px-[9px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.07em] whitespace-nowrap ${pillClass(label)}`}>{cap(label)}</span>
                </div>
                {deletable ? (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(inv.id, inv.invoice_number || "this draft"); }}
                    className="shrink-0 w-[22px] text-center text-ink/30 hover:text-coral text-[13px] transition-colors"
                    title="Delete invoice"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="shrink-0 w-[22px]" />
                )}
                <span className="shrink-0 w-[18px] text-center text-ink/30 group-hover:text-acid font-bold text-[13px] transition-colors">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
