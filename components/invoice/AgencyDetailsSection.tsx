"use client";
import { AppTooltip } from "@/components/ui/AppTooltip";

import { useEffect, useState } from "react";
import type { AgencyDetails } from "@/types/invoice";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  composeIndianAddress,
  evaluateStateSignals,
} from "@/lib/invoice-address";
import { parseGstin } from "@/lib/gstin-parser";
import { inferIndianLocationFromPinCode } from "@/lib/pin-code-inference";
import {
  appFieldFullWidthStackClass,
  appFieldPairGridClass,
  appFieldTripleCompactGridClass,
} from "@/lib/form-foundation";
import AppSwitch from "@/components/ui/AppSwitch";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/AppToast";
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
    pinCode?: string;
  };
  showAllErrors?: boolean;
  autoFilledFields?: Set<string>;
  onFieldManualEdit?: (fieldPath: string) => void;
  isGuestMode?: boolean;
  isReadOnly?: boolean;
}

export default function AgencyDetailsSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
  autoFilledFields = new Set(),
  onFieldManualEdit = () => {},
  isGuestMode = true,
  isReadOnly = false,
}: AgencyDetailsSectionProps) {
  const getInputStateClass = (fieldPath: string, fieldValue: string) => {
    if (isReadOnly) return "";
    if (!fieldValue || !fieldValue.trim()) return "";
    if (autoFilledFields.has(fieldPath)) return "input-autofilled";
    return "input-manual";
  };
  const [isDragOver, setIsDragOver] = useState(false);
  const { push } = useToast();
  
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );

  

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
    fieldValue: AgencyDetails[K],
  ) => {
    syncAgencyDetails({
      ...value,
      [key]: fieldValue,
    });
  };



  const readImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField("logoUrl", String(reader.result));
      push({ kind: "info", ttl: "Logo uploaded" });
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      prev[field] ? prev : { ...prev, [field]: true },
    );
  };
  const getVisibleError = (field: string, error?: string) =>
    showAllErrors || touchedFields[field] ? error : undefined;

  const inputClass = (
    hasError?: string,
    hasValue?: boolean,
    multiline = false,
  ) =>
    getAppFieldClass({
      hasError,
      hasValue,
      multiline,
    });
  // Expansion animation removed due to choppiness

  const showGstinField = value.gstRegistrationStatus === "registered";
  const showLutSection = showGstinField;
  const showNoLutTotalsNote = showLutSection && value.lutAvailability === "no";
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
  const pinCodeError = getVisibleError("pinCode", errors?.pinCode);
  return (
    <>
      

      <section
        className={cn(
          embedded
            ? "rounded-none border-0 bg-transparent p-0 shadow-none"
            : getAppPanelClass(),
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

        <div className="space-y-10">
          {/* Section A: Tax & Identity */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[color:var(--color-ink)]">
                Tax & Identity
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--color-soft)]" />
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 group">
                    <span className="text-[13px] font-bold text-[color:var(--color-ink)]">
                      GST Registration Status
                    </span>
                    <AppTooltip content={<>
  Required for charging GST on invoices. If registered, CGST/SGST or IGST is auto-calculated based on client location.
</>} />
                  </div>
                  {!isReadOnly && (
                    <AppSwitch
                      checked={value.gstRegistrationStatus === "registered"}
                      onChange={(checked) =>
                        updateField(
                          "gstRegistrationStatus",
                          checked ? "registered" : "not-registered",
                        )
                      }
                    />
                  )}
                  <span className="text-[13px] font-bold text-[color:var(--color-ink-2)] transition-opacity duration-200">
                    {value.gstRegistrationStatus === "registered"
                      ? "Registered"
                      : "Not registered"}
                  </span>
                </div>
                <p className="text-[11px] text-[color:var(--color-ink-2)]">
                  Required for tax compliance in India
                </p>
              </div>

              <AnimatePresence initial={false}>
                {showGstinField ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5">
                      <div className="flex flex-wrap gap-4">
                        <div className="w-full max-w-[360px]">
                          <label className={appFieldLabelClass}>
                            GSTIN
                            {autoFilledFields.has("agency.gstin") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <input
                            suppressHydrationWarning
                            type="text"
                            aria-label="Agency GSTIN"
                            autoComplete="off"
                            value={value.gstin}
                            onChange={(e) => {
                              onFieldManualEdit("agency.gstin");
                              updateField(
                                "gstin",
                                e.target.value.toUpperCase().replace(/\s+/g, ""),
                              );
                            }}
                            onBlur={() => markTouched("gstin")}
                            placeholder="GSTIN"
                            autoCapitalize="characters"
                            spellCheck={false}
                            readOnly={isReadOnly}
                            className={cn(
                              inputClass(gstinError, Boolean(value.gstin)),
                              getInputStateClass("agency.gstin", value.gstin),
                            )}
                          />
                          {gstinError ? (
                            <p className={appFieldErrorTextClass}>{gstinError}</p>
                          ) : gstinInfo.state ? (
                            <p className={appFieldHelperTextClass}>
                              GSTIN state code maps to {gstinInfo.state}.
                            </p>
                          ) : null}
                        </div>

                        <div className="w-full max-w-[180px]">
                          <div className="flex flex-wrap items-center gap-1.5 mb-2 group">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink)] m-0 p-0 block">
                              PAN
                              {autoFilledFields.has("agency.pan") && (
                                <span className="autofill-indicator">auto-filled</span>
                              )}
                            </label>
                            <AppTooltip content={<>
  10-character Permanent Account Number. Auto-derived from GSTIN if provided.
</>} />
                          </div>
                          <input
                            suppressHydrationWarning
                            type="text"
                            value={value.pan}
                            onChange={(e) => {
                              onFieldManualEdit("agency.pan");
                              updateField(
                                "pan",
                                e.target.value.toUpperCase().replace(/\s+/g, ""),
                              );
                            }}
                            onBlur={() => markTouched("pan")}
                            placeholder="PAN"
                            autoCapitalize="characters"
                            spellCheck={false}
                            autoComplete="off"
                            className={cn(
                              inputClass(panError, Boolean(value.pan)),
                              getInputStateClass("agency.pan", value.pan),
                            )}
                          />
                          {panError ? (
                            <p className={appFieldErrorTextClass}>{panError}</p>
                          ) : panConflictWarning ? (
                            <p className="mt-2 bg-[color:var(--state-warning-bg)] px-3 py-2 text-[11px] font-normal leading-relaxed text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                              {panConflictWarning}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-4 bg-[color:var(--color-paper-2)]/40 p-4 ring-1 ring-inset ring-[color:var(--color-soft)]">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-wrap items-center gap-1.5 group">
                              <span className="text-[13px] font-bold text-[color:var(--color-ink)]">
                                Valid LUT for current financial year?
                              </span>
                              <AppTooltip content={<>
  Letter of Undertaking — required to zero-rate exports to international clients without paying IGST upfront.
</>} />
                            </div>
                            {!isReadOnly && (
                              <AppSwitch
                                checked={value.lutAvailability === "yes"}
                                onChange={(checked) =>
                                  updateField("lutAvailability", checked ? "yes" : "no")
                                }
                              />
                            )}
                            <span className="text-[13px] font-bold text-[color:var(--color-ink-2)] transition-opacity duration-200">
                              {value.lutAvailability === "yes" ? "Yes" : "No"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[color:var(--color-ink-2)]">
                            Required for Zero-Rated export invoices
                          </p>
                        </div>
                        
                        <AnimatePresence initial={false}>
                          {value.lutAvailability === "yes" && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="max-w-[360px] pt-1">
                                <label className={appFieldLabelClass}>
                                  LUT Number / ARN
                                  {autoFilledFields.has("agency.lutNumber") && (
                                    <span className="autofill-indicator">auto-filled</span>
                                  )}
                                </label>
                                <input
                                  suppressHydrationWarning
                                  type="text"
                                  value={value.lutNumber}
                                  onChange={(e) => {
                                    onFieldManualEdit("agency.lutNumber");
                                    updateField("lutNumber", e.target.value);
                                  }}
                                  placeholder="LUT ARN Number"
                                  className={cn(
                                    inputClass(undefined, Boolean(value.lutNumber)),
                                    getInputStateClass("agency.lutNumber", value.lutNumber),
                                  )}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {showNoLutTotalsNote && (
                          <div className="rounded-none bg-[color:var(--color-paper-2)] px-3 py-2">
                            <p className="text-[11px] leading-relaxed text-[color:var(--color-ink-2)]">
                              Without a valid LUT, IGST will be applied to export invoices by default.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="w-full max-w-[180px] pt-2">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 group">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink)] m-0 p-0 block">PAN</label>
                        <AppTooltip content={<>
  10-character Permanent Account Number. Auto-derived from GSTIN if provided.
</>} />
                      </div>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={value.pan}
                        onChange={(e) =>
                          updateField(
                            "pan",
                            e.target.value.toUpperCase().replace(/\s+/g, ""),
                          )
                        }
                        onBlur={() => markTouched("pan")}
                        placeholder="PAN"
                        autoCapitalize="characters"
                        spellCheck={false}
                        autoComplete="off"
                        className={inputClass(panError, Boolean(value.pan))}
                      />
                      {panError ? (
                        <p className={appFieldErrorTextClass}>{panError}</p>
                      ) : panConflictWarning ? (
                        <p className="mt-2 bg-[color:var(--state-warning-bg)] px-3 py-2 text-[11px] font-normal leading-relaxed text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                          {panConflictWarning}
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Section B: Business Details */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[color:var(--color-ink)]">
                Business Details
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--color-soft)]" />
            </div>

            <div className="space-y-6">
              <div>
                <label className={appFieldLabelClass}>
                  Business / Trade Name{!isReadOnly && " *"}
                  {autoFilledFields.has("agency.agencyName") && (
                    <span className="autofill-indicator">auto-filled</span>
                  )}
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.agencyName}
                  onChange={(e) => {
                    onFieldManualEdit("agency.agencyName");
                    updateField("agencyName", e.target.value);
                  }}
                  onBlur={() => markTouched("agencyName")}
                  placeholder="Your agency or freelance brand name"
                  readOnly={isReadOnly}
                  className={cn(
                    inputClass(agencyNameError, Boolean(value.agencyName)),
                    getInputStateClass("agency.agencyName", value.agencyName),
                  )}
                />
                {agencyNameError ? (
                  <p className={appFieldErrorTextClass}>{agencyNameError}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={appFieldLabelClass}>Agency Logo</label>
                {value.logoUrl ? (
                  <div className="flex items-center justify-between bg-[color:var(--color-paper)] p-3 ring-1 ring-inset ring-[color:var(--color-soft)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center bg-white p-1 shadow-sm ring-1 ring-gray-200">
                        <img
                          src={value.logoUrl}
                          alt="Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-[color:var(--color-ink)]">
                          Agency Logo Attached
                          {value.logoUrl === value.profileLogoUrl &&
                            value.logoUrl !== "" && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-lime-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime-700 ring-1 ring-inset ring-lime-600/20">
                                Synced
                              </span>
                            )}
                        </p>
                        <p className="text-[11px] text-[color:var(--color-ink-2)]">
                          Appears at the top of the invoice
                        </p>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="group flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-ink-2)] transition-colors hover:bg-[color:var(--state-danger-bg)] hover:text-[#FF5C00]"
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
                    )}
                  </div>
                ) : !isReadOnly ? (
                  <label className="group relative flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-[#111118] bg-white px-4 transition-all hover:border-[color:var(--brand-indigo-deep)] hover:bg-[color:var(--brand-indigo-deep)]/5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-[color:var(--color-ink-2)] group-hover:text-[color:var(--brand-indigo-deep)]"
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
                    <span className="text-[13px] font-bold text-[color:var(--color-ink)] group-hover:text-[color:var(--brand-indigo-deep)]">
                      Upload Agency Logo
                    </span>
                  </label>
                ) : (
                  <div className="flex h-[46px] items-center border-2 border-[#D4D2CC] bg-[#F5F4F0] px-4 text-[13px] font-normal text-[#6B6660]">
                    No logo attached
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Registered Address */}
          <div>
            <div className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[color:var(--color-ink)]">
                Registered Address
              </h3>
              <div className="mt-1.5 h-[1px] w-full bg-[color:var(--color-soft)]" />
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div className={appFieldFullWidthStackClass}>
                  <label className={appFieldLabelClass}>
                    Address Line 1{!isReadOnly && " *"}
                    {autoFilledFields.has("agency.addressLine1") && (
                      <span className="autofill-indicator">auto-filled</span>
                    )}
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.addressLine1}
                    onChange={(e) => {
                      onFieldManualEdit("agency.addressLine1");
                      updateField("addressLine1", e.target.value);
                    }}
                    onBlur={() => markTouched("address")}
                    placeholder="Building, street, or area"
                    className={cn(
                      inputClass(addressError, Boolean(value.addressLine1)),
                      getInputStateClass("agency.addressLine1", value.addressLine1),
                    )}
                  />
                </div>

                <div className={appFieldFullWidthStackClass}>
                  <label className={appFieldLabelClass}>
                    Address Line 2
                    {autoFilledFields.has("agency.addressLine2") && (
                      <span className="autofill-indicator">auto-filled</span>
                    )}
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.addressLine2}
                    onChange={(e) => {
                      onFieldManualEdit("agency.addressLine2");
                      updateField("addressLine2", e.target.value);
                    }}
                    placeholder="Suite, floor, landmark, or optional line"
                    className={cn(
                      inputClass(undefined, Boolean(value.addressLine2)),
                      getInputStateClass("agency.addressLine2", value.addressLine2),
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[9fr_7fr_4fr]">
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>
                      State{!isReadOnly && " *"}
                      {autoFilledFields.has("agency.agencyState") && (
                        <span className="autofill-indicator">auto-filled</span>
                      )}
                    </label>
                    <AppSelectField
                      suppressHydrationWarning
                      aria-label="Agency state"
                      value={value.agencyState}
                      onChange={(e) => {
                        onFieldManualEdit("agency.agencyState");
                        updateField(
                          "agencyState",
                          e.target.value as AgencyDetails["agencyState"],
                        );
                      }}
                      onBlur={() => markTouched("agencyState")}
                      hasError={agencyStateError}
                      hasValue={Boolean(value.agencyState)}
                      className={getInputStateClass(
                        "agency.agencyState",
                        value.agencyState,
                      )}
                    >
                      <option value="">State</option>
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
                      {autoFilledFields.has("agency.city") && (
                        <span className="autofill-indicator">auto-filled</span>
                      )}
                    </label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={value.city}
                      onChange={(e) => {
                        onFieldManualEdit("agency.city");
                        updateField("city", e.target.value);
                      }}
                      placeholder="City"
                      className={cn(
                        inputClass(undefined, Boolean(value.city)),
                        getInputStateClass("agency.city", value.city),
                      )}
                    />
                  </div>

                      <div className="min-w-0 overflow-visible">
                        <label className={appFieldLabelClass}>
                          PIN
                          {autoFilledFields.has("agency.pinCode") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <input
                          suppressHydrationWarning
                          type="text"
                          inputMode="numeric"
                          value={value.pinCode}
                          onChange={(e) => {
                            onFieldManualEdit("agency.pinCode");
                            updateField(
                              "pinCode",
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            );
                          }}
                          onBlur={() => markTouched("pinCode")}
                          placeholder="PIN"
                          className={cn(
                            inputClass(pinCodeError, Boolean(value.pinCode)),
                            getInputStateClass("agency.pinCode", value.pinCode),
                            "w-full max-w-[120px]"
                          )}
                        />
                        {pinCodeError && (
                          <p className={cn(appFieldErrorTextClass, "mt-1")}>{pinCodeError}</p>
                        )}
                      </div>
                </div>
              </div>

              {addressError ? (
                <p className={appFieldErrorTextClass}>{addressError}</p>
              ) : null}
              {agencyStateError ? (
                <p className={appFieldErrorTextClass}>{agencyStateError}</p>
              ) : null}
              {stateSignals.warning ? (
                <p className="mt-2 bg-[color:var(--state-warning-bg)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                  {stateSignals.warning}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
