import { useState, useEffect, type ReactNode } from "react";
import { Building2, Users, Settings2, ListChecks, ShieldCheck, CreditCard } from "lucide-react";
import { motion } from "@/components/ui/motion-primitives";
import { cn, getAppStatusPillClass } from "@/lib/ui-foundation";
import type { InvoiceStepperStep } from "@/types/invoice";
import { orderedSteps, getStepShortLabel, getStepDescription, getStepKind } from "@/lib/invoice-editor-utils";

export function InlineStepSection({
  step,
  isActive,
  isCompleted,
  issueCount,
  optionalIssueCount,
  onActivate,
  children,
  footer,
  isReadOnly = false,
}: {
  step: InvoiceStepperStep;
  isActive: boolean;
  isCompleted: boolean;
  issueCount: number;
  optionalIssueCount: number;
  onActivate: () => void;
  children: ReactNode;
  footer?: ReactNode;
  isReadOnly?: boolean;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const stepNumber = orderedSteps.indexOf(step) + 1;
  const stepLabel = getStepShortLabel(step);
  const detailCopy = getStepDescription(step);
  const sectionDescription = isReadOnly
    ? `${detailCopy.replace(/\.$/, "")} — read only.`
    : detailCopy;
  const stepKind = getStepKind(step);
  let statusLabel =
    !isCompleted && isMounted && issueCount > 0
      ? `${issueCount} mandatory`
      : isCompleted
        ? optionalIssueCount > 0 ? "Ready" : "Complete ✓"
        : isActive && isMounted && issueCount === 0
          ? optionalIssueCount > 0 ? "Ready" : "Complete ✓"
          : isActive
            ? "In progress"
            : "Pending";

  if (step === "totals" && isActive && !isCompleted) {
    statusLabel = "Pending";
  }

  const StepIcon = {
    agency: Building2,
    client: Users,
    deliverables: ListChecks,
    payment: CreditCard,
    meta: Settings2,
    totals: ShieldCheck,
  }[step];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <motion.section
      layout
      id={`step-${step}`}
      data-step-section={step}
      data-step-state={
        isActive ? "active" : isCompleted ? "completed" : "incomplete"
      }
      data-step-kind={stepKind}
      className={cn(
        "invoice-step-card relative scroll-mt-32 overflow-visible rounded-none px-[18px] py-4 transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)] sm:px-5",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <button
            type="button"
            onClick={onActivate}
            data-step-activator={step}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "invoice-step-dot mt-[9px] inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                  isCompleted
                    ? "bg-[color:var(--interactive-secondary)]"
                    : isActive
                      ? "bg-[color:var(--interactive-primary)]"
                      : "bg-[color:var(--border-strong)]",
                )}
              />
              <div className="min-w-0">
                {!isReadOnly && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Step {stepNumber}
                  </p>
                )}
                <h2 className="mt-1 text-[19px] font-bold tracking-[-0.024em] text-[color:var(--text-primary)]">
                  <div className="flex items-center gap-2">
                    {StepIcon && (
                      <StepIcon
                        className={cn(
                          "w-5 h-5 shrink-0 transition-colors duration-200",
                          isActive || isCompleted
                            ? "text-inherit"
                            : "text-slate-400",
                        )}
                        strokeWidth={1.5}
                      />
                    )}
                    {stepLabel}
                  </div>
                </h2>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[color:var(--text-muted)]">
                  {sectionDescription}
                </p>
              </div>
            </div>
          </button>

          {!isReadOnly && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span
                className={cn(
                  statusLabel.toLowerCase().includes("ready")
                    ? "border-2 border-[#111118] bg-[#E0FFF7] text-[#006B52] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                    : statusLabel.toLowerCase().includes("mandatory")
                      ? "border-2 border-[#111118] bg-[#FF5C00] text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                      : getAppStatusPillClass(
                          isCompleted ? "success" : issueCount > 0 ? "warning" : isActive ? "default" : "muted",
                        )
                )}
              >
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        <motion.div
          layout
          initial={false}
          className="invoice-step-divider pt-2"
        >
          <div className={cn("space-y-4", footer ? "mb-20" : "mb-4")}>
            {children}
            {footer}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
