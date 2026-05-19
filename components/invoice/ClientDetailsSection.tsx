"use client";
import { AppTooltip } from "@/components/ui/AppTooltip";

import { useState, useEffect } from "react";
import type { ClientDetails } from "@/types/invoice";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  INTERNATIONAL_CURRENCY_OPTIONS,
} from "@/lib/international-billing-options";
import {
  appFieldErrorTextClass,
  appFieldHelperTextClass,
  appFieldLabelClass,
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppFieldClass,
  getAppPanelClass,
} from "@/lib/ui-foundation";
import {
  composeIndianAddress,
  evaluateStateSignals,
} from "@/lib/invoice-address";
import { parseGstin } from "@/lib/gstin-parser";
import { inferIndianLocationFromPinCode } from "@/lib/pin-code-inference";
import { suggestSezCampus } from "@/lib/sez-lookup";
import {
  appFieldFullWidthStackClass,
  appFieldPairGridClass,
} from "@/lib/form-foundation";
import {
  getClientTaxIdLabel,
  getClientTaxIdPlaceholder,
  isAgencyGstRegistered,
} from "@/lib/invoice-compliance";
import type { AgencyDetails } from "@/types/invoice";
import {
  ChevronDownIcon,
} from "@/components/ui/app-icons";
import AppSwitch from "@/components/ui/AppSwitch";
import { motion, AnimatePresence } from "framer-motion";

import {
  listClients,
  SavedClient,
  savedClientToClientDetails,
} from "@/lib/supabase/clients";

interface ClientDetailsSectionProps {
  value: ClientDetails;
  onChange: (value: ClientDetails) => void;
  embedded?: boolean;
  errors?: {
    clientName?: string;
    clientAddress?: string;
    clientState?: string;
    clientCountry?: string;
    clientGstin?: string;
    pinCode?: string;
  };
  showAllErrors?: boolean;
  savedClients?: SavedClient[];
  onClientSelect?: (client: SavedClient) => void;
  agency?: AgencyDetails;
  isNew?: boolean;
  autoFilledFields?: Set<string>;
  onFieldManualEdit?: (fieldPath: string) => void;
}

const SNIPER_DEFAULTS = {
  msaPaymentTermsDays: 15,
  msaLateFeeRate: 1.5,
  msaLateFeeUnit: "monthly" as const,
  msaIpTriggerType: "upon_full_payment" as const,
  msaLicenseType: "full-assignment" as const,
};

