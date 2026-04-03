"use client";

import { useEffect, useState } from "react";
import type { AgencyDetails } from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import {
  AnimatePresence,
  appEaseStandard,
  motion,
} from "@/components/ui/motion-primitives";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { composeIndianAddress, evaluateStateSignals } from "@/lib/invoice-address";
import { parseGstin } from "@/lib/gstin-parser";
import { inferIndianLocationFromPinCode } from "@/lib/pin-code-inference";
import {
  appFieldErrorTextClass,
  appFieldHelperTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
  getAppSubtlePanelClass,
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
  showAllErrors?: boolean;
}

export default function AgencyDetailsSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
}: AgencyDetailsSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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
  const markTouched = (field: string) => {
    setTouchedFields((prev) =>
      prev[field] ? prev : { ...prev, [field]: true }
    );
  };
  const getVisibleError = (field: string, error?: string) =>
    showAllErrors || touchedFields[field] ? error : undefined;

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
  const expandableSectionTransition = {
    duration: 0.18,
    ease: appEaseStandard,
  } as const;

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
  const agencyNameError = getVisibleError("agencyName", errors?.agencyName);
  const addressError = getVisibleError("address", errors?.address);
  const agencyStateError = getVisibleError("agencyState", errors?.agencyState);
  const gstinError = getVisibleError("gstin", errors?.gstin);
  const panError = getVisibleError("pan", errors?.pan);
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
          <div className="mb-6 space-y-2">
            <h2 className={appSectionTitleClass}>Agency</h2>
            <p className={appSectionDescriptionClass}>
              Add your business details for the invoice.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_116px] xl:items-start">
          <div className="space-y-5">
            <div>
              <label className={appFieldLabelClass}>
                Business / Trade Name *
              </label>
              <input
                suppressHydrationWarning
                type="text"
                value={value.agencyName}
                onChange={(e) => updateField("agencyName", e.target.value)}
                onBlur={() => markTouched("agencyName")}
                placeholder="Your agency or freelance brand name"
                className={inputClass(
                  agencyNameError,
                  Boolean(value.agencyName)
                )}
              />
              {agencyNameError ? (
                <p className={appFieldErrorTextClass}>
                  {agencyNameError}
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-2">
                <label className={appFieldLabelClass}>
                  Registered Address *
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[190px_minmax(0,1fr)_120px]">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className={appFieldLabelClass}>
                    Address Line 1 *
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.addressLine1}
                    onChange={(e) => updateField("addressLine1", e.target.value)}
                    onBlur={() => markTouched("address")}
                    placeholder="Building, street, or area"
                    className={inputClass(
                      addressError,
                      Boolean(value.addressLine1)
                    )}
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className={appFieldLabelClass}>
                    Address Line 2
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.addressLine2}
                    onChange={(e) => updateField("addressLine2", e.target.value)}
                    placeholder="Suite, floor, landmark, or optional line"
                    className={inputClass(undefined, Boolean(value.addressLine2))}
                  />
                </div>

                <div className="max-w-[220px]">
                  <label className={appFieldLabelClass}>
                    State *
                  </label>
                  <AppSelectField
                    suppressHydrationWarning
                    aria-label="Agency state"
                    value={value.agencyState}
                    onChange={(e) =>
                      updateField(
                        "agencyState",
                        e.target.value as AgencyDetails["agencyState"]
                      )
                    }
                    onBlur={() => markTouched("agencyState")}
                    hasError={agencyStateError}
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

                <div>
                  <label className={appFieldLabelClass}>
                    City
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Bengaluru"
                    className={inputClass(undefined, Boolean(value.city))}
                  />
                </div>

                <div className="max-w-[120px]">
                  <label className={appFieldLabelClass}>
                    PIN Code
                  </label>
                  <input
                    suppressHydrationWarning
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
              </div>

              {addressError ? (
                <p className={appFieldErrorTextClass}>
                  {addressError}
                </p>
              ) : null}
              {agencyStateError ? (
                <p className={appFieldErrorTextClass}>
                  {agencyStateError}
                </p>
              ) : null}
              {stateSignals.warning ? (
                <p className="mt-2 rounded-xl bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  {stateSignals.warning}
                </p>
              ) : null}
            </div>

            <div className={cn(getAppSubtlePanelClass("muted"), "space-y-4 px-4 py-4")}>
              <p className="text-sm font-medium text-slate-900">
                Agency Compliance
              </p>
              <div className="max-w-[360px]">
                <label className={appFieldLabelClass}>
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
                      label: "Registered",
                  },
                  {
                    value: "not-registered",
                      label: "Not registered",
                  },
                ]}
              />
              </div>

              <AnimatePresence initial={false}>
                {showGstinField ? (
                  <motion.div
                    key="agency-gstin-field"
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={expandableSectionTransition}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-200 pt-4">
                      <label className={appFieldLabelClass}>
                        GSTIN
                      </label>
                      <div className="max-w-[280px]">
                        <input
                          suppressHydrationWarning
                          type="text"
                          aria-label="Agency GSTIN"
                          value={value.gstin}
                          onChange={(e) =>
                            updateField(
                              "gstin",
                              e.target.value.toUpperCase().replace(/\s+/g, "")
                            )
                          }
                          onBlur={() => markTouched("gstin")}
                          placeholder="GSTIN"
                          autoCapitalize="characters"
                          spellCheck={false}
                          className={inputClass(gstinError, Boolean(value.gstin))}
                        />
                      </div>
                      {gstinError ? (
                        <p className={appFieldErrorTextClass}>
                          {gstinError}
                        </p>
                      ) : gstinInfo.state ? (
                        <p className={appFieldHelperTextClass}>
                          GSTIN state code maps to {gstinInfo.state}. PAN will
                          be derived automatically when blank.
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {showLutSection ? (
                  <motion.div
                    key="agency-lut-section"
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={expandableSectionTransition}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-200 pt-4">
                      <label className={appFieldLabelClass}>
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

                      <AnimatePresence initial={false}>
                        {value.lutAvailability === "yes" ? (
                          <motion.div
                            key="agency-lut-number"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={expandableSectionTransition}
                            className="overflow-hidden"
                          >
                            <div className="max-w-[260px] border-t border-gray-200 pt-4">
                              <label className={appFieldLabelClass}>
                                LUT Number / ARN
                              </label>
                              <input
                                suppressHydrationWarning
                                type="text"
                                value={value.lutNumber}
                                onChange={(e) =>
                                  updateField("lutNumber", e.target.value)
                                }
                                placeholder="Recommended, not mandatory"
                                className={inputClass(
                                  undefined,
                                  Boolean(value.lutNumber)
                                )}
                              />
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {showNoLutTotalsNote ? (
                          <motion.div
                            key="agency-lut-note"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={expandableSectionTransition}
                            className="overflow-hidden"
                          >
                            <div className={cn(getAppSubtlePanelClass(), "p-4")}>
                              <p className="text-xs leading-5 text-slate-500">
                                This only affects export tax handling later if the client
                                invoice is international.
                              </p>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="max-w-[220px]">
              <label className={appFieldLabelClass}>
                PAN
              </label>
              <input
                suppressHydrationWarning
                type="text"
                value={value.pan}
                onChange={(e) =>
                  updateField(
                    "pan",
                    e.target.value.toUpperCase().replace(/\s+/g, "")
                  )
                }
                onBlur={() => markTouched("pan")}
                placeholder="PAN"
                autoCapitalize="characters"
                spellCheck={false}
                className={inputClass(panError, Boolean(value.pan))}
              />
              {panError ? (
                <p className={appFieldErrorTextClass}>
                  {panError}
                </p>
              ) : panConflictWarning ? (
                <p className="mt-2 rounded-xl bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  {panConflictWarning}
                </p>
              ) : null}
            </div>
          </div>

          <div className={cn(getAppSubtlePanelClass("muted"), "space-y-2 p-2.5 xl:self-start")}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-900">Logo</p>

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
              className={`app-dropzone-surface ml-auto flex aspect-square w-full max-w-[88px] cursor-pointer items-center justify-center rounded-[12px] border-2 border-dashed px-2 py-2 text-center text-sm ${
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
                  className="max-h-[48px] w-auto object-contain"
                />
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-slate-700">Upload</p>
                  <p className="text-[10px] text-slate-400">PNG/JPG</p>
                </div>
              )}
            </label>
          </div>
        </div>
      </section>
    </>
  );
}
