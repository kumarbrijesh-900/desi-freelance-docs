"use client";

import { useState } from "react";
import AppFieldShell from "@/components/ui/AppFieldShell";
import AppSelectField from "@/components/ui/AppSelectField";
import AppSegmentedControl from "@/components/ui/AppSegmentedControl";
import AppTextField from "@/components/ui/AppTextField";
import AppTextareaField from "@/components/ui/AppTextareaField";
import {
  appSectionBodyClass,
  appSectionHeaderClass,
  appSectionShellClass,
  appStickyActionDockClass,
  appStickyRailClass,
  appUtilityWidgetClass,
  getAppFieldGroupClass,
  getAppFieldRowClass,
} from "@/lib/form-foundation";
import {
  appSectionDescriptionClass,
  appSectionTitleClass,
  cn,
  getAppButtonClass,
  getAppStatusPillClass,
  getAppSubtlePanelClass,
} from "@/lib/ui-foundation";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  SaveIcon,
  UploadIcon,
} from "@/components/ui/app-icons";

const railItems = [
  { step: "01", label: "Agency", state: "2 fields left" },
  { step: "02", label: "Client", state: "Ready" },
  { step: "03", label: "Items", state: "1 field left" },
  { step: "04", label: "Payment", state: "Optional section" },
  { step: "05", label: "Meta", state: "Ready" },
  { step: "06", label: "Totals", state: "Pending" },
];

const primitiveSwatches = [
  { label: "Surface", className: "bg-[color:var(--app-color-surface)]" },
  { label: "Muted", className: "bg-[color:var(--app-color-surface-muted)]" },
  { label: "Primary", className: "bg-[color:var(--app-color-primary)]" },
  { label: "Success", className: "bg-emerald-600" },
  { label: "Warning", className: "bg-amber-500" },
  { label: "Danger", className: "bg-rose-500" },
];

