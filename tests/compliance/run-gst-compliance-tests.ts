import assert from "node:assert/strict";
import { evaluateStateSignals } from "@/lib/invoice-address";
import { getClientFacingTaxComplianceNote } from "@/lib/invoice-compliance";
import { parseGstin } from "@/lib/gstin-parser";
import { calculateTax } from "@/lib/invoice-tax";
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
  const sameState = calculateTax({
    subtotal: 1000,
    agencyState: "Karnataka",
    clientState: "Karnataka",
    isInternational: false,
    isClientSezUnit: false,
    gstRegistered: true,
    lutAvailability: "no",
    noLutTaxHandling: "",
  });
  const differentState = calculateTax({
    subtotal: 1000,
    agencyState: "Karnataka",
    clientState: "Maharashtra",
    isInternational: false,
    isClientSezUnit: false,
    gstRegistered: true,
    lutAvailability: "no",
    noLutTaxHandling: "",
  });

  assert.equal(
    sameState.taxType,
    "CGST_SGST",
    "Same-state domestic billing should use CGST + SGST"
  );
  assert.equal(
    differentState.taxType,
    "IGST",
    "Different-state domestic billing should use IGST"
  );
}

function testSezTaxBranching() {
  const sezWithLut = calculateTax({
    subtotal: 1000,
    agencyState: "Karnataka",
    clientState: "Karnataka",
    isInternational: false,
    isClientSezUnit: true,
    gstRegistered: true,
    lutAvailability: "yes",
    noLutTaxHandling: "",
  });
  const sezWithoutLut = calculateTax({
    subtotal: 1000,
    agencyState: "Karnataka",
    clientState: "Karnataka",
    isInternational: false,
    isClientSezUnit: true,
    gstRegistered: true,
    lutAvailability: "no",
    noLutTaxHandling: "",
  });

  assert.notEqual(
    sezWithLut.taxType,
    "CGST_SGST",
    "Domestic SEZ supply should never fall back to CGST + SGST"
  );
  assert.equal(
    sezWithLut.taxType,
    "NONE",
    "Domestic SEZ with LUT should stay zero-rated in the tax engine"
  );
  assert.equal(
    sezWithoutLut.taxType,
    "IGST",
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
    taxType: "IGST",
  });

  assert.match(
    note,
    /IGST 18%/i,
    "International no-LUT path should label IGST clearly"
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
  testStateConflictWarning();

  console.log("GST compliance tests passed");
}

run();
