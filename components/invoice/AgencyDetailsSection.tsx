"use client";

import { useEffect, useState } from "react";
import type { AgencyDetails } from "@/types/invoice";
import UploadToast from "@/components/ui/UploadToast";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
// No motion primitives needed here anymore
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { composeIndianAddress, evaluateStateSignals } from "@/lib/invoice-address";
import { parseGstin } from "@/lib/gstin-parser";
import { inferIndianLocationFromPinCode } from "@/lib/pin-code-inference";
import {
  appFieldFullWidthStackClass,
  appFieldPairGridClass,
  appFieldTripleCompactGridClass,
} from "@/lib/form-foundation";
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
  // Expansion animation removed due to choppiness

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

        <div className="space-y-4">
            <div className={cn(getAppSubtlePanelClass("muted"), "space-y-3 px-4 py-3")}>
              <p className="text-[13px] font-semibold tracking-[0.01em] text-[color:var(--text-primary)]">
                Agency Compliance
              </p>
              <div className="w-full md:max-w-[360px]">
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

              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showGstinField ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-4">
                    <div className={appFieldPairGridClass}>
                      <div>
                        <label className={appFieldLabelClass}>
                          GSTIN
                        </label>
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

                      <div>
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
                          <p className="mt-2 rounded-lg bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                            {panConflictWarning}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showLutSection ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-4">
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

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${value.lutAvailability === "yes" ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="max-w-[220px] pt-4">
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
                      </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showNoLutTotalsNote ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className={cn(getAppSubtlePanelClass(), "mt-4 px-3 py-2")}>
                          <p className="text-[11px] leading-5 text-[color:var(--text-muted)]">
                            This only affects export tax handling later if the client
                            invoice is international.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!showGstinField ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className="w-full md:max-w-[240px] pt-4">
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
                    <p className="mt-2 rounded-lg bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                      {panConflictWarning}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Business Name */}
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

            {/* Logo Upload Section */}
            <div className="space-y-2">
              <label className={appFieldLabelClass}>Agency Logo</label>
              {value.logoUrl ? (
                <div className="flex items-center justify-between rounded-md bg-gray-50 p-3 ring-1 ring-inset ring-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-white p-1 shadow-sm ring-1 ring-gray-200">
                      <img
                        src={value.logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        Agency Logo Attached
                        {value.logoUrl === value.profileLogoUrl && value.logoUrl !== "" && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-lime-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime-700 ring-1 ring-inset ring-lime-600/20">
                            Synced from Profile
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Will appear on the top of the invoice
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="group flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remove Logo"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="group relative flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white px-4 transition-all hover:border-[color:var(--border-strong)] hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 group-hover:text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900">
                    Upload Agency Logo
                  </span>
                </label>
              )}
            </div>

            <div>
              <div className="mb-2">
                <label className={appFieldLabelClass}>
                  Registered Address *
                </label>
              </div>

              <div className="space-y-4">
                <div className={appFieldFullWidthStackClass}>
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

                <div className={appFieldFullWidthStackClass}>
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

                <div className={appFieldTripleCompactGridClass}>
                  <div className="min-w-0">
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

                  <div className="min-w-0">
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
                <p className="mt-2 rounded-lg bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                  {stateSignals.warning}
                </p>
              ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
