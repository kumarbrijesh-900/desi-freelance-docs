import assert from "node:assert";
import {
  mergeInvoiceFormData,
  normalizeInvoiceEntities,
  defaultInvoiceFormData,
} from "@/types/invoice";

// Characterization suite for the merge/normalize split (Stage 2). The merge is
// now a PURE structural merge (defaults + line-item type/unit/SAC + milestone-1
// wrapping). Entity derivation (state/PAN from GSTIN, address recompose) moved to
// the explicit normalizeInvoiceEntities, applied only at input boundaries. These
// tests lock both halves of that contract.

// --- merge is now pure: no entity derivation ---

function testMergeDoesNotDeriveAgencyStateOrPan() {
  const result = mergeInvoiceFormData({
    agency: {
      ...defaultInvoiceFormData.agency,
      gstin: "27ABCDE1234F1Z5",
      agencyState: "",
      pan: "",
    },
  });
  assert.equal(result.agency.agencyState, "");
  assert.equal(result.agency.pan, "");
}

function testMergePreservesCustomAddress() {
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
  assert.equal(result.agency.address, "SOME CUSTOM ADDRESS STRING");
}

function testMergeDoesNotDeriveDomesticClientState() {
  const result = mergeInvoiceFormData({
    client: {
      ...defaultInvoiceFormData.client,
      clientLocation: "domestic",
      clientGstin: "29XYZAB5678C1Z3",
      clientState: "",
    },
  });
  assert.equal(result.client.clientState, "");
}

// --- merge still does structural normalization ---

function testMergeNormalizesLineItemTypeUnitAndSac() {
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

function testMergeWrapsBareLineItemsInMilestoneOne() {
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

function testMergeEmptyInputFillsDefaults() {
  const result = mergeInvoiceFormData();
  assert.equal(result.agency.agencyName, "");
  assert.equal(result.lineItems.length, 1);
  assert.equal(result.milestones.length, 1);
}

// --- normalizeInvoiceEntities does the entity derivation ---

function testNormalizeDerivesAgencyStateAndPan() {
  const result = normalizeInvoiceEntities(
    mergeInvoiceFormData({
      agency: {
        ...defaultInvoiceFormData.agency,
        gstin: "27ABCDE1234F1Z5",
        agencyState: "",
        pan: "",
      },
    }),
  );
  assert.equal(result.agency.agencyState, "Maharashtra");
  assert.equal(result.agency.pan, "ABCDE1234F");
}

function testNormalizeRecomposesAddressFromParts() {
  const result = normalizeInvoiceEntities(
    mergeInvoiceFormData({
      agency: {
        ...defaultInvoiceFormData.agency,
        addressLine1: "12 MG Road",
        city: "Pune",
        agencyState: "Maharashtra",
        pinCode: "411001",
        address: "SOME CUSTOM ADDRESS STRING",
      },
    }),
  );
  assert.equal(result.agency.address, "12 MG Road, Pune, Maharashtra, 411001");
}

function testNormalizeDerivesDomesticClientState() {
  const result = normalizeInvoiceEntities(
    mergeInvoiceFormData({
      client: {
        ...defaultInvoiceFormData.client,
        clientLocation: "domestic",
        clientGstin: "29XYZAB5678C1Z3",
        clientState: "",
      },
    }),
  );
  assert.equal(result.client.clientState, "Karnataka");
}

function testNormalizeDoesNotOverwriteExplicitStateOrPan() {
  const result = normalizeInvoiceEntities(
    mergeInvoiceFormData({
      agency: {
        ...defaultInvoiceFormData.agency,
        gstin: "27ABCDE1234F1Z5",
        agencyState: "Karnataka",
        pan: "ZZZZZ9999Z",
      },
    }),
  );
  assert.equal(result.agency.agencyState, "Karnataka");
  assert.equal(result.agency.pan, "ZZZZZ9999Z");
}

function testNormalizeBypassesInternationalClient() {
  const result = normalizeInvoiceEntities(
    mergeInvoiceFormData({
      client: {
        ...defaultInvoiceFormData.client,
        clientLocation: "international",
        clientGstin: "27ABCDE1234F1Z5",
        clientState: "",
        clientCity: "London",
      },
    }),
  );
  assert.equal(result.client.clientState, "");
  assert.equal(result.client.clientCity, "London");
}

function run() {
  testMergeDoesNotDeriveAgencyStateOrPan();
  testMergePreservesCustomAddress();
  testMergeDoesNotDeriveDomesticClientState();
  testMergeNormalizesLineItemTypeUnitAndSac();
  testMergeWrapsBareLineItemsInMilestoneOne();
  testMergeEmptyInputFillsDefaults();
  testNormalizeDerivesAgencyStateAndPan();
  testNormalizeRecomposesAddressFromParts();
  testNormalizeDerivesDomesticClientState();
  testNormalizeDoesNotOverwriteExplicitStateOrPan();
  testNormalizeBypassesInternationalClient();
  console.log("Merge/normalize split characterization tests passed");
}

run();
