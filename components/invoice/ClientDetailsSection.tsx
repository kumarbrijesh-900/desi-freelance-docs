"use client";

import type { ClientDetails } from "@/types/invoice";
import ChoiceCards from "@/components/ui/ChoiceCards";
import AppSelectField from "@/components/ui/AppSelectField";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import {
  INTERNATIONAL_COUNTRY_OPTIONS,
  INTERNATIONAL_CURRENCY_OPTIONS,
} from "@/lib/international-billing-options";
import { cn, getAppFieldClass, getAppPanelClass } from "@/lib/ui-foundation";
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
      {!embedded ? (
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
          Client Details
        </h2>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
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
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.clientName}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
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
                label: "Domestic (India)",
                description: "Use Indian state-based billing and domestic payment details.",
              },
              {
                value: "international",
                label: "International",
                description: "Use country, currency, and export billing details.",
              },
            ]}
          />
          <p className="mt-2 text-xs leading-5 text-gray-500">
            This choice decides which tax, payment, and billing fields appear next.
          </p>
        </div>

        {!isInternational ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.clientGstin}
                  </p>
                ) : gstinInfo.state ? (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    GSTIN state code maps to {gstinInfo.state}.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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
              <label className="mb-2 block text-sm font-medium text-black">
                SEZ Unit
              </label>
              <ChoiceCards
                name="client-sez-unit"
                value={value.isClientSezUnit}
                onChange={(nextValue) => updateField("isClientSezUnit", nextValue)}
                variant="segmented"
                columns={2}
                options={[
                  {
                    value: "yes",
                    label: "Yes",
                    description: "Treat this domestic recipient as an SEZ unit.",
                  },
                  {
                    value: "no",
                    label: "No",
                    description: "Use regular domestic GST branching.",
                  },
                  {
                    value: "not-sure",
                    label: "Not sure",
                    description: "Keep reviewing; no SEZ tax shortcut is assumed.",
                  },
                ]}
              />
              {sezSuggestion ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                  This address looks similar to {sezSuggestion.name}. If the recipient bills as an SEZ unit, switch this toggle to Yes or Not sure.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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

              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black">
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black">
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black">
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
            </div>

            {errors?.clientAddress ? (
              <p className="text-xs font-medium text-red-600">
                {errors.clientAddress}
              </p>
            ) : null}
            {errors?.clientState ? (
              <p className="text-xs font-medium text-red-600">
                {errors.clientState}
              </p>
            ) : null}
            {stateSignals.warning ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                {stateSignals.warning}
              </p>
            ) : (
              <p className="text-xs leading-5 text-gray-500">
                PIN code and GSTIN can suggest the billing state, but your manual selection always stays editable.
              </p>
            )}
          </div>
        ) : null}

        {isInternational ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.clientCountry}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Leave this blank to keep INR as the working invoice currency
                  and show a USD reference total later.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
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
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.clientAddress}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
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
                <label className="mb-2 block text-sm font-medium text-black">
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
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.clientGstin}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
              Export declaration and LUT readiness are handled in Totals & Taxes after you confirm agency compliance.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
