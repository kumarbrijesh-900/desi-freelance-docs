"use client";

import React from "react";
import Link from "next/link";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatInr } from "./ActiveDrilldown";
import { invoiceRowHref } from "@/lib/invoice-row-href";

function getStatusPill(invoiceStatus: string, msaStatus: string | null, hasClientMsaNote: boolean) {
  const status = (invoiceStatus || '').toLowerCase();
  const msa = (msaStatus || '').toLowerCase();

  if (status === 'cancelled') return { bg: '#d8ccb3', fg: '#7c7263', label: 'cancelled', strikethrough: true };
  if (status === 'settled') return { bg: '#24201a', fg: '#fbf4e7', label: 'settled' };
  if (status === 'partial') return { bg: '#f6ddcf', fg: '#24201a', label: 'partial' };
  if (msa === 'proposed' && hasClientMsaNote) return { bg: '#D85A30', fg: '#fbf4e7', label: 'revision requested' };
  if (msa === 'accepted' && status !== 'settled') return { bg: 'transparent', fg: '#24201a', label: 'locked', border: true };
  if (msa === 'proposed') return { bg: '#BA7517', fg: '#fbf4e7', label: 'awaiting client' };
  if (msa === 'pending' && status === 'finalized') return { bg: '#BA7517', fg: '#fbf4e7', label: 'awaiting client' };
  if (status === 'finalized' || status === 'sent' || status === 'live') return { bg: '#cf4a25', fg: '#fbf4e7', label: 'live' };
  if (status === 'complete') return { bg: '#24201a', fg: '#fbf4e7', label: 'complete' };
  if (status === 'draft') return { bg: 'transparent', fg: '#7c7263', label: 'draft', border: true };
  return { bg: '#d8ccb3', fg: '#7c7263', label: status };
}

export function ProjectInvoicesLedger({ project }: { project: ProjectWithInvoices }) {
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);
  const children = project.invoices.filter(inv => (inv as any).parent_invoice_id === master?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allInvoices = master ? [master, ...children] : children;

  if (allInvoices.length === 0) {
    return (
      <div className="px-6 py-5 bg-neutral-50 text-sm text-neutral-500">
        No invoices found for this project.
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-3">
        INVOICES ({allInvoices.length})
      </div>

      <div className="border-2 border-ink bg-white shadow-[var(--elev-1)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-[#FAFAF5]">
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-black">Invoice</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-black hidden sm:table-cell">Type</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-black text-right">Amount</th>
              <th className="p-3 text-[10px] uppercase font-extrabold tracking-wide border-r-2 border-black">Status</th>
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
              const statusInfo = getStatusPill(inv.status || "draft", master?.msa_status || null, !!master?.client_msa_note);

              // Compute grand total
              let total = Number(inv.grand_total || 0);
              if (total === 0) {
                total = Number(inv.form_data?.totals?.total || 0);
              }

              return (
                <tr key={inv.id} className={idx < allInvoices.length - 1 ? "border-b-2 border-black" : ""}>
                  <td className="p-3 border-r-2 border-black text-sm font-bold">
                    {inv.invoice_number || "DRAFT"}
                  </td>
                  <td className="p-3 border-r-2 border-black text-xs text-neutral-600 hidden sm:table-cell">
                    {typeLabel}
                  </td>
                  <td className="p-3 border-r-2 border-black text-sm font-extrabold text-right">
                    {formatInr(total)}
                  </td>
                  <td className="p-3 border-r-2 border-black text-xs">
                    <span
                      className={`px-2 py-0.5 font-bold uppercase ${statusInfo.border ? 'border border-black' : ''} ${statusInfo.strikethrough ? 'line-through' : ''}`}
                      style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg }}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {(() => {
                      const status = (inv.status || '').toLowerCase();
                      const msa = (master?.msa_status || '').toLowerCase();
                      const rowHref = invoiceRowHref(inv.id);
                      return (
                        <Link
                          href={rowHref}
                          className="inline-block text-[10px] uppercase font-extrabold tracking-wide border-2 border-ink px-3 py-1 bg-white shadow-[var(--elev-1)] hover:bg-paper-2 transition-colors text-ink"
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
