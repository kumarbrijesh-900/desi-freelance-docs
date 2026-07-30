import assert from "node:assert";
import { mergeInvoiceFormData, defaultInvoiceFormData } from "@/types/invoice";

// Characterization suite for mergeInvoiceFormData (Stage 1 of the write-path
// cleanup). These LOCK current behaviour as a safety net before the refactor —
// they document what the merge does today, they do not endorse it. The merge
// currently performs hidden normalization: it derives agency/client state and
// PAN from the GSTIN (fill-if-empty) and recomposes the address string from its
// parts on every call. When a later stage moves this into an explicit
// normalization step, update these assertions to the new contract.

function testAgencyGstinDerivesStateAndPanWhenEmpty() {
  const result = mergeInvoiceFormData({
    agency: {
      ...defaultInvoiceFormData.agency,
      gstin: "27ABCDE1234F1Z5",
      agencyState: "",
      pan: "",
    },
  });
  assert.equal(result.agency.agencyState, "Maharashtra");
  assert.equal(result.agency.pan, "ABCDE1234F");
}

function testAgencyAddressIsRecomposedFromParts() {
  const result = mergeInvoiceFormData({
    agency: {
      ...defaultInvoiceFormData.agency,
      addressLine1: "12 MG Road",
      city: "Pune",
      agencyState: "Maharashtra",
      pinCode: "411001",
      address: "SOME CUSTOM ADDRESS STRING",
    },
  });
  // The custom address string is discarded; merge recomposes from the parts.
  assert.equal(result.agency.address, "12 MG Road, Pune, Maharashtra, 411001");
}

function testMergeDoesNotOverwriteExplicitStateOrPan() {
  const result = mergeInvoiceFormData({
    agency: {
      ...defaultInvoiceFormData.agency,
      gstin: "27ABCDE1234F1Z5",
      agencyState: "Karnataka",
      pan: "ZZZZZ9999Z",
    },
  });
  // Derivation is fill-if-empty: explicit values survive.
  assert.equal(result.agency.agencyState, "Karnataka");
  assert.equal(result.agency.pan, "ZZZZZ9999Z");
}

function testInternationalClientBypassesNormalization() {
  const result = mergeInvoiceFormData({
    client: {
      ...defaultInvoiceFormData.client,
      clientLocation: "international",
      clientGstin: "27ABCDE1234F1Z5",
      clientState: "",
      clientCity: "London",
    },
  });
  // International clients are returned as-is: no state inference, no recompose.
  assert.equal(result.client.clientState, "");
  assert.equal(result.client.clientCity, "London");
}

function testDomesticClientGstinDerivesState() {
  const result = mergeInvoiceFormData({
    client: {
      ...defaultInvoiceFormData.client,
      clientLocation: "domestic",
      clientGstin: "29XYZAB5678C1Z3",
      clientState: "",
    },
  });
  assert.equal(result.client.clientState, "Karnataka");
}

function testLineItemTypeUnitAndSacAreNormalized() {
  const result = mergeInvoiceFormData({
    lineItems: [
      {
        id: "x",
        description: "d",
        qty: 2,
        rate: 100,
        type: "GARBAGE" as never,
        rateUnit: "nonsense" as never,
      },
    ],
  });
  assert.equal(result.lineItems[0].type, "UI/UX Design");
  assert.equal(result.lineItems[0].rateUnit, "per-screen");
  assert.equal(result.lineItems[0].sacCode, "998314");
}

function testBareLineItemsAreWrappedInMilestoneOne() {
  const result = mergeInvoiceFormData({
    lineItems: [
      {
        id: "x",
        description: "d",
        qty: 1,
        rate: 100,
        type: "UI/UX Design",
        rateUnit: "per-screen",
      },
    ],
  });
  assert.equal(result.milestones[0].id, "milestone-1");
}

function testEmptyInputFillsDefaults() {
  const result = mergeInvoiceFormData();
  assert.equal(result.agency.agencyName, "");
  assert.equal(result.lineItems.length, 1);
  assert.equal(result.milestones.length, 1);
}

function run() {
  testAgencyGstinDerivesStateAndPanWhenEmpty();
  testAgencyAddressIsRecomposedFromParts();
  testMergeDoesNotOverwriteExplicitStateOrPan();
  testInternationalClientBypassesNormalization();
  testDomesticClientGstinDerivesState();
  testLineItemTypeUnitAndSacAreNormalized();
  testBareLineItemsAreWrappedInMilestoneOne();
  testEmptyInputFillsDefaults();
  console.log("Merge normalization characterization tests passed");
}

run();