export default function DesignSystemReference() {
  const [settlement, setSettlement] = useState<"forex" | "inr" | "not-sure">(
    "forex",
  );
  const [licensingExpanded, setLicensingExpanded] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>("default");

  const themes = [
    { id: "default", label: "Neo-Brutal (Default)", color: "bg-[#BEFF00]" },
    { id: "editorial", label: "Editorial Magazine", color: "bg-[#7A1F1F]" },
    { id: "pastel", label: "Pastel Organic", color: "bg-[#8FA68C]" },
    { id: "riso", label: "Riso Zine", color: "bg-[#FF2D7A]" },
    { id: "bauhaus", label: "Bauhaus Geometric", color: "bg-[#D72638]" },
    { id: "minimal", label: "Japanese Minimal", color: "bg-[#26478D]" },
    { id: "midcentury", label: "Mid-Century Modern", color: "bg-[#E8552E]" },
  ];

  return (
    <div data-theme={activeTheme} className="transition-all duration-300">
      {/* ─── Design System Variant Review Switcher ─── */}
      <div className="mb-8 border-2 border-[#111118] bg-white p-4 shadow-[4px_4px_0_#111118] rounded-none">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#111118] mb-3">
          Design System Variant Review Switcher — Cycle Options
        </p>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTheme(t.id)}
              className={cn(
                "inline-flex items-center gap-2 border-2 border-[#111118] px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.04em] transition-all shadow-[2px_2px_0_#111118] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#111118] active:translate-y-[1px] active:shadow-[1px_1px_0_#111118]",
                activeTheme === t.id ? "bg-[#111118] text-white" : "bg-white text-[#111118]"
              )}
            >
              <span className={cn("h-3 w-3 border border-black/10 shrink-0", t.color)} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 pb-24">
      <section className={cn(appSectionShellClass, "overflow-hidden")}>
        <div className={appSectionHeaderClass}>
          <div className="space-y-2">
            <h1 className={appSectionTitleClass}>Design system foundation</h1>
            <p className={appSectionDescriptionClass}>
              Static reference surface for tokens, primitives, and invoice-first
              form architecture. This page uses mock data only.
            </p>
          </div>
          <span className={getAppStatusPillClass("muted")}>Reference only</span>
        </div>
        <div className={cn(appSectionBodyClass, "space-y-7")}>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Token swatches
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {primitiveSwatches.map((swatch) => (
                <div
                  key={swatch.label}
                  className={cn(
                    getAppSubtlePanelClass("muted"),
                    "space-y-3 p-4",
                  )}
                >
                  <div
                    className={cn(
                      "h-16 rounded-[14px] border border-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
                      swatch.className,
                    )}
                  />
                  <p className="text-sm font-medium text-slate-800">
                    {swatch.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Primitive controls
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={getAppButtonClass({
                  variant: "primary",
                  size: "sm",
                })}
              >
                Primary action
              </button>
              <button
                type="button"
                className={getAppButtonClass({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                Secondary action
              </button>
              <button
                type="button"
                className={getAppButtonClass({ variant: "ghost", size: "sm" })}
              >
                Quiet action
              </button>
              <span className={getAppStatusPillClass("success")}>Ready</span>
              <span className={getAppStatusPillClass("default")}>
                2 required
              </span>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <div
                className={cn(getAppSubtlePanelClass("muted"), "space-y-5 p-5")}
              >
                <AppTextField
                  label="GSTIN"
                  value="29ABCDE1234F1Z5"
                  readOnly
                  hasValue
                  width="identifier"
                  helperText="Identifiers should use semantic widths instead of stretching."
                />
                <AppTextField
                  label="Postal code"
                  value="560025"
                  readOnly
                  hasValue
                  width="postal"
                />
                <AppTextareaField
                  label="Invoice notes"
                  value="Calm long-form entry should feel structured without becoming noisy."
                  readOnly
                  hasValue
                  width="content"
                />
              </div>
              <div
                className={cn(getAppSubtlePanelClass("muted"), "space-y-5 p-5")}
              >
                <AppFieldShell label="Settlement type" width="content">
                  <AppSegmentedControl
                    name="reference-settlement"
                    value={settlement}
                    options={[
                      { value: "forex", label: "Forex" },
                      { value: "inr", label: "INR" },
                      { value: "not-sure", label: "Not sure" },
                    ]}
                    onChange={setSettlement}
                    columns={1}
                  />
                </AppFieldShell>

                <AppFieldShell
                  label="Client currency"
                  helperText="Selects should stay visually consistent with text inputs."
                  width="compact"
                >
                  <AppSelectField hasValue defaultValue="USD">
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                  </AppSelectField>
                </AppFieldShell>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[148px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className={cn(appStickyRailClass, "sticky top-6 p-3")}>
            <div className="space-y-2">
              {railItems.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors",
                    index === 1
                      ? "bg-white text-slate-950 shadow-[var(--app-elevation-soft)]"
                      : "text-slate-600 hover:bg-white/75 hover:text-slate-950",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                      index === 1
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-500",
                    )}
                  >
                    {item.step}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold uppercase tracking-[0.14em]">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {item.state}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className={appSectionShellClass}>
            <div className={appSectionHeaderClass}>
              <div className="space-y-2">
                <h2 className={appSectionTitleClass}>Agency</h2>
                <p className={appSectionDescriptionClass}>
                  Add your business details for the invoice.
                </p>
              </div>
              <span className={getAppStatusPillClass("default")}>
                2 required
              </span>
            </div>
            <div className={appSectionBodyClass}>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_132px]">
                <div className="space-y-5">
                  <div className={getAppFieldRowClass({ columns: 2 })}>
                    <AppTextField
                      label="Agency name"
                      value="Acme Design Studio"
                      readOnly
                      hasValue
                      width="medium"
                    />
                    <AppTextField
                      label="PAN"
                      value="ABCDE1234F"
                      readOnly
                      hasValue
                      width="code"
                    />
                  </div>
                  <div
                    className={getAppFieldRowClass({
                      columns: 3,
                      density: "compact",
                    })}
                  >
                    <AppTextField
                      label="Address line 1"
                      value="2nd Floor, Residency Road"
                      readOnly
                      hasValue
                      width="content"
                    />
                    <AppTextField
                      label="State"
                      value="Karnataka"
                      readOnly
                      hasValue
                      width="medium"
                    />
                    <AppTextField
                      label="PIN"
                      value="560025"
                      readOnly
                      hasValue
                      width="postal"
                    />
                  </div>
                </div>
                <div className={cn(appUtilityWidgetClass, "space-y-2.5")}>
                  <p className="text-sm font-medium text-slate-900">Logo</p>
                  <div className="flex aspect-[4/3] items-center justify-center rounded-[14px] border border-dashed border-slate-300 bg-white/80 text-slate-500">
                    <UploadIcon className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] leading-5 text-slate-500">
                    PNG/JPG
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={appSectionShellClass}>
            <div className={appSectionHeaderClass}>
              <div className="space-y-2">
                <h2 className={appSectionTitleClass}>Items</h2>
                <p className={appSectionDescriptionClass}>
                  Add the billable line items.
                </p>
              </div>
              <span className={getAppStatusPillClass("muted")}>
                Dense row editor
              </span>
            </div>
            <div className={cn(appSectionBodyClass, "space-y-4")}>
              <div className="hidden lg:grid lg:grid-cols-[92px_minmax(0,3.6fr)_72px_132px_116px_104px_40px] lg:gap-2">
                {[
                  "Type",
                  "Description",
                  "Qty",
                  "Rate",
                  "Unit",
                  "Total",
                  "",
                ].map((label) => (
                  <span
                    key={label || "remove"}
                    className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className={cn(getAppFieldGroupClass(), "space-y-3")}>
                <div className="grid gap-2 lg:grid-cols-[92px_minmax(0,3.6fr)_72px_132px_116px_104px_40px]">
                  <AppFieldShell width="full">
                    <AppSelectField hasValue defaultValue="uiux">
                      <option value="uiux">UI/UX</option>
                    </AppSelectField>
                  </AppFieldShell>
                  <AppTextField
                    aria-label="Description"
                    value="Landing page design and export delivery"
                    readOnly
                    hasValue
                  />
                  <AppTextField aria-label="Qty" value="3" readOnly hasValue />
                  <AppTextField
                    aria-label="Rate"
                    value="₹12,000"
                    readOnly
                    hasValue
                  />
                  <AppFieldShell width="full">
                    <AppSelectField hasValue defaultValue="per-screen">
                      <option value="per-screen">Per screen</option>
                    </AppSelectField>
                  </AppFieldShell>
                  <div className="flex h-12 items-center rounded-[var(--app-radius-control)] border border-[color:var(--app-color-border)] bg-[color:var(--app-color-surface-muted)] px-4 text-sm font-medium text-slate-700">
                    ₹36,000
                  </div>
                  <button
                    type="button"
                    className={getAppButtonClass({
                      variant: "ghost",
                      size: "sm",
                    })}
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
                <div className="grid gap-2 lg:grid-cols-[92px_minmax(0,3.6fr)_72px_132px_116px_104px_40px]">
                  <div />
                  <p className="min-h-[20px] text-[11px] leading-5 text-slate-500">
                    Description stays dominant and visible; helper/error space
                    is reserved in the row.
                  </p>
                  <p className="min-h-[20px] text-[11px] leading-5 text-slate-500">
                    Qty
                  </p>
                  <p className="min-h-[20px] text-[11px] leading-5 text-slate-500">
                    Rate
                  </p>
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            </div>
          </section>

          <section className={appSectionShellClass}>
            <div className={appSectionHeaderClass}>
              <div className="space-y-2">
                <h2 className={appSectionTitleClass}>Payment</h2>
                <p className={appSectionDescriptionClass}>
                  Add payment and bank details.
                </p>
              </div>
              <span className={getAppStatusPillClass("muted")}>
                Optional controls
              </span>
            </div>
            <div className={appSectionBodyClass}>
              <div className="space-y-5">
                <AppFieldShell
                  label="Settlement type"
                  helperText="Use segmented controls for short exclusive choices."
                >
                  <AppSegmentedControl
                    name="payment-settlement-demo"
                    value={settlement}
                    options={[
                      { value: "forex", label: "Forex" },
                      { value: "inr", label: "INR" },
                      { value: "not-sure", label: "Not sure" },
                    ]}
                    onChange={setSettlement}
                    columns={1}
                  />
                </AppFieldShell>

                <div
                  className={cn(
                    getAppFieldGroupClass({ tone: "muted" }),
                    "space-y-4",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        License terms
                      </p>
                      <p className="text-sm leading-6 text-slate-500">
                        Optional subsection that stays lightweight until needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLicensingExpanded((current) => !current)
                      }
                      className={getAppButtonClass({
                        variant: "secondary",
                        size: "sm",
                      })}
                    >
                      {licensingExpanded ? (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          License terms added
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="h-4 w-4" />
                          Add license terms
                        </>
                      )}
                    </button>
                  </div>

                  {licensingExpanded ? (
                    <div
                      className={getAppFieldRowClass({
                        columns: 2,
                        density: "compact",
                      })}
                    >
                      <AppTextField
                        label="License duration"
                        value="12 months"
                        readOnly
                        hasValue
                        width="medium"
                      />
                      <AppTextField
                        label="Usage territory"
                        value="Worldwide web"
                        readOnly
                        hasValue
                        width="content"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_144px]">
                  <div className="space-y-4">
                    <div
                      className={getAppFieldRowClass({
                        columns: 2,
                        density: "compact",
                      })}
                    >
                      <AppTextField
                        label="Beneficiary name"
                        value="Acme Design Studio"
                        readOnly
                        hasValue
                        width="medium"
                      />
                      <AppTextField
                        label="Bank name"
                        value="HDFC Bank"
                        readOnly
                        hasValue
                        width="medium"
                      />
                    </div>
                    <div
                      className={getAppFieldRowClass({
                        columns: 3,
                        density: "compact",
                      })}
                    >
                      <AppTextField
                        label="Account number"
                        value="50200044321098"
                        readOnly
                        hasValue
                        width="identifier"
                      />
                      <AppTextField
                        label="SWIFT / BIC"
                        value="HDFCINBB"
                        readOnly
                        hasValue
                        width="code"
                      />
                      <AppTextField
                        label="IBAN / Routing"
                        value="N/A"
                        readOnly
                        hasValue
                        width="medium"
                      />
                    </div>
                  </div>
                  <div className={cn(appUtilityWidgetClass, "space-y-2.5")}>
                    <p className="text-sm font-medium text-slate-900">QR</p>
                    <div className="flex aspect-square max-h-24 items-center justify-center rounded-[14px] border border-dashed border-slate-300 bg-white/80 text-slate-500">
                      <UploadIcon className="h-5 w-5" />
                    </div>
                    <p className="text-[11px] leading-5 text-slate-500">
                      Optional utility
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <div className="pointer-events-none sticky bottom-4 z-30 flex justify-end">
        <div
          className={cn(
            appStickyActionDockClass,
            "pointer-events-auto flex flex-wrap items-center gap-2 p-2.5",
          )}
        >
          <button
            type="button"
            className={getAppButtonClass({ variant: "ghost", size: "sm" })}
          >
            Cancel
          </button>
          <button
            type="button"
            className={getAppButtonClass({ variant: "secondary", size: "sm" })}
          >
            <SaveIcon className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            className={getAppButtonClass({ variant: "primary", size: "sm" })}
          >
            <DownloadIcon className="h-4 w-4" />
            Preview &amp; download
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
