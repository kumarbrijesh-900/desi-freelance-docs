"use client";

import { useState } from "react";
import ProjectPresetStep from "@/components/flow/ProjectPresetStep";
import BriefInputStep from "@/components/flow/BriefInputStep";
import LicensingStep from "@/components/flow/LicensingStep";
import ReviewStep from "@/components/flow/ReviewStep";
import GenerateButtons from "@/components/flow/GenerateButtons";
import Paywall from "@/components/flow/Paywall";
import InvoiceTemplate from "@/components/documents/InvoiceTemplate";
import ScopeTemplate from "@/components/documents/ScopeTemplate";
import WatermarkedNotice from "@/components/documents/WatermarkedNotice";
import { getLicensingSummary } from "@/lib/licensing-summary";
import { extractDocumentData } from "@/lib/extract-document-data";
import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";
import type {
  ProjectPreset,
  LicensingData,
  ExtractedDocumentData,
} from "@/types/document";

const initialLicensingState: LicensingData = {
  licenseType: "",
  duration: "",
  territory: "",
  usageMedium: "",
  sourceFilesIncluded: "",
  portfolioRightsRetained: "",
};

const initialExtractedData: ExtractedDocumentData = {
  clientName: "",
  projectType: "",
  deliverables: [],
  timeline: "",
  revisions: "",
  fee: "",
  gstApplicable: false,
  notes: "",
  exclusions: [],
};

const FREE_GENERATION_LIMIT = 2;

export default function CreateDocumentWizard() {
  const [projectPreset, setProjectPreset] = useState<ProjectPreset | "">("");
  const [rawBrief, setRawBrief] = useState("");
  const [licensing, setLicensing] =
    useState<LicensingData>(initialLicensingState);
  const [extractedData, setExtractedData] =
    useState<ExtractedDocumentData>(initialExtractedData);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showScope, setShowScope] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleMagicFill = async () => {
    try {
      setIsExtracting(true);
      const data = await extractDocumentData(rawBrief, projectPreset);
      setExtractedData(data);
    } catch {
      alert("Magic Fill failed. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const canGenerateMore = generationCount < FREE_GENERATION_LIMIT;
  const isFreeUser = true;

  const handleGenerateInvoice = () => {
    if (!canGenerateMore) {
      setShowPaywall(true);
      return;
    }

    setShowInvoice(true);
    setGenerationCount((prev) => prev + 1);
  };

  const handleGenerateScope = () => {
    if (!canGenerateMore) {
      setShowPaywall(true);
      return;
    }

    setShowScope(true);
    setGenerationCount((prev) => prev + 1);
  };

  const handleUpgrade = () => {
    alert("Upgrade flow will be connected next.");
  };

  const licensingSummary = getLicensingSummary(licensing);

  return (
    <div className="space-y-6">
      <ProjectPresetStep
        value={projectPreset}
        onChange={setProjectPreset}
      />

      <BriefInputStep
        value={rawBrief}
        onChange={setRawBrief}
      />

      <div className={getAppPanelClass()}>
        <button
          type="button"
          onClick={handleMagicFill}
          disabled={!rawBrief.trim() || isExtracting}
          className={getAppButtonClass({
            variant: "primary",
            size: "lg",
          })}
        >
          {isExtracting ? "Filling..." : "Magic Fill"}
        </button>
      </div>

      <ReviewStep
        value={extractedData}
        onChange={setExtractedData}
      />

      <LicensingStep
        value={licensing}
        onChange={setLicensing}
      />

      <GenerateButtons
        onGenerateInvoice={handleGenerateInvoice}
        onGenerateScope={handleGenerateScope}
      />

      {showPaywall && <Paywall onUpgrade={handleUpgrade} />}

      {showInvoice && (
        <div className="space-y-3">
          {isFreeUser && <WatermarkedNotice />}
          <InvoiceTemplate
            clientName={extractedData.clientName}
            projectType={projectPreset || extractedData.projectType || ""}
            fee={extractedData.fee}
            timeline={extractedData.timeline}
          />
        </div>
      )}

      {showScope && (
        <div className="space-y-3">
          {isFreeUser && <WatermarkedNotice />}
          <ScopeTemplate
            clientName={extractedData.clientName}
            projectType={projectPreset || extractedData.projectType || ""}
            revisions={extractedData.revisions}
            timeline={extractedData.timeline}
            notes={extractedData.notes}
            licensingSummary={licensingSummary}
          />
        </div>
      )}

      <div className={getAppPanelClass("muted")}>
        <h2 className="text-2xl font-semibold text-black">
          Create Document Wizard
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Selected project type: {projectPreset || "None"}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Brief length: {rawBrief.length} characters
        </p>
        <p className="mt-2 text-sm text-gray-600">
          License type: {licensing.licenseType || "None"}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Free generations used: {generationCount}/{FREE_GENERATION_LIMIT}
        </p>
      </div>
    </div>
  );
}
