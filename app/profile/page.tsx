/**
 * ─── Profile Page ──────────────────────────────────
 *
 * Auth-gated page for managing agency details and
 * payment defaults. Data saved here auto-fills every
 * new invoice, eliminating repetitive data entry.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { MotionReveal, MotionButton, SuccessPulse } from "@/components/ui/motion-primitives";
import {
  appGridClass,
  appPageContainerClass,
  appPageShellClass,
} from "@/lib/layout-foundation";
import {
  getAppButtonClass,
  getAppFieldClass,
  getAppPanelClass,
  appFieldLabelClass,
  appSectionTitleClass,
  appSectionDescriptionClass,
  appFieldHelperTextClass,
} from "@/lib/ui-foundation";
import { ChevronLeftIcon, SaveIcon } from "@/components/ui/app-icons";
import {
  loadProfile,
  upsertProfile,
  type UserProfile,
} from "@/lib/supabase/profiles";
import { supabase } from "@/lib/supabase/client";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { uploadProfessionalAsset } from "@/lib/supabase/storage";
import type { AgencyDetails, PaymentDetails } from "@/types/invoice";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";

/* ─── Section Label Component ─────────────────────── */

function SectionLabel({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className={appSectionTitleClass}>
        <span className="mr-2">{icon}</span>
        {title}
      </h2>
      <p className={`mt-1 ${appSectionDescriptionClass}`}>{description}</p>
    </div>
  );
}

/* ─── Field Row Component ─────────────────────────── */

function FieldRow({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={appFieldLabelClass}>{label}</label>
      {children}
      {helper && <p className={appFieldHelperTextClass}>{helper}</p>}
    </div>
  );
}

