"use client";

import type { ClientDetails } from "@/types/invoice";
import {
  getClientTaxIdLabel,
  getClientTaxIdPlaceholder,
  isInternationalClient,
} from "@/lib/invoice-compliance";

interface ClientDetailsSectionProps {
  value: ClientDetails;
  onChange: (value: ClientDetails) => void;
  errors?: {
    clientName?: string;
    clientAddress?: string;
    clientGstin?: string;
    gstRegistrationStatus?: string;
    hasValidLut?: string;
    exportTaxHandling?: string;
  };
}

export default function ClientDetailsSection({
  value,
  onChange,
  errors,
}: ClientDetailsSectionProps) {
  const updateField = <K extends keyof ClientDetails>(
    key: K,
    fieldValue: ClientDetails[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black ${
      hasError ? "border-red-400 bg-red-50/30" : "border-gray-300"
    }`;

  const toggleButtonClass = (isSelected: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${
      isSelected
        ? "border-black bg-black text-white"
        : "border-gray-300 bg-white text-black hover:border-black"
    }`;

  const isInternational = isInternationalClient(value);
  const clientTaxIdLabel = getClientTaxIdLabel(value);
  const clientTaxIdPlaceholder = getClientTaxIdPlaceholder(value);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
        Client Details
      </h2>

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
            className={inputClass(errors?.clientName)}
          />
          {errors?.clientName ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.clientName}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Client Address *
          </label>
          <textarea
            rows={3}
            value={value.clientAddress}
            onChange={(e) => updateField("clientAddress", e.target.value)}
            placeholder="Client billing address"
            className={inputClass(errors?.clientAddress)}
          />
          {errors?.clientAddress ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.clientAddress}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Client Location *
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => updateField("clientLocation", "domestic")}
              className={toggleButtonClass(value.clientLocation === "domestic")}
            >
              Domestic (India)
            </button>

            <button
              type="button"
              onClick={() => updateField("clientLocation", "international")}
              className={toggleButtonClass(value.clientLocation === "international")}
            >
              International
            </button>
          </div>
        </div>

        {isInternational ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                GST Registration Status *
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateField("gstRegistrationStatus", "registered")
                  }
                  className={toggleButtonClass(
                    value.gstRegistrationStatus === "registered"
                  )}
                >
                  Registered under GST
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateField("gstRegistrationStatus", "not-registered")
                  }
                  className={toggleButtonClass(
                    value.gstRegistrationStatus === "not-registered"
                  )}
                >
                  Not registered under GST
                </button>
              </div>
              {errors?.gstRegistrationStatus ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.gstRegistrationStatus}
                </p>
              ) : null}
            </div>

            {value.gstRegistrationStatus === "registered" ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-black">
                  Valid LUT for current financial year? *
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("hasValidLut", "yes")}
                    className={toggleButtonClass(value.hasValidLut === "yes")}
                  >
                    Yes
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField("hasValidLut", "no")}
                    className={toggleButtonClass(value.hasValidLut === "no")}
                  >
                    No
                  </button>
                </div>
                {errors?.hasValidLut ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.hasValidLut}
                  </p>
                ) : null}

                {value.hasValidLut === "yes" ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-black">
                      LUT Number / ARN
                    </label>
                    <input
                      type="text"
                      value={value.lutNumber}
                      onChange={(e) => updateField("lutNumber", e.target.value)}
                      placeholder="Recommended for invoice declaration"
                      className={inputClass()}
                    />
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Tax will be kept at 0% in the client-facing invoice under
                      LUT.
                    </p>
                  </div>
                ) : null}

                {value.hasValidLut === "no" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-950">
                      Without a valid LUT, export of services may require 18%
                      IGST. Foreign clients usually expect a tax-clean invoice.
                      Choose how you want to handle this invoice.
                    </p>

                    <fieldset className="mt-3 space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-3">
                        <input
                          type="radio"
                          name="export-tax-handling"
                          checked={value.exportTaxHandling === "add-igst"}
                          onChange={() =>
                            updateField("exportTaxHandling", "add-igst")
                          }
                          className="mt-1 h-4 w-4 border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm leading-6 text-black">
                          Add 18% IGST to the client invoice
                        </span>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-3">
                        <input
                          type="radio"
                          name="export-tax-handling"
                          checked={
                            value.exportTaxHandling === "handle-separately"
                          }
                          onChange={() =>
                            updateField(
                              "exportTaxHandling",
                              "handle-separately"
                            )
                          }
                          className="mt-1 h-4 w-4 border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm leading-6 text-black">
                          Keep client invoice at 0% tax (I will handle IGST
                          separately)
                        </span>
                      </label>
                    </fieldset>

                    {errors?.exportTaxHandling ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.exportTaxHandling}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {value.gstRegistrationStatus === "not-registered" ? (
              <p className="mt-4 text-xs leading-5 text-gray-500">
                This invoice will stay at 0% tax and use the international
                payment flow.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            {clientTaxIdLabel}
          </label>
          <input
            type="text"
            value={isInternational ? value.clientTaxId : value.clientGstin}
            onChange={(e) => {
              if (isInternational) {
                updateField("clientTaxId", e.target.value);
                return;
              }

              updateField(
                "clientGstin",
                e.target.value.toUpperCase().replace(/\s+/g, "")
              );
            }}
            placeholder={clientTaxIdPlaceholder}
            autoCapitalize={isInternational ? "sentences" : "characters"}
            spellCheck={false}
            className={inputClass(errors?.clientGstin)}
          />
          {errors?.clientGstin ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errors.clientGstin}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
