"use client";

import React from "react";
import { DrilldownState } from "@/lib/lifecycle/computeActiveDrilldown";
import { computeSettlementTiming, formatTimingPill, formatProjectedDate } from "@/lib/lifecycle/timing";
import { computeInvoiceTax } from "@/lib/invoice-tax";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function formatInr(amount: number | string): string {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function ActiveDrilldown({
  state,
  invoiceIds,
  onSendNow,
  onMarkSettled,
  onResend,
  onFinalize,
  onReviewRevision,
  onPreview
}: {
  state: DrilldownState | null;
  invoiceIds?: string[];
  onSendNow?: () => void;
  onMarkSettled?: () => void;
  onResend?: () => void;
  onFinalize?: () => void;
  onReviewRevision?: () => void;
  onPreview?: () => void;
}) {
  if (!state || !state.invoice) {
    return (
      <div className="px-6 py-5 border-b-2 border-ink bg-paper-2">
        <div className="text-[10px] uppercase tracking-widest font-bold text-ink/70 mb-3">
          Active now
        </div>
        <div className="text-lg font-extrabold text-ink/50">
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
      : `M${milestone.order_index! + 1} · ${rawTitle}`;
  }

  const invoiceNum = invoice.invoice_number || "DRAFT";

  let subtitle = `${invoiceNum}`;
  if (milestone?.trigger_date) {
    subtitle += ` · DUE ${new Date(milestone.trigger_date).toLocaleDateString('en-IN').replace(/\//g, ' / ')}`;
  } else if (invoice.due_date) {
    subtitle += ` · DUE ${new Date(invoice.due_date).toLocaleDateString('en-IN').replace(/\//g, ' / ')}`;
  } else {
    subtitle += ` · DUE NOT SET`;
  }

  // Fetch actual notifications for the selected project
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchActivities = async () => {
      if (!invoiceIds || invoiceIds.length === 0) {
        if (active) {
          setActivities([]);
          setLoadingActivities(false);
        }
        return;
      }
      setLoadingActivities(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('created_at', { ascending: false })
        .limit(8);

      if (active && !error && data) {
        setActivities(data);
      }
      if (active) setLoadingActivities(false);
    };
    fetchActivities();
    return () => { active = false; };
  }, [invoiceIds]);

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    const diffHours = (Date.now() - d.getTime()) / 3600000;
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days`;
  };

  // Determine Action Button
  let btnLabel = "";
  let btnClass = "border-2 border-ink font-extrabold uppercase px-4 py-2 text-[11px] tracking-widest transition-all";
  let handler: (() => void) | undefined;

  switch (primary_action) {
    case "send_now":
      btnLabel = "SEND NOW";
      btnClass += " shadow-[var(--elev-3)] bg-grass text-white active:translate-y-[2px] active:translate-x-[2px] active:shadow-none";
      handler = onSendNow;
      break;
    case "mark_settled":
      btnLabel = "MARK SETTLED";
      btnClass += " shadow-[var(--elev-3)] bg-grass text-white active:translate-y-[2px] active:translate-x-[2px] active:shadow-none";
      handler = onMarkSettled;
      break;
    case "resend":
      btnLabel = "NUDGE CLIENT";
      btnClass += " shadow-[3px_3px_0_var(--color-ink)] bg-white text-ink hover:bg-paper-2 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none";
      handler = onResend;
      break;
    case "finalize":
      btnLabel = "FINALIZE & SEND";
      btnClass += " shadow-[3px_3px_0_var(--color-ink)] bg-grass text-white active:translate-y-[2px] active:translate-x-[2px] active:shadow-none";
      handler = onFinalize;
      break;
    case "review_revision":
      btnLabel = "REVIEW REVISION";
      btnClass += " shadow-[3px_3px_0_var(--color-ink)] bg-coral text-white active:translate-y-[2px] active:translate-x-[2px] active:shadow-none";
      handler = onReviewRevision;
      break;
    case "review_only":
      btnLabel = "VIEW";
      btnClass += " shadow-[3px_3px_0_var(--color-ink)] bg-white text-ink hover:bg-paper-2 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none";
      handler = onPreview;
      break;
  }

  const dotColors = ["bg-sky", "bg-lav", "bg-coral", "bg-grass", "bg-butter"];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const taxBreakdown = computeInvoiceTax(invoice.form_data, subtotal);
  const grandTotal = taxBreakdown.totalPayable;

  let countdownJSX = null;
  if (invoice?.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.due_date);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const shortDate = due.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    
    if (diffDays > 0) {
      countdownJSX = <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70 mt-1">DUE IN {diffDays} DAYS · {shortDate}</div>;
    } else if (diffDays === 0) {
      countdownJSX = <div className="text-[10px] font-extrabold uppercase tracking-widest text-coral mt-1">DUE TODAY</div>;
    } else {
      countdownJSX = <div className="text-[10px] font-extrabold uppercase tracking-widest text-coral mt-1">OVERDUE BY {Math.abs(diffDays)} DAYS</div>;
    }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 min-h-0">
      <div className="flex-1 bg-paper p-6 border-2 border-ink shadow-[var(--elev-1)] flex flex-col">
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="flex gap-2 mb-2">
              <div className="px-2 py-0.5 bg-acid text-ink text-[10px] font-extrabold uppercase tracking-widest border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-ink rounded-full animate-pulse" /> ACTIVE NOW</div>
            </div>
            <h2 className="text-[28px] font-display font-black tracking-tight leading-tight mb-1.5 text-ink">{title}</h2>
            <h3 className="text-[10px] font-extrabold tracking-widest text-ink/70 uppercase">{subtitle}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFinalize}
              className="px-4 py-2 border-2 border-transparent hover:border-ink hover:bg-paper-2 font-extrabold uppercase text-[11px] tracking-widest transition-all text-ink"
            >
              EDIT
            </button>
          </div>
        </div>

        <div className="h-px bg-ink/20 my-4" />

        <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70 mb-3">LINE ITEMS · {items.length}</div>

        <div className="flex flex-col gap-3">
          {items.map((item, idx) => {
            const dotBg = dotColors[idx % dotColors.length];
            return (
              <div key={idx} className={`flex justify-between items-center py-2 ${idx < items.length - 1 ? 'border-b border-ink/20 border-dashed' : ''}`}>
                <div className="flex items-center gap-2.5 flex-1">
                  <div className={`w-3 h-3 rounded-full border-[1.5px] border-ink ${dotBg}`} />
                  <div className="text-[13px] font-bold text-ink">{item.description || item.name || "Item"}</div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-[11px] font-bold tracking-widest text-ink/70">
                    {item.qty} {item.rateUnit === 'flat' ? '' : '×'} {item.rateUnit === 'flat' ? '' : formatInr(item.rate || 0)}
                  </div>
                  <div className="w-[90px] text-right text-[14px] font-black text-ink">
                    {formatInr(Number(item.qty || 0) * Number(item.rate || 0))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-px bg-ink/20 my-4" />

        <div className="border-t-2 border-ink mt-auto pt-4 flex justify-between items-end">
          <div className="flex flex-col items-start gap-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/70">
              {milestone ? `M${(milestone.order_index ?? 0) + 1} TOTAL` : 'TOTAL'} · {taxBreakdown.label}
            </div>
            <div className="text-2xl font-black text-ink leading-none mt-1">
              {formatInr(grandTotal)}
            </div>
            {countdownJSX}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {primary_action === 'mark_settled' && (
                <button
                  type="button"
                  onClick={onResend}
                  title="Their dt of payment is due in 24 hours, this nudge will send a polite mail to client as a reminder"
                  className="px-4 py-2 bg-white text-ink border-2 border-ink font-extrabold uppercase text-[11px] tracking-widest shadow-[var(--elev-2)] hover:bg-paper-2 transition-all group relative"
                >
                  NUDGE CLIENT
                </button>
              )}
              <button
                className={btnClass + (!handler ? " opacity-50 cursor-not-allowed" : "")}
                onClick={handler}
                disabled={!handler}
              >
                {btnLabel}
              </button>
            </div>
            {primary_action === 'mark_settled' && state?.next_milestone && (
              <div className="text-[9px] font-bold uppercase tracking-widest text-ink/50 text-right mt-1">
                {(() => {
                  const m = state.next_milestone!;
                  const prefix = `ON SETTLE → M${(m.order_index ?? 0) + 1} (${formatInr(Number(m.amount || 0))})`;
                  if (m.trigger_mode === 'scheduled' && m.trigger_date) {
                    return `${prefix} STARTS ~${formatProjectedDate(m.trigger_date)}`;
                  }
                  return `${prefix} GOES LIVE`;
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: activity */}
      <div className="w-full xl:w-[280px] flex flex-col gap-3">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink mb-1">ACTIVITY</div>
        {loadingActivities ? (
          <div className="text-xs font-bold text-ink/50 py-2">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-xs font-bold text-ink/50 py-2">No activity yet</div>
        ) : (
          activities.map((act) => {
            let ic = "·";
            let k = "paper";
            const type = act.type || "";
            if (type === "invoice_sent") { ic = "✉"; k = "sky"; }
            else if (type === "invoice_viewed") { ic = "👁"; k = "lav"; }
            else if (type === "msa_accepted") { ic = "§"; k = "butter"; }
            else if (type === "msa_negotiating" || type === "msa_rejected") { ic = "⚠"; k = "coral"; }
            else if (type === "invoice_settled") { ic = "✓"; k = "grass"; }

            let bgClass = "bg-paper text-ink";
            if (k === "grass") bgClass = "bg-grass text-ink";
            else if (k === "coral") bgClass = "bg-coral text-ink";
            else if (k === "sky") bgClass = "bg-sky text-ink";
            else if (k === "lav") bgClass = "bg-lav text-ink";
            else if (k === "butter") bgClass = "bg-butter text-ink";

            return (
              <div key={act.id} className="flex items-start gap-2.5" title={act.message || ""}>
                <div className={`w-7 h-7 flex items-center justify-center border-[1.5px] border-ink font-bold text-[13px] shrink-0 ${bgClass}`}>
                  {ic}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-ink leading-tight mt-0.5 truncate" title={act.title}>
                    {act.title}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink/50 mt-0.5 truncate">
                    {formatRelativeTime(act.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
