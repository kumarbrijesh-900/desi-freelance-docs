"use client";

import React from "react";
import { DrilldownState } from "@/lib/lifecycle/computeActiveDrilldown";

export function formatInr(amount: number | string): string {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function ActiveDrilldown({
  state,
  onSendNow,
  onMarkSettled,
  onResend,
  onFinalize,
  onReviewRevision,
  onPreview
}: {
  state: DrilldownState | null;
  onSendNow?: () => void;
  onMarkSettled?: () => void;
  onResend?: () => void;
  onFinalize?: () => void;
  onReviewRevision?: () => void;
  onPreview?: () => void;
}) {
  if (!state || !state.invoice) {
    return (
      <div className="px-6 py-5 border-b-2 border-black bg-[#FAF7F2]">
        <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-3">
          Active now
        </div>
        <div className="text-lg font-extrabold text-neutral-500">
          No active invoice selected.
        </div>
      </div>
    );
  }

  const { invoice, milestone, items, primary_action } = state;

  // Determine Titles
  const genericRegex = /^Milestone \d+$/i;
  let title = "MASTER INVOICE";
  if (milestone) {
    const rawTitle = milestone.title || `Milestone ${milestone.order_index! + 1}`;
    title = genericRegex.test(rawTitle)
      ? `MILESTONE ${milestone.order_index! + 1}`
      : `M${milestone.order_index! + 1}: ${rawTitle}`;
  }

  const invoiceNum = invoice.invoice_number || "DRAFT";

  let subtitle = `INVOICE ${invoiceNum}`;
  if (milestone?.trigger_date) {
    subtitle += ` · fires ${new Date(milestone.trigger_date).toLocaleDateString('en-IN')}`;
  } else if (invoice.due_date) {
    subtitle += ` · due ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`;
  } else {
    subtitle += " · draft";
  }

  // Determine Action Button
  let btnLabel = "";
  let btnClass = "border-2 border-black font-extrabold uppercase px-4 py-2 text-sm shadow-[3px_3px_0_#000] transition-all";
  let handler: (() => void) | undefined;

  switch (primary_action) {
    case "send_now":
      btnLabel = "SEND NOW";
      btnClass += " bg-[#D4FF00] text-black active:translate-y-[3px] active:translate-x-[3px] active:shadow-none";
      handler = onSendNow;
      break;
    case "mark_settled":
      btnLabel = "MARK SETTLED";
      btnClass += " bg-[#00DCB4] text-black active:translate-y-[3px] active:translate-x-[3px] active:shadow-none";
      handler = onMarkSettled;
      break;
    case "resend":
      btnLabel = "RESEND INVOICE";
      btnClass += " bg-white text-black active:translate-y-[3px] active:translate-x-[3px] active:shadow-none";
      handler = onResend;
      break;
    case "finalize":
      btnLabel = "FINALIZE & SEND";
      btnClass += " bg-[#D4FF00] text-black active:translate-y-[3px] active:translate-x-[3px] active:shadow-none";
      handler = onFinalize;
      break;
    case "review_revision":
      btnLabel = "REVIEW REVISION";
      btnClass += " bg-[#D85A30] text-white active:translate-y-[3px] active:translate-x-[3px] active:shadow-none";
      handler = onReviewRevision;
      break;
    case "review_only":
      btnLabel = "VIEW";
      btnClass += " bg-white text-black active:translate-y-[3px] active:translate-x-[3px] active:shadow-none";
      handler = onPreview;
      break;
  }

  return (
    <div className="px-6 py-5 border-b-2 border-black bg-[#FAF7F2]">
      <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-3">
        ACTIVE NOW
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
        <h3 className="text-lg font-bold text-neutral-500 uppercase">{subtitle}</h3>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          className={btnClass + (!handler ? " opacity-50 cursor-not-allowed" : "")}
          onClick={handler}
          disabled={!handler}
        >
          {btnLabel}
        </button>
        <button
          type="button"
          onClick={onFinalize}
          className="text-sm font-bold uppercase underline underline-offset-4 text-neutral-600 hover:text-black"
        >
          EDIT
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="text-sm font-bold uppercase underline underline-offset-4 text-neutral-600 hover:text-black"
        >
          PREVIEW
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-6 border-t-2 border-black pt-4">
          <div className="text-[10px] uppercase font-bold text-neutral-500 mb-2">LINE ITEMS</div>
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm border-b border-neutral-200 pb-2">
                <div className="font-bold flex-1">{item.description || item.name || "Item"}</div>
                <div className="w-[80px] text-right font-medium">
                  {item.qty} {item.rateUnit === 'flat' ? '' : '×'} {item.rateUnit === 'flat' ? '' : formatInr(item.rate || 0)}
                </div>
                <div className="w-[100px] text-right font-extrabold">
                  {formatInr(Number(item.qty || 0) * Number(item.rate || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
