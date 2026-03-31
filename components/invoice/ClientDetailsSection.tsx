"use client";

import type { ClientDetails } from "@/types/invoice";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";

interface ClientDetailsSectionProps {
  value: ClientDetails;
  onChange: (value: ClientDetails) => void;
  errors?: {
    clientName?: string;
    clientAddress?: string;
    clientState?: string;
    clientGstin?: string;
  };
}

export default function ClientDetailsSection({
  value,
  onChange,
  errors,
}: ClientDetailsSectionProps) {
  const isInternational = value.clientLocation === "international";

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

  const segmentButtonClass = (isSelected: boolean) =>
    `flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
      isSelected
        ? "bg-black text-white"
        : "bg-transparent text-black hover:bg-gray-100"
    }`;

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
          <div className="inline-flex w-full max-w-sm rounded-xl border border-gray-300 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => updateField("clientLocation", "domestic")}
              className={segmentButtonClass(
                value.clientLocation === "domestic"
              )}
            >
              Domestic (India)
            </button>

            <button
              type="button"
              onClick={() => updateField("clientLocation", "international")}
              className={segmentButtonClass(
                value.clientLocation === "international"
              )}
            >
              International
            </button>
          </div>
        </div>

        {!isInternational ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Client State *
            </label>
            <select
              value={value.clientState}
              onChange={(e) =>
                updateField(
                  "clientState",
                  e.target.value as ClientDetails["clientState"]
                )
              }
              className={inputClass(errors?.clientState)}
            >
              <option value="">Select state or union territory</option>
              {INDIA_STATE_OPTIONS.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
            {errors?.clientState ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {errors.clientState}
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            {isInternational
              ? "Client Tax ID / VAT No. (Optional)"
              : "Client GSTIN"}
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
            placeholder={
              isInternational
                ? "Client tax ID or VAT number"
                : "Client GSTIN"
            }
            autoCapitalize="characters"
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
