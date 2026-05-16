/**
 * ─── Profile Page ──────────────────────────────────
 *
 * Auth-gated page for managing agency details and
 * payment defaults. Data saved here auto-fills every
 * new invoice, eliminating repetitive data entry.
 */

"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  MotionReveal,
  MotionButton,
  SuccessPulse,
} from "@/components/ui/motion-primitives";
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
  cn,
} from "@/lib/ui-foundation";
import { ChevronLeftIcon, SaveIcon } from "@/components/ui/app-icons";
import {
  loadProfile,
  upsertProfile,
  type UserProfile,
} from "@/lib/supabase/profiles";
import {
  getClientSessionUser,
  supabase,
  withTimeoutFallback,
} from "@/lib/supabase/client";
import { playInteractionCue } from "@/lib/interaction-feedback";
import { uploadProfessionalAsset } from "@/lib/supabase/storage";
import type { AgencyDetails, PaymentDetails } from "@/types/invoice";
import { INDIA_STATE_OPTIONS } from "@/lib/india-state-options";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getCroppedImg } from "@/lib/image-crop-utils";
import { DEFAULT_MSA_TITLE, DEFAULT_MSA_CONTENT } from '@/lib/default-msa';

/* ─── Section Label Component ─────────────────────── */

function SectionLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
        {title}
      </h2>
      <p className={`mt-1.5 ${appSectionDescriptionClass}`}>{description}</p>
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

