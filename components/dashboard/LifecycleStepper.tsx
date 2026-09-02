import React, { useState } from "react";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatProjectedDate, nextMilestoneStartLabel } from "@/lib/lifecycle/timing";
import { formatInr } from "@/components/dashboard/ActiveDrilldown";
import { MilestoneFocusCard } from "@/components/dashboard/MilestoneFocusCard";

type StopState = "done" | "live" | "pending" | "end";

interface StopDef {
  id: string;
  type: "start" | "milestone" | "complete";
  state: StopState;
  kicker: string;
  name: string;
  amount: string | null;
  meta: string | null;
  originalIndex?: number;
}

export function LifecycleStepper({ project, onSettleLive }: { project: ProjectWithInvoices; onSettleLive?: () => void }) {
  const [listOpen, setListOpen] = useState(false);
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) setListOpen(true);
  }, []);
  const milestones = [...project.milestones].filter(m =>
    project.invoices.find(inv => inv.id === m.invoice_id && !(inv as any).parent_invoice_id)
  ).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);

  const firstPendingIndex = milestones.findIndex(m => {
    const status = (m.status || "").toLowerCase();
    const hasChild = master ? project.invoices.some(inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (m.order_index ?? 0) + 1) : false;
    const isSet = status === "settled";
    const isAct = (status === "live" || hasChild || m.trigger_status === "fired") && !isSet;
    return !isAct && !isSet;
  });

  const milestoneStates = milestones.map((m, i) => {
    const milestoneStatus = (m.status || "").toLowerCase();
    const hasChildInvoice = master ? project.invoices.some(inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (m.order_index ?? 0) + 1) : false;
    const isSettled = milestoneStatus === "settled";
    const isActive = (milestoneStatus === "live" || hasChildInvoice || m.trigger_status === "fired") && !isSettled;
    const isPending = !isActive && !isSettled;
    return { m, i, isSettled, isActive, isPending };
  });

  const anyLiveOrSettled = milestoneStates.some(s => s.isActive || s.isSettled);
  const allSettled = milestoneStates.length > 0 && milestoneStates.every(s => s.isSettled);

  const stops: StopDef[] = [];

  stops.push({
    id: "start",
    type: "start",
    state: anyLiveOrSettled ? "done" : "live",
    kicker: "PROJECT START",
    name: "Agreement accepted",
    amount: null,
    meta: null,
  });

  milestoneStates.forEach(({ m, i, isSettled, isActive, isPending }) => {
    let labelStr = m.title || `Milestone ${i + 1}`;
    labelStr = labelStr.replace(/^m\d+[\s\-\·]+/i, '');
    
    const amtStr = m.amount ? formatInr(Number(m.amount)) : "—";

    const invoice = (i === 0) ? master : (master ? project.invoices.find(inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (m.order_index ?? 0) + 1) : null);
    let timingLabel = null;
    if ((isSettled || isActive) && invoice && (invoice as any).shared_at && (invoice as any).due_date) {
      timingLabel = `SENT ${formatProjectedDate((invoice as any).shared_at)} · DUE ${formatProjectedDate((invoice as any).due_date)}`;
    } else if (isPending && i === firstPendingIndex) {
      timingLabel = nextMilestoneStartLabel(m);
    }

    const state: StopState = isSettled ? "done" : isActive ? "live" : "pending";

    stops.push({
      id: m.id,
      type: "milestone",
      state,
      kicker: `MILESTONE ${i + 1}`,
      name: labelStr,
      amount: amtStr,
      meta: timingLabel,
      originalIndex: i,
    });
  });

  stops.push({
    id: "complete",
    type: "complete",
    state: allSettled ? "done" : "end",
    kicker: "PROJECT COMPLETE",
    name: "On final settle",
    amount: null,
    meta: null,
  });

  const total = stops.length;
  const settledCount = stops.filter(s => s.type === "milestone" && s.state === "done").length;
  const milestoneCount = stops.filter(s => s.type === "milestone").length;
  const focusStop = stops.find(s => s.state === "live" && s.type !== "start" && s.type !== "complete") || null;
  const focusLabel = focusStop ? ((focusStop as any).label || (focusStop.originalIndex !== undefined ? `M${focusStop.originalIndex + 1}` : focusStop.kicker) || "") : "";
  const focusInvoice = focusStop
    ? (project.invoices.find(inv => (inv as any).parent_invoice_id && String((inv as any).milestone_index ?? "") === focusLabel.replace(/^M/i, "")) || project.invoices.find(inv => !(inv as any).parent_invoice_id) || null)
    : null;
  const focusDueRaw = focusInvoice ? (focusInvoice as any).due_date : null;
  let focusDaysLate: number | null = null;
  let focusDueLabel: string | null = null;
  if (focusDueRaw) {
    const due = new Date(focusDueRaw);
    if (!Number.isNaN(due.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      if (diff < 0) focusDaysLate = Math.abs(diff);
      focusDueLabel =
        diff === 0 ? "Due today" : diff > 0 ? `Due in ${diff} day${diff === 1 ? "" : "s"}` : null;
    }
  }

  const focusNextStop = focusStop
    ? stops.find(s => s.type === "milestone" && s.state === "pending") || null
    : null;
  const focusUnlocks = focusNextStop
    ? `Settling unlocks ${focusNextStop.originalIndex !== undefined ? `M${focusNextStop.originalIndex + 1}` : "the next milestone"}${focusNextStop.amount && focusNextStop.amount !== "—" ? ` (${focusNextStop.amount})` : ""}`
    : null;

  const focusData = focusStop
    ? {
        label: focusLabel,
        name: focusStop.name || "",
        amount: focusStop.amount || "—",
        invoiceId: focusInvoice ? (focusInvoice as any).id : null,
        isOverdue: focusDaysLate !== null,
        daysLate: focusDaysLate,
        dueLabel: focusDueLabel,
        unlocksLabel: focusUnlocks,
      }
    : null;
  const center = (idx: number) => ((idx + 0.5) / total) * 100;
  
  let liveStopIndex = 0;
  const liveIndex = stops.findIndex(s => s.state === "live");
  if (liveIndex !== -1) {
    liveStopIndex = liveIndex;
  } else {
    let lastSettled = -1;
    for (let i = stops.length - 1; i >= 0; i--) {
      if (stops[i].state === "done") {
        lastSettled = i;
        break;
      }
    }
    if (lastSettled !== -1) {
      liveStopIndex = lastSettled;
    }
  }

  const solidEnd = center(liveStopIndex);
  const startCenter = center(0);
  const endCenter = center(total - 1);

  return (
    <div className="mb-6">
      {focusData && (
        <div className="mb-4 max-w-[760px]">
          <MilestoneFocusCard data={focusData} onSettle={onSettleLive} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setListOpen(open => !open)}
        aria-expanded={listOpen}
        className="mb-3 flex w-full max-w-[760px] items-center justify-between gap-3 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] font-mono">
          All milestones · {settledCount} of {milestoneCount} settled
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--color-ink-2)] font-mono">
          {listOpen ? "Hide" : "Show"}
        </span>
      </button>

      <div className={`${listOpen ? "block" : "hidden"} max-w-[760px] bg-[color:var(--color-paper-2)] border border-soft rounded-[14px] p-4 mb-4`}>
        {stops.map((stop, idx) => {
          const isLast = idx === stops.length - 1;
          const segSolid = idx < liveStopIndex;
          let dotClass = "w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 relative z-10";
          let dotContent = null;
          if (stop.state === "done") { dotClass += " bg-grass text-[color:var(--color-acc-ink)]"; dotContent = "✓"; }
          else if (stop.state === "live") { dotClass += " bg-acid text-acc-ink shadow-[0_0_0_5px_var(--color-acc-soft)]"; if (stop.type === "milestone") dotContent = `M${(stop.originalIndex ?? 0) + 1}`; }
          else if (stop.state === "pending") { dotClass += " bg-paper border-[3px] border-dashed border-[color:var(--color-strong)] text-ink"; if (stop.type === "milestone") dotContent = `M${(stop.originalIndex ?? 0) + 1}`; }
          else { dotClass += " bg-paper border-[2px] border-solid border-[color:var(--color-strong)] text-ink"; }

          let chipNode = null;
          if (stop.type === "milestone") {
            if (stop.state === "live") chipNode = <span className="inline-block mt-1 px-2 py-0.5 bg-acid text-acc-ink text-[10px] font-bold uppercase tracking-widest font-mono">LIVE</span>;
            else if (stop.state === "pending") chipNode = <span className="inline-block mt-1 px-2 py-0.5 border-[1.5px] border-dashed border-[color:var(--color-strong)] text-ink-2 text-[10px] font-bold uppercase tracking-widest font-mono">PENDING</span>;
            else if (stop.state === "done") chipNode = <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-2 font-mono">SETTLED</span>;
          }

          return (
            <div key={stop.id} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!isLast && (
                segSolid
                  ? <div className="absolute left-[16px] top-[34px] bottom-0 w-[3px] bg-acid" />
                  : <div className="absolute left-[16px] top-[34px] bottom-0 border-l-2 border-dashed border-[color:var(--color-strong)]" />
              )}
              <div className={dotClass}>
                <span className="text-[12px] font-bold font-display">{dotContent}</span>
                {stop.state === "live" && onSettleLive && (
                  <button
                    type="button"
                    onClick={onSettleLive}
                    aria-label={`Settle ${stop.name}`}
                    className="absolute inset-0 z-20 cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95 after:absolute after:left-1/2 after:top-1/2 after:h-[40px] after:w-[40px] after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                {stop.state === "live" && (
                  <span className="inline-block mb-1 px-2 py-0.5 bg-acid text-acc-ink text-[9px] font-bold font-mono uppercase rounded-sm">NOW</span>
                )}
                <div className="text-[10px] text-ink-2 font-bold font-mono uppercase tracking-widest mb-0.5">{stop.kicker}</div>
                <div className={`text-[14px] font-display font-bold leading-tight mb-0.5 ${stop.state === 'done' || stop.state === 'live' ? 'text-ink' : 'text-ink-2'}`}>{stop.name}</div>
                {stop.amount && (
                  <div className={`text-[15px] font-display font-bold ${stop.state === 'done' || stop.state === 'live' ? 'text-ink' : 'text-ink-2'}`}>{stop.amount}</div>
                )}
                {chipNode}
                {stop.meta && (
                  <div className="text-[9px] font-bold uppercase tracking-widest text-ink-2 font-mono mt-1.5">{stop.meta}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
}
