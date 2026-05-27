"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import { upsertProfile } from "@/lib/supabase/profiles";
import type { AgencyDetails } from "@/types/invoice";
import { 
  appFieldLabelClass, 
  getAppButtonClass, 
  getAppFieldClass,
  cn
} from "@/lib/ui-foundation";
import AppSelectField from "@/components/ui/AppSelectField";

const SNIPER_DEFAULTS = {
  msaPaymentTermsDays: 15,
  msaLateFeeRate: 1.5,
  msaLateFeeUnit: "monthly" as const,
  msaIpTriggerType: "upon_full_payment" as const,
  msaLicenseType: "full-assignment" as const,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: "",
    state: "",
  });

  const handleNext = () => {
    if (step === 1 && (!formData.agencyName || !formData.state)) return;
    setStep(step + 1);
  };

  const getNextRoute = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("next") || "/invoice/new";
    }
    return "/invoice/new";
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const agencyDetails: AgencyDetails = {
        agencyName: formData.agencyName,
        agencyState: formData.state as any,
        address: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        pinCode: "",
        gstin: "",
        pan: "",
        logoUrl: "",
        gstRegistrationStatus: "not-registered",
        lutAvailability: "no",
        lutNumber: "",
        lutValidity: "",
        noLutTaxHandling: "",
        signatureUrl: "",
        ...SNIPER_DEFAULTS,
        msaJurisdictionCity: formData.state.split(" ")[0] || "Bangalore",
      };

      const { error } = await upsertProfile(agencyDetails);
      if (error) throw new Error(error);
      
      router.push(getNextRoute());
    } catch (err) {
      console.error("Onboarding failed:", err);
      setIsSubmitting(false);
    }
  };

  const skipOnboarding = () => {
    router.push(getNextRoute());
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-paper)] flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[color:var(--color-lime-300)] mb-4 shadow-[0_0_20px_rgba(191,255,0,0.3)]">
            <span className="text-xl font-black text-black">L</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--color-ink)] sm:text-[32px]">
            Welcome to Lance
          </h1>
          <p className="text-sm text-[color:var(--color-ink-2)] mt-2">
            Let's set up your creative studio in seconds.
          </p>
        </div>

        <div className="relative min-h-[380px]">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className={appFieldLabelClass}>Agency / Brand Name</label>
                    <input
                      type="text"
                      value={formData.agencyName}
                      onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                      placeholder="e.g. Liquid Studios"
                      className={getAppFieldClass({ hasValue: Boolean(formData.agencyName) })}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={appFieldLabelClass}>Primary State / Jurisdiction</label>
                    <AppSelectField
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      hasValue={Boolean(formData.state)}
                    >
                      <option value="">Select state...</option>
                      {INDIA_STATE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </AppSelectField>
                    <p className="mt-2 text-[11px] text-[color:var(--color-ink-2)] leading-relaxed">
                      Used to automate GST calculations (IGST/CGST/SGST) correctly.
                    </p>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button
                    onClick={handleNext}
                    disabled={!formData.agencyName || !formData.state}
                    className={getAppButtonClass({ variant: "primary", fullWidth: true })}
                  >
                    Next
                  </button>
                  <button
                    onClick={skipOnboarding}
                    className="w-full text-center text-sm text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)] transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-2 border-[#111118] bg-white p-6 shadow-[var(--brutal-shadow-sm)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-[#bfff00]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--color-ink)]">
                      Standard Contract Terms
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[color:var(--color-ink-2)]">Payment Terms</span>
                      <span className="text-sm font-bold text-black">Net 15 Days</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[color:var(--color-ink-2)]">Late Fee</span>
                      <span className="text-sm font-bold text-black">1.5% / month</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[color:var(--color-ink-2)]">IP Transfer</span>
                      <span className="text-sm font-bold text-black">Upon Full Payment</span>
                    </div>
                  </div>
                  
                  <p className="mt-6 text-[11px] text-[color:var(--color-ink-2)] italic leading-relaxed">
                    These "Sniper Defaults" ensure you're legally protected on every invoice. You can customize these later in your profile.
                  </p>
                </div>

                <div className="pt-4 space-y-4">
                  <button
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className={getAppButtonClass({ variant: "primary", fullWidth: true })}
                  >
                    {isSubmitting ? "Setting up..." : "Save & Continue"}
                  </button>
                  <button
                    onClick={skipOnboarding}
                    className="w-full text-center text-sm text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)] transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-12 flex gap-2">
        <div className={cn("w-2 h-2 transition-colors", step === 1 ? "bg-[#bfff00]" : "bg-gray-200")} />
        <div className={cn("w-2 h-2 transition-colors", step === 2 ? "bg-[#bfff00]" : "bg-gray-200")} />
      </div>
    </div>
  );
}
