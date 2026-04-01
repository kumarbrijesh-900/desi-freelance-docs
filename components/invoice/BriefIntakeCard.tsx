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
  MotionStagger,
  motion,
} from "@/components/ui/motion-primitives";
import { playInteractionCue } from "@/lib/interaction-feedback";
import type { BriefIntakeInput } from "@/lib/invoice-brief-intake";
import {
  appGridClass,
  appPrimaryPaneClass,
  appSecondaryPaneClass,
} from "@/lib/layout-foundation";
import {
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
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
  const intakeSummaryBits = [
    hasTypedBrief ? "Text ready" : null,
    hasImages ? `${imageFiles.length} screenshot${imageFiles.length === 1 ? "" : "s"}` : null,
    "Audio placeholder",
  ].filter(Boolean);

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
        ? "Extracting text from the screenshot and preparing the autofill summary."
        : "Preparing the autofill summary from your brief."
      : statusTone === "success"
      ? "Autofill summary ready. You can keep working in the form or reopen intake anytime."
      : statusTone === "warning"
      ? "Nothing usable was extracted yet. Add more detail or try a clearer screenshot."
      : statusTone === "ready"
      ? "Ready to extract from the current brief input."
      : "Start with text, a screenshot, or the voice placeholder whenever you’re ready.";

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
          className={cn(getAppPanelClass("muted"), "overflow-hidden")}
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
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  id="brief-intake-collapsed-heading"
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Brief Intake
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                    statusBadgeClass
                  )}
                >
                  {isExtracting
                    ? "Extracting"
                    : lastExtractionState === "success"
                    ? "Autofill ready"
                    : lastExtractionState === "error"
                    ? "Needs more detail"
                    : canExtract
                    ? "Ready"
                    : "Empty"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500">
                {(intakeSummaryBits.length > 0
                  ? intakeSummaryBits
                  : ["Screenshot / Text / Audio"]
                ).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <MotionButton
              type="button"
              onClick={() => onCollapsedChange(false)}
              aria-expanded={false}
              aria-controls="brief-intake-panel"
              className={cn(
                getAppButtonClass({ variant: "secondary", size: "sm" }),
                "shrink-0"
              )}
            >
              <ChevronDownIcon className="h-4 w-4" />
              Expand
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
        <div className={appGridClass}>
          <div className="col-span-4 flex flex-col gap-3 sm:col-span-8 lg:col-span-12 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <SparklesIcon className="h-4 w-4" />
                Brief Intake
              </div>
              <h2
                id="brief-intake-heading"
                className="mt-3 text-xl font-semibold tracking-tight text-slate-950"
              >
                Screenshot, text, or audio brief
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Paste a brief, upload a screenshot, or use the voice placeholder.
                Mention agency details, client details, deliverables, price,
                payment terms, and billing clues whenever you can.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                  statusBadgeClass
                )}
              >
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
                    getAppButtonClass({ variant: "secondary", size: "sm" }),
                    "shrink-0"
                  )}
                >
                  <ChevronUpIcon className="h-4 w-4" />
                  Collapse
                </MotionButton>
              ) : null}
            </div>
          </div>

          <div className="col-span-4 sm:col-span-8 lg:col-span-12">
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500">
              {intakeSummaryBits.length > 0 ? (
                intakeSummaryBits.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  Screenshot / Text / Audio
                </span>
              )}
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
              className="contents"
            >
                <MotionReveal preset="soft" className={`${appPrimaryPaneClass} mt-2`}>
                  <div>
                    <label className="mb-2.5 block text-sm font-medium tracking-tight text-slate-900">
                      Paste or type a brief
                    </label>
                    <textarea
                      rows={8}
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
                  </div>
                </MotionReveal>

                <MotionReveal preset="soft" delay={60} className={`${appSecondaryPaneClass} mt-2`}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="block text-sm font-medium tracking-tight text-slate-900">
                        Upload brief screenshot
                      </label>

                      <MotionButton
                        type="button"
                        onClick={() =>
                          onPlaceholderAction(
                            "Voice intake is ready as a placeholder hook. Speech-to-text can plug into this card next."
                          )
                        }
                        className={cn(
                          getAppButtonClass({ variant: "secondary", size: "sm" }),
                          "shrink-0"
                        )}
                      >
                        <MicrophoneIcon className="h-4 w-4" />
                        Speak Brief
                      </MotionButton>
                    </div>

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
                        "app-dropzone-surface flex min-h-[220px] cursor-pointer items-center justify-center rounded-[24px] border-2 border-dashed bg-white p-5 text-center text-sm",
                        isDragOver
                          ? "app-dropzone-accept text-slate-950"
                          : "border-slate-300 text-slate-500 hover:border-slate-500"
                      )}
                    >
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

                      <div className="flex flex-col items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                          <UploadIcon className="h-5 w-5" />
                        </span>
                        <div>
                          Drop a screenshot here
                          <br />
                          or click to upload
                          <br />
                          <span className="text-xs text-slate-400">PNG, JPG, JPEG</span>
                        </div>
                      </div>
                    </label>

                    {imageFiles.length > 0 ? (
                      <MotionReveal preset="scale-in">
                        <div
                          className={cn(
                            getAppPanelClass(),
                            "px-3 py-3 text-xs leading-5 text-slate-600"
                          )}
                        >
                          <p className="inline-flex items-center gap-2 font-medium text-slate-950">
                            <ClipboardCheckIcon className="h-4 w-4" />
                            Attached images
                          </p>
                          <ul className="mt-2 space-y-1">
                            {imageFiles.map((file) => (
                              <li key={`${file.name}-${file.lastModified}`}>
                                {file.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </MotionReveal>
                    ) : null}
                  </div>
                </MotionReveal>

                <div className="col-span-4 mt-1 flex flex-wrap items-center justify-between gap-3 sm:col-span-8 lg:col-span-12">
                  <MotionStagger className="text-xs leading-5 text-slate-500">
                    <p>{statusCopy}</p>
                    <p>
                      Text, OCR, and the future voice transcript all feed the same
                      autofill pipeline, so you can reopen this section anytime
                      without losing what you already typed or attached.
                    </p>
                  </MotionStagger>

                  <MotionButton
                    type="button"
                    onClick={handleExtract}
                    disabled={isExtracting || !canExtract}
                    className={getAppButtonClass({ variant: "primary", size: "lg" })}
                  >
                    <SparklesIcon className="h-4 w-4" />
                    {isExtracting ? "Extracting..." : "Extract & Autofill"}
                  </MotionButton>
                </div>
              </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </MotionReveal>
  );
}
