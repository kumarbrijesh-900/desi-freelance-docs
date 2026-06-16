"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { upsertProfile } from "@/lib/supabase/profiles";
import {
  isValidGstin,
  getStateFromGstin,
  derivePanFromGstin,
} from "@/lib/gstin-parser";
import type { AgencyDetails } from "@/types/invoice";
import {
  appFieldLabelClass,
  getAppButtonClass,
  getAppFieldClass,
} from "@/lib/ui-foundation";
import AppSelectField from "@/components/ui/AppSelectField";
import AppSegmentedControl from "@/components/ui/AppSegmentedControl";

const SNIPER_DEFAULTS = {
  msaPaymentTermsDays: 15,
  msaLateFeeRate: 1.5,
  msaLateFeeUnit: "monthly" as const,
  msaIpTriggerType: "upon_full_payment" as const,
  msaLicenseType: "full-assignment" as const,
};

// Each profession maps 1:1 to a canonical line-item catalog category, stored in
// primaryService and later used to preset the default deliverable type.
const PROFESSION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Graphic Design", label: "Graphic & brand design" },
  { value: "Logo Design", label: "Logo & visual identity" },
  { value: "UI/UX Design", label: "UI/UX & product design" },
  { value: "Illustration", label: "Illustration" },
  { value: "Software Development", label: "Software development" },
  { value: "Photography", label: "Photography" },
  { value: "Videography", label: "Videography" },
  { value: "Video Editing", label: "Video editing" },
  { value: "Motion Graphics", label: "Motion graphics & animation" },
  { value: "Social Media Content", label: "Social media content" },
  { value: "Architecture & Interior Design", label: "Architecture & interior" },
  { value: "Consulting", label: "Consulting & strategy" },
  { value: "Other", label: "Something else" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [touched, setTouched] = useState(false);
  const [gstRegistered, setGstRegistered] = useState<"yes" | "no" | "">("");
  const [form, setForm] = useState({
    agencyName: "",
    profession: "",
    gstin: "",
    state: "",
  });

  const set = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const gstinValid = isValidGstin(form.gstin);
  const detectedState = gstinValid ? getStateFromGstin(form.gstin) : "";

  const nameError = touched && !form.agencyName.trim();
  const professionError = touched && !form.profession;
  const gstChoiceError = touched && gstRegistered === "";
  const gstinError = touched && gstRegistered === "yes" && !gstinValid;
  const stateError = touched && gstRegistered === "no" && !form.state;

  const getNextRoute = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("next") || "/invoice/new";
    }
    return "/invoice/new";
  };

  const buildAgency = (): AgencyDetails => {
    const registered = gstRegistered === "yes";
    const agencyState = registered
      ? getStateFromGstin(form.gstin)
      : (form.state as AgencyDetails["agencyState"]);
    return {
      agencyName: form.agencyName.trim(),
      agencyState,
      address: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      pinCode: "",
      gstin: registered ? form.gstin.trim().toUpperCase() : "",
      pan: registered ? derivePanFromGstin(form.gstin) : "",
      logoUrl: "",
      gstRegistrationStatus:
        gstRegistered === "" ? "" : registered ? "registered" : "not-registered",
      lutAvailability: "no",
      lutNumber: "",
      lutValidity: "",
      noLutTaxHandling: "",
      signatureUrl: "",
      primaryService: form.profession,
      ...SNIPER_DEFAULTS,
      msaJurisdictionCity: "",
    };
  };

  const handleStart = async () => {
    setTouched(true);
    if (!form.agencyName.trim() || !form.profession || gstRegistered === "") return;
    if (gstRegistered === "yes" && !gstinValid) return;
    if (gstRegistered === "no" && !form.state) return;

    setSaveError("");
    setIsSubmitting(true);
    try {
      const { error } = await upsertProfile(buildAgency(), {});
      if (error) throw new Error(error);
      router.push(getNextRoute());
    } catch (err) {
      console.error("Onboarding failed:", err);
      setSaveError(
        "Couldn't save your details — check your connection and try again.",
      );
      setIsSubmitting(false);
    }
  };

  // "Later" still writes a profile row so login never re-prompts onboarding.
  const handleLater = async () => {
    setSaveError("");
    setIsSubmitting(true);
    try {
      await upsertProfile(buildAgency(), {});
    } catch (err) {
      console.error("Onboarding skip persist failed:", err);
    }
    router.push(getNextRoute());
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--color-paper)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3.5 inline-grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-[color:var(--color-acid)] shadow-[0_12px_24px_-12px_rgba(30,61,51,0.6)]">
            <span className="font-display text-[24px] font-extrabold text-[color:var(--color-acc-ink)]">L</span>
          </div>
          <h1 className="font-display text-[27px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Welcome to Lance
          </h1>
          <p className="mx-auto mt-2 max-w-[24em] text-[14.5px] leading-relaxed text-[color:var(--color-ink-2)]">
            One quick thing, so every invoice is <b className="font-bold text-[color:var(--color-ink)]">GST-correct from the first one</b>.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleStart();
          }}
          className="rounded-[18px] border border-soft bg-[color:var(--color-paper-2)] p-[22px] shadow-[0_18px_44px_-26px_rgba(30,61,51,0.5)]"
        >
          <div className="mb-4">
            <label className={appFieldLabelClass} htmlFor="agencyName">Studio / brand name</label>
            <input
              id="agencyName"
              type="text"
              value={form.agencyName}
              onChange={(e) => set({ agencyName: e.target.value })}
              placeholder="e.g. Liquid Studios"
              autoFocus
              className={getAppFieldClass({ hasValue: Boolean(form.agencyName), hasError: nameError ? "err" : undefined })}
            />
            {nameError && (
              <p className="mt-1.5 text-[11px] font-semibold text-[color:var(--color-coral)]">Enter your studio or brand name.</p>
            )}
          </div>

          <div className="mb-4">
            <label className={appFieldLabelClass} htmlFor="profession">What&rsquo;s your main line of work?</label>
            <AppSelectField
              value={form.profession}
              onChange={(e) => set({ profession: e.target.value })}
              hasValue={Boolean(form.profession)}
              hasError={professionError ? "err" : undefined}
            >
              <option value="">Select your craft…</option>
              {PROFESSION_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </AppSelectField>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-2)]">
              We&rsquo;ll preset your invoice &amp; milestone line items to match — change it per project anytime.
            </p>
            {professionError && (
              <p className="mt-1.5 text-[11px] font-semibold text-[color:var(--color-coral)]">Pick your main line of work.</p>
            )}
          </div>

          <div className="mb-4">
            <label className={appFieldLabelClass}>Are you registered for GST?</label>
            <AppSegmentedControl
              name="gstRegistered"
              value={gstRegistered}
              columns={2}
              onChange={(v) => setGstRegistered(v as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes, I have a GSTIN" },
                { value: "no", label: "No / not yet" },
              ]}
            />
            {gstChoiceError && (
              <p className="mt-1.5 text-[11px] font-semibold text-[color:var(--color-coral)]">Let us know so we set up tax correctly.</p>
            )}
          </div>

          {gstRegistered === "yes" && (
            <div className="mb-4">
              <label className={appFieldLabelClass} htmlFor="gstin">Your GSTIN</label>
              <input
                id="gstin"
                type="text"
                value={form.gstin}
                onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                className={getAppFieldClass({ hasValue: Boolean(form.gstin), hasError: gstinError ? "err" : undefined })}
              />
              {detectedState && (
                <div className="mt-2 flex items-center gap-2 rounded-[9px] border border-[rgba(21,122,84,0.22)] bg-[rgba(21,122,84,0.10)] px-3 py-2 text-[12px] font-semibold text-[color:var(--color-grass)]">
                  <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-[color:var(--color-grass)] text-[10px] text-white">✓</span>
                  {detectedState} · detected from your GSTIN
                </div>
              )}
              <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-2)]">
                We&rsquo;ll auto-fill your state and PAN from this — no manual entry.
              </p>
              {gstinError && (
                <p className="mt-1.5 text-[11px] font-semibold text-[color:var(--color-coral)]">Check your GSTIN — that doesn&rsquo;t look right.</p>
              )}
            </div>
          )}

          {gstRegistered === "no" && (
            <div className="mb-4">
              <label className={appFieldLabelClass} htmlFor="state">Your state / jurisdiction</label>
              <AppSelectField
                value={form.state}
                onChange={(e) => set({ state: e.target.value })}
                hasValue={Boolean(form.state)}
                hasError={stateError ? "err" : undefined}
              >
                <option value="">Select state…</option>
                {INDIA_STATE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </AppSelectField>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-2)]">
                Sets your GST split correctly (CGST/SGST vs IGST) on every invoice.
              </p>
              {stateError && (
                <p className="mt-1.5 text-[11px] font-semibold text-[color:var(--color-coral)]">Select your state.</p>
              )}
            </div>
          )}

          <div className="mt-1 flex gap-2.5 rounded-[12px] border border-soft bg-[color:var(--color-paper)] px-3.5 py-3">
            <span className="flex-none text-[15px] leading-tight">🛡️</span>
            <p className="m-0 text-[11.5px] leading-relaxed text-[color:var(--color-ink-2)]">
              Your contract terms — <b className="font-bold text-[color:var(--color-ink)]">Net 15, late fee, IP transfers on full payment</b> — ship on every invoice automatically. Editable anytime in your profile.
            </p>
          </div>

          {saveError && (
            <p className="mt-4 text-center text-[12.5px] font-semibold text-[color:var(--color-coral)]">{saveError}</p>
          )}

          <div className="mt-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className={getAppButtonClass({ variant: "primary", fullWidth: true })}
            >
              {isSubmitting ? "Setting up…" : "Start invoicing →"}
            </button>
            <button
              type="button"
              onClick={handleLater}
              disabled={isSubmitting}
              className="mt-3.5 block w-full text-center text-[13.5px] font-semibold text-[color:var(--color-ink-2)] underline decoration-[color:var(--color-strong)] underline-offset-[3px] transition-colors hover:text-[color:var(--color-ink)]"
            >
              I&rsquo;ll set this up later
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[11.5px] text-[color:var(--color-ink-3)]">
          Address &amp; bank details are added on your first invoice — no need now.
        </p>
      </div>
    </div>
  );
}
