"use client";

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
}

export default function ClientDetailsSection({
  value,
  onChange,
  embedded = false,
  errors,
}: ClientDetailsSectionProps) {
  const isInternational = value.clientLocation === "international";

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

  return (
    <section
      className={cn(
        embedded
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : getAppPanelClass()
      )}
    >
      <div className={cn(embedded ? "space-y-2" : "mb-6 space-y-2")}>
        {!embedded ? <h2 className={appSectionTitleClass}>Client</h2> : null}
        <p className={appSectionDescriptionClass}>
          Capture who is being billed and which billing rules apply.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div>
            <label className={appFieldLabelClass}>
              Client Name *
            </label>
            <input
              type="text"
              value={value.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
              placeholder="Client or company name"
              className={inputClass(errors?.clientName, Boolean(value.clientName))}
            />
            {errors?.clientName ? (
              <p className={appFieldErrorTextClass}>
                {errors.clientName}
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
          <div className="space-y-5 border-t border-slate-200/70 pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
              <div>
                <label className={appFieldLabelClass}>
                  Client GSTIN
                </label>
                <input
                  type="text"
                  value={value.clientGstin}
                  onChange={(e) =>
                    updateField(
                      "clientGstin",
                      e.target.value.toUpperCase().replace(/\s+/g, "")
                    )
                  }
                  placeholder="Client GSTIN"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={inputClass(errors?.clientGstin, Boolean(value.clientGstin))}
                />
                {errors?.clientGstin ? (
                  <p className={appFieldErrorTextClass}>
                    {errors.clientGstin}
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
                  type="email"
                  value={value.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  placeholder="billing@client.com"
                  className={inputClass(undefined, Boolean(value.clientEmail))}
                />
              </div>
            </div>

            <div>
              <label className={appFieldLabelClass}>
                SEZ Unit
              </label>
              <ChoiceCards
                name="client-sez-unit"
                value={value.isClientSezUnit}
                onChange={(nextValue) => updateField("isClientSezUnit", nextValue)}
                variant="inline"
                options={[
                  {
                    value: "yes",
                    label: "Yes",
                  },
                  {
                    value: "no",
                    label: "No",
                  },
                  {
                    value: "not-sure",
                    label: "Not sure",
                  },
                ]}
              />
              {sezSuggestion ? (
                <p className="mt-2 rounded-xl bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  This address looks similar to {sezSuggestion.name}. If the recipient bills as an SEZ unit, switch this toggle to Yes or Not sure.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2 lg:col-span-3">
                <label className={appFieldLabelClass}>
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={value.clientAddressLine1}
                  onChange={(e) => updateField("clientAddressLine1", e.target.value)}
                  placeholder="Building, street, or campus name"
                  className={inputClass(errors?.clientAddress, Boolean(value.clientAddressLine1))}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className={appFieldLabelClass}>
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={value.clientAddressLine2}
                  onChange={(e) => updateField("clientAddressLine2", e.target.value)}
                  placeholder="Suite, floor, landmark, or optional line"
                  className={inputClass(undefined, Boolean(value.clientAddressLine2))}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>
                  State *
                </label>
                <AppSelectField
                  aria-label="Client state"
                  value={value.clientState}
                  onChange={(e) =>
                    updateField(
                      "clientState",
                      e.target.value as ClientDetails["clientState"]
                    )
                  }
                  hasError={errors?.clientState}
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
                  type="text"
                  value={value.clientCity}
                  onChange={(e) => updateField("clientCity", e.target.value)}
                  placeholder="Bengaluru"
                  className={inputClass(undefined, Boolean(value.clientCity))}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>
                  PIN Code
                </label>
                <input
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

            {errors?.clientAddress ? (
              <p className={appFieldErrorTextClass}>
                {errors.clientAddress}
              </p>
            ) : null}
            {errors?.clientState ? (
              <p className={appFieldErrorTextClass}>
                {errors.clientState}
              </p>
            ) : null}
            {stateSignals.warning ? (
              <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 ring-1 ring-inset ring-amber-200/80">
                {stateSignals.warning}
              </p>
            ) : null}
          </div>
        ) : null}

        {isInternational ? (
          <div className="space-y-5 border-t border-slate-200/70 pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={appFieldLabelClass}>
                  Country *
                </label>
                <AppSelectField
                  aria-label="Client country"
                  value={value.clientCountry}
                  onChange={(e) =>
                    updateField(
                      "clientCountry",
                      e.target.value as ClientDetails["clientCountry"]
                    )
                  }
                  hasError={errors?.clientCountry}
                  hasValue={Boolean(value.clientCountry)}
                >
                  <option value="">Select country</option>
                  {INTERNATIONAL_COUNTRY_OPTIONS.map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                </AppSelectField>
                {errors?.clientCountry ? (
                  <p className={appFieldErrorTextClass}>
                    {errors.clientCountry}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={appFieldLabelClass}>
                  Currency
                </label>
                <AppSelectField
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
                rows={4}
                value={value.clientAddress}
                onChange={(e) => updateField("clientAddress", e.target.value)}
                placeholder="Full international billing address"
                className={inputClass(
                  errors?.clientAddress,
                  Boolean(value.clientAddress),
                  true
                )}
              />
              {errors?.clientAddress ? (
                <p className={appFieldErrorTextClass}>
                  {errors.clientAddress}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={appFieldLabelClass}>
                  Postal Code
                </label>
                <input
                  type="text"
                  value={value.clientPostalCode}
                  onChange={(e) => updateField("clientPostalCode", e.target.value)}
                  placeholder="Postal / ZIP code"
                  className={inputClass(undefined, Boolean(value.clientPostalCode))}
                />
              </div>

              <div>
                <label className={appFieldLabelClass}>
                  Tax Identification Number
                </label>
                <input
                  type="text"
                  value={value.clientGstin}
                  onChange={(e) => updateField("clientGstin", e.target.value)}
                  placeholder="VAT / EIN / tax ID"
                  className={inputClass(errors?.clientGstin, Boolean(value.clientGstin))}
                />
                {errors?.clientGstin ? (
                  <p className={appFieldErrorTextClass}>
                    {errors.clientGstin}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-xs font-medium leading-5 text-amber-900 ring-1 ring-inset ring-amber-200/80">
              Export declaration and LUT handling are finalized in Totals after agency compliance is confirmed.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
