import React from "react";
import { ProjectWithInvoices } from "@/lib/supabase/projects";
import { formatTimingPill, SettlementTiming } from "@/lib/lifecycle/timing";
import { formatInr } from "@/components/dashboard/ActiveDrilldown";

export function LifecycleStepper({ project }: { project: ProjectWithInvoices }) {
  const milestones = [...project.milestones].filter(m =>
    project.invoices.find(inv => inv.id === m.invoice_id && !(inv as any).parent_invoice_id)
  ).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  
  const master = project.invoices.find(inv => !(inv as any).parent_invoice_id);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink">
          MILESTONE TIMELINE
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-ink border-[1.5px] border-rule" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink">SETTLED</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-acid border-[1.5px] border-rule" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink">LIVE</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-paper border-[1.5px] border-ink/30 border-dashed" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink">PENDING</div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-ink p-6 shadow-[4px_4px_0_var(--color-rule)] mb-6 overflow-x-auto no-scrollbar">
        <div className="flex items-start min-w-[600px]">
          {milestones.map((m, i) => {
            const milestoneStatus = (m.status || "").toLowerCase();
            const hasChildInvoice = master ? project.invoices.some(inv => (inv as any).parent_invoice_id === master.id && (inv as any).milestone_index === (m.order_index ?? 0) + 1) : false;
            const isSettled = milestoneStatus === "settled";
            const isActive = (hasChildInvoice || m.trigger_status === "fired") && !isSettled;
            const isPending = !isActive && !isSettled;
            
            const circleBg = isSettled ? "bg-ink text-white" : isActive ? "bg-acid text-ink shadow-[3px_3px_0_var(--color-rule)]" : "bg-paper text-ink border-dashed";
            const lineStyle = isSettled ? "border-t-[2.5px] border-solid border-ink" : "border-t-[2px] border-dashed border-ink/30";
            
            // Generate label: remove explicit M1 prefixes if present to reduce noise
            let labelStr = m.title || `Milestone ${i + 1}`;
            labelStr = labelStr.replace(/^m\d+[\s\-\·]+/i, '');
            
            const amtStr = m.amount ? formatInr(Number(m.amount)) : "—";
            const statusStr = isSettled ? "SETTLED" : isActive ? "LIVE" : "PENDING";

            return (
              <div key={m.id} className="flex-1 relative">
                <div className="flex items-center">
                  <div className={`w-[38px] h-[38px] rounded-full border-2 border-ink flex items-center justify-center text-xs font-black z-10 shrink-0 ${circleBg}`}>
                    {isSettled ? "✓" : `M${i+1}`}
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`flex-1 h-0 ${lineStyle} -ml-[2px] z-0`} />
                  )}
                </div>
                <div className="pt-3 pr-4">
                  <div className={`text-[11px] uppercase tracking-widest mb-1 truncate transition-all ${
                    isActive ? "font-black text-ink" : 
                    isSettled ? "font-extrabold text-ink" : 
                    "font-bold text-ink/40"
                  }`} title={labelStr}>
                    M{i+1} · {labelStr}
                  </div>
                  <div className={`transition-all mb-1 ${
                    isActive ? "text-lg font-black text-ink" : 
                    isSettled ? "text-base font-black text-ink" : 
                    "text-base font-bold text-ink/40"
                  }`}>{amtStr}</div>
                  <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isActive ? 'text-grass' : 'text-ink/40'}`}>
                    {statusStr}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
