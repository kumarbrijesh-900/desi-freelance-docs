import React from "react";
import { LifecycleStep } from "@/lib/lifecycle/computeProjectLifecycle";
import { formatTimingPill, SettlementTiming } from "@/lib/lifecycle/timing";
import { Clock } from "lucide-react";

export function LifecycleStepper({ steps }: { steps: LifecycleStep[] }) {
  const getHelperText = (label: string): string | null => {
    const l = label.toLowerCase();
    if (l.includes("msa accepted")) return "contract accepted";
    if (l.includes("msa proposed")) return "contract sent, awaiting client";
    if (l.includes("revision requested")) return "client wants changes before accepting";
    if (l.includes("settled")) return "paid and marked done";
    if (l.includes("fired")) return "invoice generated and sent";
    if (l.includes("scheduled")) return "invoice will auto-send on date";
    if (l.includes("sent to client")) return "invoice delivered, awaiting response";
    if (l.includes("finalized")) return "invoice locked, ready to send";
    if (l.includes("project complete")) return "all milestones settled, work done";
    return null;
  };

  return (
    <div className="px-6 py-5">
      <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-600 mb-3">
        WHERE YOU ARE
      </div>

      <div className="relative pl-[5px]">
        {/* Vertical line */}
        <div className="absolute left-[10.5px] top-[14px] bottom-0 w-[1.5px] bg-black" />

        <div className="flex flex-col gap-6">
          {steps.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";
            const isPending = step.status === "pending";

            const isCancelled = step.kind === "milestone_cancelled";
            const helperText = getHelperText(step.label);
            const isScheduled = isActive && step.label.includes("scheduled");
            const isRevision = isActive && step.kind === "msa_revision";

            let nodeClass = "";
            if (isCancelled) nodeClass = "bg-neutral-300 border-2 border-white";
            else if (isCompleted) nodeClass = "bg-[#00DCB4] border-2 border-white";
            else if (isActive) {
              if (isScheduled) nodeClass = "bg-[color:var(--color-lime-warm)] border-2 border-black flex items-center justify-center";
              else if (isRevision) nodeClass = "bg-[#D85A30] border-2 border-black";
              else nodeClass = "bg-[color:var(--color-lime-warm)] border-2 border-black";
            }
            else if (isPending) nodeClass = "bg-white border-2 border-neutral-400";

            // If active, wrap in a highlighted container, overriding standard padding
            const wrapperClass = isActive
              ? `flex justify-between items-start -ml-3 px-3 py-2 border-l-[3px] z-10 relative ${
                  isRevision ? "bg-red-50 border-[#D85A30]" : "bg-[#FBFBEA] border-[color:var(--color-lime-warm)]"
                }`
              : "flex justify-between items-start z-10 relative";

            return (
              <div key={step.id} className={wrapperClass}>
                <div className="flex items-start gap-4 w-full">
                  <div className={`w-[12px] h-[12px] rounded-full shrink-0 mt-[4px] relative z-20 ${nodeClass}`}>
                    {isScheduled && <Clock size={8} className="text-black m-auto mt-[1px]" strokeWidth={3} />}
                  </div>

                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${
                        isCancelled ? "text-neutral-500 line-through" :
                        isActive ? "text-black font-extrabold" :
                        isPending ? "text-neutral-500" :
                        "text-black"
                      }`}>
                        {step.label}
                      </div>

                      <div className="flex items-center gap-2">
                        {step.meta?.timing && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 whitespace-nowrap ${
                            step.meta.timing === 'early' ? 'bg-[color:var(--color-lime-warm)] text-black' :
                            step.meta.timing === 'on_time' ? 'bg-[#00DCB4] text-black' :
                            'bg-[#BA7517] text-white'
                          }`}>
                            {formatTimingPill(step.meta.timing as SettlementTiming, step.meta.days_diff)}
                          </span>
                        )}
                        {step.date && (
                          <span className="text-xs text-neutral-600">
                            {new Date(step.date).toLocaleDateString('en-IN')}
                            {step.meta?.email && ` · ${step.meta.email}`}
                          </span>
                        )}
                        {isActive && !isCancelled && (
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 ${
                            isRevision ? "bg-black text-[#D85A30]" : "bg-black text-[color:var(--color-lime-warm)]"
                          }`}>
                            NOW
                          </span>
                        )}
                      </div>
                    </div>

                    {helperText && (
                      <div className="text-[10px] text-neutral-500 lowercase mt-0.5">
                        {helperText}
                      </div>
                    )}
                    {step.meta?.note && isRevision && (
                      <div className="text-xs text-black italic bg-white p-2 border border-black mt-2 shadow-[2px_2px_0_#111118]">
                        "client note: {step.meta.note}"
                      </div>
                    )}
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
