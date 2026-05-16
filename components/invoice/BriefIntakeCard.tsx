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
  motion,
} from "@/components/ui/motion-primitives";
import { playInteractionCue } from "@/lib/interaction-feedback";
import type { BriefIntakeInput } from "@/lib/invoice-brief-intake";
import {
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppFieldClass,
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
      <MotionReveal className="mb-4" preset="fade-up" delay={40}>
        <section
          className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] overflow-hidden"
          aria-labelledby="brief-intake-collapsed-heading"
        >
          <motion.div
            key="brief-intake-collapsed"
            className="flex h-12 items-center justify-between gap-3 px-4"
          >
            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#BEFF00] border-2 border-[#111118] text-[12px] font-bold">
                ✨
              </span>
              <div className="flex flex-col min-w-0">
                <span
                  id="brief-intake-collapsed-heading"
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E6E7A]"
                >
                  AI Autofill
                </span>
                <span className="truncate text-[12px] font-bold text-[#111118]">
                  Ready to scan your brief
                </span>
              </div>
            </div>

            <MotionButton
              type="button"
              onClick={() => onCollapsedChange(false)}
              className={cn(
                getAppButtonClass({ variant: "secondary", size: "sm" }),
                "shrink-0",
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
    <MotionReveal className="mb-4" preset="fade-up" delay={40}>
      <section
        className="border-2 border-[#111118] bg-white shadow-[var(--brutal-shadow-sm)] relative overflow-hidden px-4 py-3 sm:px-[18px]"
        aria-labelledby="brief-intake-heading"
      >
        {/* Toggle */}
        <div className="absolute right-3 top-3 z-[10]">
          <MotionButton
            type="button"
            onClick={() => onCollapsedChange(true)}
            className={getAppButtonClass({ variant: "tertiary", size: "sm" })}
          >
            <ChevronUpIcon className="h-3.5 w-3.5" />
          </MotionButton>
        </div>

        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            <h2 id="brief-intake-heading" className={appSectionTitleClass}>
              Screenshot, text, or audio brief
            </h2>
            <p className={cn("max-w-2xl", appSectionDescriptionClass)}>
              Paste a brief first, then add a screenshot only if it helps
              autofill.
            </p>
          </div>

          <AnimatePresence initial={false}>
            <motion.div
              key="brief-intake-expanded"
              id="brief-intake-panel"
              className="space-y-3"
            >
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

                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imageFiles.map((file) => (
                      <span
                        key={`${file.name}-${file.lastModified}`}
                        className="inline-flex items-center gap-2 border-2 border-[#111118] bg-[#F4F4F5] px-2 py-1 text-[11px] font-bold text-[#111118]"
                      >
                        <ClipboardCheckIcon className="h-3.5 w-3.5" />
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#111118] pt-3 mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={cn(
                        getAppButtonClass({
                          variant: "secondary",
                          size: "sm",
                        }),
                        "cursor-pointer",
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

                    {(isExtracting || lastExtractionState !== "idle") && (
                      <p className="ml-2 text-[11px] font-bold text-[#6E6E7A]">
                        {statusCopy}
                      </p>
                    )}
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
                    <SparklesIcon className="h-4 w-4" />
                    {isExtracting
                      ? `Extracting... ${extractProgress}%`
                      : "Extract & Autofill"}
                  </MotionButton>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </MotionReveal>
  );
}
