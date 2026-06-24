import { ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/ui-foundation";
import { formatCurrency } from "@/lib/invoice-editor-utils";

export function WorkbenchReadinessPanel({
  ready,
  completedCount,
  totalCount,
  issueCount,
  activeStepLabel,
  nextStepLabel,
  nextFields,
  total,
  currency,
  dueDate,
  clientName,
  onReview,
  compact = false,
  rail = false,
  isReadOnly = false,
  readOnlyReason,
}: {
  ready: boolean;
  completedCount: number;
  totalCount: number;
  issueCount: number;
  activeStepLabel: string;
  nextStepLabel?: string;
  nextFields: string[];
  total: number;
  currency: string;
  dueDate?: string;
  clientName?: string;
  onReview: () => void;
  compact?: boolean;
  rail?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: string;
}) {
  const progress = isReadOnly
    ? 100
    : totalCount > 0
    ? Math.min(100, Math.max(0, Math.round((completedCount / totalCount) * 100)))
    : 0;
  const visibleFields = nextFields.slice(0, rail ? 2 : 3);
  const hiddenFieldCount = Math.max(0, nextFields.length - visibleFields.length);
  const readinessLabel = isReadOnly ? "State" : rail ? "Status" : "Workbench readiness";
  const statusText = isReadOnly
    ? "Locked"
    : ready
    ? rail ? "Ready" : "Ready for preview"
    : rail
      ? `${issueCount} left`
      : `${issueCount} required ${issueCount === 1 ? "detail" : "details"} remaining`;

  return (
    <div
      className={cn(
        "border border-soft bg-white shadow-[var(--brutal-shadow-sm)]",
        compact ? "px-4 py-3" : "px-3 py-3",
      )}
      aria-label="Invoice workbench readiness"
    >
      <div className="space-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-soft",
              isReadOnly
                ? "bg-[#F5F4F0] text-[#6B6660]"
                : ready ? "bg-[#00DCB4] text-[color:var(--color-ink)]" : "bg-[#FFFBE6] text-[#B45309]",
            )}
            aria-hidden="true"
          >
            {isReadOnly ? (
              <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
            ) : ready ? (
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
            ) : (
              <AlertCircle className="h-4 w-4" strokeWidth={2.4} />
            )}
          </span>
          <div className="min-w-0">
            <p className={cn(
              "font-black uppercase text-[color:var(--color-ink-2)]",
              rail ? "text-[9px] tracking-[0.08em]" : "text-[10px] tracking-[0.14em]",
            )}>
              {readinessLabel}
            </p>
            <p className="mt-0.5 text-[14px] font-black text-[color:var(--color-ink)]">
              {statusText}
            </p>
            {!isReadOnly && (
              <p className="mt-1 text-[11px] font-black text-[color:var(--color-ink)]">
                {progress}%
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 border border-soft bg-[#F5F5F0]">
        <div
          className={cn(
            "h-full",
            isReadOnly ? "bg-[#D4D2CC]" : ready ? "bg-[#00DCB4]" : "bg-[color:var(--color-lime-warm)]",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 border-t border-[color:var(--color-soft)] pt-3" aria-live="polite">
        {isReadOnly ? (
          <p className="text-[12px] font-bold leading-5 text-[#6B6660]">
            {readOnlyReason || "This invoice is read-only."}
          </p>
        ) : ready ? (
          <p className="text-[12px] font-bold leading-5 text-[color:var(--color-ink)]">
            All required sections are complete. Review totals, then open preview.
          </p>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--color-ink-2)]">
              Next blocker
            </p>
            <p className="mt-0.5 text-[12px] font-bold leading-5 text-[color:var(--color-ink)]">
              {rail ? "" : nextStepLabel ? `${nextStepLabel}: ` : `${activeStepLabel}: `}
              {visibleFields.length > 0
                ? visibleFields.join(", ")
                : "Complete the highlighted fields."}
              {hiddenFieldCount > 0 ? ` +${hiddenFieldCount} more` : ""}
            </p>
          </>
        )}
      </div>

      <div className={cn(
        "mt-3 grid border-t border-[color:var(--color-soft)] pt-3",
        rail ? "grid-cols-1 gap-2" : "grid-cols-3 gap-3",
      )}>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">Client</p>
          <p className="truncate text-[12px] font-bold text-[color:var(--color-ink)]">{clientName?.trim() || "Not set"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">Due</p>
          <p className="truncate text-[12px] font-bold text-[color:var(--color-ink)]">{dueDate || "Not set"}</p>
        </div>
        <div className={cn("min-w-0", !rail && "text-right")}>
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--color-ink-2)]">Total</p>
          <p className="truncate text-[12px] font-black text-[color:var(--brand-indigo-deep)]">{formatCurrency(total, currency)}</p>
        </div>
      </div>

      {!ready && (
        <button
          type="button"
          onClick={onReview}
          className="mt-3 flex h-9 w-full items-center justify-center border border-soft bg-[color:var(--color-lime-warm)] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--color-ink)] shadow-[var(--brutal-shadow-sm)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          {rail ? "Review" : "Review what's left"}
        </button>
      )}
    </div>
  );
}

