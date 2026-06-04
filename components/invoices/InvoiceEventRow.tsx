"use client";

import React from "react";
import Link from "next/link";
import { formatInr } from "../dashboard/ActiveDrilldown";
import { invoiceRowHref } from "@/lib/invoice-row-href";

function getStatusInfo(invoiceStatus: string, msaStatus: string | null, hasClientMsaNote: boolean, wasShared: boolean = false) {
  const status = (invoiceStatus || '').toLowerCase();
  const msa = (msaStatus || '').toLowerCase();

  // Return side (left stripe color) and pill details
  if (status === 'cancelled') return { side: 'bg-rule', pill: 'bg-rule text-ink line-through', label: 'cancelled' };
  if (status === 'settled') return { side: 'bg-grass', pill: 'bg-grass text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'settled' };
  if (status === 'partial') return { side: 'bg-lav', pill: 'bg-lav text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'partial' };
  if (msa === 'proposed' && hasClientMsaNote) return { side: 'bg-coral', pill: 'bg-coral text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'revision' };
  if (msa === 'accepted' && status !== 'settled' && status !== 'live' && status !== 'finalized') return { side: 'bg-grass', pill: 'bg-grass text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'locked' };
  if (msa === 'proposed') return { side: 'bg-butter', pill: 'bg-butter text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'awaiting' };
  if (msa === 'pending' && status === 'finalized') return { side: 'bg-butter', pill: 'bg-butter text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'awaiting' };
  if (status === 'finalized' || status === 'sent' || status === 'live') return { side: 'bg-acid', pill: 'bg-acid text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'live' };
  if (status === 'complete') return { side: 'bg-grass', pill: 'bg-grass text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'complete' };
  if (status === 'draft' && wasShared) return { side: 'bg-butter', pill: 'bg-butter text-ink shadow-[2px_2px_0_var(--color-rule)]', label: 'awaiting' };
  if (status === 'draft') return { side: 'bg-butter', pill: 'bg-transparent text-ink border-2 border-rule border-dashed', label: 'draft' };
  return { side: 'bg-rule', pill: 'bg-rule text-ink', label: status };
}

export function isInvoiceRowDeletable(
  invoice: any,
  masterMsaStatus?: string | null,
  hasClientMsaNote?: boolean,
) {
  const info = getStatusInfo(invoice?.status || "draft", masterMsaStatus || null, !!hasClientMsaNote, !!invoice?.shared_at);
  return info.label === "draft" || info.label === "live";
}

export function InvoiceEventRow({
  invoice,
  projectName,
  clientName,
  isMaster,
  projectId,
  masterMsaStatus,
  masterHasClientMsaNote,
  masterInvoice,
  onDelete,
  selectable,
  selected,
  onToggleSelect
}: {
  invoice: any;
  projectName?: string;
  clientName?: string;
  isMaster: boolean;
  projectId?: string | null;
  masterMsaStatus?: string | null;
  masterHasClientMsaNote?: boolean;
  masterInvoice?: any;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const milestoneIndex = Number(invoice.milestone_index);
  const typeLabel = isMaster
    ? "MASTER"
    : Number.isFinite(milestoneIndex)
      ? `M${milestoneIndex} BILLING`
      : "MILESTONE BILLING";
  
  const statusInfo = getStatusInfo(invoice.status || "draft", masterMsaStatus || null, !!masterHasClientMsaNote, !!invoice.shared_at);

  let total = Number(invoice.grand_total || 0);
  if (total === 0 && invoice.form_data?.totals?.total) {
    total = Number(invoice.form_data.totals.total);
  }
  if (total === 0 && invoice.form_data?.milestones) {
    const ms = invoice.form_data.milestones;
    if (Number.isFinite(milestoneIndex) && ms[milestoneIndex]) {
       total = (ms[milestoneIndex].lineItems || []).reduce((s: number, li: any) => s + (Number(li.qty||0)*Number(li.rate||0)), 0);
    } else {
       total = ms.reduce((s: number, m: any) => s + (m.lineItems || []).reduce((sum: number, li: any) => sum + (Number(li.qty||0)*Number(li.rate||0)), 0), 0);
    }
  }

  const status = (invoice.status || 'draft').toLowerCase();
  const msa = (masterMsaStatus || '').toLowerCase();
  const rowHref = invoiceRowHref(invoice.id);
  const clientInitial = (clientName || "U").slice(0, 2).toUpperCase();
  const cName = clientName || "Unknown Client";
  const pName = projectName || "Unlinked Project";

  // Determine avatar text color based on background
  const avatarText = "text-ink";

  return (
    <Link
      href={rowHref}
      className="flex items-stretch bg-white border-2 border-ink shadow-[3px_3px_0_var(--color-rule)] mb-2 overflow-hidden group hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[5px_5px_0_var(--color-rule)] transition-all"
    >
      {selectable && (
        <div
          className="flex items-center pl-3 pr-1 shrink-0"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect?.(invoice.id); }}
        >
          <input
            type="checkbox"
            checked={!!selected}
            readOnly
            className="w-4 h-4 border-2 border-ink accent-ink cursor-pointer"
          />
        </div>
      )}
      {/* Color stripe */}
      <div className={`w-[10px] ${statusInfo.side} border-r-[1.5px] border-ink shrink-0`} />

      <div className="flex flex-1 items-center px-6 py-3">
        {/* Col 1 */}
        <div className="w-[200px] shrink-0">
          <div className="text-[13px] font-extrabold uppercase tracking-widest text-ink mb-1">{invoice.invoice_number || "DRAFT"}</div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">{typeLabel}</div>
        </div>

        {/* Col 2 */}
        <div className="flex-1 min-w-[200px]">
          <div className="text-[14px] font-bold text-ink mb-1 truncate pr-4">{pName}</div>
          <div className="flex items-center gap-2">
            <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] border-ink flex items-center justify-center text-[8px] font-black ${statusInfo.side} ${avatarText}`}>
              {clientInitial}
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70 truncate">{cName}</div>
          </div>
        </div>

        {/* Col 3 */}
        <div className="w-[140px] shrink-0 text-right pr-6">
          <div className="text-[18px] font-black text-ink">{formatInr(total)}</div>
        </div>

        {/* Col 4 */}
        <div className="w-[130px] shrink-0 text-center">
          <span className={`inline-block px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${statusInfo.pill}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Col 5 */}
        <div className="ml-4 shrink-0 flex items-center gap-2">
          {onDelete && (statusInfo.label === 'draft' || statusInfo.label === 'live') && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(invoice.id);
              }}
              className="px-2 py-1.5 border-2 border-transparent hover:border-coral hover:bg-coral hover:text-white text-[11px] font-extrabold uppercase tracking-widest text-coral transition-all"
              title="Delete Invoice"
            >
              🗑
            </button>
          )}
          <button className="px-3 py-1.5 border-2 border-transparent group-hover:border-ink group-hover:bg-paper-2 text-[10px] font-extrabold uppercase tracking-widest text-ink transition-all">
            VIEW →
          </button>
        </div>
      </div>
    </Link>
  );
}
