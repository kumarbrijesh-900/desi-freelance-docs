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
  appFieldTripleCompactGridClass,
} from "@/lib/form-foundation";
import {
  getClientTaxIdLabel,
  getClientTaxIdPlaceholder,
} from "@/lib/invoice-compliance";
import type { AgencyDetails } from "@/types/invoice";
import {
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
}

export default function ClientDetailsSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
  savedClients,
  onClientSelect,
  agency,
}: ClientDetailsSectionProps) {
  const isInternational = value.clientLocation === "international";
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isMsaOpen, setIsMsaOpen] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalClients, setInternalClients] = useState<SavedClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use provided clients or fetch them if needed
  const effectiveClients =
    savedClients && savedClients.length > 0 ? savedClients : internalClients;

  // Fetch clients if none were passed in (fallback)
  const performSafetyFetch = async () => {
    if (effectiveClients.length === 0 && !isLoading) {
      setIsLoading(true);
      const { data, error } = await listClients();
      setIsLoading(false);

      if (error) {
        console.error(error);
      }
      if (data) {
        setInternalClients(data);
      }
    }
  };

  useEffect(() => {
    performSafetyFetch();
  }, [savedClients]);

  const filteredClients = effectiveClients.filter((c) =>
    c.client_name.toLowerCase().includes(value.clientName.toLowerCase()),
  );

  const handleSelectClient = (client: SavedClient) => {
    const details = savedClientToClientDetails(client);
    onChange(details);
    setShowSuggestions(false);
    if (onClientSelect) {
      onClientSelect(client);
    }
  };

  const syncClientDetails = (nextValue: ClientDetails) => {
    if (nextValue.clientLocation === "international") {
      onChange(nextValue);
      return;
    }

    const gstinInfo = parseGstin(nextValue.clientGstin);
    const pinInference = inferIndianLocationFromPinCode(
      nextValue.clientPinCode,
    );
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
  const gstinInfo = parseGstin(value.clientGstin);
  const stateSignals = evaluateStateSignals({
    manualState: value.clientState,
    city: value.clientCity,
    pinCode: value.clientPinCode,
    gstinState: gstinInfo.state,
    label: "Client state",
  });
  const sezSuggestion = !isInternational
    ? suggestSezCampus(
        [
          value.clientName,
          value.clientAddressLine1,
          value.clientAddressLine2,
          value.clientCity,
        ]
          .filter(Boolean)
          .join(", "),
      )
    : null;
  const clientNameError = getVisibleError("clientName", errors?.clientName);
  const clientAddressError = getVisibleError(
    "clientAddress",
    errors?.clientAddress,
  );
  const clientStateError = getVisibleError("clientState", errors?.clientState);
  const clientCountryError = getVisibleError(
    "clientCountry",
    errors?.clientCountry,
  );
  const clientGstinError = getVisibleError("clientGstin", errors?.clientGstin);

  return (
    <section
      className={cn(
        "overflow-visible",
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass(),
      )}
    >
      <AnimatePresence mode="wait">
        {value.clientName && !isEditingClient ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center justify-between rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]/50 p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Client
                </span>
                {isInternational && (
                  <span className="rounded-full bg-[color:var(--bg-surface-muted)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-[color:var(--text-secondary)] ring-1 ring-inset ring-[color:var(--border-subtle)]">
                    International
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-bold tracking-tight text-[color:var(--text-primary)]">
                {value.clientName}
              </h3>
              <p className="text-[12px] font-medium text-[color:var(--text-secondary)]">
                {[value.clientCity, value.clientState, value.clientCountry]
                  .filter(Boolean)
                  .join(", ")}
                {value.clientGstin ? ` • GSTIN: ${value.clientGstin}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingClient(true)}
              className="group flex h-9 w-9 items-center justify-center rounded-full bg-white text-[color:var(--text-muted)] shadow-sm ring-1 ring-[color:var(--border-subtle)] transition-all hover:text-[color:var(--text-primary)] hover:ring-[color:var(--border-strong)]"
            >
              <PencilIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={appFieldFullWidthStackClass}
          >
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
                // Delay hiding suggestions so click can register
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onFocus={() => {
                setShowSuggestions(true);
                performSafetyFetch();
              }}
              placeholder="Client or company name"
              className={inputClass(clientNameError, Boolean(value.clientName))}
            />

            {/* Suggestion Tray */}
            {showSuggestions && (isLoading || effectiveClients.length > 0) && (
              <div
                className="absolute left-0 right-0 z-[9999] mt-1 max-h-64 overflow-auto rounded-xl border border-[color:var(--border-subtle)] bg-white p-1 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200"
                style={{ top: "100%" }}
              >
                {isLoading ? (
                  <div className="px-3 py-4 text-center">
                    <span className="text-[12px] text-[color:var(--text-soft)] animate-pulse">
                      Loading saved clients...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--border-subtle)] mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-soft)]">
                        {filteredClients.length === 0
                          ? "No matches found"
                          : "Saved Clients"}
                      </span>
                      <span className="text-[10px] font-medium text-[color:var(--color-lime-600)]">
                        {effectiveClients.length} in directory
                      </span>
                    </div>
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-[color:var(--color-lime-50)] transition-colors group"
                      >
                        <span className="text-[13px] font-semibold text-[color:var(--text-primary)] group-hover:text-[color:var(--color-lime-700)]">
                          {client.client_name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[color:var(--text-muted)]">
                          <span>{client.client_email}</span>
                          {client.city && <span>• {client.city}</span>}
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="px-3 py-4 text-center">
                        <p className="text-[12px] text-[color:var(--text-soft)]">
                          No clients match your search.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {clientNameError ? (
              <p className={appFieldErrorTextClass}>{clientNameError}</p>
            ) : null}
          </div>

          <div>
            <label className={appFieldLabelClass}>Client Location *</label>
            <ChoiceCards
              name="client-location"
              value={value.clientLocation}
              onChange={(nextValue) =>
                syncClientDetails({
                  ...value,
                  clientLocation: nextValue,
                  clientCountry:
                    nextValue === "domestic" ? "" : value.clientCountry,
                  clientState:
                    nextValue === "international" ? "" : value.clientState,
                })
              }
              variant="segmented"
              columns={2}
              options={[
                {
                  value: "domestic",
                  label: "Domestic",
                },
                {
                  value: "international",
                  label: "International",
                },
              ]}
            />
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!isInternational ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-4">
              <div className={appFieldPairGridClass}>
                <div className="min-w-0">
                  <label className={appFieldLabelClass}>
                    {agency
                      ? getClientTaxIdLabel(value, agency)
                      : "Client GSTIN"}
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.clientGstin}
                    onChange={(e) =>
                      updateField(
                        "clientGstin",
                        e.target.value.toUpperCase().replace(/\s+/g, ""),
                      )
                    }
                    onBlur={() => markTouched("clientGstin")}
                    placeholder={
                      agency
                        ? getClientTaxIdPlaceholder(value, agency)
                        : "Client GSTIN"
                    }
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={inputClass(
                      clientGstinError,
                      Boolean(value.clientGstin),
                    )}
                  />
                  {clientGstinError ? (
                    <p className={appFieldErrorTextClass}>{clientGstinError}</p>
                  ) : gstinInfo.state ? (
                    <p className={appFieldHelperTextClass}>
                      GSTIN state code maps to {gstinInfo.state}.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col justify-end pb-1.5">
                  <div className="flex items-center gap-3">
                    <AppSwitch
                      checked={value.isClientSezUnit === "yes"}
                      onChange={(checked) =>
                        updateField("isClientSezUnit", checked ? "yes" : "no")
                      }
                    />
                    <div className="space-y-0.5">
                      <span className="text-[13px] font-semibold text-[color:var(--text-primary)]">
                        SEZ Unit
                      </span>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        This affects GST treatment for SEZ supplies
                      </p>
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
                  className={inputClass(
                    undefined,
                    Boolean(value.clientEmail),
                  )}
                />
              </div>
                {sezSuggestion ? (
                  <p className="mt-2 rounded-xl bg-[color:var(--state-warning-bg)] px-3 py-2 text-[11px] font-medium leading-5 text-[color:var(--text-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                    This address looks similar to {sezSuggestion.name}. If the
                    recipient bills as an SEZ unit, switch this toggle to Yes or
                    Not sure.
                  </p>
                ) : null}
              </div>

              <div className={appFieldFullWidthStackClass}>
                <div>
                  <label className={appFieldLabelClass}>Address Line 1 *</label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.clientAddressLine1}
                    onChange={(e) =>
                      updateField("clientAddressLine1", e.target.value)
                    }
                    onBlur={() => markTouched("clientAddress")}
                    placeholder="Building, street, or campus name"
                    className={inputClass(
                      clientAddressError,
                      Boolean(value.clientAddressLine1),
                    )}
                  />
                </div>

                <div>
                  <label className={appFieldLabelClass}>Address Line 2</label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.clientAddressLine2}
                    onChange={(e) =>
                      updateField("clientAddressLine2", e.target.value)
                    }
                    placeholder="Suite, floor, landmark, or optional line"
                    className={inputClass(
                      undefined,
                      Boolean(value.clientAddressLine2),
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>State *</label>
                    <AppSelectField
                      suppressHydrationWarning
                      aria-label="Client state"
                      value={value.clientState}
                      onChange={(e) =>
                        updateField(
                          "clientState",
                          e.target.value as ClientDetails["clientState"],
                        )
                      }
                      onBlur={() => markTouched("clientState")}
                      hasError={clientStateError}
                      hasValue={Boolean(value.clientState)}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATE_OPTIONS.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </AppSelectField>
                  </div>

                  <div>
                    <label className={appFieldLabelClass}>City</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={value.clientCity}
                      onChange={(e) =>
                        updateField("clientCity", e.target.value)
                      }
                      placeholder="City"
                      className={inputClass(
                        undefined,
                        Boolean(value.clientCity),
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className={appFieldLabelClass}>PIN Code</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      inputMode="numeric"
                      value={value.clientPinCode}
                      onChange={(e) =>
                        updateField(
                          "clientPinCode",
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="PIN"
                      className={inputClass(
                        undefined,
                        Boolean(value.clientPinCode),
                      )}
                    />
                  </div>
                </div>
              </div>

              {clientAddressError ? (
                <p className={appFieldErrorTextClass}>{clientAddressError}</p>
              ) : null}
              {clientStateError ? (
                <p className={appFieldErrorTextClass}>{clientStateError}</p>
              ) : null}
              {stateSignals.warning ? (
                <p className="rounded-xl bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                  {stateSignals.warning}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isInternational ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-4">
              <div className={appFieldPairGridClass}>
                <div className="min-w-0">
                  <label className={appFieldLabelClass}>Country *</label>
                  <AppSelectField
                    suppressHydrationWarning
                    aria-label="Client country"
                    value={value.clientCountry}
                    onChange={(e) =>
                      updateField(
                        "clientCountry",
                        e.target.value as ClientDetails["clientCountry"],
                      )
                    }
                    onBlur={() => markTouched("clientCountry")}
                    hasError={clientCountryError}
                    hasValue={Boolean(value.clientCountry)}
                  >
                    <option value="">Select country</option>
                    {INTERNATIONAL_COUNTRY_OPTIONS.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName}
                      </option>
                    ))}
                  </AppSelectField>
                  {clientCountryError ? (
                    <p className={appFieldErrorTextClass}>
                      {clientCountryError}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <label className={appFieldLabelClass}>Currency</label>
                  <AppSelectField
                    suppressHydrationWarning
                    aria-label="Client currency"
                    value={value.clientCurrency}
                    onChange={(e) =>
                      updateField(
                        "clientCurrency",
                        e.target.value as ClientDetails["clientCurrency"],
                      )
                    }
                    hasValue={Boolean(value.clientCurrency)}
                  >
                    <option value="">Keep INR as primary (default)</option>
                    {INTERNATIONAL_CURRENCY_OPTIONS.map((currencyOption) => (
                      <option
                        key={currencyOption.code}
                        value={currencyOption.code}
                      >
                        {currencyOption.label}
                      </option>
                    ))}
                  </AppSelectField>
                </div>
              </div>

              <div>
                <label className={appFieldLabelClass}>Full Address *</label>
                <textarea
                  suppressHydrationWarning
                  rows={4}
                  value={value.clientAddress}
                  onChange={(e) => updateField("clientAddress", e.target.value)}
                  onBlur={() => markTouched("clientAddress")}
                  placeholder="Full international billing address"
                  className={inputClass(
                    clientAddressError,
                    Boolean(value.clientAddress),
                    true,
                  )}
                />
                {clientAddressError ? (
                  <p className={appFieldErrorTextClass}>{clientAddressError}</p>
                ) : null}
              </div>

              <div className={appFieldPairGridClass}>
                <div className="min-w-0">
                  <label className={appFieldLabelClass}>Postal Code</label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.clientPostalCode}
                    onChange={(e) =>
                      updateField("clientPostalCode", e.target.value)
                    }
                    placeholder="Postal / ZIP code"
                    className={inputClass(
                      undefined,
                      Boolean(value.clientPostalCode),
                    )}
                  />
                </div>

                <div className="min-w-0">
                  <label className={appFieldLabelClass}>
                    {agency
                      ? getClientTaxIdLabel(value, agency)
                      : "Tax Identification Number"}
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={value.clientGstin}
                    onChange={(e) => updateField("clientGstin", e.target.value)}
                    onBlur={() => markTouched("clientGstin")}
                    placeholder={
                      agency
                        ? getClientTaxIdPlaceholder(value, agency)
                        : "VAT / EIN / tax ID"
                    }
                    className={inputClass(
                      clientGstinError,
                      Boolean(value.clientGstin),
                    )}
                  />
                  {clientGstinError ? (
                    <p className={appFieldErrorTextClass}>{clientGstinError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Master Services Agreement (MSA) Defaults */}
        <div className="border-t border-[color:var(--border-subtle)] mt-4">
          <button
            type="button"
            onClick={() => setIsMsaOpen(!isMsaOpen)}
            className="flex w-full items-center justify-between py-4 text-left transition-colors hover:bg-gray-50/50"
          >
            <div className="space-y-0.5">
              <h3 className="text-[13px] font-bold text-[color:var(--text-primary)]">
                Advanced: MSA Defaults
              </h3>
              <p className="text-[11px] text-[color:var(--text-muted)]">
                Baseline payment terms and IP transfer rules for this client
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bg-surface-soft)]">
              {isMsaOpen ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {isMsaOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-6 pb-6 pt-2">
                  <div className={appFieldPairGridClass}>
                    <div>
                      <label className={appFieldLabelClass}>
                        Default Payment Terms (Days)
                      </label>
                      <input
                        type="number"
                        value={value.msaPaymentTermsDays ?? 20}
                        onChange={(e) =>
                          updateField(
                            "msaPaymentTermsDays",
                            Number(e.target.value),
                          )
                        }
                        className={inputClass(undefined, true)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={appFieldLabelClass}>
                          Late Fee Rate
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={value.msaLateFeeRate ?? 1.5}
                            onChange={(e) =>
                              updateField(
                                "msaLateFeeRate",
                                Number(e.target.value),
                              )
                            }
                            className={inputClass(undefined, true)}
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-[11px] font-medium text-[color:var(--text-muted)]">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={appFieldLabelClass}>Unit</label>
                        <AppSelectField
                          value={value.msaLateFeeUnit || "monthly"}
                          onChange={(e) =>
                            updateField("msaLateFeeUnit", e.target.value as any)
                          }
                          hasValue={true}
                        >
                          <option value="monthly">per month</option>
                          <option value="annually">per annum</option>
                          <option value="daily">per day</option>
                        </AppSelectField>
                      </div>
                    </div>

                    <div>
                      <label className={appFieldLabelClass}>
                        IP Transfer Trigger
                      </label>
                      <AppSelectField
                        value={value.msaIpTriggerType || "upon_full_payment"}
                        onChange={(e) =>
                          updateField("msaIpTriggerType", e.target.value as any)
                        }
                        hasValue={true}
                      >
                        <option value="upon_full_payment">
                          Upon Full Payment
                        </option>
                        <option value="upon_signing">Upon Signing</option>
                        <option value="upon_delivery">Upon Delivery</option>
                        <option value="proportional_transfer">
                          Proportional (Per Milestone)
                        </option>
                        <option value="retained_by_creator">
                          Retained by Creator (License Only)
                        </option>
                      </AppSelectField>
                    </div>

                    <div>
                      <label className={appFieldLabelClass}>Jurisdiction</label>
                      <input
                        type="text"
                        value={value.msaJurisdictionCity || ""}
                        onChange={(e) =>
                          updateField("msaJurisdictionCity", e.target.value)
                        }
                        placeholder="e.g. Bangalore"
                        className={inputClass(
                          undefined,
                          Boolean(value.msaJurisdictionCity),
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={appFieldLabelClass}>
                        Notes / MSA Boilerplate
                      </label>
                      {!value.msaNotesBoilerplate && (
                        <button
                          type="button"
                          onClick={() => {
                            const ipLabels: Record<string, string> = {
                              upon_full_payment: "upon full payment",
                              upon_signing: "upon signing",
                              upon_delivery: "upon delivery",
                              proportional_transfer:
                                "proportionally per milestone",
                              retained_by_creator:
                                "retained by the creator (limited license)",
                            };
                            const ipLabel =
                              ipLabels[
                                value.msaIpTriggerType || "upon_full_payment"
                              ];

                            const unitLabels: Record<string, string> = {
                              monthly: "per month",
                              annually: "per annum",
                              daily: "per day",
                            };
                            const unitLabel =
                              unitLabels[value.msaLateFeeUnit || "monthly"];

                            const template = `Payment is due within ${value.msaPaymentTermsDays ?? 20} days. A late fee of ${value.msaLateFeeRate ?? 1.5}% ${unitLabel} applies to overdue balances. Intellectual Property rights transfer to the client ${ipLabel}.`;

                            updateField("msaNotesBoilerplate", template);
                          }}
                          className="text-[11px] font-bold text-[color:var(--color-lime-600)] hover:text-[color:var(--color-lime-700)] transition-colors"
                        >
                          + Generate Smart Template
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      value={value.msaNotesBoilerplate || ""}
                      onChange={(e) =>
                        updateField("msaNotesBoilerplate", e.target.value)
                      }
                      placeholder="Custom terms or additional MSA boilerplate for this client..."
                      className={inputClass(
                        undefined,
                        Boolean(value.msaNotesBoilerplate),
                        true,
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</section>
  );
}
