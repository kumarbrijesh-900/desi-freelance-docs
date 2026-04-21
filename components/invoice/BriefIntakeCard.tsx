"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCheckIcon,
  MicrophoneIcon,
  SparklesIcon,
  UploadIcon,
} from "@/components/ui/app-icons";
import {
  AnimatePresence,
  MotionButton,
  MotionReveal,
  SuccessPulse,
  motion,
} from "@/components/ui/motion-primitives";
import { playInteractionCue } from "@/lib/interaction-feedback";
import type { BriefIntakeInput } from "@/lib/invoice-brief-intake";
import {
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";

interface BriefIntakeCardProps {
  onExtract: (input: BriefIntakeInput) => Promise<boolean> | boolean;
  onPlaceholderAction: (message: string) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export default function BriefIntakeCard({
  onExtract,
  onPlaceholderAction,
  isCollapsed,
  onCollapsedChange,
}: BriefIntakeCardProps) {
  const [briefText, setBriefText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastExtractionState, setLastExtractionState] =
    useState<"idle" | "success" | "error">("idle");

  const hasTypedBrief = Boolean(briefText.trim());
  const hasImages = imageFiles.length > 0;
  const canExtract = hasTypedBrief || hasImages;

  const statusTone = isExtracting
    ? "processing"
    : lastExtractionState === "success"
    ? "success"
    : lastExtractionState === "error"
    ? "warning"
    : canExtract
    ? "ready"
    : "idle";

  const statusCopy =
    statusTone === "processing"
      ? hasImages
        ? "Reading the screenshot and preparing autofill."
        : "Preparing autofill from the brief."
      : statusTone === "success"
      ? "Autofill is ready."
      : statusTone === "warning"
      ? "Add a little more detail or try a clearer screenshot."
      : statusTone === "ready"
      ? "Ready to extract."
      : "Add a brief first.";

  const statusBadgeClass =
    statusTone === "processing"
      ? "border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)]"
      : statusTone === "success"
      ? "border-[color:var(--state-success-border)] bg-[color:var(--state-success-bg)] text-[color:var(--state-success-text)]"
      : statusTone === "warning"
      ? "border-[color:var(--state-warning-border)] bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]"
      : statusTone === "ready"
      ? "border-[color:var(--state-info-border)] bg-[color:var(--state-info-bg)] text-[color:var(--state-info-text)]"
      : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] text-[color:var(--text-muted)]";

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const nextFiles = Array.from(files).filter((file) =>
      ["image/png", "image/jpeg"].includes(file.type)
    );

    if (!nextFiles.length) {
      onPlaceholderAction("Please upload a PNG or JPG image.");
      return;
    }

    setImageFiles(nextFiles);
    setLastExtractionState("idle");
    playInteractionCue("uploadAccepted");
  };

  const handleExtract = async () => {
    setIsExtracting(true);

    try {
      const didExtract = await onExtract({
        text: briefText,
        imageFiles,
        voiceTranscript: "",
      });

      if (didExtract) {
        setLastExtractionState("success");
        onCollapsedChange(true);
        playInteractionCue("autofillComplete");
      } else {
        setLastExtractionState("error");
      }
    } finally {
      setIsExtracting(false);
    }
  };

  if (isCollapsed) {
    return (
      <MotionReveal className="mb-3" preset="fade-up" delay={40}>
        <section
          className={cn("app-soft-panel-muted overflow-hidden rounded-[14px]")}
          aria-labelledby="brief-intake-collapsed-heading"
          data-brief-intake-state="collapsed"
          data-testid="brief-intake-collapsed"
        >
          <motion.div
            key="brief-intake-collapsed"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-12 items-center justify-between gap-3 px-4"
          >
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <span
                id="brief-intake-collapsed-heading"
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 shadow-[0_1px_0_rgba(255,255,255,0.78)]"
              >
                <ClipboardCheckIcon className="h-3.5 w-3.5" />
                Brief
              </span>
              <SuccessPulse active={lastExtractionState === "success"}>
                <span
                  className={cn(
                    "inline-flex h-7 min-w-0 items-center rounded-full border px-2 text-xs font-medium",
                    statusBadgeClass
                  )}
                >
                  {isExtracting
                    ? "Extracting"
                    : lastExtractionState === "success"
                    ? "Autofill Ready"
                    : lastExtractionState === "error"
                    ? "Needs Detail"
                    : canExtract
                    ? "Ready"
                    : "Empty"}
                </span>
              </SuccessPulse>
            </div>

            <MotionButton
              type="button"
              onClick={() => onCollapsedChange(false)}
              aria-expanded={false}
              aria-controls="brief-intake-panel"
              className={cn(
                getAppButtonClass({ variant: "ghost", size: "sm" }),
                "shrink-0"
              )}
            >
              <ChevronDownIcon className="h-3.5 w-3.5" />
              Brief
            </MotionButton>
          </motion.div>
        </section>
      </MotionReveal>
    );
  }

  return (
    <MotionReveal className="mb-3" preset="fade-up" delay={40}>
      <section
        className={cn(
          getAppSubtlePanelClass("muted"),
          "invoice-brief-card overflow-hidden px-4 py-3 sm:px-[18px]"
        )}
        aria-labelledby="brief-intake-heading"
        data-brief-intake-state="expanded"
      >
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl space-y-0.5">
              <h2 id="brief-intake-heading" className={appSectionTitleClass}>
                Screenshot, text, or audio brief
              </h2>
              <p className={cn("max-w-2xl", appSectionDescriptionClass)}>
                Paste a brief first, then add a screenshot only if it helps autofill.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  statusBadgeClass
                )}
              >
                <motion.span
                  aria-hidden="true"
                  className="mr-1 inline-flex"
                  animate={
                    isExtracting
                      ? { rotate: [0, 12, -10, 0], scale: [1, 1.08, 1] }
                      : lastExtractionState === "success"
                      ? { scale: [1, 1.08, 1] }
                      : undefined
                  }
                  transition={{
                    duration: isExtracting ? 0.9 : 0.55,
                    repeat: isExtracting ? Number.POSITIVE_INFINITY : 0,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                </motion.span>
                {isExtracting
                  ? "Extracting"
                  : lastExtractionState === "success"
                  ? "Autofill ready"
                  : lastExtractionState === "error"
                  ? "Needs more detail"
                  : canExtract
                  ? "Ready to extract"
                  : "Waiting for input"}
              </span>

              {!isCollapsed ? (
                <MotionButton
                  type="button"
                  onClick={() => onCollapsedChange(true)}
                  aria-expanded={true}
                  aria-controls="brief-intake-panel"
                  className={cn(
                    getAppButtonClass({ variant: "tertiary", size: "sm" }),
                    "shrink-0"
                  )}
                >
                  <ChevronUpIcon className="h-3.5 w-3.5" />
                  Hide
                </MotionButton>
              ) : null}
            </div>
          </div>

          <AnimatePresence initial={false}>
            <motion.div
              key="brief-intake-expanded"
              id="brief-intake-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <MotionReveal preset="soft">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className={appFieldLabelClass}>
                      Brief
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDragOver(false);
                          handleFiles(event.dataTransfer.files);
                        }}
                        className={cn(
                          getAppButtonClass({ variant: "secondary", size: "sm" }),
                          "cursor-pointer",
                          isDragOver ? "border-[color:var(--border-accent)] bg-[color:var(--bg-surface)] text-[color:var(--text-primary)]" : ""
                        )}
                      >
                        <UploadIcon className="h-4 w-4" />
                        Screenshot
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          multiple
                          onChange={(event) => {
                            handleFiles(event.target.files);
                            event.target.value = "";
                          }}
                          className="hidden"
                        />
                      </label>

                      <MotionButton
                        type="button"
                        onClick={() =>
                          onPlaceholderAction(
                            "Voice intake is still a placeholder hook. Add text or a screenshot for now."
                          )
                        }
                        className={getAppButtonClass({ variant: "ghost", size: "sm" })}
                      >
                        <MicrophoneIcon className="h-4 w-4" />
                        Voice
                      </MotionButton>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={briefText}
                    onChange={(e) => {
                      setBriefText(e.target.value);
                      setLastExtractionState("idle");
                    }}
                    placeholder="Agency: Ashok Creative Studio. Client: Metro Shoes. Deliverable: Landing page UI design. Qty: 3. Rate: INR 12000 per screen. Payment terms: Net 15."
                    className={cn(
                      getAppFieldClass({
                        hasValue: Boolean(briefText),
                        multiline: true,
                      }),
                      "min-h-[104px]"
                    )}
                  />

                  {imageFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {imageFiles.map((file) => (
                        <span
                          key={`${file.name}-${file.lastModified}`}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[color:var(--text-secondary)]"
                          )}
                        >
                          <ClipboardCheckIcon className="h-3.5 w-3.5" />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] pt-2">
                    {isExtracting || lastExtractionState !== "idle" ? (
                      <p className="text-[11px] leading-5 text-[color:var(--text-muted)]">
                        {statusCopy}
                      </p>
                    ) : <div />}

                    <MotionButton
                      type="button"
                      onClick={handleExtract}
                      disabled={isExtracting || !canExtract}
                      className={getAppButtonClass({ variant: "primary", size: "md" })}
                    >
                      <motion.span
                        animate={
                          isExtracting
                            ? { rotate: [0, 18, -10, 0], scale: [1, 1.06, 1] }
                            : undefined
                        }
                        transition={{
                          duration: 0.8,
                          repeat: isExtracting ? Number.POSITIVE_INFINITY : 0,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <SparklesIcon className="h-4 w-4" />
                      </motion.span>
                      {isExtracting ? "Extracting..." : "Extract & Autofill"}
                    </MotionButton>
                  </div>
                </div>
              </MotionReveal>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </MotionReveal>
  );
}
