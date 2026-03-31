"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InvoiceLineItem,
  InvoiceLineItemType,
  InvoiceRateUnit,
} from "@/types/invoice";
import {
  getCurrencySymbol,
  type InvoiceDisplayCurrency,
} from "@/lib/international-billing-options";

interface DeliverablesSectionProps {
  value: InvoiceLineItem[];
  currency?: InvoiceDisplayCurrency;
  onChange: (value: InvoiceLineItem[]) => void;
  errors?: Record<
    string,
    {
      description?: string;
      qty?: string;
      rate?: string;
    }
  >;
}

type FloatingMenuState = {
  itemId: string;
  top: number;
  left: number;
  width: number;
} | null;

const typeOptions: InvoiceLineItemType[] = [
  "Logo Design",
  "UI/UX",
  "Illustration",
  "Photography",
  "Video Editing",
  "Social Media",
  "Other",
];

const unitLabels: Record<InvoiceRateUnit, string> = {
  "per-deliverable": "Per deliverable",
  "per-item": "Per item",
  "per-screen": "Per screen",
  "per-hour": "Per hour",
  "per-day": "Per day",
  "per-revision": "Per revision",
  "per-concept": "Per concept",
  "per-post": "Per post",
  "per-video": "Per video",
  "per-image": "Per image",
};

const allowedUnitsByType: Record<InvoiceLineItemType, InvoiceRateUnit[]> = {
  "Logo Design": [
    "per-deliverable",
    "per-concept",
    "per-revision",
    "per-item",
  ],
  "UI/UX": [
    "per-screen",
    "per-hour",
    "per-day",
    "per-deliverable",
    "per-revision",
  ],
  Illustration: [
    "per-item",
    "per-deliverable",
    "per-revision",
    "per-concept",
  ],
  Photography: [
    "per-image",
    "per-hour",
    "per-day",
    "per-deliverable",
  ],
  "Video Editing": [
    "per-video",
    "per-hour",
    "per-day",
    "per-deliverable",
    "per-revision",
  ],
  "Social Media": [
    "per-post",
    "per-item",
    "per-deliverable",
    "per-revision",
  ],
  Other: ["per-deliverable", "per-item", "per-hour", "per-day"],
};

const defaultUnitByType: Record<InvoiceLineItemType, InvoiceRateUnit> = {
  "Logo Design": "per-deliverable",
  "UI/UX": "per-screen",
  Illustration: "per-item",
  Photography: "per-image",
  "Video Editing": "per-video",
  "Social Media": "per-post",
  Other: "per-deliverable",
};

const deliverableSuggestions: Record<InvoiceLineItemType, string[]> = {
  "Logo Design": [
    "Primary Logo Design",
    "Secondary Logo Variation",
    "Logo Concepts",
    "Brand Mark Design",
    "Wordmark Design",
    "Logo Usage Guidelines",
    "Final Logo Package",
    "Logo Redraw / Cleanup",
  ],
  "UI/UX": [
    "UX Audit",
    "User Flow Design",
    "Wireframes",
    "High-Fidelity UI Screens",
    "Design System Components",
    "Landing Page UI Design",
    "Mobile App Screen Design",
    "Dashboard UI Design",
    "Prototype Design",
    "Design Handoff Assets",
  ],
  Illustration: [
    "Custom Illustration",
    "Editorial Illustration",
    "Character Illustration",
    "Spot Illustration",
    "Social Media Illustration Set",
    "Web Illustration Assets",
    "Product Illustration",
    "Packaging Illustration",
    "Icon Illustration Set",
  ],
  Photography: [
    "Product Photography",
    "Edited Product Images",
    "Campaign Shoot",
    "Portrait Session",
    "Retouched Photo Set",
    "E-commerce Product Shoot",
    "Event Photography",
    "Lifestyle Shoot",
    "Color-Corrected Final Images",
  ],
  "Video Editing": [
    "Video Editing",
    "Short-form Video Edit",
    "Reel Edit",
    "YouTube Video Edit",
    "Motion Graphics Edit",
    "Subtitled Edit",
    "Color Correction",
    "Sound Sync and Cleanup",
    "Export Package",
  ],
  "Social Media": [
    "Social Media Post Design",
    "Carousel Design",
    "Story Design Set",
    "Ad Creative Set",
    "Monthly Content Design",
    "Social Media Template Design",
    "Campaign Visual Set",
    "Static Post Creatives",
    "Branded Content Assets",
  ],
  Other: [],
};

const shortPlaceholders: Record<InvoiceLineItemType, string> = {
  "Logo Design": "Primary logo design",
  "UI/UX": "UI/UX design deliverable",
  Illustration: "Custom illustration",
  Photography: "Photography deliverable",
  "Video Editing": "Video editing deliverable",
  "Social Media": "Social media deliverable",
  Other: "Describe deliverable",
};

