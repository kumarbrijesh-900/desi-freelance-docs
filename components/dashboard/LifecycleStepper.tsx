import React from "react";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatProjectedDate, nextMilestoneStartLabel } from "@/lib/lifecycle/timing";
import { formatInr } from "@/components/dashboard/ActiveDrilldown";

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

export function LifecycleStepper({ project }: { project: ProjectWithInvoices }) {
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
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink font-mono">
          MILESTONE TIMELINE
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-ink" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink font-mono">SETTLED</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-acid shadow-[0_0_0_2px_var(--color-acc-soft)]" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink font-mono">LIVE</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-paper border-[1.5px] border-[color:var(--color-strong)] border-dashed" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink font-mono">PENDING</div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-ink p-6 shadow-[var(--elev-1)] mb-6 overflow-x-auto no-scrollbar relative">
        <div className="relative min-w-[800px] py-4">
          
          <div className="absolute top-[53px] left-0 right-0 h-0 z-0">
            <div 
              className="absolute h-[3px] bg-acid -translate-y-1/2" 
              style={{ left: `${startCenter}%`, width: `${solidEnd - startCenter}%` }} 
            />
            <div 
              className="absolute h-[2px] border-t-[2px] border-dashed border-[color:var(--color-strong)] -translate-y-1/2"
              style={{ left: `${solidEnd}%`, right: `${100 - endCenter}%` }}
            />
          </div>

          <div className="flex relative z-10">
            {stops.map((stop) => {
              let dotClass = "w-[34px] h-[34px] rounded-full mx-auto flex items-center justify-center relative";
              let dotContent = null;

              if (stop.state === "done") {
                dotClass += " bg-ink text-white";
                dotContent = "✓";
              } else if (stop.state === "live") {
                dotClass += " bg-acid text-acc-ink shadow-[0_0_0_6px_var(--color-acc-soft)]";
                if (stop.type === "milestone") dotContent = `M${(stop.originalIndex ?? 0) + 1}`;
              } else if (stop.state === "pending") {
                dotClass += " bg-paper border-[3px] border-dashed border-[color:var(--color-strong)] text-ink";
                if (stop.type === "milestone") dotContent = `M${(stop.originalIndex ?? 0) + 1}`;
              } else if (stop.state === "end") {
                dotClass += " bg-paper border-[2px] border-solid border-[color:var(--color-strong)] text-ink";
              }

              let chipNode = null;
              if (stop.type === "milestone") {
                if (stop.state === "live") {
                  chipNode = <div className="inline-block mt-2 px-2 py-0.5 bg-acid text-acc-ink text-[10px] font-extrabold uppercase tracking-widest font-mono">LIVE</div>;
                } else if (stop.state === "pending") {
                  chipNode = <div className="inline-block mt-2 px-2 py-0.5 border-[1.5px] border-dashed border-[color:var(--color-strong)] text-ink-3 text-[10px] font-extrabold uppercase tracking-widest font-mono">PENDING</div>;
                } else if (stop.state === "done") {
                  chipNode = <div className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-ink-3 font-mono">SETTLED</div>;
                }
              }

              return (
                <div key={stop.id} className="flex-1 text-center relative flex flex-col items-center">
                  
                  <div className="h-8 relative w-full flex justify-center mb-1">
                    {stop.state === "live" && (
                      <div className="absolute bottom-2 flex flex-col items-center">
                        <div className="px-2 py-0.5 bg-acid text-acc-ink text-[10px] font-extrabold font-mono uppercase rounded-sm">NOW</div>
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-acid" />
                      </div>
                    )}
                  </div>

                  <div className="h-[34px] flex items-center justify-center w-full relative mb-4">
                     <div className={dotClass}>
                       <span className="text-[12px] font-black font-display">{dotContent}</span>
                     </div>
                  </div>
                  
                  <div className="px-2">
                    <div className="text-[10px] text-ink-3 font-extrabold font-mono uppercase tracking-widest mb-1">{stop.kicker}</div>
                    <div className={`text-[13px] font-display font-bold leading-tight mb-1 ${stop.state === 'done' || stop.state === 'live' ? 'text-ink' : 'text-ink-2'}`}>
                      {stop.name}
                    </div>
                    {stop.amount && (
                      <div className={`text-[14px] font-display font-black ${stop.state === 'done' || stop.state === 'live' ? 'text-ink' : 'text-ink-3'}`}>
                        {stop.amount}
                      </div>
                    )}
                    {chipNode}
                    {stop.meta && (
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-ink-3 font-mono mt-3">
                        {stop.meta}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
