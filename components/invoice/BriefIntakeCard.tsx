"use client";

import { useState, useEffect } from "react";
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
  userEmail?: string | null;
}

export default function BriefIntakeCard({
  onExtract,
  onPlaceholderAction,
  isCollapsed,
  onCollapsedChange,
  userEmail,
}: BriefIntakeCardProps) {
  const [briefText, setBriefText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [lastExtractionState, setLastExtractionState] = useState<
    "idle" | "success" | "error"
  >("idle");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isExtracting) {
      setExtractProgress(0);
      interval = setInterval(() => {
        setExtractProgress((prev) =>
          prev >= 95 ? 95 : prev + Math.floor(Math.random() * 5) + 1,
        );
      }, 300);
    } else {
      if (lastExtractionState === "success") {
        setExtractProgress(100);
      }
    }
    return () => clearInterval(interval);
  }, [isExtracting, lastExtractionState]);

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
      ["image/png", "image/jpeg"].includes(file.type),
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
          className={cn(
            "app-soft-panel-muted overflow-hidden rounded-[14px] border-indigo-muted bg-indigo-light/30",
          )}
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
            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-light text-[12px] shadow-sm">
                ✨
              </span>
              <div className="flex flex-col min-w-0">
                <span
                  id="brief-intake-collapsed-heading"
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-brand/60"
                >
                  AI Autofill
                </span>
                <span className="truncate text-[12px] font-bold text-indigo-brand">
                  Ready to scan your brief
                </span>
              </div>
            </div>

            <MotionButton
              type="button"
              onClick={() => onCollapsedChange(false)}
              aria-expanded={false}
              aria-controls="brief-intake-panel"
              className={cn(
                getAppButtonClass({ variant: "ghost", size: "sm" }),
                "shrink-0 bg-white/50 hover:bg-white shadow-sm",
              )}
            >
              <ChevronDownIcon className="h-3.5 w-3.5 text-indigo-brand" />
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
          "invoice-brief-card relative overflow-hidden px-4 py-3 sm:px-[18px]",
        )}
        aria-labelledby="brief-intake-heading"
        data-brief-intake-state="expanded"
      >
        {/* Toggle - Top Layer */}
        {!isCollapsed && (
          <div className="absolute right-3 top-3 z-[100]">
            <MotionButton
              type="button"
              onClick={() => onCollapsedChange(true)}
              aria-expanded={true}
              aria-controls="brief-intake-panel"
              className={cn(
                getAppButtonClass({ variant: "tertiary", size: "sm" }),
                "bg-white/80 shadow-sm hover:bg-white",
              )}
            >
              <ChevronUpIcon className="h-3.5 w-3.5" />
            </MotionButton>
          </div>
        )}


        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl space-y-0.5">
              <h2 id="brief-intake-heading" className={appSectionTitleClass}>
                Screenshot, text, or audio brief
              </h2>
              <p className={cn("max-w-2xl", appSectionDescriptionClass)}>
                Paste a brief first, then add a screenshot only if it helps
                autofill.
              </p>
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
                      "min-h-[104px]",
                    )}
                  />

                  {imageFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {imageFiles.map((file) => (
                        <span
                          key={`${file.name}-${file.lastModified}`}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[color:var(--text-secondary)]",
                          )}
                        >
                          <ClipboardCheckIcon className="h-3.5 w-3.5" />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        className={cn(
                          getAppButtonClass({
                            variant: "secondary",
                            size: "sm",
                          }),
                          "cursor-pointer",
                          isDragOver
                            ? "border-[color:var(--text-primary)] bg-[color:var(--bg-surface)] text-[color:var(--text-primary)]"
                            : "",
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
                        className={getAppButtonClass({
                          variant: "ghost",
                          size: "sm",
                        })}
                      >
                        <MicrophoneIcon className="h-4 w-4" />
                        Voice
                      </MotionButton>

                      {isExtracting || lastExtractionState !== "idle" ? (
                        <p className="ml-2 text-[11px] leading-5 text-[color:var(--text-muted)]">
                          {statusCopy}
                        </p>
                      ) : null}
                    </div>

                    <MotionButton
                      type="button"
                      onClick={handleExtract}
                      disabled={isExtracting || !canExtract}
                      className={getAppButtonClass({
                        variant: "primary",
                        size: "md",
                      })}
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
                      {isExtracting
                        ? `Extracting... ${extractProgress}%`
                        : "Extract & Autofill"}
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