const helperCopyByType: Record<InvoiceLineItemType, string> = {
  "Logo Design":
    "Examples: Primary Logo Design, Logo Concepts, Final Logo Package",
  "UI/UX":
    "Examples: UX Audit, Wireframes, High-Fidelity UI Screens, Prototype Design",
  Illustration:
    "Examples: Custom Illustration, Editorial Illustration, Character Illustration",
  Photography:
    "Examples: Product Photography, Retouched Photo Set, Event Photography",
  "Video Editing":
    "Examples: Reel Edit, YouTube Video Edit, Motion Graphics Edit",
  "Social Media":
    "Examples: Social Media Post Design, Carousel Design, Campaign Visual Set",
  Other: "Describe the exact freelance deliverable in your own words.",
};

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 text-gray-600"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatCurrency(amount = 0, currency: InvoiceDisplayCurrency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString("en-IN")}`;
  }
}

function RateTooltip({
  currency = "INR",
}: {
  currency?: InvoiceDisplayCurrency;
}) {
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <span className="group relative ml-1 inline-flex items-center">
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500"
        aria-label="What does rate mean?"
      >
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-6 z-[100] hidden w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-5 text-gray-600 shadow-lg group-hover:block">
        Rate is the amount charged for one billing unit. For example, if Qty is
        3 and Rate is {currencySymbol}5,000, the line total becomes{" "}
        {currencySymbol}15,000.
      </span>
    </span>
  );
}

function UnitTooltip() {
  return (
    <span className="group relative ml-1 inline-flex items-center">
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500"
        aria-label="What does unit mean?"
      >
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-6 z-[100] hidden w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-5 text-gray-600 shadow-lg group-hover:block">
        Unit defines what the rate applies to, such as per screen, per hour, per
        post, or per deliverable.
      </span>
    </span>
  );
}

