"use client";

import React, { useState } from "react";
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
  masterHasClientMsaNote,
  masterInvoice
}: {
  invoice: any;
  projectName?: string;
  clientName?: string;
  isMaster: boolean;
  projectId?: string | null;
  masterMsaStatus?: string | null;
  masterHasClientMsaNote?: boolean;
  masterInvoice?: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const milestoneIndex = Number(invoice.milestone_index);
  const typeLabel = isMaster
    ? "Master"
    : Number.isFinite(milestoneIndex)
      ? `M${milestoneIndex + 1} billing` // assuming milestone_index is 0-based
      : "Milestone billing";
  const statusInfo = getStatusPill(invoice.status || "draft", masterMsaStatus || null, !!masterHasClientMsaNote);

  let total = Number(invoice.grand_total || 0);
  if (total === 0) {
    total = Number(invoice.form_data?.totals?.total || 0);
  }
  
  let lineItemsToRender = [];
  if (invoice.form_data) {
    const milestones = invoice.form_data.milestones || [];
    if (milestones.length > 0) {
      if (total === 0) {
        total = milestones.reduce((s: number, m: any) => s + (m.lineItems || []).reduce(
          (sum: number, li: any) => sum + Number(li.qty || 0) * Number(li.rate || 0), 0
        ), 0);
      }
      if (Number.isFinite(milestoneIndex) && milestones[milestoneIndex]) {
         lineItemsToRender = milestones[milestoneIndex].lineItems || [];
      } else {
         lineItemsToRender = milestones.flatMap((m: any) => m.lineItems || []);
      }
    } else {
      lineItemsToRender = invoice.form_data.lineItems || [];
      if (total === 0) {
        total = lineItemsToRender.reduce(
          (s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0
        );
      }
    }
  }

  const rowHref = `/invoice/${invoice.id}/client-preview`;

  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  const today = new Date();
  let dueDaysText = "N/A";
  if (dueDate) {
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      dueDaysText = `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      dueDaysText = "Due today";
    } else {
      dueDaysText = `Due in ${diffDays} days`;
    }
  }

  const allMilestones = masterInvoice?.form_data?.milestones || invoice.form_data?.milestones || [];

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className="flex flex-col border-2 border-black bg-white shadow-[4px_4px_0_#111118] p-4 gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#111118] cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
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
        <div className="flex sm:w-[120px] shrink-0 justify-end items-center gap-3">
          <Link
            href={rowHref}
            onClick={(e) => e.stopPropagation()}
            className="border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-[2px_2px_0_#111118] transition-colors hover:bg-black hover:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none whitespace-nowrap"
          >
            VIEW →
          </Link>
          <div className="text-black transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-4 border-t-2 border-black flex flex-col gap-4 text-sm" onClick={(e) => e.stopPropagation()}>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Details Left Panel */}
            <div className="flex-1 flex flex-col gap-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[color:var(--bg-surface-soft)] p-4 border-2 border-black">
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Issue Date</p>
                   <p className="font-extrabold">{invoice.issue_date || "Not Issued"}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Due Date</p>
                   <p className="font-extrabold">{invoice.due_date || "N/A"}</p>
                   {invoice.due_date && <p className="text-[10px] font-bold text-[#FF5C00] mt-1 uppercase">{dueDaysText}</p>}
                </div>
              </div>

              {/* Line Items Container moved inside left panel */}
              <div className="border-2 border-black">
                <div className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex justify-between">
                  <span>Item</span>
                  <span className="text-right w-[100px]">Total</span>
                </div>
                <div className="flex flex-col">
                  {lineItemsToRender.length > 0 ? lineItemsToRender.map((li: any, i: number) => (
                    <div key={i} className="px-4 py-2 flex justify-between items-center border-b-2 border-black last:border-b-0 bg-white hover:bg-neutral-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{li.title || "Item"}</span>
                        <span className="text-[10px] text-neutral-500 font-bold">{li.qty} x {formatInr(li.rate)}</span>
                      </div>
                      <span className="font-black text-sm text-right w-[100px] shrink-0">{formatInr(Number(li.qty || 0) * Number(li.rate || 0))}</span>
                    </div>
                  )) : (
                     <div className="px-4 py-4 text-center text-xs font-bold text-neutral-500 uppercase">No line items available</div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline Right Panel */}
            {allMilestones.length > 0 && (
              <div className="sm:w-[250px] border-2 border-black p-4 bg-white flex flex-col shrink-0">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-black mb-4 border-b-2 border-black pb-2">Milestone Timeline</h4>
                 <div className="flex flex-col gap-3 relative flex-1">
                   <div className="absolute left-[7px] top-[10px] bottom-[10px] w-0.5 bg-neutral-200"></div>
                   {allMilestones.map((m: any, idx: number) => {
                     const isPast = idx < milestoneIndex;
                     const isCurrent = idx === milestoneIndex;
                     const isFuture = idx > milestoneIndex;
                     
                     // If it's a master invoice, there is no "current milestone" (milestoneIndex is NaN).
                     // In that case, we can just show all of them as standard (not faded).
                     const masterMode = Number.isNaN(milestoneIndex);
                     const faded = !masterMode && isFuture;
                     const highlight = masterMode ? false : isCurrent;
                     
                     return (
                       <div key={idx} className={`flex items-start gap-4 relative z-10 ${faded ? 'opacity-40' : ''}`}>
                          <div className={`w-4 h-4 rounded-full border-2 border-black flex-shrink-0 mt-0.5 ${highlight ? 'bg-[color:var(--color-lime-warm)]' : isPast ? 'bg-black' : 'bg-white'}`}></div>
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wide ${highlight ? 'text-black' : 'text-neutral-700'}`}>M{idx + 1}: {m.name || 'Milestone'}</p>
                            <p className="text-[10px] text-neutral-500 font-bold">{formatInr(m.lineItems?.reduce((sum: number, li: any) => sum + (Number(li.qty)*Number(li.rate)), 0) || 0)}</p>
                          </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
