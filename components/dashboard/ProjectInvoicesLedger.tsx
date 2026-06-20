"use client";

import React from "react";
import Link from "next/link";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatInr } from "./ActiveDrilldown";
import { invoiceRowHref } from "@/lib/invoice-row-href";
import { getStatusTint, type StatusKind } from "@/lib/status-tint";

function getStatusPill(invoiceStatus: string, msaStatus: string | null, hasClientMsaNote: boolean) {
  const status = (invoiceStatus || '').toLowerCase();
  const msa = (msaStatus || '').toLowerCase();

  let kind: StatusKind = "neutral";
  let label = status;
  if (status === 'cancelled') { kind = "cancelled"; label = "cancelled"; }
  else if (status === 'overdue') { kind = "overdue"; label = "overdue"; }
  else if (status === 'settled') { kind = "settled"; label = "settled"; }
  else if (status === 'partial') { kind = "partial"; label = "partial"; }
  else if (msa === 'proposed' && hasClientMsaNote) { kind = "revision"; label = "revision requested"; }
  else if (msa === 'accepted' && status !== 'settled') { kind = "locked"; label = "locked"; }
  else if (msa === 'proposed') { kind = "awaiting"; label = "awaiting client"; }
  else if (msa === 'pending' && status === 'finalized') { kind = "awaiting"; label = "awaiting client"; }
  else if (status === 'finalized' || status === 'sent' || status === 'live') { kind = "live"; label = "live"; }
  else if (status === 'complete') { kind = "complete"; label = "complete"; }
  else if (status === 'draft') { kind = "draft"; label = "draft"; }

  return { ...getStatusTint(kind), label };
}

export function ProjectInvoicesLedger({ project }: { project: ProjectWithInvoices }) {
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);
  const children = project.invoices.filter(inv => (inv as any).parent_invoice_id === master?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allInvoices = master ? [master, ...children] : children;

  if (allInvoices.length === 0) {
    return (
      <div className="py-5 bg-neutral-50 text-sm text-neutral-500">
        No invoices found for this project.
      </div>
    );
  }

  return (
    <div className="py-5">
      <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-3">
        INVOICES ({allInvoices.length})
      </div>

      <div className="border border-soft bg-white shadow-[var(--elev-1)] overflow-x-auto">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-ink bg-[#FAFAF5]">
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-ink">Invoice</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-ink hidden sm:table-cell">Type</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-ink text-right">Amount</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-ink">Status</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide text-center w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {allInvoices.map((inv, idx) => {
              const isMaster = inv.id === master?.id;
              const milestoneIndex = Number((inv as any).milestone_index);
              const typeLabel = isMaster
                ? "Master"
                : Number.isFinite(milestoneIndex)
                  ? `M${milestoneIndex} billing`
                  : "Milestone billing";
              let statusInfo;
              if (isMaster) {
                statusInfo = getStatusPill(inv.status || "draft", master?.msa_status || null, !!master?.client_msa_note);
              } else {
                const ms = project.milestones.find(m => (m.order_index ?? -1) === milestoneIndex - 1);
                const mStatus = (ms?.status || "").toLowerCase();
                if (mStatus === "settled") statusInfo = { ...getStatusTint("settled"), label: 'settled' };
                else if (mStatus === "live") statusInfo = { ...getStatusTint("live"), label: 'live' };
                else if (mStatus === "cancelled") statusInfo = { ...getStatusTint("cancelled"), label: 'cancelled' };
                else statusInfo = { ...getStatusTint("scheduled"), label: 'pending' };
              }

              // Compute grand total
              let total = Number(inv.grand_total || 0);
              if (total === 0) {
                total = Number(inv.form_data?.totals?.total || 0);
              }

              return (
                <tr key={inv.id} className={idx < allInvoices.length - 1 ? "border-b-2 border-ink" : ""}>
                  <td className="p-3 border-r-2 border-ink text-sm font-bold">
                    {inv.invoice_number || "DRAFT"}
                  </td>
                  <td className="p-3 border-r-2 border-ink text-xs text-neutral-600 hidden sm:table-cell">
                    {typeLabel}
                  </td>
                  <td className="p-3 border-r-2 border-ink text-sm font-extrabold text-right">
                    {formatInr(total)}
                  </td>
                  <td className="p-3 border-r-2 border-ink text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full border font-bold uppercase ${statusInfo.strikethrough ? 'line-through' : ''}`}
                      style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg, borderColor: statusInfo.bd, borderStyle: statusInfo.dashed ? 'dashed' : 'solid' }}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {(() => {
                      const status = (inv.status || '').toLowerCase();
                      const msa = (master?.msa_status || '').toLowerCase();
                      const rowHref = invoiceRowHref(inv.id, inv.status);
                      return (
                        <Link
                          href={rowHref}
                          className="inline-block text-[10px] uppercase font-extrabold tracking-wide border border-soft px-3 py-1 bg-white shadow-[var(--elev-1)] hover:bg-paper-2 transition-colors text-ink"
                        >
                          VIEW
                        </Link>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