type ProfileTab = 'agency' | 'banking' | 'contract' | 'compliance';

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success">(
    "idle",
  );
  const [userId, setUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ProfileTab>('agency');
  const [isDirty, setIsDirty] = useState(false);

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
  const [lutNumber, setLutNumber] = useState("");
  const [lutValidity, setLutValidity] = useState("");

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
  const [msaLateFeeUnit, setMsaLateFeeUnit] = useState<
    "monthly" | "annually" | "daily"
  >("monthly");
  const [msaIpTriggerType, setMsaIpTriggerType] = useState("upon_full_payment");
  const [msaJurisdictionCity, setMsaJurisdictionCity] = useState("Bangalore");

  const [globalMsaId, setGlobalMsaId] = useState<string | null>(null);
  const [globalMsaTitle, setGlobalMsaTitle] = useState('');
  const [globalMsaContent, setGlobalMsaContent] = useState('');

  // UI States
  const [isLutExpanded, setIsLutExpanded] = useState(false);
  const [isMsaExpanded, setIsMsaExpanded] = useState(false);

  // Load auth + profile
  useEffect(() => {
    let isActive = true;

    async function init() {
      const user = await withTimeoutFallback(getClientSessionUser(), 2000, null);
      if (!isActive) return;

      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setIsAuthenticated(true);
      setUserId(user.id);

      const { data: profile, error: profileError } = await withTimeoutFallback(
        loadProfile(),
        4000,
        {
          data: null as UserProfile | null,
          error: "Timed out while loading your profile.",
        },
      );
      if (!isActive) return;

      if (profileError && profileError !== "Not authenticated") {
        console.error("PROFILE_INIT_ERROR:", profileError);
        setLoadError(profileError);
        setIsLoading(false);
        return;
      }

      if (profile) {
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
        setLutNumber(profile.lut_number || "");
        setLutValidity(profile.lut_validity || "");
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
      }

      // Load global MSA
      const globalMsaResult = (await Promise.race([
        Promise.resolve(
          supabase
            .from("client_msas")
            .select("id, title, content")
            .eq("user_id", user.id)
            .is("client_id", null)
            .maybeSingle(),
        ),
        new Promise<{
          data: { id: string; title: string; content: string } | null;
          error: { message: string };
        }>((resolve) =>
          globalThis.setTimeout(
            () =>
              resolve({
                data: null,
                error: {
                  message: "Timed out while loading your default contract.",
                },
              }),
            4000,
          ),
        ),
      ])) as {
        data: { id: string; title: string; content: string } | null;
        error: { message: string } | null;
      };
      const { data: globalMsa, error: globalMsaError } = globalMsaResult;
      if (!isActive) return;

      if (globalMsaError) {
        console.error("PROFILE_GLOBAL_MSA_ERROR:", globalMsaError.message);
        setLoadError(globalMsaError.message);
        setIsLoading(false);
        return;
      }

      if (globalMsa) {
        setGlobalMsaId(globalMsa.id);
        setGlobalMsaTitle(globalMsa.title);
        setGlobalMsaContent(globalMsa.content);
      } else {
        setGlobalMsaTitle(DEFAULT_MSA_TITLE);
        setGlobalMsaContent(DEFAULT_MSA_CONTENT);
      }

      setIsLoading(false);
      setIsDirty(false); // Reset dirty after initial load
    }

    void init();

    return () => {
      isActive = false;
    };
  }, []);

  const fc = getAppFieldClass;

  /* ── Image Upload Helper ────────────────────────── */
  const ImageUploadField = ({
    label,
    helper,
    value,
    onUrlChange,
    folder,
  }: {
    label: string;
    helper: string;
    value: string;
    onUrlChange: (url: string) => void;
    folder: string;
  }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImgSrc, setTempImgSrc] = useState("");
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const aspect = label.toLowerCase().includes("qr") ? 1 : undefined;
      const initialCrop = centerCrop(
        makeAspectCrop(
          { unit: "%", width: 90 },
          aspect || width / height,
          width,
          height,
        ),
        width,
        height,
      );
      setCrop(initialCrop);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setTempImgSrc(reader.result?.toString() || "");
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    };

    const handleCropComplete = async () => {
      if (!imgRef.current || !completedCrop || !userId) return;

      setIsUploading(true);
      setCropModalOpen(false);

      try {
        const croppedFile = await getCroppedImg(
          imgRef.current,
          completedCrop,
          `cropped-${Date.now()}.png`,
        );

        const fileName = `${folder}/${userId}-${Date.now()}-cropped.png`;
        const { url, error } = await uploadProfessionalAsset(
          croppedFile,
          fileName,
        );

        if (url) {
          onUrlChange(url);
          setIsDirty(true);
        } else if (error) {
          alert("Upload failed: " + error);
        }
      } catch (err) {
        console.error("Cropping error:", err);
      } finally {
        setIsUploading(false);
        setTempImgSrc("");
      }
    };

    return (
      <div className="col-span-1">
        <FieldRow label={label} helper={helper}>
          <div className="mt-1">
            {value ? (
              <div className="flex items-center justify-between bg-[color:var(--bg-surface-soft)] p-3 ring-1 ring-inset ring-[color:var(--border-subtle)]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white p-1 shadow-sm ring-1 ring-gray-200">
                    <img
                      src={value}
                      alt={label}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-[13px] font-medium text-[color:var(--text-primary)]">
                      {label} Attached
                    </p>
                    <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                      Optimized for invoice placement
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-canvas)] hover:text-[color:var(--text-primary)]"
                    title="Change image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUrlChange("");
                      setIsDirty(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remove"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="group relative flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-[color:var(--border-subtle)] bg-white px-4 transition-all hover:border-[color:var(--interactive-primary)] hover:bg-[color:var(--bg-surface-soft)] disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--interactive-primary)] border-t-transparent"></div>
                    <span className="text-[13px] font-medium text-[color:var(--text-primary)]">
                      Processing...
                    </span>
                  </div>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    <span className="text-[13px] font-medium text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)]">
                      Upload {label}
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              onClick={(e) => (e.currentTarget.value = "")}
            />
          </div>
        </FieldRow>

        {/* Cropper Modal */}
        {cropModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <MotionReveal
              preset="fade-up"
              className="w-full max-w-2xl overflow-hidden bg-[color:var(--bg-surface)] shadow-[var(--brutal-shadow-lg)]"
            >
              <div className="border-b border-[color:var(--border-subtle)] p-4 flex justify-between items-center bg-[color:var(--bg-surface-soft)]">
                <h3 className="font-bold text-[color:var(--text-primary)]">
                  Optimize Your {label}
                </h3>
                <button
                  onClick={() => setCropModalOpen(false)}
                  className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col items-center">
                <p className="mb-4 text-[13px] text-[color:var(--text-muted)] text-center">
                  Crop your image to remove unnecessary margins for a perfect
                  fit on the invoice.
                </p>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={label.toLowerCase().includes("qr") ? 1 : undefined}
                  className="max-h-[50vh]"
                >
                  <img
                    ref={imgRef}
                    src={tempImgSrc}
                    onLoad={onImageLoad}
                    alt="To Crop"
                    style={{ maxWidth: "100%", maxHeight: "50vh" }}
                  />
                </ReactCrop>
              </div>
              <div className="border-t border-[color:var(--border-subtle)] p-4 bg-[color:var(--bg-surface-soft)] flex justify-end gap-3">
                <button
                  onClick={() => setCropModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropComplete}
                  className={getAppButtonClass({ variant: "primary" })}
                >
                  Save & Upload
                </button>
              </div>
            </MotionReveal>
          </div>
        )}
      </div>
    );
  };

  const handleSave = async () => {
    setSaveState("saving");
    playInteractionCue("stepComplete");

    try {
      const agency: AgencyDetails = {
        agencyName,
        address: [addressLine1, addressLine2, city, agencyState, pinCode]
          .filter(Boolean)
          .join(", "),
        addressLine1,
        addressLine2,
        city,
        pinCode,
        agencyState: agencyState as AgencyDetails["agencyState"],
        gstin,
        pan,
        logoUrl,
        gstRegistrationStatus:
          gstStatus as AgencyDetails["gstRegistrationStatus"],
        lutAvailability: lutNumber ? "yes" : "no",
        lutNumber,
        lutValidity,
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

      // Save Global MSA
      if (userId) {
        if (globalMsaId) {
          await supabase
            .from('client_msas')
            .update({
              title: globalMsaTitle,
              content: globalMsaContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', globalMsaId);
        } else {
          const { data } = await supabase
            .from('client_msas')
            .insert({
              user_id: userId,
              client_id: null,
              title: globalMsaTitle,
              content: globalMsaContent,
              status: 'active',
            })
            .select('id')
            .single();
          if (data) setGlobalMsaId(data.id);
        }
      }

      setSaveState("success");
      setIsDirty(false);
      playInteractionCue("saveSuccess");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      console.error("Unexpected save error:", err);
      setSaveState("idle");
    }
  };

  const handleDiscard = () => {
    window.location.reload();
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

  if (loadError) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">
            Could not load your profile
          </p>
          <p className="max-w-md text-[13px] leading-6 text-[color:var(--text-muted)]">
            {loadError} Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={getAppButtonClass({ variant: "primary" })}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={appPageShellClass}>
        <AppHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">
            Sign in to manage your profile
          </p>
          <p className="text-[13px] text-[color:var(--text-muted)]">
            Your profile auto-fills agency details on every invoice.
          </p>
          <Link
            href="/login"
            className={getAppButtonClass({ variant: "primary" })}
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'agency', label: 'Agency' },
    { id: 'banking', label: 'Banking' },
    { id: 'contract', label: 'Contract & MSA' },
    { id: 'compliance', label: 'Compliance' },
  ];

  const updateVal = (setter: any) => (e: any) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  return (
    <main className={cn(appPageShellClass, "pb-24")}>
      <AppHeader />

      <section className={`${appPageContainerClass} pt-8`}>
        <div className={appGridClass}>
          <div className="col-span-4 sm:col-span-8 lg:col-span-8 lg:col-start-3">
            {/* Header */}
            <MotionReveal preset="fade-up">
              <div className="mb-8">
                <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)] sm:text-[32px]">
                  Your Profile
                </h1>
                <p className="mt-1.5 text-[13px] text-[color:var(--text-muted)]">
                  Agency details saved here auto-fill every new invoice you
                  create.
                </p>
              </div>
            </MotionReveal>

            {/* Tabs */}
            <div className="sticky top-[64px] z-20 bg-white border-b border-gray-200 mb-8 -mx-4 px-4 sm:-mx-8 sm:px-8">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "py-4 text-[13px] font-semibold transition-all relative whitespace-nowrap",
                      activeTab === tab.id
                        ? "text-[color:var(--brand-indigo)]"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--brand-indigo)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {(!agencyName || !addressLine1 || !agencyState || !accountNumber) && (
              <div className="mb-6 border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex gap-3">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800">Complete your profile</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Please fill in your agency name, address, state, and account number to ensure your invoices are compliant.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Agency Details Tab */}
            {activeTab === 'agency' && (
              <MotionReveal preset="fade-up" delay={5}>
                <div className={getAppPanelClass()}>
                  <SectionLabel
                    title="Agency Details"
                    description="Your studio or freelancer identity shown on invoices."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldRow label="Agency / Studio Name">
                        <input
                          type="text"
                          value={agencyName}
                          onChange={updateVal(setAgencyName)}
                          placeholder="e.g. Ashok Creative Studio"
                          className={fc({ hasValue: Boolean(agencyName) })}
                        />
                      </FieldRow>
                    </div>

                    <FieldRow label="Address Line 1">
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={updateVal(setAddressLine1)}
                        placeholder="Building, street"
                        className={fc({ hasValue: Boolean(addressLine1) })}
                      />
                    </FieldRow>

                    <FieldRow label="Address Line 2">
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={updateVal(setAddressLine2)}
                        placeholder="Area, landmark"
                        className={fc({ hasValue: Boolean(addressLine2) })}
                      />
                    </FieldRow>

                    <FieldRow label="City">
                      <input
                        type="text"
                        value={city}
                        onChange={updateVal(setCity)}
                        placeholder="e.g. Bengaluru"
                        className={fc({ hasValue: Boolean(city) })}
                      />
                    </FieldRow>

                    <FieldRow label="PIN Code">
                      <input
                        type="text"
                        value={pinCode}
                        onChange={updateVal(setPinCode)}
                        placeholder="e.g. 560001"
                        className={fc({ hasValue: Boolean(pinCode) })}
                      />
                    </FieldRow>

                    <FieldRow label="State">
                      <select
                        value={agencyState}
                        onChange={updateVal(setAgencyState)}
                        className={fc({
                          hasValue: Boolean(agencyState),
                          isSelect: true,
                        })}
                      >
                        <option value="">Select state</option>
                        {INDIA_STATE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </FieldRow>

                    <FieldRow label="GST Status">
                      <select
                        value={gstStatus}
                        onChange={updateVal(setGstStatus)}
                        className={fc({
                          hasValue: Boolean(gstStatus),
                          isSelect: true,
                        })}
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
                          onChange={(e) => {
                            setGstin(e.target.value.toUpperCase());
                            setIsDirty(true);
                          }}
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
                        onChange={(e) => {
                          setPan(e.target.value.toUpperCase());
                          setIsDirty(true);
                        }}
                        placeholder="e.g. AAACR5055K"
                        maxLength={10}
                        className={fc({ hasValue: Boolean(pan) })}
                      />
                    </FieldRow>

                    <ImageUploadField
                      label="Logo"
                      helper="Upload your logo (PNG, SVG, 1:1 recommended)"
                      value={logoUrl}
                      onUrlChange={setLogoUrl}
                      folder="logos"
                    />

                    <ImageUploadField
                      label="Digital Signature"
                      helper="Upload your signature image"
                      value={signatureUrl}
                      onUrlChange={setSignatureUrl}
                      folder="signatures"
                    />

                    <ImageUploadField
                      label="Payment QR Code"
                      helper="Upload your UPI / Payment QR code"
                      value={qrCodeUrl}
                      onUrlChange={setQrCodeUrl}
                      folder="qrcodes"
                    />
                  </div>
                </div>
              </MotionReveal>
            )}

            {/* Banking Tab */}
            {activeTab === 'banking' && (
              <MotionReveal preset="fade-up" delay={5}>
                <div className={getAppPanelClass()}>
                  <SectionLabel
                    title="Payment Defaults"
                    description="Bank details pre-filled on every invoice. Update anytime."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldRow label="Bank Name">
                      <input
                        type="text"
                        value={bankName}
                        onChange={updateVal(setBankName)}
                        placeholder="e.g. HDFC Bank"
                        className={fc({ hasValue: Boolean(bankName) })}
                      />
                    </FieldRow>

                    <FieldRow label="Account Holder Name">
                      <input
                        type="text"
                        value={accountName}
                        onChange={updateVal(setAccountName)}
                        placeholder="Name on account"
                        className={fc({ hasValue: Boolean(accountName) })}
                      />
                    </FieldRow>

                    <FieldRow label="Account Number">
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={updateVal(setAccountNumber)}
                        placeholder="e.g. 1234567890"
                        className={fc({ hasValue: Boolean(accountNumber) })}
                      />
                    </FieldRow>

                    <FieldRow label="IFSC Code">
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => {
                          setIfscCode(e.target.value.toUpperCase());
                          setIsDirty(true);
                        }}
                        placeholder="e.g. HDFC0001234"
                        className={fc({ hasValue: Boolean(ifscCode) })}
                      />
                    </FieldRow>

                    <div className="sm:col-span-2">
                      <FieldRow
                        label="Bank Address"
                        helper="For international payments (SWIFT transfers)"
                      >
                        <input
                          type="text"
                          value={bankAddress}
                          onChange={updateVal(setBankAddress)}
                          placeholder="Optional — bank branch address"
                          className={fc({ hasValue: Boolean(bankAddress) })}
                        />
                      </FieldRow>
                    </div>

                    <FieldRow
                      label="SWIFT / BIC Code"
                      helper="For international clients"
                    >
                      <input
                        type="text"
                        value={swiftBicCode}
                        onChange={(e) => {
                          setSwiftBicCode(e.target.value.toUpperCase());
                          setIsDirty(true);
                        }}
                        placeholder="e.g. HDFCINBB"
                        className={fc({ hasValue: Boolean(swiftBicCode) })}
                      />
                    </FieldRow>
                  </div>
                </div>
              </MotionReveal>
            )}

            {/* Contract & MSA Tab */}
            {activeTab === 'contract' && (
              <div className="space-y-4">
                <MotionReveal preset="fade-up" delay={5}>
                  <div className={getAppPanelClass()}>
                    <SectionLabel
                      title="Global Contract Defaults"
                      description="Your Master Services Agreement (MSA) blueprint for new clients."
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldRow label="Default Payment Terms (Days)">
                        <input
                          type="number"
                          value={msaPaymentTermsDays}
                          onChange={(e) => {
                            setMsaPaymentTermsDays(Number(e.target.value));
                            setIsDirty(true);
                          }}
                          className={fc({ hasValue: true })}
                        />
                      </FieldRow>

                      <FieldRow label="Late Fee Rate (%)">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={msaLateFeeRate}
                            onChange={(e) => {
                              setMsaLateFeeRate(Number(e.target.value));
                              setIsDirty(true);
                            }}
                            className={fc({ hasValue: true })}
                          />
                          <select
                            value={msaLateFeeUnit}
                            onChange={(e) => {
                              setMsaLateFeeUnit(e.target.value as any);
                              setIsDirty(true);
                            }}
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
                          onChange={(e) => {
                            setMsaIpTriggerType(e.target.value as any);
                            setIsDirty(true);
                          }}
                          className={fc({ hasValue: true, isSelect: true })}
                        >
                          <option value="upon_full_payment">
                            Upon Full Payment
                          </option>
                          <option value="upon_signing">Upon Signing</option>
                          <option value="upon_delivery">Upon Delivery</option>
                          <option value="proportional_transfer">
                            Proportional (Per Milestone)
                          </option>
                          <option value="retained_by_creator">
                            Retained by Creator (License Only)
                          </option>
                        </select>
                      </FieldRow>

                      <FieldRow label="Jurisdiction">
                        <input
                          type="text"
                          value={msaJurisdictionCity}
                          onChange={updateVal(setMsaJurisdictionCity)}
                          placeholder="e.g. Bangalore"
                          className={fc({ hasValue: Boolean(msaJurisdictionCity) })}
                        />
                      </FieldRow>
                    </div>
                  </div>
                </MotionReveal>

                <MotionReveal preset="fade-up" delay={10}>
                  <div className={getAppPanelClass()}>
                    <button
                      onClick={() => setIsMsaExpanded(!isMsaExpanded)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                          Global MSA Document
                        </h2>
                      </div>
                      <span className="text-[color:var(--brand-indigo)] text-[12px] font-medium">
                        {isMsaExpanded ? "Hide" : "View/Edit MSA Document →"}
                      </span>
                    </button>

                    {isMsaExpanded && (
                      <div className="mt-6 space-y-4">
                        <p className="text-[12px] text-[color:var(--text-muted)]">
                          Your default Master Services Agreement. Automatically attached to invoices when no client-specific MSA exists.
                        </p>

                        <FieldRow label="MSA Title">
                          <input
                            type="text"
                            value={globalMsaTitle}
                            onChange={updateVal(setGlobalMsaTitle)}
                            className={fc({ hasValue: Boolean(globalMsaTitle) })}
                            placeholder="e.g. Standard Freelance Agreement"
                          />
                        </FieldRow>

                        <FieldRow label="MSA Content">
                          <textarea
                            value={globalMsaContent}
                            onChange={updateVal(setGlobalMsaContent)}
                            rows={12}
                            className={cn(fc({ hasValue: Boolean(globalMsaContent), multiline: true }), "font-mono")}
                            placeholder="Paste or type your MSA terms here..."
                          />
                        </FieldRow>
                      </div>
                    )}
                  </div>
                </MotionReveal>
              </div>
            )}

            {/* Compliance Tab */}
            {activeTab === 'compliance' && (
              <MotionReveal preset="fade-up" delay={5}>
                <div className={getAppPanelClass()}>
                  <button
                    onClick={() => setIsLutExpanded(!isLutExpanded)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <SectionLabel
                      title="Export Compliance"
                      description="Details for zero-tax international or SEZ billing."
                    />
                    <span className="text-[color:var(--brand-indigo)] text-[12px] font-medium">
                      {isLutExpanded ? "Hide" : "Expand LUT Details →"}
                    </span>
                  </button>

                  {isLutExpanded && (
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <FieldRow
                        label="LUT Number"
                        helper="Enter your Letter of Undertaking number if applicable."
                      >
                        <input
                          type="text"
                          value={lutNumber}
                          onChange={(e) => {
                            setLutNumber(e.target.value.toUpperCase());
                            setIsDirty(true);
                          }}
                          placeholder="e.g., AD290324..."
                          className={fc({ hasValue: Boolean(lutNumber) })}
                        />
                      </FieldRow>

                      <FieldRow
                        label="Validity Period"
                        helper="Select the financial year for which the LUT is valid."
                      >
                        <select
                          value={lutValidity}
                          onChange={updateVal(setLutValidity)}
                          className={fc({
                            hasValue: Boolean(lutValidity),
                            isSelect: true,
                          })}
                        >
                          <option value="">Select validity</option>
                          <option value="fy_2025_26">FY 2025-26</option>
                          <option value="fy_2026_27">FY 2026-27</option>
                          <option value="fy_2027_28">FY 2027-28</option>
                        </select>
                      </FieldRow>

                      <div className="sm:col-span-2">
                        <p className={appFieldHelperTextClass}>
                          If provided, this LUT will be automatically applied to
                          International and SEZ invoices to legally enforce 0% IGST.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </MotionReveal>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          {isDirty && (
            <button
              onClick={handleDiscard}
              className={getAppButtonClass({ variant: "ghost" })}
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="inline-flex items-center gap-2 bg-[#bfff00] px-6 py-2.5 text-sm font-bold text-black shadow-sm hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveState === "saving" ? (
              "Saving…"
            ) : saveState === "success" ? (
              <SuccessPulse>✓ Saved!</SuccessPulse>
            ) : (
              "Save Profile"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
