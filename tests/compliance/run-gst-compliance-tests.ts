import assert from "node:assert/strict";
import { evaluateStateSignals } from "@/lib/invoice-address";
import { getClientFacingTaxComplianceNote } from "@/lib/invoice-compliance";
import { parseGstin } from "@/lib/gstin-parser";
import { computeInvoiceTax } from "@/lib/invoice-tax";
import { defaultInvoiceFormData, mergeInvoiceFormData } from "@/types/invoice";

function testGstinParsing() {
  const parsed = parseGstin("29ABCDE1234F1Z5");

  assert.equal(parsed.isValid, true, "GSTIN should validate");
  assert.equal(parsed.stateCode, "29", "GSTIN state code should be 29");
  assert.equal(parsed.state, "Karnataka", "GSTIN should map to Karnataka");
  assert.equal(parsed.pan, "ABCDE1234F", "PAN should derive from GSTIN");
}

function testGstinMergeAutoDerivation() {
  const merged = mergeInvoiceFormData({
    agency: {
      ...defaultInvoiceFormData.agency,
      gstRegistrationStatus: "registered",
      gstin: "29ABCDE1234F1Z5",
    },
    client: {
      ...defaultInvoiceFormData.client,
      clientLocation: "domestic",
      clientGstin: "27AAACM8899L1Z2",
    },
  });

  assert.equal(
    merged.agency.agencyState,
    "Karnataka",
    "Agency state should auto-derive from GSTIN when blank"
  );
  assert.equal(
    merged.agency.pan,
    "ABCDE1234F",
    "Agency PAN should auto-derive from GSTIN when blank"
  );
  assert.equal(
    merged.client.clientState,
    "Maharashtra",
    "Client state should auto-derive from domestic client GSTIN when blank"
  );
}

function testRegularDomesticTaxBranches() {
  const sameState = computeInvoiceTax(mergeInvoiceFormData({
    agency: { ...defaultInvoiceFormData.agency, agencyState: "Karnataka", gstRegistrationStatus: "registered", lutAvailability: "no" },
    client: { ...defaultInvoiceFormData.client, clientState: "Karnataka", clientLocation: "domestic" },
  }), 1000);

  const differentState = computeInvoiceTax(mergeInvoiceFormData({
    agency: { ...defaultInvoiceFormData.agency, agencyState: "Karnataka", gstRegistrationStatus: "registered", lutAvailability: "no" },
    client: { ...defaultInvoiceFormData.client, clientState: "Maharashtra", clientLocation: "domestic" },
  }), 1000);

  assert.equal(
    sameState.taxType,
    "cgst_sgst",
    "Same-state domestic billing should use CGST + SGST"
  );
  assert.equal(
    differentState.taxType,
    "igst",
    "Different-state domestic billing should use IGST"
  );
}

function testSezTaxBranching() {
  const sezWithLut = computeInvoiceTax(mergeInvoiceFormData({
    agency: { ...defaultInvoiceFormData.agency, agencyState: "Karnataka", gstRegistrationStatus: "registered", lutAvailability: "yes" },
    client: { ...defaultInvoiceFormData.client, clientState: "Karnataka", clientLocation: "domestic", isClientSezUnit: "yes" },
  }), 1000);

  const sezWithoutLut = computeInvoiceTax(mergeInvoiceFormData({
    agency: { ...defaultInvoiceFormData.agency, agencyState: "Karnataka", gstRegistrationStatus: "registered", lutAvailability: "no" },
    client: { ...defaultInvoiceFormData.client, clientState: "Karnataka", clientLocation: "domestic", isClientSezUnit: "yes" },
  }), 1000);

  assert.notEqual(
    sezWithLut.taxType,
    "cgst_sgst",
    "Domestic SEZ supply should never fall back to CGST + SGST"
  );
  assert.equal(
    sezWithLut.taxType,
    "zero_rated",
    "Domestic SEZ with LUT should stay zero-rated in the tax engine"
  );
  assert.equal(
    sezWithoutLut.taxType,
    "igst",
    "Domestic SEZ without LUT should use IGST"
  );
}

function testInternationalIgstLabeling() {
  const note = getClientFacingTaxComplianceNote({
    agency: mergeInvoiceFormData({
      agency: {
        ...defaultInvoiceFormData.agency,
        gstRegistrationStatus: "registered",
        lutAvailability: "no",
        noLutTaxHandling: "add-igst",
      },
    }).agency,
    client: mergeInvoiceFormData({
      client: {
        ...defaultInvoiceFormData.client,
        clientLocation: "international",
      },
    }).client,
    taxType: "igst",
  });

  assert.match(
    note,
    /IGST 18%/i,
    "International no-LUT path should label IGST clearly"
  );
}

function testSacDefaultsAndBackwardCompatibility() {
  const merged = mergeInvoiceFormData({
    lineItems: [
      {
        id: "legacy-uiux",
        type: "UI/UX",
        description: "Legacy UI item",
        qty: 1,
        rate: 1000,
        rateUnit: "per-screen",
      },
      {
        id: "custom-other",
        type: "Other",
        description: "Custom creative support",
        qty: 1,
        rate: 1000,
        rateUnit: "per-day",
      },
    ],
  });

  assert.equal(
    merged.lineItems[0]?.sacCode,
    "998314",
    "Mapped deliverable types should regain their default SAC on merge"
  );
  assert.equal(
    merged.lineItems[1]?.sacCode,
    "",
    "Other should remain unresolved until a manual SAC is provided"
  );
}

function testStateConflictWarning() {
  const warning = evaluateStateSignals({
    manualState: "Maharashtra",
    gstinState: "Karnataka",
    label: "Agency state",
  }).warning;

  assert.match(
    warning,
    /GSTIN says Karnataka/i,
    "Conflict warning should mention GSTIN-derived state"
  );
  assert.match(
    warning,
    /selected state says Maharashtra/i,
    "Conflict warning should mention manual state"
  );
}

function run() {
  testGstinParsing();
  testGstinMergeAutoDerivation();
  testRegularDomesticTaxBranches();
  testSezTaxBranching();
  testInternationalIgstLabeling();
  testSacDefaultsAndBackwardCompatibility();
  testStateConflictWarning();

  console.log("GST compliance tests passed");
}

run();
