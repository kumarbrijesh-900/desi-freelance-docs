"use client";

import type { ClientDetails } from "@/types/invoice";

interface ClientDetailsSectionProps {
  value: ClientDetails;
  onChange: (value: ClientDetails) => void;
  errors?: {
    clientName?: string;
    clientAddress?: string;
    clientGstin?: string;
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