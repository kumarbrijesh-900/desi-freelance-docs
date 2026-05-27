"use client";

import React from "react";
import Link from "next/link";

import { formatInr } from "../dashboard/ActiveDrilldown";

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

// This is slightly generic since invoices on the /invoices page might have joined project/client data
export function InvoiceEventRow({
  invoice,
  projectName,
  clientName,
  isMaster,
  projectId,
  masterMsaStatus,
  masterHasClientMsaNote
}: {
  invoice: any;
  projectName?: string;
  clientName?: string;
  isMaster: boolean;
  projectId?: string | null;
  masterMsaStatus?: string | null;
  masterHasClientMsaNote?: boolean;
}) {
  const milestoneIndex = Number(invoice.milestone_index);
  const typeLabel = isMaster
    ? "Master"
    : Number.isFinite(milestoneIndex)
      ? `M${milestoneIndex} billing`
      : "Milestone billing";
  const statusInfo = getStatusPill(invoice.status || "draft", masterMsaStatus || null, !!masterHasClientMsaNote);

  let total = Number(invoice.grand_total || 0);
  if (total === 0) {
    total = Number(invoice.form_data?.totals?.total || 0);
  }
  if (total === 0 && invoice.form_data) {
    const milestones = invoice.form_data.milestones || [];
    if (milestones.length > 0) {
      total = milestones.reduce((s: number, m: any) => s + (m.lineItems || []).reduce(
        (sum: number, li: any) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0
      ), 0);
    } else {
      total = (invoice.form_data.lineItems || []).reduce(
        (s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0
      );
    }
  }

  const rowHref = projectId || invoice.project_id
    ? `/dashboard?project=${projectId || invoice.project_id}&invoice=${invoice.id}`
    : `/invoice/preview?id=${invoice.id}`;

  return (
    <Link
      href={rowHref}
      className="flex flex-col sm:flex-row items-center justify-between border-2 border-black bg-white shadow-[4px_4px_0_#111118] p-4 mb-4 gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#111118]"
    >

      {/* Col 1: Invoice Number & Type */}
      <div className="flex flex-col sm:w-[150px] shrink-0">
        <span className="text-lg font-black uppercase tracking-tight">{invoice.invoice_number || "DRAFT"}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {typeLabel}
        </span>
      </div>

      {/* Col 2: Project / Client */}
      <div className="flex flex-col flex-1 min-w-[200px]">
        <span className="text-sm font-extrabold uppercase tracking-wide truncate">
          {projectName || "Unlinked Project"}
        </span>
        <span className="text-xs uppercase text-neutral-600 truncate">
          {clientName || "Unknown Client"}
        </span>
      </div>

      {/* Col 3: Amount */}
      <div className="flex flex-col sm:w-[120px] shrink-0 text-left sm:text-right">
        <span className="text-lg font-black tracking-tighter">{formatInr(total)}</span>
      </div>

      {/* Col 4: Status */}
      <div className="flex sm:w-[120px] shrink-0 justify-start sm:justify-center">
        <span
          className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${statusInfo.border ? 'border-2 border-black' : ''} ${statusInfo.strikethrough ? 'line-through' : ''}`}
          style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Col 5: Action */}
      <div className="flex sm:w-[100px] shrink-0 justify-end">
        <span className="border-2 border-black bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-black shadow-[2px_2px_0_#111118] transition-colors hover:bg-black hover:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none whitespace-nowrap">
          VIEW →
        </span>
      </div>

    </Link>
  );
}
