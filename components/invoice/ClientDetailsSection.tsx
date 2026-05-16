"use client";

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
    const template = `Payment is due within ${value.msaPaymentTermsDays ?? 20} days. A late fee of ${value.msaLateFeeRate ?? 1.5}% ${unitLabel} applies to overdue balances. Intellectual Property rights transfer to the client as a ${licenseLabel} ${ipLabel}. Jurisdiction is ${value.msaJurisdictionCity || "Bengaluru"}.`;
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
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">Client Location *</label>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                    title="Domestic = Indian client (GST rules apply). International = foreign client (export rules, multi-currency)."
                  >
                    ?
                  </span>
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
                      <div className="flex items-center gap-1.5 mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">
                          {agency ? getClientTaxIdLabel(value, agency) : "Client GSTIN"}
                          {autoFilledFields.has("client.clientGstin") && (
                            <span className="autofill-indicator">auto-filled</span>
                          )}
                        </label>
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                          title="Client's 15-digit GST Identification Number. Optional for unregistered clients."
                        >
                          ?
                        </span>
                      </div>
                      <input
                        suppressHydrationWarning
                        type="text"
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
                        <div className="space-y-0.5">
                          <span className="text-[13px] font-semibold text-[color:var(--text-primary)]">SEZ Unit</span>
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
                        <div className="flex items-center gap-1.5 mb-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)] m-0 p-0 block">
                            {agency ? getClientTaxIdLabel(value, agency) : "Tax ID"}
                            {autoFilledFields.has("client.clientGstin") && (
                              <span className="autofill-indicator">auto-filled</span>
                            )}
                          </label>
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[10px] text-gray-400 cursor-help shrink-0"
                            title="Client's 15-digit GST Identification Number. Optional for unregistered clients."
                          >
                            ?
                          </span>
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

      <div className="mt-8 space-y-4">
        <div
          className={cn(
            "flex justify-between items-center w-full p-4 border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left group"
          )}
        >
          <div className="flex flex-col flex-1 pr-4">
            <span className="text-gray-900 font-medium">Default Contract & Payment Terms</span>
            <p className="text-sm text-gray-500 mt-1 font-normal">
              Set payment terms and legal conditions...
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateContract();
              }}
              className="inline-flex items-center gap-2 bg-[color:var(--bg-surface-muted)] px-3 py-1.5 text-[12px] font-semibold text-[#4F46E5] hover:bg-[#4F46E5]/10 transition-colors shrink-0"
            >
              ✨ Generate
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMsaOpen(!isMsaOpen);
                setHasInteractedWithMSA(true);
              }}
              className="p-1"
            >
              <ChevronDownIcon 
                className={cn(
                  "h-5 w-5 transition-transform duration-300 ease-[var(--app-ease-standard)] text-gray-400 group-hover:text-gray-600", 
                  isMsaOpen && "rotate-180"
                )} 
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMsaOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden ml-1 pl-4"
            >
              {/* Compact Contract Terms Grid */}
              <div className="rounded-xl bg-[color:var(--bg-surface-muted)] p-5 ring-1 ring-inset ring-[color:var(--border-subtle)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  {/* Payment Terms */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[13px] font-medium text-[color:var(--text-primary)]">Payment terms</label>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[10px] text-[color:var(--text-muted)] cursor-help" title="Days until payment is due after invoice date">?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={value.msaPaymentTermsDays || ""}
                        onChange={(e) => updateField("msaPaymentTermsDays", parseInt(e.target.value) || 0)}
                        className={cn(inputClass(undefined, Boolean(value.msaPaymentTermsDays)), "h-9 text-[13px] max-w-[80px]")}
                      />
                      <span className="text-[12px] text-[color:var(--text-muted)]">days</span>
                    </div>
                  </div>

                  {/* Late Fee */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[13px] font-medium text-[color:var(--text-primary)]">Late fee</label>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[10px] text-[color:var(--text-muted)] cursor-help" title="Penalty charged on overdue payments">?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={value.msaLateFeeRate || ""}
                        onChange={(e) => updateField("msaLateFeeRate", parseFloat(e.target.value) || 0)}
                        className={cn(inputClass(undefined, Boolean(value.msaLateFeeRate)), "h-9 text-[13px] max-w-[60px]")}
                      />
                      <AppSelectField
                        value={value.msaLateFeeUnit || "monthly"}
                        onChange={(e) => updateField("msaLateFeeUnit", e.target.value as any)}
                        hasValue={true}
                        className="h-9 text-[12px] min-w-[90px]"
                      >
                        <option value="monthly">monthly</option>
                        <option value="annually">annually</option>
                        <option value="daily">daily</option>
                      </AppSelectField>
                    </div>
                  </div>

                  {/* IP Transfer */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[13px] font-medium text-[color:var(--text-primary)]">IP Transfer</label>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[10px] text-[color:var(--text-muted)] cursor-help" title="When does IP ownership transfer to client?">?</span>
                    </div>
                    <AppSelectField
                      value={value.msaIpTriggerType || "upon_full_payment"}
                      onChange={(e) => updateField("msaIpTriggerType", e.target.value as any)}
                      hasValue={true}
                      className="h-9 text-[13px]"
                    >
                      <option value="upon_full_payment">Upon Full Payment</option>
                      <option value="upon_delivery">Upon Delivery</option>
                      <option value="work_for_hire">Work for Hire</option>
                    </AppSelectField>
                  </div>

                  {/* Jurisdiction */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[13px] font-medium text-[color:var(--text-primary)]">Jurisdiction</label>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[10px] text-[color:var(--text-muted)] cursor-help" title="City for dispute resolution">?</span>
                    </div>
                    <input
                      type="text"
                      value={value.msaJurisdictionCity || ""}
                      onChange={(e) => updateField("msaJurisdictionCity", e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className={cn(inputClass(undefined, Boolean(value.msaJurisdictionCity)), "h-9 text-[13px]")}
                    />
                  </div>

                  {/* License Type */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[13px] font-medium text-[color:var(--text-primary)]">License Type</label>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[10px] text-[color:var(--text-muted)] cursor-help" title="What rights does the client receive?">?</span>
                    </div>
                    <AppSelectField
                      value={value.msaLicenseType || ""}
                      onChange={(e) => updateField("msaLicenseType", e.target.value as any)}
                      hasValue={Boolean(value.msaLicenseType)}
                      className="h-9 text-[13px]"
                    >
                      <option value="">Select license…</option>
                      <option value="full-assignment">Full Assignment</option>
                      <option value="exclusive-license">Exclusive License</option>
                      <option value="non-exclusive-license">Non-Exclusive License</option>
                    </AppSelectField>
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
                          className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors"
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
