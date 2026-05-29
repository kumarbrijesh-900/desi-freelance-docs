"use client";

import React from "react";
import Link from "next/link";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatInr } from "./ActiveDrilldown";
import { invoiceRowHref } from "@/lib/invoice-row-href";

function getStatusPill(invoiceStatus: string, msaStatus: string | null, hasClientMsaNote: boolean) {
  const status = (invoiceStatus || '').toLowerCase();
  const msa = (msaStatus || '').toLowerCase();

  if (status === 'cancelled') return { bg: '#E5E5E5', fg: '#737373', label: 'cancelled', strikethrough: true };
  if (status === 'settled') return { bg: '#00DCB4', fg: '#04342C', label: 'settled' };
  if (status === 'partial') return { bg: '#5DCAA5', fg: '#04342C', label: 'partial' };
  if (msa === 'proposed' && hasClientMsaNote) return { bg: '#D85A30', fg: '#FFFFFF', label: 'revision requested' };
  if (msa === 'accepted' && status !== 'settled') return { bg: '#5DCAA5', fg: '#04342C', label: 'locked' };
  if (msa === 'proposed') return { bg: '#BA7517', fg: '#FFFFFF', label: 'awaiting client' };
  if (msa === 'pending' && status === 'finalized') return { bg: '#BA7517', fg: '#FFFFFF', label: 'awaiting client' };
  if (status === 'finalized' || status === 'sent' || status === 'live') return { bg: 'var(--color-lime-warm)', fg: '#173404', label: 'live' };
  if (status === 'complete') return { bg: '#00DCB4', fg: '#04342C', label: 'complete' };
  if (status === 'draft') return { bg: 'transparent', fg: '#000000', label: 'draft', border: true };
  return { bg: '#E5E5E5', fg: '#737373', label: status };
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

      <div className="border-2 border-black bg-white shadow-[4px_4px_0_#111118]">
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
                      const hasClientMsaNote = !!master?.client_msa_note;
                      const isEditable = (status === 'draft') || (msa === 'proposed' && hasClientMsaNote);
                      const rowHref = invoiceRowHref(inv.id, isEditable);
                      return (
                        <Link
                          href={rowHref}
                          className="inline-block text-[10px] uppercase font-extrabold tracking-wide border border-black px-3 py-1 bg-white hover:bg-black hover:text-white transition-colors"
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
