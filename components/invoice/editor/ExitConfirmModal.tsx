import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";

export function ExitConfirmModal({
  onSkip,
  onSaveDraft,
  onClose,
}: {
  onSkip: () => void;
  onSaveDraft: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[color:var(--bg-overlay)] px-4">
      <div className={`w-full max-w-md ${getAppPanelClass()}`}>
        <h2 className="text-xl font-black tracking-tight tracking-tight text-[color:var(--color-ink)]">
          Leave invoice editor?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-ink)]">
          You have unsaved progress. Choose{" "}
          <span className="font-bold text-[color:var(--color-ink)]">
            Save Draft
          </span>{" "}
          to keep your work, or{" "}
          <span className="font-bold text-[color:var(--color-ink)]">
            Skip
          </span>{" "}
          to leave without saving.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={getAppButtonClass({ variant: "ghost", size: "sm" })}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSkip}
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className={getAppButtonClass({ variant: "primary", size: "sm" })}
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}
