"use client";

import { useState } from "react";
import {
  ClipboardCheckIcon,
  MicrophoneIcon,
  SparklesIcon,
  UploadIcon,
} from "@/components/ui/app-icons";
import {
  MotionButton,
  MotionReveal,
  MotionStagger,
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
  onExtract: (input: BriefIntakeInput) => Promise<void> | void;
  onPlaceholderAction: (message: string) => void;
}

export default function BriefIntakeCard({
  onExtract,
  onPlaceholderAction,
}: BriefIntakeCardProps) {
  const [briefText, setBriefText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

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
    playInteractionCue("uploadAccepted");
  };

  const handleExtract = async () => {
    setIsExtracting(true);

    try {
      await onExtract({
        text: briefText,
        imageFiles,
        voiceTranscript: "",
      });
      playInteractionCue("autofillComplete");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <MotionReveal className="mb-6" preset="fade-up" delay={40}>
      <section className={cn(getAppPanelClass("muted"), "overflow-hidden")}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-12 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <SparklesIcon className="h-4 w-4" />
              Brief Intake
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Upload a screenshot of a design/work brief, paste or type a brief,
              or speak a brief. If using voice, mention your agency name and
              address, client name and address, type of deliverable, rate per
              deliverable in rupees, license type, and payment details.
            </p>
          </div>

          <MotionButton
            type="button"
            onClick={() =>
              onPlaceholderAction(
                "Voice intake is ready as a placeholder hook. Speech-to-text can plug into this card next."
              )
            }
            className={cn(getAppButtonClass({ variant: "secondary", size: "sm" }), "shrink-0")}
          >
            <MicrophoneIcon className="h-4 w-4" />
            Speak Brief
          </MotionButton>
          </div>

          <MotionReveal preset="soft" className={`${appPrimaryPaneClass} mt-2`}>
            <div>
              <label className="mb-2.5 block text-sm font-medium tracking-tight text-slate-900">
                Paste or type a brief
              </label>
              <textarea
                rows={8}
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
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
              <label className="block text-sm font-medium tracking-tight text-slate-900">
                Upload brief screenshot
              </label>

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
                  <div className={cn(getAppPanelClass(), "px-3 py-3 text-xs leading-5 text-slate-600")}>
                    <p className="inline-flex items-center gap-2 font-medium text-slate-950">
                      <ClipboardCheckIcon className="h-4 w-4" />
                      Attached images
                    </p>
                    <ul className="mt-2 space-y-1">
                      {imageFiles.map((file) => (
                        <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                </MotionReveal>
              ) : null}
            </div>
          </MotionReveal>

          <div className="col-span-4 mt-1 flex flex-wrap items-center justify-between gap-3 sm:col-span-8 lg:col-span-12">
          <MotionStagger className="text-xs leading-5 text-slate-500">
            <p>
              Text parsing and image OCR now feed the same autofill pipeline.
              Voice transcription is still an extension hook for a later phase.
            </p>
            {isExtracting && imageFiles.length > 0 ? (
              <p className="mt-1 font-medium text-slate-950">
                Extracting text from image...
              </p>
            ) : null}
          </MotionStagger>

          <MotionButton
            type="button"
            onClick={handleExtract}
            disabled={isExtracting}
            className={getAppButtonClass({ variant: "primary", size: "lg" })}
          >
            <SparklesIcon className="h-4 w-4" />
            {isExtracting ? "Extracting..." : "Extract & Autofill"}
          </MotionButton>
          </div>
        </div>
      </section>
    </MotionReveal>
  );
}