export default function ClientDetailsSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
  savedClients,
  onClientSelect,
  agency,
  isNew = false,
  autoFilledFields = new Set(),
  onFieldManualEdit = () => {},
}: ClientDetailsSectionProps) {
  const getInputStateClass = (fieldPath: string, fieldValue: string) => {
    if (!fieldValue || !fieldValue.trim()) return "";
    if (autoFilledFields.has(fieldPath)) return "input-autofilled";
    return "input-manual";
  };
  const isInternational = value.clientLocation === "international";
  const [isMsaOpen, setIsMsaOpen] = useState(false);
  const [hasInteractedWithMSA, setHasInteractedWithMSA] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalClients, setInternalClients] = useState<SavedClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use provided clients or fetch them if needed
  const effectiveClients =
    savedClients && savedClients.length > 0 ? savedClients : internalClients;

  const applyMsaCascade = (details: ClientDetails): ClientDetails => {
    return {
      ...details,
      msaPaymentTermsDays: details.msaPaymentTermsDays || agency?.msaPaymentTermsDays || SNIPER_DEFAULTS.msaPaymentTermsDays,
      msaLateFeeRate: details.msaLateFeeRate || agency?.msaLateFeeRate || SNIPER_DEFAULTS.msaLateFeeRate,
      msaLateFeeUnit: details.msaLateFeeUnit || agency?.msaLateFeeUnit || SNIPER_DEFAULTS.msaLateFeeUnit,
      msaIpTriggerType: details.msaIpTriggerType || agency?.msaIpTriggerType || SNIPER_DEFAULTS.msaIpTriggerType,
      msaLicenseType: details.msaLicenseType || agency?.msaLicenseType || SNIPER_DEFAULTS.msaLicenseType,
      msaJurisdictionCity: details.msaJurisdictionCity || agency?.city || "",
      freeRevisionRounds: details.freeRevisionRounds || agency?.freeRevisionRounds || 2,
      extraRevisionFeePercent: details.extraRevisionFeePercent || agency?.extraRevisionFeePercent || 15,
    };
  };

  const performSafetyFetch = async () => {
    if (effectiveClients.length === 0 && !isLoading) {
      setIsLoading(true);
      const { data, error } = await listClients();
      setIsLoading(false);

      if (error) console.error(error);
      if (data) setInternalClients(data);
    }
  };

  useEffect(() => {
    performSafetyFetch();
  }, [savedClients]);

  useEffect(() => {
    if (!value.msaPaymentTermsDays) {
      onChange(applyMsaCascade(value));
    }
  }, []);

  useEffect(() => {
    if (!value.msaJurisdictionCity && agency?.city) {
      updateField("msaJurisdictionCity", agency.city);
    }
  }, [agency?.city]);

  const filteredClients = effectiveClients.filter((c) =>
    c.client_name.toLowerCase().includes(value.clientName.toLowerCase()),
  );

  const handleSelectClient = (client: SavedClient) => {
    const details = savedClientToClientDetails(client);
    const finalDetails = applyMsaCascade(details);
    onChange(finalDetails);
    setShowSuggestions(false);
    if (onClientSelect) onClientSelect(client);
  };

  const syncClientDetails = (nextValue: ClientDetails) => {
    if (nextValue.clientLocation === "international") {
      onChange(nextValue);
      return;
    }

    const gstinInfo = parseGstin(nextValue.clientGstin);
    const pinInference = inferIndianLocationFromPinCode(nextValue.clientPinCode);
    const nextCity = nextValue.clientCity || pinInference.city;
    const stateSignals = evaluateStateSignals({
      manualState: nextValue.clientState,
      city: nextCity,
      pinCode: nextValue.clientPinCode,
      gstinState: gstinInfo.state,
      label: "Client state",
    });
    const nextState =
      nextValue.clientState ||
      (stateSignals.strongestState as ClientDetails["clientState"]) ||
      "";

    onChange({
      ...nextValue,
      clientCity: nextCity,
      clientState: nextState,
      clientAddress: composeIndianAddress({
        addressLine1: nextValue.clientAddressLine1,
        addressLine2: nextValue.clientAddressLine2,
        city: nextCity,
        state: nextState,
        pinCode: nextValue.clientPinCode,
      }),
    });
  };

  const updateField = <K extends keyof ClientDetails>(
    key: K,
    fieldValue: ClientDetails[K],
  ) => {
    syncClientDetails({
      ...value,
      [key]: fieldValue,
    });
  };

  const markTouched = (field: string) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const getVisibleError = (field: string, error?: string) =>
    showAllErrors || touchedFields[field] ? error : undefined;

  const inputClass = (hasError?: string, hasValue?: boolean, multiline = false) =>
    getAppFieldClass({ hasError, hasValue, multiline });

  const gstinInfo = parseGstin(value.clientGstin);
  const stateSignals = evaluateStateSignals({
    manualState: value.clientState,
    city: value.clientCity,
    pinCode: value.clientPinCode,
    gstinState: gstinInfo.state,
    label: "Client state",
  });

  const clientNameError = getVisibleError("clientName", errors?.clientName);
  const clientAddressError = getVisibleError("clientAddress", errors?.clientAddress);
  const clientStateError = getVisibleError("clientState", errors?.clientState);
  const clientCountryError = getVisibleError("clientCountry", errors?.clientCountry);
  const clientGstinError = getVisibleError("clientGstin", errors?.clientGstin);
  const clientPinCodeError = getVisibleError("pinCode", errors?.pinCode);

  const handleGenerateContract = () => {
    const ipLabels: Record<string, string> = { upon_full_payment: "upon receipt of full payment", upon_delivery: "upon delivery of materials", work_for_hire: "as a work-for-hire" };
    const ipLabel = ipLabels[value.msaIpTriggerType || "upon_full_payment"];
    const unitLabels: Record<string, string> = { monthly: "per month", annually: "per annum", daily: "per day" };
    const unitLabel = unitLabels[value.msaLateFeeUnit || "monthly"];
    const licenseLabels: Record<string, string> = { "full-assignment": "full assignment", "exclusive-license": "exclusive license", "non-exclusive-license": "non-exclusive license" };
    const licenseLabel = value.msaLicenseType ? licenseLabels[value.msaLicenseType] : "assignment";
    const revisionClause = `The quoted fee includes up to ${value.freeRevisionRounds || 2} rounds of revisions per deliverable. Each additional round beyond the included ${value.freeRevisionRounds || 2} will incur a surcharge of ${value.extraRevisionFeePercent || 15}% of that specific line item's total.`;
    const template = `Payment is due within ${value.msaPaymentTermsDays ?? 20} days. A late fee of ${value.msaLateFeeRate ?? 1.5}% ${unitLabel} applies to overdue balances. Intellectual Property rights transfer to the client as a ${licenseLabel} ${ipLabel}. Jurisdiction is ${value.msaJurisdictionCity || "Bengaluru"}. ${revisionClause}`;
    updateField("msaNotesBoilerplate", template);
  };

  return (
    <section className={cn(embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : getAppPanelClass())}>
      {!embedded && (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Client</h2>
          <p className={appSectionDescriptionClass}>Details of the person or company paying you.</p>
        </div>
      )}

      <div className="space-y-10">
        {/* Section A: Client Info */}
        <div>
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
              Client Info
            </h3>
            <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative">
                <label className={appFieldLabelClass}>
                  Client Name *
                  {autoFilledFields.has("client.clientName") && (
                    <span className="autofill-indicator">auto-filled</span>
                  )}
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.clientName}
                  onChange={(e) => {
                    onFieldManualEdit("client.clientName");
                    updateField("clientName", e.target.value);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    markTouched("clientName");
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onFocus={() => {
                    setShowSuggestions(true);
                    performSafetyFetch();
                  }}
                  placeholder="Client or company name"
                  className={cn(
                    inputClass(clientNameError, Boolean(value.clientName)),
                    getInputStateClass("client.clientName", value.clientName),
                  )}
                />

                {showSuggestions && (isLoading || effectiveClients.length > 0) && (
                  <div className="absolute left-0 right-0 z-[9999] mt-1 max-h-[200px] pb-20 overflow-y-auto border border-[color:var(--border-subtle)] bg-white p-1 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200" style={{ top: "100%" }}>
                    {isLoading ? (
                      <div className="px-3 py-4 text-center">
                        <span className="text-[12px] text-[color:var(--text-soft)] animate-pulse">Loading saved clients...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--border-subtle)] mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-soft)]">{filteredClients.length === 0 ? "No matches found" : "Saved Clients"}</span>
                        </div>
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[color:var(--color-lime-50)] transition-colors group"
                          >
                            <span className="text-[13px] font-semibold text-[color:var(--text-primary)] group-hover:text-[color:var(--color-lime-700)]">{client.client_name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-[color:var(--text-muted)]">
                              <span>{client.client_email}</span>
                              {client.city && <span>• {client.city}</span>}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
                {clientNameError && <p className={appFieldErrorTextClass}>{clientNameError}</p>}
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-1.5 mb-2 group">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">Client Location *</label>
                  <AppTooltip content={<>
  Domestic = Indian client (GST rules apply). International = foreign client (export rules, multi-currency).
</>} />
                </div>
                <ChoiceCards
                  name="client-location"
                  value={value.clientLocation}
                  onChange={(nextValue) => syncClientDetails({ ...value, clientLocation: nextValue as ClientDetails["clientLocation"], clientCountry: nextValue === "domestic" ? "" : value.clientCountry, clientState: nextValue === "international" ? "" : value.clientState })}
                  variant="minimal-segmented"
                  columns={2}
                  options={[
                    { value: "domestic", label: "Domestic" },
                    { value: "international", label: "International" },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className={appFieldLabelClass}>
                Client Email
                {autoFilledFields.has("client.clientEmail") && (
                  <span className="autofill-indicator">auto-filled</span>
                )}
              </label>
              <input
                suppressHydrationWarning
                type="email"
                value={value.clientEmail}
                onChange={(e) => {
                  onFieldManualEdit("client.clientEmail");
                  updateField("clientEmail", e.target.value);
                }}
                placeholder="Email address"
                className={cn(
                  inputClass(undefined, Boolean(value.clientEmail)),
                  getInputStateClass("client.clientEmail", value.clientEmail),
                )}
              />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!isInternational ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-10">
                {/* Section B: Tax Details (Domestic) */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
                      Tax Details
                    </h3>
                    <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
                  </div>

                  <div className="flex flex-wrap gap-6 items-end">
                    <div className="w-full max-w-[360px]">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 group">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">
                          {agency ? getClientTaxIdLabel(value, agency) : "Client GSTIN"}
                          {autoFilledFields.has("client.clientGstin") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <AppTooltip content={<>
  Client's 15-digit GST Identification Number. Optional for unregistered clients.
</>} />
                      </div>
                      <input
                        suppressHydrationWarning
                        type="text"
                        autoComplete="off"
                        value={value.clientGstin}
                        onChange={(e) => {
                          onFieldManualEdit("client.clientGstin");
                          updateField("clientGstin", e.target.value.toUpperCase().replace(/\s+/g, ""));
                        }}
                        onBlur={() => markTouched("clientGstin")}
                        placeholder={agency ? getClientTaxIdPlaceholder(value, agency) : "Client GSTIN"}
                        className={cn(
                          inputClass(clientGstinError, Boolean(value.clientGstin)),
                          getInputStateClass("client.clientGstin", value.clientGstin),
                        )}
                      />
                      {clientGstinError && <p className={appFieldErrorTextClass}>{clientGstinError}</p>}
                    </div>
                    <div className="pb-1.5">
                      <div className="flex items-center gap-3">
                        <AppSwitch checked={value.isClientSezUnit === "yes"} onChange={(checked) => updateField("isClientSezUnit", checked ? "yes" : "no")} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-[color:var(--text-primary)]">SEZ Unit</span>
                          <AppTooltip content={<>
                            Special Economic Zone. Supplies to SEZ units are treated as exports (Zero-rated supply under GST). IGST is applicable unless you provide a Letter of Undertaking (LUT).
                          </>} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section C: Client Address (Domestic) */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
                      Client Address
                    </h3>
                    <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
                  </div>

                  <div className="space-y-5">
                    <div className={appFieldFullWidthStackClass}>
                      <label className={appFieldLabelClass}>
                        Address Line 1 *
                        {autoFilledFields.has("client.clientAddressLine1") && (
                          <span className="autofill-indicator">auto-filled</span>
                        )}
                      </label>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={value.clientAddressLine1}
                        onChange={(e) => {
                          onFieldManualEdit("client.clientAddressLine1");
                          updateField("clientAddressLine1", e.target.value);
                        }}
                        onBlur={() => markTouched("clientAddress")}
                        placeholder="Building, street, or campus"
                        className={cn(
                          inputClass(clientAddressError, Boolean(value.clientAddressLine1)),
                          getInputStateClass("client.clientAddressLine1", value.clientAddressLine1),
                        )}
                      />
                    </div>
                    <div className={appFieldFullWidthStackClass}>
                      <label className={appFieldLabelClass}>
                        Address Line 2
                        {autoFilledFields.has("client.clientAddressLine2") && (
                          <span className="autofill-indicator">auto-filled</span>
                        )}
                      </label>
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={value.clientAddressLine2}
                        onChange={(e) => {
                          onFieldManualEdit("client.clientAddressLine2");
                          updateField("clientAddressLine2", e.target.value);
                        }}
                        placeholder="Optional additional address details"
                        className={cn(
                          inputClass(undefined, Boolean(value.clientAddressLine2)),
                          getInputStateClass("client.clientAddressLine2", value.clientAddressLine2),
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[9fr_7fr_4fr]">
                      <div className="min-w-0">
                        <label className={appFieldLabelClass}>
                          State {agency && isAgencyGstRegistered(agency) ? '*' : ''}
                          {autoFilledFields.has("client.clientState") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <AppSelectField
                          suppressHydrationWarning
                          value={value.clientState}
                          onChange={(e) => {
                            onFieldManualEdit("client.clientState");
                            updateField("clientState", e.target.value as any);
                          }}
                          onBlur={() => markTouched("clientState")}
                          hasError={clientStateError}
                          hasValue={Boolean(value.clientState)}
                          className={getInputStateClass("client.clientState", value.clientState)}
                        >
                          <option value="">State</option>
                          {INDIA_STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </AppSelectField>
                      </div>
                      <div className="min-w-0">
                        <label className={appFieldLabelClass}>
                          City
                          {autoFilledFields.has("client.clientCity") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={value.clientCity}
                          onChange={(e) => {
                            onFieldManualEdit("client.clientCity");
                            updateField("clientCity", e.target.value);
                          }}
                          placeholder="City"
                          className={cn(
                            inputClass(undefined, Boolean(value.clientCity)),
                            getInputStateClass("client.clientCity", value.clientCity),
                          )}
                        />
                      </div>
                      <div className="min-w-0 overflow-visible">
                        <label className={appFieldLabelClass}>
                          PIN
                          {autoFilledFields.has("client.clientPinCode") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={value.clientPinCode}
                          onChange={(e) => {
                            onFieldManualEdit("client.clientPinCode");
                            updateField("clientPinCode", e.target.value.replace(/\D/g, "").slice(0, 6));
                          }}
                          onBlur={() => markTouched("clientPinCode")}
                          placeholder="PIN"
                          className={cn(
                            inputClass(clientPinCodeError, Boolean(value.clientPinCode)),
                            getInputStateClass("client.clientPinCode", value.clientPinCode),
                            "w-full max-w-full"
                          )}
                        />
                        {clientPinCodeError && (
                          <p className={cn(appFieldErrorTextClass, "mt-1")}>{clientPinCodeError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {clientAddressError && <p className={appFieldErrorTextClass}>{clientAddressError}</p>}
                  {stateSignals.warning && (
                    <p className="mt-3 bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                      {stateSignals.warning}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-10">
                {/* Section B: Tax Details (International) */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
                      Tax Details
                    </h3>
                    <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="min-w-0">
                      <label className={appFieldLabelClass}>
                        Country *
                        {autoFilledFields.has("client.clientCountry") && (
                          <span className="autofill-indicator">auto-filled</span>
                        )}
                      </label>
                      <AppSelectField
                        suppressHydrationWarning
                        value={value.clientCountry}
                        onChange={(e) => {
                          onFieldManualEdit("client.clientCountry");
                          updateField("clientCountry", e.target.value as any);
                        }}
                        onBlur={() => markTouched("clientCountry")}
                        hasError={clientCountryError}
                        hasValue={Boolean(value.clientCountry)}
                        className={getInputStateClass("client.clientCountry", value.clientCountry)}
                      >
                        <option value="">Select country</option>
                        {INTERNATIONAL_COUNTRY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </AppSelectField>
                      {clientCountryError && <p className={appFieldErrorTextClass}>{clientCountryError}</p>}
                    </div>
                    <div className="min-w-0">
                      <label className={appFieldLabelClass}>
                        Currency
                        {autoFilledFields.has("client.clientCurrency") && (
                          <span className="autofill-indicator">auto-filled</span>
                        )}
                      </label>
                      <AppSelectField
                        suppressHydrationWarning
                        value={value.clientCurrency}
                        onChange={(e) => {
                          onFieldManualEdit("client.clientCurrency");
                          updateField("clientCurrency", e.target.value as any);
                        }}
                        hasValue={Boolean(value.clientCurrency)}
                        className={getInputStateClass("client.clientCurrency", value.clientCurrency)}
                      >
                        <option value="">Keep INR (default)</option>
                        {INTERNATIONAL_CURRENCY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </AppSelectField>
                    </div>
                  </div>
                </div>

                {/* Section C: Client Address (International) */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
                      Client Address
                    </h3>
                    <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className={appFieldLabelClass}>
                        Full Address *
                        {autoFilledFields.has("client.clientAddress") && (
                          <span className="autofill-indicator">auto-filled</span>
                        )}
                      </label>
                      <textarea
                        suppressHydrationWarning
                        rows={3}
                        value={value.clientAddress}
                        onChange={(e) => {
                          onFieldManualEdit("client.clientAddress");
                          updateField("clientAddress", e.target.value);
                        }}
                        onBlur={() => markTouched("clientAddress")}
                        placeholder="Full international billing address"
                        className={cn(
                          inputClass(clientAddressError, Boolean(value.clientAddress), true),
                          getInputStateClass("client.clientAddress", value.clientAddress),
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className={appFieldLabelClass}>
                          Postal Code
                          {autoFilledFields.has("client.clientPostalCode") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={value.clientPostalCode}
                          onChange={(e) => {
                            onFieldManualEdit("client.clientPostalCode");
                            updateField("clientPostalCode", e.target.value);
                          }}
                          placeholder="ZIP / Postal Code"
                          className={cn(
                            inputClass(undefined, Boolean(value.clientPostalCode)),
                            getInputStateClass("client.clientPostalCode", value.clientPostalCode),
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2 group">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">
                            {agency ? getClientTaxIdLabel(value, agency) : "Tax ID"}
                            {autoFilledFields.has("client.clientGstin") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <AppTooltip content={<>
  Client's 15-digit GST Identification Number. Optional for unregistered clients.
</>} />
                        </div>
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={value.clientGstin}
                          onChange={(e) => {
                            onFieldManualEdit("client.clientGstin");
                            updateField("clientGstin", e.target.value);
                          }}
                          placeholder={agency ? getClientTaxIdPlaceholder(value, agency) : "VAT / Tax ID"}
                          className={cn(
                            inputClass(clientGstinError, Boolean(value.clientGstin)),
                            getInputStateClass("client.clientGstin", value.clientGstin),
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  {clientAddressError && <p className={appFieldErrorTextClass}>{clientAddressError}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 space-y-0">
        {/* ─── Section Header ─── */}
        <div
          className={cn(
            "flex justify-between items-start w-full p-4 border border-[color:var(--border-subtle)] bg-white hover:bg-[color:var(--bg-surface-soft)] transition-colors text-left group cursor-pointer"
          )}
          onClick={() => {
            setIsMsaOpen(!isMsaOpen);
            setHasInteractedWithMSA(true);
          }}
        >
          <div className="flex flex-col flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[color:var(--text-primary)] font-semibold text-[15px]">Client Specific Payment &amp; Legal Terms</span>
              <AppTooltip content={
                <div className="space-y-2">
                  <p><strong>Master Service Agreement (MSA).</strong> The foundational legal contract that governs payment deadlines, late fees, IP ownership, and licensing for your engagement with this client.</p>
                  <p className="font-semibold text-[10px] text-[#FF5C00]">These defaults can be overridden per-project via a Project Addendum attached to the invoice.</p>
                  <div className="flex flex-col gap-1.5 mt-2 border-t border-[#111118]/20 pt-2">
                    <a href="/profile" className="text-[#4F46E5] font-semibold hover:underline flex items-center gap-1">→ Edit Global Defaults (Profile)</a>
                    <a href="/clients" className="text-[#4F46E5] font-semibold hover:underline flex items-center gap-1">→ Edit Client-Specific Terms</a>
                  </div>
                </div>
              } />
            </div>
            {/* Always-visible summary row */}
            <p className="text-[12px] text-[color:var(--text-muted)] mt-1.5 font-normal leading-relaxed">
              {[
                value.msaPaymentTermsDays ? `Net ${value.msaPaymentTermsDays}` : null,
                value.msaLateFeeRate ? `${value.msaLateFeeRate}% ${value.msaLateFeeUnit || "monthly"} late fee` : null,
                value.msaIpTriggerType === "upon_full_payment" ? "IP on payment" : value.msaIpTriggerType === "upon_delivery" ? "IP on delivery" : value.msaIpTriggerType === "upon_signing" ? "IP on signing" : value.msaIpTriggerType === "retained_by_creator" ? "IP retained" : value.msaIpTriggerType === "proportional_transfer" ? "Proportional IP" : null,
                value.msaJurisdictionCity ? `${value.msaJurisdictionCity}` : null,
                value.msaLicenseType ? value.msaLicenseType.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : null,
              ].filter(Boolean).join(" · ") || "No terms configured — expand to set up"}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateContract();
              }}
              className="inline-flex items-center gap-1.5 bg-[#4F46E5]/5 border border-[#4F46E5]/20 px-3 py-1.5 text-[11px] font-semibold text-[#4F46E5] hover:bg-[#4F46E5]/10 transition-colors shrink-0 rounded-md"
              title="Auto-generate legal clause text from your settings below"
            >
              ✨ Generate Clause
            </button>
            <ChevronDownIcon 
              className={cn(
                "h-5 w-5 transition-transform duration-300 ease-[var(--app-ease-standard)] text-[color:var(--text-muted)] group-hover:text-[color:var(--text-secondary)]", 
                isMsaOpen && "rotate-180"
              )} 
            />
          </div>
        </div>

        <AnimatePresence>
          {isMsaOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border border-t-0 border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)] p-5 space-y-6">
                {/* ── Group 1: Payment ── */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-3 flex items-center gap-1.5">
                    <span>💰</span> Payment
                  </h4>
                  <div className="flex flex-wrap gap-6">
                    {/* Payment Terms */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[13px] font-medium text-[color:var(--text-primary)]">Payment terms</label>
                        <AppTooltip content={<>
                          <strong>Net payment days.</strong> The number of calendar days the client has to pay after the invoice issue date. Common values: Net 15, Net 30, Net 45. If the client doesn&apos;t pay within this window, the late fee kicks in.
                        </>} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={value.msaPaymentTermsDays || ""}
                          onChange={(e) => updateField("msaPaymentTermsDays", parseInt(e.target.value) || 0)}
                          placeholder="e.g. 20"
                          className={cn(inputClass(undefined, Boolean(value.msaPaymentTermsDays)), "h-9 text-[13px] !w-20 min-w-0")}
                        />
                        <span className="text-[12px] text-[color:var(--text-muted)] shrink-0">days</span>
                      </div>
                    </div>

                    {/* Late Fee */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[13px] font-medium text-[color:var(--text-primary)]">Late fee</label>
                        <AppTooltip content={<>
                          <strong>Overdue penalty rate.</strong> Interest charged on unpaid invoices past the payment deadline. Industry standard is 1.5% monthly. This clause discourages late payments and protects your cash flow.
                        </>} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={value.msaLateFeeRate || ""}
                          onChange={(e) => updateField("msaLateFeeRate", parseFloat(e.target.value) || 0)}
                          placeholder="1.5"
                          className={cn(inputClass(undefined, Boolean(value.msaLateFeeRate)), "h-9 text-[13px] !w-16 min-w-0")}
                        />
                        <span className="text-[12px] text-[color:var(--text-muted)] shrink-0">%</span>
                        <AppSelectField
                          value={value.msaLateFeeUnit || "monthly"}
                          onChange={(e) => updateField("msaLateFeeUnit", e.target.value as any)}
                          hasValue={true}
                          className="h-9 text-[12px] min-w-[100px]"
                        >
                          <option value="monthly">monthly</option>
                          <option value="annually">annually</option>
                          <option value="daily">daily</option>
                        </AppSelectField>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Group 2: Legal ── */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-3 flex items-center gap-1.5">
                    <span>⚖️</span> Legal &amp; IP
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* IP Transfer */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[13px] font-medium text-[color:var(--text-primary)]">IP Transfer</label>
                        <AppTooltip content={<>
                          <strong>Intellectual Property transfer trigger.</strong> Determines when ownership of the work (designs, code, content) passes to the client. &quot;Upon Full Payment&quot; is the safest option — it protects you if the client doesn&apos;t pay.
                        </>} />
                      </div>
                      <AppSelectField
                        value={value.msaIpTriggerType || "upon_full_payment"}
                        onChange={(e) => updateField("msaIpTriggerType", e.target.value as any)}
                        hasValue={true}
                        className="h-9 text-[13px] w-full min-w-0"
                      >
                        <option value="upon_full_payment">Upon Full Payment</option>
                        <option value="upon_delivery">Upon Delivery</option>
                        <option value="upon_signing">Upon Signing</option>
                        <option value="proportional_transfer">Proportional Transfer</option>
                        <option value="retained_by_creator">Retained by Creator</option>
                      </AppSelectField>
                    </div>

                    {/* Jurisdiction */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[13px] font-medium text-[color:var(--text-primary)]">Jurisdiction</label>
                        <AppTooltip content={<>
                          <strong>Dispute resolution city.</strong> If a legal dispute arises, this is the city whose courts will have authority. Usually set to your own city for convenience.
                        </>} />
                      </div>
                      <input
                        type="text"
                        value={value.msaJurisdictionCity || ""}
                        onChange={(e) => updateField("msaJurisdictionCity", e.target.value)}
                        placeholder="e.g. Bangalore"
                        className={cn(inputClass(undefined, Boolean(value.msaJurisdictionCity)), "h-9 text-[13px] w-full min-w-0 max-w-[200px]")}
                      />
                    </div>

                    {/* License Type */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-[13px] font-medium text-[color:var(--text-primary)]">License Type</label>
                        <AppTooltip content={<>
                          <strong>Client rights model.</strong> &quot;Full Assignment&quot; = client owns everything outright. &quot;Exclusive License&quot; = client gets sole usage rights but you retain ownership. &quot;Non-Exclusive&quot; = you can reuse/resell the work.
                        </>} />
                      </div>
                      <AppSelectField
                        value={value.msaLicenseType || ""}
                        onChange={(e) => updateField("msaLicenseType", e.target.value as any)}
                        hasValue={Boolean(value.msaLicenseType)}
                        className="h-9 text-[13px] w-full min-w-0"
                      >
                        <option value="">Select license…</option>
                        <option value="full-assignment">Full Assignment</option>
                        <option value="exclusive-license">Exclusive License</option>
                        <option value="non-exclusive-license">Non-Exclusive License</option>
                      </AppSelectField>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Section B: Generated MSA (only shown when text exists) ─── */}
              <AnimatePresence>
                {value.msaNotesBoilerplate && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 bg-[color:var(--bg-surface-muted)] p-5 ring-1 ring-inset ring-[color:var(--border-subtle)]">
                      <div className="mb-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-secondary)]">
                          Generated MSA
                        </h3>
                        <div className="mt-1.5 h-[1px] w-full bg-[color:var(--border-subtle)]" />
                      </div>
                      <textarea
                        suppressHydrationWarning
                        value={value.msaNotesBoilerplate || ""}
                        onChange={(e) => updateField("msaNotesBoilerplate", e.target.value)}
                        placeholder="Enter project-specific terms that override your default MSA..."
                        className={cn(inputClass(undefined, Boolean(value.msaNotesBoilerplate), true), "resize-y")}
                        style={{ minHeight: 120, maxHeight: 300 }}
                      />
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            const ipLabels: Record<string, string> = { upon_full_payment: "upon receipt of full payment", upon_delivery: "upon delivery of materials", work_for_hire: "as a work-for-hire" };
                            const ipLabel = ipLabels[value.msaIpTriggerType || "upon_full_payment"];
                            const unitLabels: Record<string, string> = { monthly: "per month", annually: "per annum", daily: "per day" };
                            const unitLabel = unitLabels[value.msaLateFeeUnit || "monthly"];
                            const licenseLabels: Record<string, string> = { "full-assignment": "full assignment", "exclusive-license": "exclusive license", "non-exclusive-license": "non-exclusive license" };
                            const licenseLabel = value.msaLicenseType ? licenseLabels[value.msaLicenseType] : "assignment";
                            const template = `Payment is due within ${value.msaPaymentTermsDays ?? 20} days. A late fee of ${value.msaLateFeeRate ?? 1.5}% ${unitLabel} applies to overdue balances. Intellectual Property rights transfer to the client as a ${licenseLabel} ${ipLabel}. Jurisdiction is ${value.msaJurisdictionCity || "Bengaluru"}.`;
                            updateField("msaNotesBoilerplate", template);
                          }}
                          className="text-[11px] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
                        >
                          Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField("msaNotesBoilerplate", "")}
                          className="text-[11px] font-semibold text-[#FF5C00] hover:text-[#FF5C00] transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