/* ─── Main Page Component ─────────────────────────── */

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success">("idle");
  const [userId, setUserId] = useState<string>("");

  // Form Fields - Agency fields
  const [agencyName, setAgencyName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [agencyState, setAgencyState] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [gstStatus, setGstStatus] = useState("not-registered");

  // Payment fields
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [swiftBicCode, setSwiftBicCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  // MSA Defaults
  const [msaPaymentTermsDays, setMsaPaymentTermsDays] = useState(20);
  const [msaLateFeeRate, setMsaLateFeeRate] = useState(1.5);
  const [msaLateFeeUnit, setMsaLateFeeUnit] = useState<"monthly" | "annually" | "daily">("monthly");
  const [msaIpTriggerType, setMsaIpTriggerType] = useState("upon_full_payment");
  const [msaJurisdictionCity, setMsaJurisdictionCity] = useState("Bangalore");

  // Load auth + profile
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setIsAuthenticated(true);
      setUserId(user.id);

      const { data: profile, error: loadError } = await loadProfile();
      if (loadError) {
        console.error("PROFILE_INIT_ERROR:", loadError);
      }
      
      if (profile) {
        console.log("PROFILE_INIT_SUCCESS: Setting fields for", profile.agency_name);
        setAgencyName(profile.agency_name || "");
        setAddressLine1(profile.address_line1 || "");
        setAddressLine2(profile.address_line2 || "");
        setCity(profile.city || "");
        setPinCode(profile.pin_code || "");
        setAgencyState(profile.state || "");
        setGstin(profile.gstin || "");
        setPan(profile.pan || "");
        setLogoUrl(profile.logo_url || "");
        setGstStatus(profile.gst_registration_status || "not-registered");
        setBankName(profile.bank_name || "");
        setAccountName(profile.account_name || "");
        setAccountNumber(profile.account_number || "");
        setIfscCode(profile.ifsc_code || "");
        setBankAddress(profile.bank_address || "");
        setSwiftBicCode(profile.swift_bic_code || "");
        setQrCodeUrl(profile.qr_code_url || "");
        setSignatureUrl(profile.signature_url || "");
        
        // MSA Defaults
        setMsaPaymentTermsDays(profile.msa_payment_terms_days ?? 20);
        setMsaLateFeeRate(profile.msa_late_fee_rate ?? 1.5);
        setMsaLateFeeUnit((profile.msa_late_fee_unit as any) || "monthly");
        setMsaIpTriggerType(profile.msa_ip_trigger_type || "upon_full_payment");
        setMsaJurisdictionCity(profile.msa_jurisdiction_city || "Bangalore");
      } else {
        console.log("PROFILE_INIT_INFO: No profile data to apply.");
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const fc = getAppFieldClass;

  /* ── Image Upload Helper ────────────────────────── */
  const ImageUploadField = ({ 
    label, 
    helper, 
    value, 
    onUrlChange, 
    folder 
  }: { 
    label: string; 
    helper: string; 
    value: string; 
    onUrlChange: (url: string) => void;
    folder: string;
  }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;

      setIsUploading(true);
      const fileName = `${folder}/${userId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { url, error } = await uploadProfessionalAsset(file, fileName);
      
      if (url) {
        onUrlChange(url);
      } else if (error) {
        alert("Upload failed: " + error);
      }
      setIsUploading(false);
    };

    return (
      <div className="sm:col-span-2">
        <FieldRow label={label} helper={helper}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={value}
                  onChange={(e) => onUrlChange(e.target.value)}
                  placeholder="Paste URL or upload image"
                  className={fc({ hasValue: Boolean(value) })}
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-soft)] transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--interactive-primary)] border-t-transparent"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <span>Upload File</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {value && (
              <div className="relative group w-20 h-20 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)] overflow-hidden transition-all hover:border-[color:var(--interactive-primary)]">
                <img src={value} alt={label} className="w-full h-full object-contain" />
                <button 
                  type="button"
                  onClick={() => onUrlChange("")}
                  className="absolute top-1 right-1 bg-[color:var(--bg-canvas)]/80 text-[color:var(--text-primary)] rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </FieldRow>
      </div>
    );
  };

  const handleSave = async () => {
    setSaveState("saving");
    playInteractionCue("stepComplete");

    const agency: AgencyDetails = {
      agencyName,
      address: [addressLine1, addressLine2, city, agencyState, pinCode].filter(Boolean).join(", "),
      addressLine1,
      addressLine2,
      city,
      pinCode,
      agencyState: agencyState as AgencyDetails["agencyState"],
      gstin,
      pan,
      logoUrl,
      gstRegistrationStatus: gstStatus as AgencyDetails["gstRegistrationStatus"],
      lutAvailability: "",
      lutNumber: "",
      noLutTaxHandling: "",
      signatureUrl,
      msaPaymentTermsDays,
      msaLateFeeRate,
      msaLateFeeUnit,
      msaIpTriggerType: msaIpTriggerType as AgencyDetails["msaIpTriggerType"],
      msaJurisdictionCity,
    };

    const payment: Partial<PaymentDetails> = {
      bankName,
      accountName,
      accountNumber,
      ifscCode,
      bankAddress,
      swiftBicCode,
      qrCodeUrl,
    };

    const { error } = await upsertProfile(agency, payment);

    if (error) {
      console.error("Save failed:", error);
      setSaveState("idle");
      return;
    }

    setSaveState("success");
    playInteractionCue("saveSuccess");
    setTimeout(() => setSaveState("idle"), 2500);
  };

  if (isLoading) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[color:var(--text-muted)]">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">Sign in to manage your profile</p>
          <p className="text-[13px] text-[color:var(--text-muted)]">Your profile auto-fills agency details on every invoice.</p>
          <Link href="/login" className={getAppButtonClass({ variant: "primary" })}>
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={appPageShellClass}>
      <AppHeader
        rightSlot={
          <MotionButton
            onClick={handleSave}
            disabled={saveState === "saving"}
            className={getAppButtonClass({ variant: "primary" })}
          >
            {saveState === "saving" ? (
              "Saving…"
            ) : saveState === "success" ? (
              <SuccessPulse>✓ Saved!</SuccessPulse>
            ) : (
              <>
                <SaveIcon className="h-4 w-4" />
                Save Profile
              </>
            )}
          </MotionButton>
        }
      />

      <section className={`${appPageContainerClass} py-5 sm:py-8`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-8 lg:col-start-3">
            {/* Header */}
            <MotionReveal preset="fade-up">
              <div className="mb-6">
                <Link
                  href="/"
                  className="mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                  Back to Home
                </Link>
                <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                  Your Profile
                </h1>
                <p className="mt-1.5 text-[13px] text-[color:var(--text-muted)]">
                  Agency details saved here auto-fill every new invoice you create.
                </p>
              </div>
            </MotionReveal>

            {/* Agency Details */}
            <MotionReveal preset="fade-up" delay={10}>
              <div className={`${getAppPanelClass()} mb-4`}>
                <SectionLabel
                  icon="🏢"
                  title="Agency Details"
                  description="Your studio or freelancer identity shown on invoices."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldRow label="Agency / Studio Name">
                      <input
                        type="text"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="e.g. Ashok Creative Studio"
                        className={fc({ hasValue: Boolean(agencyName) })}
                      />
                    </FieldRow>
                  </div>

                  <FieldRow label="Address Line 1">
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="Building, street"
                      className={fc({ hasValue: Boolean(addressLine1) })}
                    />
                  </FieldRow>

                  <FieldRow label="Address Line 2">
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Area, landmark"
                      className={fc({ hasValue: Boolean(addressLine2) })}
                    />
                  </FieldRow>

                  <FieldRow label="City">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className={fc({ hasValue: Boolean(city) })}
                    />
                  </FieldRow>

                  <FieldRow label="PIN Code">
                    <input
                      type="text"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="e.g. 560001"
                      className={fc({ hasValue: Boolean(pinCode) })}
                    />
                  </FieldRow>

                  <FieldRow label="State">
                    <select
                      value={agencyState}
                      onChange={(e) => setAgencyState(e.target.value)}
                      className={fc({ hasValue: Boolean(agencyState), isSelect: true })}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </FieldRow>

                  <FieldRow label="GST Status">
                    <select
                      value={gstStatus}
                      onChange={(e) => setGstStatus(e.target.value)}
                      className={fc({ hasValue: Boolean(gstStatus), isSelect: true })}
                    >
                      <option value="not-registered">Not registered</option>
                      <option value="registered">GST registered</option>
                    </select>
                  </FieldRow>

                  {gstStatus === "registered" && (
                    <FieldRow label="GSTIN" helper="15-character GST number">
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 29AAACR5055K1ZK"
                        maxLength={15}
                        className={fc({ hasValue: Boolean(gstin) })}
                      />
                    </FieldRow>
                  )}

                  <FieldRow label="PAN" helper="10-character PAN number">
                    <input
                      type="text"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="e.g. AAACR5055K"
                      maxLength={10}
                      className={fc({ hasValue: Boolean(pan) })}
                    />
                  </FieldRow>

                  <ImageUploadField 
                    label="Logo" 
                    helper="Direct link or upload your logo (PNG, SVG, 1:1 recommended)"
                    value={logoUrl}
                    onUrlChange={setLogoUrl}
                    folder="logos"
                  />

                  <ImageUploadField 
                    label="Digital Signature" 
                    helper="Direct link or upload your signature image (PNG with transparent background recommended)"
                    value={signatureUrl}
                    onUrlChange={setSignatureUrl}
                    folder="signatures"
                  />
                </div>
              </div>
            </MotionReveal>

            {/* Payment Defaults */}
            <MotionReveal preset="fade-up" delay={20}>
              <div className={`${getAppPanelClass()} mb-4`}>
                <SectionLabel
                  icon="💳"
                  title="Payment Defaults"
                  description="Bank details pre-filled on every invoice. Update anytime."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Bank Name">
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className={fc({ hasValue: Boolean(bankName) })}
                    />
                  </FieldRow>

                  <FieldRow label="Account Holder Name">
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Name on account"
                      className={fc({ hasValue: Boolean(accountName) })}
                    />
                  </FieldRow>

                  <FieldRow label="Account Number">
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 1234567890"
                      className={fc({ hasValue: Boolean(accountNumber) })}
                    />
                  </FieldRow>

                  <FieldRow label="IFSC Code">
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className={fc({ hasValue: Boolean(ifscCode) })}
                    />
                  </FieldRow>

                  <ImageUploadField 
                    label="Payment QR Code" 
                    helper="Direct link or upload your UPI / Payment QR code image"
                    value={qrCodeUrl}
                    onUrlChange={setQrCodeUrl}
                    folder="qrcodes"
                  />

                  <div className="sm:col-span-2">
                    <FieldRow label="Bank Address" helper="For international payments (SWIFT transfers)">
                      <input
                        type="text"
                        value={bankAddress}
                        onChange={(e) => setBankAddress(e.target.value)}
                        placeholder="Optional — bank branch address"
                        className={fc({ hasValue: Boolean(bankAddress) })}
                      />
                    </FieldRow>
                  </div>

                  <FieldRow label="SWIFT / BIC Code" helper="For international clients">
                    <input
                      type="text"
                      value={swiftBicCode}
                      onChange={(e) => setSwiftBicCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFCINBB"
                      className={fc({ hasValue: Boolean(swiftBicCode) })}
                    />
                  </FieldRow>
                </div>
              </div>
            </MotionReveal>

            {/* MSA Defaults */}
            <MotionReveal preset="fade-up" delay={25}>
              <div className={`${getAppPanelClass()} mb-4`}>
                <SectionLabel
                  icon="⚖️"
                  title="Global Contract Defaults"
                  description="Your Master Services Agreement (MSA) blueprint for new clients."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Default Payment Terms (Days)">
                    <input
                      type="number"
                      value={msaPaymentTermsDays}
                      onChange={(e) => setMsaPaymentTermsDays(Number(e.target.value))}
                      className={fc({ hasValue: true })}
                    />
                  </FieldRow>

                  <FieldRow label="Late Fee Rate (%)">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={msaLateFeeRate}
                        onChange={(e) => setMsaLateFeeRate(Number(e.target.value))}
                        className={fc({ hasValue: true })}
                      />
                      <select
                        value={msaLateFeeUnit}
                        onChange={(e) => setMsaLateFeeUnit(e.target.value as any)}
                        className={fc({ hasValue: true, isSelect: true })}
                      >
                        <option value="monthly">per month</option>
                        <option value="annually">per annum</option>
                        <option value="daily">per day</option>
                      </select>
                    </div>
                  </FieldRow>

                  <FieldRow 
                    label="IP Transfer Trigger"
                    helper="Note: Invoice-specific briefs will override these defaults during AI extraction."
                  >
                    <select
                      value={msaIpTriggerType}
                      onChange={(e) => setMsaIpTriggerType(e.target.value as any)}
                      className={fc({ hasValue: true, isSelect: true })}
                    >
                      <option value="upon_full_payment">Upon Full Payment</option>
                      <option value="upon_signing">Upon Signing</option>
                      <option value="upon_delivery">Upon Delivery</option>
                      <option value="proportional_transfer">Proportional (Per Milestone)</option>
                      <option value="retained_by_creator">Retained by Creator (License Only)</option>
                    </select>
                  </FieldRow>

                  <FieldRow label="Jurisdiction">
                    <input
                      type="text"
                      value={msaJurisdictionCity}
                      onChange={(e) => setMsaJurisdictionCity(e.target.value)}
                      placeholder="e.g. Bangalore"
                      className={fc({ hasValue: Boolean(msaJurisdictionCity) })}
                    />
                  </FieldRow>
                </div>
              </div>
            </MotionReveal>

            {/* Save bar (mobile) */}
            <MotionReveal preset="fade-up" delay={30}>
              <div className="flex justify-end sm:hidden">
                <MotionButton
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className={getAppButtonClass({ variant: "primary", fullWidth: true })}
                >
                  {saveState === "saving" ? "Saving…" : saveState === "success" ? "✓ Saved!" : "Save Profile"}
                </MotionButton>
              </div>
            </MotionReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
