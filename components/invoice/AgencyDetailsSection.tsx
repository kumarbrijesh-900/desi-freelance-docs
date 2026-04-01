"use client";

import { useEffect, useState } from "react";
import type { AgencyDetails } from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { composeIndianAddress, evaluateStateSignals } from "@/lib/invoice-address";
import { parseGstin } from "@/lib/gstin-parser";
import { inferIndianLocationFromPinCode } from "@/lib/pin-code-inference";
import {
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
} from "@/lib/ui-foundation";

interface AgencyDetailsSectionProps {
  value: AgencyDetails;
  onChange: (value: AgencyDetails) => void;
  embedded?: boolean;
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
  onChange,
  embedded = false,
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

  const syncAgencyDetails = (nextValue: AgencyDetails) => {
    const gstinInfo = parseGstin(nextValue.gstin);
    const pinInference = inferIndianLocationFromPinCode(nextValue.pinCode);
    const nextCity = nextValue.city || pinInference.city;
    const stateSignals = evaluateStateSignals({
      manualState: nextValue.agencyState,
      city: nextCity,
      pinCode: nextValue.pinCode,
      gstinState: gstinInfo.state,
      label: "Agency state",
    });
    const nextState =
      nextValue.agencyState ||
      (stateSignals.strongestState as AgencyDetails["agencyState"]) ||
      "";
    const nextPan = nextValue.pan || gstinInfo.pan;

    onChange({
      ...nextValue,
      city: nextCity,
      agencyState: nextState,
      pan: nextPan,
      address: composeIndianAddress({
        addressLine1: nextValue.addressLine1,
        addressLine2: nextValue.addressLine2,
        city: nextCity,
        state: nextState,
        pinCode: nextValue.pinCode,
      }),
    });
  };

