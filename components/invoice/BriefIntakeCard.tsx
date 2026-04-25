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
  const [lastExtractionState, setLastExtractionState] =
    useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isExtracting) {
      setExtractProgress(0);
      interval = setInterval(() => {
        setExtractProgress((prev) => (prev >= 95 ? 95 : prev + Math.floor(Math.random() * 5) + 1));
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

  const isAdmin = userEmail === "kumar.brijesh900@gmail.com";
  const isEngineLocked = !isAdmin; // Manual lock override
  const lockMessage = "Engine is out of fuel, waiting for Strait to straighten up.";

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
                Brief Parsing Engine
              </span>
              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Maintenance
              </span>
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
          "invoice-brief-card relative overflow-hidden px-4 py-3 sm:px-[18px]"
        )}
        aria-labelledby="brief-intake-heading"
        data-brief-intake-state="expanded"
      >
        {/* Maintenance Overlay */}
        {isEngineLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl">
                ⛽
              </div>
              <p className="max-w-[240px] text-center text-[14px] font-bold leading-relaxed text-amber-900">
                {lockMessage}
              </p>
              <div className="h-1 w-32 rounded-full bg-gray-100 overflow-hidden">
                <motion.div 
                  className="h-full bg-amber-400"
                  animate={{ x: [-128, 128] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        )}

        <div className={cn("space-y-2", isEngineLocked && "opacity-20 pointer-events-none grayscale")}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl space-y-0.5">
              <h2 id="brief-intake-heading" className={appSectionTitleClass}>
                Screenshot, text, or audio brief
              </h2>
              <p className={cn("max-w-2xl", appSectionDescriptionClass)}>
                Paste a brief first, then add a screenshot only if it helps autofill.
              </p>
            </div>

            {!isCollapsed ? (
              <MotionButton
                type="button"
                onClick={() => onCollapsedChange(true)}
                disabled={isEngineLocked}
                aria-expanded={true}
                aria-controls="brief-intake-panel"
                className={cn(
                  getAppButtonClass({ variant: "tertiary", size: "sm" }),
                  "shrink-0"
                )}
              >
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </MotionButton>
            ) : null}
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
                    disabled={isEngineLocked}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <label
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
                          disabled={isEngineLocked}
                          onChange={(event) => {
                            handleFiles(event.target.files);
                            event.target.value = "";
                          }}
                          className="hidden"
                        />
                      </label>

                      <MotionButton
                        type="button"
                        disabled={isEngineLocked}
                        className={getAppButtonClass({ variant: "ghost", size: "sm" })}
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
                      disabled={isEngineLocked || isExtracting || !canExtract}
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
                      {isExtracting ? `Extracting... ${extractProgress}%` : "Extract & Autofill"}
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