export default function DeliverablesSection({
  value,
  currency = "INR",
  onChange,
  errors,
}: DeliverablesSectionProps) {
  const [menu, setMenu] = useState<FloatingMenuState>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const activeInput = menu ? inputRefs.current[menu.itemId] : null;

      if (activeInput && activeInput.contains(target)) return;
      setMenu(null);
    }

    function repositionMenu() {
      if (!menu) return;
      const input = inputRefs.current[menu.itemId];
      if (!input) return;

      const rect = input.getBoundingClientRect();
      setMenu({
        itemId: menu.itemId,
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", repositionMenu);
    window.addEventListener("scroll", repositionMenu, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", repositionMenu);
      window.removeEventListener("scroll", repositionMenu, true);
    };
  }, [menu]);

  const updateItem = <K extends keyof InvoiceLineItem>(
    id: string,
    key: K,
    fieldValue: InvoiceLineItem[K]
  ) => {
    onChange(
      value.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: fieldValue,
            }
          : item
      )
    );
  };

  const handleTypeChange = (id: string, nextType: InvoiceLineItemType) => {
    onChange(
      value.map((item) => {
        if (item.id !== id) return item;

        const allowedUnits = allowedUnitsByType[nextType];
        const fallbackUnit = defaultUnitByType[nextType];
        const nextRateUnit = allowedUnits.includes(item.rateUnit)
          ? item.rateUnit
          : fallbackUnit;

        return {
          ...item,
          type: nextType,
          rateUnit: nextRateUnit,
        };
      })
    );

    requestAnimationFrame(() => {
      const nextSuggestions = deliverableSuggestions[nextType];
      if (nextSuggestions.length > 0) {
        openDescriptionMenu(id);
      }
    });
  };

  const openDescriptionMenu = (id: string) => {
    const input = inputRefs.current[id];
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setMenu({
      itemId: id,
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "UI/UX",
      description: "",
      qty: 1,
      rate: 0,
      rateUnit: defaultUnitByType["UI/UX"],
    };

    onChange([...value, newItem]);

    requestAnimationFrame(() => {
      const input = inputRefs.current[newItem.id];
      input?.focus();
    });
  };

  const removeLineItem = (id: string) => {
    if (value.length <= 1) return;
    onChange(value.filter((item) => item.id !== id));

    if (menu?.itemId === id) {
      setMenu(null);
    }
  };

  const canDeleteRows = value.length > 1;

  const activeItem = useMemo(
    () => value.find((item) => item.id === menu?.itemId) ?? null,
    [menu, value]
  );

  const filteredSuggestions =
    activeItem && menu
      ? (() => {
          const allSuggestions = deliverableSuggestions[activeItem.type];
          const query = activeItem.description.trim().toLowerCase();

          if (!query) return allSuggestions;

          const exactMatch = allSuggestions.some(
            (suggestion) => suggestion.toLowerCase() === query
          );

          if (exactMatch) return allSuggestions;

          return allSuggestions.filter((suggestion) =>
            suggestion.toLowerCase().includes(query)
          );
        })()
      : [];

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border bg-white p-2 text-sm text-black outline-none focus:border-black ${
      hasError ? "border-red-400 bg-red-50/30" : "border-gray-300"
    }`;
  const rateInputClass = (hasError?: string) =>
    `w-full rounded-xl border bg-white py-2 pl-9 pr-2 text-sm text-black outline-none focus:border-black ${
      hasError ? "border-red-400 bg-red-50/30" : "border-gray-300"
    }`;
  const currencySymbol = getCurrencySymbol(currency);

  const numberInputProps = {
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
        e.preventDefault();
      }
    },
  };

  return (
    <section className="overflow-visible rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
        Deliverables
      </h2>

      <div ref={containerRef} className="overflow-x-auto overflow-y-visible">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[24%]" />
            <col className="w-[110px]" />
            <col className="w-[140px]" />
            <col className="w-[210px]" />
            <col className="w-[90px]" />
            <col className="w-[92px]" />
          </colgroup>

          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-700">
              <th className="pb-3 pr-3">Type *</th>
              <th className="pb-3 px-3">Description *</th>
              <th className="pb-3 px-3">Qty *</th>
              <th className="pb-3 px-3">
                <span className="inline-flex items-center">
                  Rate ({currency})
                  <RateTooltip currency={currency} />
                </span>
              </th>
              <th className="pb-3 px-3">
                <span className="inline-flex items-center">
                  Unit *
                  <UnitTooltip />
                </span>
              </th>
              <th className="pb-3 pl-3">Total</th>
              <th className="pb-3 pl-0 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {value.map((item) => {
              const lineTotal = item.qty * item.rate;
              const placeholder = shortPlaceholders[item.type];
              const helperCopy = helperCopyByType[item.type];
              const allowedUnits = allowedUnitsByType[item.type];
              const rowErrors = errors?.[item.id];

              return (
                <tr key={item.id} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-3">
                    <div className="relative">
                      <select
                        value={item.type}
                        onChange={(e) =>
                          handleTypeChange(
                            item.id,
                            e.target.value as InvoiceLineItemType
                          )
                        }
                        className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-black outline-none focus:border-black"
                      >
                        {typeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <input
                      ref={(el) => {
                        inputRefs.current[item.id] = el;
                      }}
                      type="text"
                      value={item.description}
                      onFocus={() => openDescriptionMenu(item.id)}
                      onClick={() => openDescriptionMenu(item.id)}
                      onChange={(e) => {
                        updateItem(item.id, "description", e.target.value);
                        openDescriptionMenu(item.id);
                      }}
                      placeholder={placeholder}
                      className={inputClass(rowErrors?.description)}
                    />

                    {rowErrors?.description ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {rowErrors.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      {helperCopy}
                    </p>
                  </td>

                  <td className="py-3 px-3">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "qty",
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className={inputClass(rowErrors?.qty)}
                      {...numberInputProps}
                    />
                    {rowErrors?.qty ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {rowErrors.qty}
                      </p>
                    ) : null}
                  </td>

                  <td className="py-3 px-3">
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-gray-500">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "rate",
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className={rateInputClass(rowErrors?.rate)}
                        {...numberInputProps}
                      />
                    </div>
                    {rowErrors?.rate ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {rowErrors.rate}
                      </p>
                    ) : null}
                  </td>

                  <td className="py-3 px-3">
                    <div className="relative">
                      <select
                        value={item.rateUnit}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "rateUnit",
                            e.target.value as InvoiceRateUnit
                          )
                        }
                        className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-black outline-none focus:border-black"
                      >
                        {allowedUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unitLabels[unit]}
                          </option>
                        ))}
                      </select>

                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </td>

                  <td className="py-3 pl-3 font-medium text-black">
                    {formatCurrency(lineTotal, currency)}
                  </td>

                  <td className="py-3 pl-0 text-right">
                    {canDeleteRows ? (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:border-red-400 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    ) : (
                      <div className="h-[36px]" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {menu && activeItem && filteredSuggestions.length > 0 && (
        <div
          className="fixed z-[200] max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
          style={{
            top: menu.top,
            left: menu.left,
            width: menu.width,
          }}
        >
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                updateItem(activeItem.id, "description", suggestion);
                setMenu(null);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-black transition hover:bg-gray-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={addLineItem}
          className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-bold text-black transition hover:border-black"
        >
          + Add New Line Item
        </button>
      </div>
    </section>
  );
}
