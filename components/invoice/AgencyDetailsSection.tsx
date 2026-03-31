"use client";

import { useEffect, useState } from "react";
import type { AgencyDetails } from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";

interface AgencyDetailsSectionProps {
  value: AgencyDetails;
  clientLocation: "domestic" | "international";
  onChange: (value: AgencyDetails) => void;
  errors?: {
    agencyName?: string;
    address?: string;
    agencyState?: string;
    gstin?: string;
    pan?: string;
  };
}

export default function AgencyDetailsSection({
  value,
  clientLocation,
  onChange,
  errors,
}: AgencyDetailsSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!showToast) return;

    const timer = window.setTimeout(() => {
      setShowToast(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [showToast]);

  const updateField = <K extends keyof AgencyDetails>(
    key: K,
    fieldValue: AgencyDetails[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(false);

    requestAnimationFrame(() => {
      setShowToast(true);
    });
  };

  const readImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField("logoUrl", String(reader.result));
      triggerToast("Logo uploaded");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    readImageFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    readImageFile(event.dataTransfer.files?.[0]);
  };

  const removeLogo = () => {
    updateField("logoUrl", "");
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black ${
      hasError ? "border-red-400 bg-red-50/30" : "border-gray-300"
    }`;

  const chipButtonClass = (isSelected: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${
      isSelected
        ? "border-black bg-black text-white"
        : "border-gray-300 bg-white text-black hover:border-black"
    }`;
  const showGstinField = value.gstRegistrationStatus === "registered";
  const showLutSection =
    clientLocation === "international" && showGstinField;
  const showNoLutTotalsNote =
    showLutSection && value.lutAvailability === "no";

  return (
    <>
      <UploadToast message={toastMessage} visible={showToast} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
          My Agency Details
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Agency Name *
              </label>
              <input
                type="text"
                value={value.agencyName}
                onChange={(e) => updateField("agencyName", e.target.value)}
                placeholder="Your agency or freelance brand name"
                className={inputClass(errors?.agencyName)}
              />
              {errors?.agencyName ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.agencyName}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Address *
              </label>
              <textarea
                rows={3}
                value={value.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Business address"
                className={inputClass(errors?.address)}
              />
              {errors?.address ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.address}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Agency State *
              </label>
              <select
                value={value.agencyState}
                onChange={(e) =>
                  updateField(
                    "agencyState",
                    e.target.value as AgencyDetails["agencyState"]
                  )
                }
                className={inputClass(errors?.agencyState)}
              >
                <option value="">Select state or union territory</option>
                {INDIA_STATE_OPTIONS.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
              {errors?.agencyState ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.agencyState}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-black">
                Agency Compliance
              </p>
              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-black">
                  GST Registration Status
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateField("gstRegistrationStatus", "registered")
                    }
                    className={chipButtonClass(
                      value.gstRegistrationStatus === "registered"
                    )}
                  >
                    Registered under GST
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateField("gstRegistrationStatus", "not-registered")
                    }
                    className={chipButtonClass(
                      value.gstRegistrationStatus === "not-registered"
                    )}
                  >
                    Not registered under GST
                  </button>
                </div>
              </div>

              <div
                className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                  showGstinField
                    ? "mt-4 grid-rows-[1fr] opacity-100"
                    : "mt-0 grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-gray-200 pt-4">
                    <label className="mb-2 block text-sm font-medium text-black">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={value.gstin}
                      onChange={(e) =>
                        updateField(
                          "gstin",
                          e.target.value.toUpperCase().replace(/\s+/g, "")
                        )
                      }
                      placeholder="GSTIN"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className={inputClass(errors?.gstin)}
                    />
                    {errors?.gstin ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.gstin}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                  showLutSection
                    ? "mt-4 grid-rows-[1fr] opacity-100"
                    : "mt-0 grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-gray-200 pt-4">
                    <label className="mb-2 block text-sm font-medium text-black">
                      Valid LUT for current financial year?
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => updateField("lutAvailability", "yes")}
                        className={chipButtonClass(
                          value.lutAvailability === "yes"
                        )}
                      >
                        Yes
                      </button>

                      <button
                        type="button"
                        onClick={() => updateField("lutAvailability", "no")}
                        className={chipButtonClass(
                          value.lutAvailability === "no"
                        )}
                      >
                        No
                      </button>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                        value.lutAvailability === "yes"
                          ? "mt-4 grid-rows-[1fr] opacity-100"
                          : "mt-0 grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-gray-200 pt-4">
                          <label className="mb-2 block text-sm font-medium text-black">
                            LUT Number / ARN
                          </label>
                          <input
                            type="text"
                            value={value.lutNumber}
                            onChange={(e) =>
                              updateField("lutNumber", e.target.value)
                            }
                            placeholder="Recommended, not mandatory"
                            className={inputClass()}
                          />
                          <p className="mt-2 text-xs leading-5 text-gray-500">
                            Add the LUT reference if you have it handy.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                        showNoLutTotalsNote
                          ? "mt-4 grid-rows-[1fr] opacity-100"
                          : "mt-0 grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                          <p className="text-xs leading-5 text-gray-600">
                            Export tax handling for no-LUT invoices is chosen
                            in the Totals & Taxes step.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                PAN
              </label>
              <input
                type="text"
                value={value.pan}
                onChange={(e) =>
                  updateField(
                    "pan",
                    e.target.value.toUpperCase().replace(/\s+/g, "")
                  )
                }
                placeholder="PAN"
                autoCapitalize="characters"
                spellCheck={false}
                className={inputClass(errors?.pan)}
              />
              {errors?.pan ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.pan}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-black">Agency Logo</p>

              {value.logoUrl ? (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-400 hover:bg-red-50"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`flex min-h-[180px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed bg-white p-4 text-center text-sm transition ${
                isDragOver
                  ? "border-black text-black"
                  : "border-gray-300 text-gray-500 hover:border-black"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {value.logoUrl ? (
                <img
                  src={value.logoUrl}
                  alt="Agency logo preview"
                  className="max-h-[140px] w-auto object-contain"
                />
              ) : (
                <div>
                  Drag & drop logo here
                  <br />
                  or click to upload
                  <br />
                  <span className="text-xs text-gray-400">PNG, JPG, SVG</span>
                </div>
              )}
            </label>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Upload or drop a logo file to show it in invoice preview and
              exported layout.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
