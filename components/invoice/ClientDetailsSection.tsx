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
  };
  showAllErrors?: boolean;
  savedClients?: SavedClient[];
  onClientSelect?: (client: SavedClient) => void;
  agency?: AgencyDetails;
  isNew?: boolean;
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
}: ClientDetailsSectionProps) {
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

  return (
    <section className={cn(embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : getAppPanelClass())}>
      {!embedded && (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Client</h2>
          <p className={appSectionDescriptionClass}>Details of the person or company paying you.</p>
        </div>
      )}

      <div className={appFieldFullWidthStackClass}>
        <div className="grid grid-cols-1 gap-4 md:items-end lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative">
            <label className={appFieldLabelClass}>Client Name *</label>
            <input
              suppressHydrationWarning
              type="text"
              value={value.clientName}
              onChange={(e) => {
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
              className={inputClass(clientNameError, Boolean(value.clientName))}
            />

            {showSuggestions && (isLoading || effectiveClients.length > 0) && (
              <div className="absolute left-0 right-0 z-[9999] mt-1 max-h-64 overflow-auto rounded-xl border border-[color:var(--border-subtle)] bg-white p-1 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200" style={{ top: "100%" }}>
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
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-[color:var(--color-lime-50)] transition-colors group"
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

          <div>
            <label className={appFieldLabelClass}>Client Location *</label>
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

        <AnimatePresence initial={false}>
          {!isInternational && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-6">
                <div className={appFieldPairGridClass}>
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>{agency ? getClientTaxIdLabel(value, agency) : "Client GSTIN"}</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={value.clientGstin}
                      onChange={(e) => updateField("clientGstin", e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      onBlur={() => markTouched("clientGstin")}
                      placeholder={agency ? getClientTaxIdPlaceholder(value, agency) : "Client GSTIN"}
                      className={inputClass(clientGstinError, Boolean(value.clientGstin))}
                    />
                    {clientGstinError && <p className={appFieldErrorTextClass}>{clientGstinError}</p>}
                  </div>
                  <div className="flex flex-col justify-end pb-1.5">
                    <div className="flex items-center gap-3">
                      <AppSwitch checked={value.isClientSezUnit === "yes"} onChange={(checked) => updateField("isClientSezUnit", checked ? "yes" : "no")} />
                      <div className="space-y-0.5">
                        <span className="text-[13px] font-semibold text-[color:var(--text-primary)]">SEZ Unit</span>
                        <p className="text-[11px] text-[color:var(--text-muted)]">Affects GST treatment</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={appFieldLabelClass}>Client Email</label>
                  <input
                    suppressHydrationWarning
                    type="email"
                    value={value.clientEmail}
                    onChange={(e) => updateField("clientEmail", e.target.value)}
                    placeholder="Email address"
                    className={inputClass(undefined, Boolean(value.clientEmail))}
                  />
                </div>

                <div className="space-y-4">
                  <div className={appFieldFullWidthStackClass}>
                    <label className={appFieldLabelClass}>Address Line 1 *</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={value.clientAddressLine1}
                      onChange={(e) => updateField("clientAddressLine1", e.target.value)}
                      onBlur={() => markTouched("clientAddress")}
                      placeholder="Building, street, or campus"
                      className={inputClass(clientAddressError, Boolean(value.clientAddressLine1))}
                    />
                  </div>
                  <div className={appFieldFullWidthStackClass}>
                    <label className={appFieldLabelClass}>Address Line 2</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={value.clientAddressLine2}
                      onChange={(e) => updateField("clientAddressLine2", e.target.value)}
                      placeholder="Optional additional address details"
                      className={inputClass(undefined, Boolean(value.clientAddressLine2))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="min-w-0">
                      <label className={appFieldLabelClass}>State *</label>
                      <AppSelectField suppressHydrationWarning value={value.clientState} onChange={(e) => updateField("clientState", e.target.value as any)} onBlur={() => markTouched("clientState")} hasError={clientStateError} hasValue={Boolean(value.clientState)}>
                        <option value="">Select state</option>
                        {INDIA_STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </AppSelectField>
                    </div>
                    <div className="min-w-0">
                      <label className={appFieldLabelClass}>City</label>
                      <input suppressHydrationWarning type="text" value={value.clientCity} onChange={(e) => updateField("clientCity", e.target.value)} placeholder="City" className={inputClass(undefined, Boolean(value.clientCity))} />
                    </div>
                    <div className="min-w-0">
                      <label className={appFieldLabelClass}>PIN Code</label>
                      <input suppressHydrationWarning type="text" value={value.clientPinCode} onChange={(e) => updateField("clientPinCode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN" className={inputClass(undefined, Boolean(value.clientPinCode))} />
                    </div>
                  </div>
                </div>
                {clientAddressError && <p className={appFieldErrorTextClass}>{clientAddressError}</p>}
                {stateSignals.warning && (
                  <p className="rounded-xl bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                    {stateSignals.warning}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isInternational && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-6">
                <div className={appFieldPairGridClass}>
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>Country *</label>
                    <AppSelectField suppressHydrationWarning value={value.clientCountry} onChange={(e) => updateField("clientCountry", e.target.value as any)} onBlur={() => markTouched("clientCountry")} hasError={clientCountryError} hasValue={Boolean(value.clientCountry)}>
                      <option value="">Select country</option>
                      {INTERNATIONAL_COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </AppSelectField>
                    {clientCountryError && <p className={appFieldErrorTextClass}>{clientCountryError}</p>}
                  </div>
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>Currency</label>
                    <AppSelectField suppressHydrationWarning value={value.clientCurrency} onChange={(e) => updateField("clientCurrency", e.target.value as any)} hasValue={Boolean(value.clientCurrency)}>
                      <option value="">Keep INR (default)</option>
                      {INTERNATIONAL_CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </AppSelectField>
                  </div>
                </div>

                <div>
                  <label className={appFieldLabelClass}>Full Address *</label>
                  <textarea suppressHydrationWarning rows={3} value={value.clientAddress} onChange={(e) => updateField("clientAddress", e.target.value)} onBlur={() => markTouched("clientAddress")} placeholder="Full international billing address" className={inputClass(clientAddressError, Boolean(value.clientAddress), true)} />
                </div>

                <div className={appFieldPairGridClass}>
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>Postal Code</label>
                    <input suppressHydrationWarning type="text" value={value.clientPostalCode} onChange={(e) => updateField("clientPostalCode", e.target.value)} placeholder="ZIP" className={inputClass(undefined, Boolean(value.clientPostalCode))} />
                  </div>
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>{agency ? getClientTaxIdLabel(value, agency) : "Tax ID"}</label>
                    <input suppressHydrationWarning type="text" value={value.clientGstin} onChange={(e) => updateField("clientGstin", e.target.value)} placeholder={agency ? getClientTaxIdPlaceholder(value, agency) : "VAT / ID"} className={inputClass(clientGstinError, Boolean(value.clientGstin))} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 space-y-4">
        {isNew && !hasInteractedWithMSA ? (
          <div className="relative overflow-hidden rounded-lg p-[2px]">
            <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,var(--color-lime-300)_50%,transparent_100%)]" />
            <div className="relative h-full w-full rounded-md bg-white">
              <button
                type="button"
                onClick={() => {
                  setIsMsaOpen(!isMsaOpen);
                  setHasInteractedWithMSA(true);
                }}
                className={cn(
                  "flex justify-between items-center w-full p-4 border border-transparent rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer text-left group"
                )}
              >
                <div className="flex flex-col flex-1 pr-4">
                  <span className="text-gray-900 font-medium">Default Contract & Payment Terms</span>
                  <p className="text-sm text-gray-500 mt-1 font-normal">
                    Set late fees, payment and legal terms, this will be added to MSA for this particular Client in Client master .
                  </p>
                </div>
                <ChevronDownIcon 
                  className={cn(
                    "h-5 w-5 transition-transform duration-300 ease-[var(--app-ease-standard)] text-gray-400 group-hover:text-gray-600", 
                    isMsaOpen && "rotate-180"
                  )} 
                />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsMsaOpen(!isMsaOpen);
              setHasInteractedWithMSA(true);
            }}
            className={cn(
              "flex justify-between items-center w-full p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-left group"
            )}
          >
            <div className="flex flex-col flex-1 pr-4">
              <span className="text-gray-900 font-medium">Default Contract & Payment Terms</span>
              <p className="text-sm text-gray-500 mt-1 font-normal">
                Set late fees, payment and legal terms, this will be added to MSA for this particular Client in Client master .
              </p>
            </div>
            <ChevronDownIcon 
              className={cn(
                "h-5 w-5 transition-transform duration-300 ease-[var(--app-ease-standard)] text-gray-400 group-hover:text-gray-600", 
                isMsaOpen && "rotate-180"
              )} 
            />
          </button>
        )}

        <AnimatePresence>
          {isMsaOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-l-2 border-l-[#bfff00] ml-1 pl-4"
            >
              <p className="text-sm text-[color:var(--text-muted)] mb-4 leading-relaxed">
                Set the baseline rules for this client. Lance will enforce these globally unless overridden by project-specific terms.
              </p>
              <div className="grid grid-cols-1 gap-4 rounded-xl bg-[color:var(--bg-surface-muted)] p-4 ring-1 ring-inset ring-[color:var(--border-subtle)] sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className={appFieldLabelClass}>Payment Terms (Days)</label>
                    <input type="number" value={value.msaPaymentTermsDays || ""} onChange={(e) => updateField("msaPaymentTermsDays", parseInt(e.target.value) || 0)} className={inputClass(undefined, Boolean(value.msaPaymentTermsDays))} />
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Late Fee Rate (%)</label>
                    <div className="flex items-center gap-3">
                      <input type="number" step="0.1" value={value.msaLateFeeRate || ""} onChange={(e) => updateField("msaLateFeeRate", parseFloat(e.target.value) || 0)} className={inputClass(undefined, Boolean(value.msaLateFeeRate))} />
                      <AppSelectField value={value.msaLateFeeUnit || "monthly"} onChange={(e) => updateField("msaLateFeeUnit", e.target.value as any)} hasValue={true}>
                        <option value="monthly">per month</option>
                        <option value="annually">per annum</option>
                        <option value="daily">per day</option>
                      </AppSelectField>
                    </div>
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Jurisdiction (City)</label>
                    <input type="text" value={value.msaJurisdictionCity || ""} onChange={(e) => updateField("msaJurisdictionCity", e.target.value)} placeholder="e.g. Bengaluru" className={inputClass(undefined, Boolean(value.msaJurisdictionCity))} />
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Default License Type</label>
                    <AppSelectField value={value.msaLicenseType || ""} onChange={(e) => updateField("msaLicenseType", e.target.value as any)} hasValue={Boolean(value.msaLicenseType)}>
                      <option value="">Select license...</option>
                      <option value="full-assignment">Full Assignment</option>
                      <option value="exclusive-license">Exclusive License</option>
                      <option value="non-exclusive-license">Non-Exclusive License</option>
                    </AppSelectField>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={appFieldLabelClass}>IP Trigger Type</label>
                    <AppSelectField value={value.msaIpTriggerType || "upon_full_payment"} onChange={(e) => updateField("msaIpTriggerType", e.target.value as any)} hasValue={true}>
                      <option value="upon_full_payment">Upon Full Payment</option>
                      <option value="upon_delivery">Upon Delivery</option>
                      <option value="work_for_hire">Work for Hire</option>
                    </AppSelectField>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className={appFieldLabelClass}>MSA Boilerplate / Notes</label>
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
                        className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-lime-600)] hover:text-[color:var(--color-lime-700)]"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <textarea suppressHydrationWarning rows={10} value={value.msaNotesBoilerplate || ""} onChange={(e) => updateField("msaNotesBoilerplate", e.target.value)} placeholder="Terms specific to this client..." className={inputClass(undefined, Boolean(value.msaNotesBoilerplate), true)} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