  const updateField = <K extends keyof AgencyDetails>(
    key: K,
    fieldValue: AgencyDetails[K]
  ) => {
    syncAgencyDetails({
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

  const inputClass = (
    hasError?: string,
    hasValue?: boolean,
    multiline = false
  ) =>
    getAppFieldClass({
      hasError,
      hasValue,
      multiline,
    });

  const showGstinField = value.gstRegistrationStatus === "registered";
  const showLutSection = showGstinField;
  const showNoLutTotalsNote =
    showLutSection && value.lutAvailability === "no";
  const gstinInfo = parseGstin(value.gstin);
  const stateSignals = evaluateStateSignals({
    manualState: value.agencyState,
    city: value.city,
    pinCode: value.pinCode,
    gstinState: showGstinField ? gstinInfo.state : "",
    label: "Agency state",
  });
  const panConflictWarning =
    showGstinField &&
    value.pan.trim() &&
    gstinInfo.pan &&
    value.pan.trim().toUpperCase() !== gstinInfo.pan
      ? `PAN does not match this GSTIN. GSTIN implies PAN ${gstinInfo.pan}.`
      : "";
  const addressHelperText =
    errors?.address || stateSignals.warning
      ? ""
      : "PIN code can suggest city and state, but you can still edit them manually.";

  return (
    <>
      <UploadToast message={toastMessage} visible={showToast} />

      <section
        className={cn(
          embedded
            ? "rounded-none border-0 bg-transparent p-0 shadow-none"
            : getAppPanelClass()
        )}
      >
        {!embedded ? (
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
            My Agency Details
          </h2>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Business / Trade Name *
              </label>
              <input
                type="text"
                value={value.agencyName}
                onChange={(e) => updateField("agencyName", e.target.value)}
                placeholder="Your agency or freelance brand name"
                className={inputClass(errors?.agencyName, Boolean(value.agencyName))}
              />
              {errors?.agencyName ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.agencyName}
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-black">
                  Registered Address *
                </label>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">
                  Structured for GST checks
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={value.pinCode}
                    onChange={(e) =>
                      updateField("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="560025"
                    className={inputClass(undefined, Boolean(value.pinCode))}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    City
                  </label>
                  <input
                    type="text"
                    value={value.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Bengaluru"
                    className={inputClass(undefined, Boolean(value.city))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={value.addressLine1}
                    onChange={(e) => updateField("addressLine1", e.target.value)}
                    placeholder="Building, street, or area"
                    className={inputClass(errors?.address, Boolean(value.addressLine1))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={value.addressLine2}
                    onChange={(e) => updateField("addressLine2", e.target.value)}
                    placeholder="Suite, floor, landmark, or optional line"
                    className={inputClass(undefined, Boolean(value.addressLine2))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black">
                    State *
                  </label>
                  <AppSelectField
                    aria-label="Agency state"
                    value={value.agencyState}
                    onChange={(e) =>
                      updateField(
                        "agencyState",
                        e.target.value as AgencyDetails["agencyState"]
                      )
                    }
                    hasError={errors?.agencyState}
                    hasValue={Boolean(value.agencyState)}
                  >
                    <option value="">Select state or union territory</option>
                    {INDIA_STATE_OPTIONS.map((stateName) => (
                      <option key={stateName} value={stateName}>
                        {stateName}
                      </option>
                    ))}
                  </AppSelectField>
                </div>
              </div>

              {errors?.address ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.address}
                </p>
              ) : null}
              {errors?.agencyState ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.agencyState}
                </p>
              ) : null}
              {stateSignals.warning ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                  {stateSignals.warning}
                </p>
              ) : addressHelperText ? (
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {addressHelperText}
                </p>
              ) : null}
            </div>

            <div className={cn(getAppPanelClass("muted"), "p-5")}>
              <p className="text-sm font-medium text-black">
                Agency Compliance
              </p>
              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-black">
                  GST Registration Status
                </label>
                <ChoiceCards
                  name="agency-gst-registration"
                  value={value.gstRegistrationStatus}
                  onChange={(nextValue) =>
                    updateField("gstRegistrationStatus", nextValue)
                  }
                  variant="segmented"
                  columns={2}
                  options={[
                    {
                      value: "registered",
                      label: "Registered under GST",
                      description: "GSTIN becomes required and tax rules can apply.",
                    },
                    {
                      value: "not-registered",
                      label: "Not registered",
                      description: "Keep this invoice outside GST registration flow.",
                    },
                  ]}
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  This choice controls whether GSTIN and LUT compliance fields apply.
                </p>
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
                      aria-label="Agency GSTIN"
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
                      className={inputClass(errors?.gstin, Boolean(value.gstin))}
                    />
                    {errors?.gstin ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.gstin}
                      </p>
                    ) : gstinInfo.state ? (
                      <p className="mt-2 text-xs leading-5 text-gray-500">
                        GSTIN state code maps to {gstinInfo.state}. PAN will be derived automatically when blank.
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
                    <ChoiceCards
                      name="agency-lut-availability"
                      value={value.lutAvailability}
                      onChange={(nextValue) =>
                        updateField("lutAvailability", nextValue)
                      }
                      variant="segmented"
                      columns={2}
                      options={[
                        {
                          value: "yes",
                          label: "Yes",
                        },
                        {
                          value: "no",
                          label: "No",
                        },
                      ]}
                    />

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
                            className={inputClass(undefined, Boolean(value.lutNumber))}
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
                        <div className={cn(getAppPanelClass(), "p-4")}>
                          <p className="text-xs leading-5 text-gray-600">
                            This LUT setting stays part of agency compliance
                            and only affects tax handling later when the client
                            invoice is international.
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
                className={inputClass(errors?.pan, Boolean(value.pan))}
              />
              {errors?.pan ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.pan}
                </p>
              ) : panConflictWarning ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                  {panConflictWarning}
                </p>
              ) : null}
            </div>
          </div>

          <div className={cn(getAppPanelClass("muted"), "p-5")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-black">Agency Logo</p>

              {value.logoUrl ? (
                <button
                  type="button"
                  onClick={removeLogo}
                  className={cn(
                    getAppButtonClass({
                      variant: "destructive-lite",
                      size: "sm",
                    }),
                    "h-8 px-3 text-xs"
                  )}
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
              className={`app-dropzone-surface flex min-h-[180px] cursor-pointer items-center justify-center rounded-[var(--app-radius-card)] border-2 border-dashed p-4 text-center text-sm ${
                isDragOver
                  ? "app-dropzone-accept text-slate-950"
                  : "text-slate-500 hover:border-slate-400"
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
