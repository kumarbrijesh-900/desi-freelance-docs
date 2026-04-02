"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCheckIcon,
  DocumentSparkIcon,
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
  getAppPanelClass,
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
        ? "Reading your screenshot and preparing autofill."
        : "Preparing autofill from the current brief."
      : statusTone === "success"
      ? "Autofill is ready. You can reopen intake anytime."
      : statusTone === "warning"
      ? "Add a little more detail or try a clearer screenshot."
      : statusTone === "ready"
      ? "Ready to extract from the current brief."
      : "Start with a typed brief, then add a screenshot only if it helps.";

  const statusBadgeClass =
    statusTone === "processing"
      ? "border-slate-300 bg-white text-slate-700"
      : statusTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : statusTone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : statusTone === "ready"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-slate-200 bg-slate-100 text-slate-600";

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
      <MotionReveal className="mb-4" preset="fade-up" delay={40}>
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
            className="flex h-12 items-center justify-between gap-3 px-3.5 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <span
                id="brief-intake-collapsed-heading"
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 shadow-[0_1px_0_rgba(255,255,255,0.78)]"
              >
                <ClipboardCheckIcon className="h-3.5 w-3.5" />
                Brief
              </span>
              <SuccessPulse active={lastExtractionState === "success"}>
                <span
                  className={cn(
                    "inline-flex h-7 min-w-0 items-center rounded-full border px-2.5 text-xs font-medium",
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
    <MotionReveal className="mb-6" preset="fade-up" delay={40}>
      <section
        className={cn(getAppPanelClass("muted"), "overflow-hidden")}
        aria-labelledby="brief-intake-heading"
        data-brief-intake-state="expanded"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-soft-border)] bg-white/78 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.78)]">
                <DocumentSparkIcon className="h-4 w-4" />
                Brief Intake
              </div>
              <h2
                id="brief-intake-heading"
                className={cn("mt-3", appSectionTitleClass)}
              >
                Screenshot, text, or audio brief
              </h2>
              <p className={cn("mt-2 max-w-2xl", appSectionDescriptionClass)}>
                Start with text first. Add a screenshot only when it helps autofill.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
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
              className="space-y-4"
            >
              <MotionReveal preset="soft">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className={appFieldLabelClass}>
                      Paste or type a brief
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
                          isDragOver ? "border-indigo-300 bg-white text-slate-950" : ""
                        )}
                      >
                        <UploadIcon className="h-4 w-4" />
                        Upload screenshot
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
                            "Voice intake is ready as a placeholder hook. Speech-to-text can plug into this card next."
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
                    rows={5}
                    value={briefText}
                    onChange={(e) => {
                      setBriefText(e.target.value);
                      setLastExtractionState("idle");
                    }}
                    placeholder="Example: Agency name: DesiFreelanceDocs Studio. Agency address: 14 Residency Road, Bengaluru, Karnataka. Client name: Metro Shoes Pvt. Ltd. Client address: Bengaluru, Karnataka. Deliverable type: UI/UX. Deliverable description: Landing page UI design. Qty: 3 screens. Rate: INR 12000 per screen. License type: exclusive license. Payment terms: Net 15. Bank name: HDFC Bank. Account number: 50200044321098. IFSC: HDFC0001122."
                    className={getAppFieldClass({
                      hasValue: Boolean(briefText),
                      multiline: true,
                    })}
                  />

                  {imageFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {imageFiles.map((file) => (
                        <span
                          key={`${file.name}-${file.lastModified}`}
                          className={cn(
                            getAppSubtlePanelClass("muted"),
                            "inline-flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-700"
                          )}
                        >
                          <ClipboardCheckIcon className="h-3.5 w-3.5" />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-3">
                    <p className="text-xs leading-5 text-slate-500">
                      {statusCopy}
                    </p>

                    <MotionButton
                      type="button"
                      onClick={handleExtract}
                      disabled={isExtracting || !canExtract}
                      className={getAppButtonClass({ variant: "primary", size: "lg" })}
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
