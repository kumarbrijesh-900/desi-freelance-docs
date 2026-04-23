"use client";

import { useState } from "react";
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
}

export default function ClientDetailsSection({
  value,
  onChange,
  embedded = false,
  errors,
  showAllErrors = false,
}: ClientDetailsSectionProps) {
  const isInternational = value.clientLocation === "international";
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalClients, setInternalClients] = useState<SavedClient[]>([]);

  // Use provided clients or fetch them if needed
  const effectiveClients = savedClients && savedClients.length > 0 ? savedClients : internalClients;

  // Fetch clients if none were passed in (fallback)
  useEffect(() => {
    if (!savedClients || savedClients.length === 0) {
      listClients().then(({ data, error }) => {
        if (error) {
          console.error("CLIENT_FETCH_ERROR:", error);
        }
        if (data) {
          console.log("CLIENT_FETCH_SUCCESS: Found", data.length, "clients");
          setInternalClients(data);
        }
      });
    }
  }, [savedClients]);

  const filteredClients = effectiveClients.filter((c) =>
    c.client_name.toLowerCase().includes(value.clientName.toLowerCase())
  );

  const handleSelectClient = (client: SavedClient) => {
    const details = savedClientToClientDetails(client);
    onChange(details);
    setShowSuggestions(false);
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
    fieldValue: ClientDetails[K]
  ) => {
    syncClientDetails({
      ...value,
      [key]: fieldValue,
    });
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
        [value.clientName, value.clientAddressLine1, value.clientAddressLine2, value.clientCity]
          .filter(Boolean)
          .join(", ")
      )
    : null;
  const clientNameError = getVisibleError("clientName", errors?.clientName);
  const clientAddressError = getVisibleError(
    "clientAddress",
    errors?.clientAddress
  );
  const clientStateError = getVisibleError("clientState", errors?.clientState);
  const clientCountryError = getVisibleError(
    "clientCountry",
    errors?.clientCountry
  );
  const clientGstinError = getVisibleError("clientGstin", errors?.clientGstin);

  return (
    <section
      className={cn(
        "overflow-visible",
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass()
      )}
    >
      {!embedded ? (
        <div className="mb-6 space-y-2">
          <h2 className={appSectionTitleClass}>Client</h2>
          <p className={appSectionDescriptionClass}>
            Add the client details and billing location.
          </p>
        </div>
      ) : null}

      <div className={appFieldFullWidthStackClass}>
        <div className="grid grid-cols-1 gap-4 md:items-end lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative">
            <label className={appFieldLabelClass}>
              Client Name *
            </label>
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
              onFocus={() => setShowSuggestions(true)}
              placeholder="Client or company name"
              className={inputClass(
                clientNameError,
                Boolean(value.clientName)
              )}
            />
            
            {/* Suggestion Tray */}
            {showSuggestions && filteredClients.length > 0 && (
              <div 
                className="absolute left-0 right-0 z-[9999] mt-1 max-h-64 overflow-auto rounded-xl border border-[color:var(--border-subtle)] bg-white p-1 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200"
                style={{ top: '100%' }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--border-subtle)] mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-soft)]">
                    Saved Clients
                  </span>
                  <span className="text-[10px] font-medium text-[color:var(--color-lime-600)]">
                    {filteredClients.length} found
                  </span>
                </div>
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-[color:var(--bg-surface-muted)]"
                  >
                    <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {client.client_name}
                    </span>
                    <span className="text-xs text-[color:var(--text-muted)] line-clamp-1">
                      {client.client_email || client.city || "No details"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {clientNameError ? (
              <p className={appFieldErrorTextClass}>
                {clientNameError}
              </p>
            ) : null}
          </div>

          <div>
            <label className={appFieldLabelClass}>
              Client Location *
            </label>
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

        {!isInternational ? (
          <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-4">
            <div className={appFieldPairGridClass}>
              <div className="min-w-0">
                <label className={appFieldLabelClass}>
                  Client GSTIN
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.clientGstin}
                  onChange={(e) =>
                    updateField(
                      "clientGstin",
                      e.target.value.toUpperCase().replace(/\s+/g, "")
                    )
                  }
                  onBlur={() => markTouched("clientGstin")}
                  placeholder="Client GSTIN"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={inputClass(
                    clientGstinError,
                    Boolean(value.clientGstin)
                  )}
                />
                {clientGstinError ? (
                  <p className={appFieldErrorTextClass}>
                    {clientGstinError}
                  </p>
                ) : gstinInfo.state ? (
                  <p className={appFieldHelperTextClass}>
                    GSTIN state code maps to {gstinInfo.state}.
                  </p>
                ) : null}
              </div>

              <div>
                <label className={appFieldLabelClass}>
                  Client Email
                </label>
                <input
                  suppressHydrationWarning
                  type="email"
                  value={value.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  placeholder="Email address"
                  className={inputClass(undefined, Boolean(value.clientEmail))}
                />
              </div>
            </div>

            <div>
              <label className={appFieldLabelClass}>
                SEZ Unit
              </label>
              <div className="max-w-[420px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)] p-2">
                <div className="flex flex-wrap items-center gap-2">
                  {(["yes", "no"] as const).map((option) => {
                    const isSelected = value.isClientSezUnit === option;
                    return (
                      <label key={option} className="min-w-[92px] flex-1 cursor-pointer sm:flex-none">
                        <input
                          type="radio"
                          name="client-sez-unit"
                          value={option}
                          checked={isSelected}
                          onChange={() => updateField("isClientSezUnit", option)}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "app-focus-ring block border px-3 py-2 text-center text-[13px] font-semibold transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring)] peer-focus-visible:ring-offset-1",
                            isSelected
                              ? "border-[color:var(--focus-ring)] bg-white text-[color:var(--text-primary)] shadow-[0_8px_16px_rgba(37,37,65,0.07)]"
                              : "border-transparent bg-white/70 text-[color:var(--text-secondary)] hover:border-[color:var(--border-subtle)] hover:bg-white"
                          )}
                        >
                          {option === "yes" ? "Yes" : "No"}
                        </span>
                      </label>
                    );
                  })}
                  <label className="cursor-pointer">
                    <input
                      type="radio"
                      name="client-sez-unit"
                      value="not-sure"
                      checked={value.isClientSezUnit === "not-sure"}
                      onChange={() => updateField("isClientSezUnit", "not-sure")}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "app-focus-ring inline-flex min-h-9 items-center border px-3 text-[12px] font-medium transition-[background-color,border-color,color,box-shadow] duration-[var(--app-duration-fast)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring)] peer-focus-visible:ring-offset-1",
                        value.isClientSezUnit === "not-sure"
                          ? "border-[color:var(--state-warning-border)] bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning-text)]"
                          : "border-transparent bg-transparent text-[color:var(--text-muted)] hover:border-[color:var(--border-subtle)] hover:bg-white/70 hover:text-[color:var(--text-secondary)]"
                      )}
                    >
                      Not sure
                    </span>
                  </label>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[color:var(--text-muted)]">
                  This affects GST treatment for SEZ supplies.
                </p>
              </div>
              {sezSuggestion ? (
                <p className="mt-2 rounded-xl bg-[color:var(--state-warning-bg)] px-3 py-2 text-[11px] font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                  This address looks similar to {sezSuggestion.name}. If the recipient bills as an SEZ unit, switch this toggle to Yes or Not sure.
                </p>
              ) : null}
            </div>

            <div className={appFieldFullWidthStackClass}>
              <div>
                <label className={appFieldLabelClass}>
                  Address Line 1 *
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.clientAddressLine1}
                  onChange={(e) => updateField("clientAddressLine1", e.target.value)}
                  onBlur={() => markTouched("clientAddress")}
                  placeholder="Building, street, or campus name"
                  className={inputClass(
                    clientAddressError,
                    Boolean(value.clientAddressLine1)
                  )}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>
                  Address Line 2
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.clientAddressLine2}
                  onChange={(e) => updateField("clientAddressLine2", e.target.value)}
                  placeholder="Suite, floor, landmark, or optional line"
                  className={inputClass(undefined, Boolean(value.clientAddressLine2))}
                />
              </div>

              <div className={appFieldTripleCompactGridClass}>
                <div className="min-w-0">
                <label className={appFieldLabelClass}>
                  State *
                </label>
                <AppSelectField
                  suppressHydrationWarning
                  aria-label="Client state"
                  value={value.clientState}
                  onChange={(e) =>
                    updateField(
                      "clientState",
                      e.target.value as ClientDetails["clientState"]
                    )
                  }
                  onBlur={() => markTouched("clientState")}
                  hasError={clientStateError}
                  hasValue={Boolean(value.clientState)}
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
                  value={value.clientCity}
                  onChange={(e) => updateField("clientCity", e.target.value)}
                  placeholder="Bengaluru"
                  className={inputClass(undefined, Boolean(value.clientCity))}
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
                  value={value.clientPinCode}
                  onChange={(e) =>
                    updateField(
                      "clientPinCode",
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                    placeholder="560048"
                    className={inputClass(undefined, Boolean(value.clientPinCode))}
                  />
                </div>
              </div>
            </div>

            {clientAddressError ? (
              <p className={appFieldErrorTextClass}>
                {clientAddressError}
              </p>
            ) : null}
            {clientStateError ? (
              <p className={appFieldErrorTextClass}>
                {clientStateError}
              </p>
            ) : null}
            {stateSignals.warning ? (
              <p className="rounded-xl bg-[color:var(--state-warning-bg)] px-3 py-2 text-xs font-medium leading-5 text-[color:var(--state-warning-text)] ring-1 ring-inset ring-[color:var(--state-warning-border)]">
                {stateSignals.warning}
              </p>
            ) : null}
          </div>
        ) : null}

        {isInternational ? (
          <div className="space-y-4 border-t border-[color:var(--border-subtle)] pt-4">
            <div className={appFieldPairGridClass}>
              <div className="min-w-0">
                <label className={appFieldLabelClass}>
                  Country *
                </label>
                <AppSelectField
                  suppressHydrationWarning
                  aria-label="Client country"
                  value={value.clientCountry}
                  onChange={(e) =>
                    updateField(
                      "clientCountry",
                      e.target.value as ClientDetails["clientCountry"]
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
                <label className={appFieldLabelClass}>
                  Currency
                </label>
                <AppSelectField
                  suppressHydrationWarning
                  aria-label="Client currency"
                  value={value.clientCurrency}
                  onChange={(e) =>
                    updateField(
                      "clientCurrency",
                      e.target.value as ClientDetails["clientCurrency"]
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
              <label className={appFieldLabelClass}>
                Full Address *
              </label>
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
                  true
                )}
              />
              {clientAddressError ? (
                <p className={appFieldErrorTextClass}>
                  {clientAddressError}
                </p>
              ) : null}
            </div>

            <div className={appFieldPairGridClass}>
              <div className="min-w-0">
                <label className={appFieldLabelClass}>
                  Postal Code
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.clientPostalCode}
                  onChange={(e) => updateField("clientPostalCode", e.target.value)}
                  placeholder="Postal / ZIP code"
                  className={inputClass(undefined, Boolean(value.clientPostalCode))}
                />
              </div>

              <div className="min-w-0">
                <label className={appFieldLabelClass}>
                  Tax Identification Number
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={value.clientGstin}
                  onChange={(e) => updateField("clientGstin", e.target.value)}
                  onBlur={() => markTouched("clientGstin")}
                  placeholder="VAT / EIN / tax ID"
                  className={inputClass(
                    clientGstinError,
                    Boolean(value.clientGstin)
                  )}
                />
                {clientGstinError ? (
                  <p className={appFieldErrorTextClass}>
                    {clientGstinError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
