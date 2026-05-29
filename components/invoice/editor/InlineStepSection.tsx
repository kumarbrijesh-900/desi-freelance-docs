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
        "box shadow relative scroll-mt-32 overflow-visible rounded-none px-[18px] sm:px-[32px] py-[28px] transition-[background-color,border-color,box-shadow] duration-[var(--app-duration-medium)]",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
          <button
            type="button"
            onClick={onActivate}
            data-step-activator={step}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="box flex items-center justify-center shrink-0 bg-[color:var(--color-acid)]" style={{width:38, height:38, fontSize:18}}>
                {StepIcon && <StepIcon className="w-5 h-5" strokeWidth={1.5} />}
              </div>
              <div className="min-w-0">
                {!isReadOnly && (
                  <p className="cap mb-0.5">
                    STEP {stepNumber} · {stepLabel.toUpperCase()}
                  </p>
                )}
                <h2 className="display text-[26px] leading-none m-0">
                  {stepLabel}
                </h2>
              </div>
            </div>
          </button>

          {!isReadOnly && (
            <div className="flex shrink-0 items-center">
              <span
                className={cn(
                  "pill",
                  statusLabel.toLowerCase().includes("ready")
                    ? "success"
                    : statusLabel.toLowerCase().includes("mandatory")
                      ? "alert"
                      : "ghost"
                )}
              >
                {statusLabel}
              </span>
            </div>
          )}
        </div>
        
        <div className="cap" style={{color:"var(--color-ink-2)", marginBottom: 12}}>
          {sectionDescription}
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
