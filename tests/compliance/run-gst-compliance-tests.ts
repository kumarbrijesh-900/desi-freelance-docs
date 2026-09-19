import assert from "node:assert/strict";
import { evaluateStateSignals } from "@/lib/invoice-address";
import { getClientFacingTaxComplianceNote } from "@/lib/invoice-compliance";
import { parseGstin } from "@/lib/gstin-parser";
import { computeTaxOnAmount } from "@/lib/invoice-calculations";
import {
  defaultInvoiceFormData,
  mergeInvoiceFormData,
  normalizeInvoiceEntities,
} from "@/types/invoice";

function testGstinParsing() {
  const parsed = parseGstin("29ABCDE1234F1Z5");

  assert.equal(parsed.isValid, true, "GSTIN should validate");
  assert.equal(parsed.stateCode, "29", "GSTIN state code should be 29");
  assert.equal(parsed.state, "Karnataka", "GSTIN should map to Karnataka");
  assert.equal(parsed.pan, "ABCDE1234F", "PAN should derive from GSTIN");
}

function testGstinMergeAutoDerivation() {
  // Derivation moved from the merge to normalizeInvoiceEntities (Stage 2); this
  // still verifies GSTIN → state/PAN, now via the explicit normalizer.
  const merged = normalizeInvoiceEntities(
    mergeInvoiceFormData({
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
    }),
  );

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
  // These are hand-written GST rules, and until now they were checked against
  // computeInvoiceTax - a function no production code calls. computeTaxOnAmount
  // takes the same (formData, taxableValue) arguments and routes through
  // calculateInvoiceTotals into computeInvoiceMoney, which prices real invoices.
  const sameState = computeTaxOnAmount(mergeInvoiceFormData({
    agency: { ...defaultInvoiceFormData.agency, agencyState: "Karnataka", gstRegistrationStatus: "registered", lutAvailability: "no" },
    client: { ...defaultInvoiceFormData.client, clientState: "Karnataka", clientLocation: "domestic" },
  }), 1000);

  const differentState = computeTaxOnAmount(mergeInvoiceFormData({
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

/**
 * A LUT only zero-rates a supply if it can be VALIDATED on the supply date:
 * declared yes, a recognised financial year, and an invoice date inside that
 * year's window. See `lutValidOn` in lib/money/compute-invoice-money.ts, whose
 * own comment records the tightening as deliberate ("Rule 2 below is new").
 *
 * computeInvoiceTax, which this suite used to call, consulted only
 * `lutAvailability`. It therefore zero-rated SEZ supplies backed by a LUT that
 * nobody can check, which is the freelancer's liability if it turns out not to
 * cover the supply date. The three cases below are three different supplies;
 * the old function could only see two.
 */
function testSezTaxBranching() {
  const sezBase = (agencyOverrides: Record<string, unknown>) =>
    mergeInvoiceFormData({
      agency: {
        ...defaultInvoiceFormData.agency,
        agencyState: "Karnataka",
        gstRegistrationStatus: "registered",
        ...agencyOverrides,
      },
      client: {
        ...defaultInvoiceFormData.client,
        clientState: "Karnataka",
        clientLocation: "domestic",
        isClientSezUnit: "yes",
      },
    });

  // contextFor() reads the supply date from meta.invoiceDate. Set it after the
  // merge so this does not depend on mergeInvoiceFormData passing meta through.
  const onDate = (fd: any, invoiceDate: string) => ({
    ...fd,
    meta: { ...(fd?.meta ?? {}), invoiceDate },
  });

  const sezWithValidLut = computeTaxOnAmount(
    onDate(
      sezBase({ lutAvailability: "yes", lutValidity: "fy_2026_27" }),
      "2026-06-15",
    ),
    1000,
  );

  const sezLutUnvalidatable = computeTaxOnAmount(
    sezBase({ lutAvailability: "yes" }),
    1000,
  );

  const sezWithoutLut = computeTaxOnAmount(
    sezBase({ lutAvailability: "no" }),
    1000,
  );

  assert.notEqual(
    sezWithValidLut.taxType,
    "cgst_sgst",
    "Domestic SEZ supply should never fall back to CGST + SGST"
  );
  assert.equal(
    sezWithValidLut.taxType,
    "zero_rated",
    "Domestic SEZ with a LUT valid on the supply date should be zero-rated"
  );
  assert.equal(
    sezLutUnvalidatable.taxType,
    "igst",
    "Domestic SEZ with a LUT that cannot be validated should be taxed, not zero-rated"
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
