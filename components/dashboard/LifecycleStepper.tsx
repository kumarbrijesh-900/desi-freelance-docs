import React from "react";
import { LifecycleStep } from "@/lib/lifecycle/computeProjectLifecycle";
import { formatTimingPill, SettlementTiming } from "@/lib/lifecycle/timing";
import { formatInr } from "@/components/dashboard/ActiveDrilldown";

export function LifecycleStepper({ steps }: { steps: LifecycleStep[] }) {
  // Only extract milestone steps for the timeline to match the visual
  const milestones = steps.filter(s => s.kind.startsWith("milestone_"));

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
            const isSettled = m.status === "completed";
            const isActive = m.status === "active";
            const isPending = m.status === "pending";
            
            const circleBg = isSettled ? "bg-ink text-white" : isActive ? "bg-acid text-ink shadow-[3px_3px_0_var(--color-rule)]" : "bg-paper text-ink border-dashed";
            const lineStyle = isSettled ? "border-t-[2.5px] border-solid border-ink" : "border-t-[2px] border-dashed border-ink/30";
            
            // Generate label
            const labelStr = m.label.split(" (")[0]; // Remove date if present
            const amtStr = (m.meta as any)?.amount ? formatInr((m.meta as any).amount as number) : "—";
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
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink mb-1 truncate" title={labelStr}>
                    M{i+1} · {labelStr}
                  </div>
                  <div className="text-base font-black text-ink mb-1">{amtStr}</div>
                  <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isActive ? 'text-grass' : 'text-ink/60'}`}>
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
