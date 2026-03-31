"use client";

import { useState } from "react";
import type { BriefIntakeInput } from "@/lib/invoice-brief-intake";

interface BriefIntakeCardProps {
  onExtract: (input: BriefIntakeInput) => void;
  onPlaceholderAction: (message: string) => void;
}

export default function BriefIntakeCard({
  onExtract,
  onPlaceholderAction,
}: BriefIntakeCardProps) {
  const [briefText, setBriefText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const nextFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!nextFiles.length) {
      onPlaceholderAction("Please upload an image file for the OCR placeholder.");
      return;
    }

    setImageFiles(nextFiles);
    onPlaceholderAction(
      "Image upload is wired as a placeholder. Add the key details into the text brief for this MVP."
    );
  };

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-700">
            Brief Intake
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Upload a screenshot of a design/work brief, paste or type a brief,
            or speak a brief. If using voice, mention your agency name and
            address, client name and address, type of deliverable, rate per
            deliverable in rupees, license type, and payment details.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onPlaceholderAction(
              "Voice intake is ready as a placeholder hook. Speech-to-text can plug into this card next."
            )
          }
          className="inline-flex shrink-0 items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black"
        >
          Speak Brief
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_320px]">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Paste or type a brief
          </label>
          <textarea
            rows={8}
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            placeholder="Example: Agency name: DesiFreelanceDocs Studio. Agency address: 14 Residency Road, Bengaluru, Karnataka. Client name: Metro Shoes Pvt. Ltd. Client address: Bengaluru, Karnataka. Deliverable type: UI/UX. Deliverable description: Landing page UI design. Qty: 3 screens. Rate: INR 12000 per screen. License type: exclusive license. Payment terms: Net 15. Bank name: HDFC Bank. Account number: 50200044321098. IFSC: HDFC0001122."
            className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-black">
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
            className={`flex min-h-[220px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed bg-white p-5 text-center text-sm transition ${
              isDragOver
                ? "border-black text-black"
                : "border-gray-300 text-gray-500 hover:border-black"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
              className="hidden"
            />

            <div>
              Drop a screenshot here
              <br />
              or click to upload
              <br />
              <span className="text-xs text-gray-400">
                OCR extraction is a placeholder hook in this MVP
              </span>
            </div>
          </label>

          {imageFiles.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs leading-5 text-gray-600">
              <p className="font-medium text-black">Attached image placeholders</p>
              <ul className="mt-2 space-y-1">
                {imageFiles.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-gray-500">
          Text parsing is live in this MVP. Image OCR and speech transcription
          are wired as extension points for the same autofill pipeline.
        </p>

        <button
          type="button"
          onClick={() =>
            onExtract({
              text: briefText,
              imageFiles,
              voiceTranscript: "",
            })
          }
          className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          Extract & Autofill
        </button>
      </div>
    </section>
  );
}
