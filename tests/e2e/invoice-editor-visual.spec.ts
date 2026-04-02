import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  briefIntakeExpanded,
  buildStoredDraft,
  editorRoot,
  expectFocusVisible,
  expectNoHorizontalOverflow,
  expectStableBoxAfter,
  extractBrief,
  focusViaTabUntil,
  loadDemoData,
  openInvoicePage,
  stepToggle,
  waitForUiSettle,
} from "./helpers/invoice-editor";

const seededBrief = [
  "Agency name: DesiFreelanceDocs Studio",
  "Agency address: 14 Residency Road, Bengaluru, Karnataka 560025",
  "Agency state: Karnataka",
  "Client name: Metro Shoes Pvt. Ltd.",
  "Client state: Karnataka",
  "Deliverable description: Landing page UI design",
  "Qty: 1",
  "Rate: INR 12000 per screen",
  "Payment terms: Net 15",
  "Bank name: HDFC Bank",
  "Account number: 50200044321098",
  "IFSC: HDFC0001122",
  "Invoice number: INV-2026-001",
  "Invoice date: 2026-04-01",
  "Due date: 2026-04-15",
].join("\n");

const screenshotOptions = {
  animations: "disabled" as const,
  caret: "hide" as const,
};

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("fresh invoice editor shell stays visually consistent across viewports", async ({
  page,
}) => {
  await openInvoicePage(page);
  await expectNoHorizontalOverflow(page);

  const root = editorRoot(page);

  await expect(root).toHaveScreenshot("invoice-editor-shell.png", screenshotOptions);
  await expect(briefIntakeExpanded(page)).toHaveScreenshot(
    "brief-intake-expanded.png",
    screenshotOptions
  );
  await expect(root.getByText(/Recommended next/i)).toHaveCount(0);
});

test("desktop support rail and floating actions stay visible without competing with the form", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width < 1280, "Desktop-only support rail assertion");

  const actions = root.getByTestId("floating-editor-actions").first();
  const rail = root.getByTestId("desktop-support-rail").first();

  const actionsBefore = await actions.boundingBox();
  const railBefore = await rail.boundingBox();

  await page.mouse.wheel(0, 1000);
  await waitForUiSettle(page);

  const actionsAfter = await actions.boundingBox();
  const railAfter = await rail.boundingBox();

  expect(actionsAfter?.y ?? 0).toBeLessThanOrEqual((actionsBefore?.y ?? 0) + 8);
  expect(railAfter?.y ?? 0).toBeLessThanOrEqual((railBefore?.y ?? 0) + 8);
  await expect(rail.getByText(/Ready State/i)).toHaveCount(0);
  await expect(rail.getByText(/Compliance/i)).toHaveCount(0);
  await expect(rail).toHaveScreenshot("invoice-editor-right-rail.png", screenshotOptions);
});

test("brief intake collapse preserves layout stability and compact visual state", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);
  await briefIntakeExpanded(page).locator("textarea").first().fill(seededBrief);

  const stepper = root.getByTestId("invoice-vertical-stepper");
  await expectStableBoxAfter(page, stepper, async () => {
    await briefIntakeExpanded(page).getByRole("button", { name: /^Hide$/i }).click();
    await waitForUiSettle(page, 220);
  });

  const collapsed = root.getByTestId("brief-intake-collapsed");
  await expect(collapsed).toBeVisible();
  await expect(collapsed).toHaveScreenshot(
    "brief-intake-collapsed.png",
    {
      ...screenshotOptions,
      maxDiffPixels: 300,
    }
  );
  await expectNoHorizontalOverflow(page);

  await expectStableBoxAfter(page, stepper, async () => {
    await collapsed.getByRole("button", { name: /^Brief$/i }).click();
    await waitForUiSettle(page, 220);
  });
});

test("post-autofill editor state stays stable and visually guided", async ({
  page,
}) => {
  await extractBrief(page, seededBrief);
  const root = editorRoot(page);
  await expect(page.getByText(/Autofilled \d+ fields?/i)).toHaveCount(0, {
    timeout: 4000,
  });
  await expectNoHorizontalOverflow(page);
  await expect(root.locator('[data-step-section="client"]')).toBeVisible();
  await expect(root.locator('[data-step-section="agency"]')).toBeVisible();

  await expect(root).toHaveScreenshot(
    "invoice-editor-post-autofill.png",
    {
      ...screenshotOptions,
      maxDiffPixels: 2500,
    }
  );
});

test("editing a section does not auto-scroll or collapse the continuous form", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  const stepper = root.getByTestId("invoice-vertical-stepper");

  await expectStableBoxAfter(page, stepper, async () => {
    await root.getByPlaceholder(/Your agency or freelance brand name/i).fill(
      "DesiFreelanceDocs Studio"
    );
    await root.getByPlaceholder("Building, street, or area").fill(
      "14 Residency Road"
    );
    await root.getByLabel("Agency state").selectOption("Karnataka");
    await waitForUiSettle(page, 180);
  });

  await expect(root.locator('[data-step-section="client"]')).toBeVisible();
  await expect(root.locator('[data-step-section="payment"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await expect(root).toHaveScreenshot(
    "invoice-editor-progressive-mid-form.png",
    screenshotOptions
  );
});

test("shared field focus and dropdown affordance stay aligned", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  const agencyName = root.getByPlaceholder(/Your agency or freelance brand name/i);
  await root
    .getByTestId("floating-editor-actions")
    .getByRole("button", { name: /^Cancel$/i })
    .focus();
  await focusViaTabUntil(page, agencyName);
  await expect(agencyName).toBeFocused();
  await expectFocusVisible(agencyName);

  const agencyState = root.getByLabel("Agency state");
  await focusViaTabUntil(page, agencyState);
  await expect(agencyState).toBeFocused();
  await expectFocusVisible(agencyState);

  const paddingRight = await agencyState.evaluate((element) => {
    return Number.parseFloat(
      window.getComputedStyle(element as HTMLElement).paddingRight
    );
  });
  expect(paddingRight).toBeGreaterThanOrEqual(44);

  const chevron = agencyState.locator("xpath=following-sibling::span[1]");
  const chevronOffset = await chevron.evaluate((element) => {
    return Number.parseFloat(window.getComputedStyle(element as HTMLElement).right);
  });
  expect(chevronOffset).toBeGreaterThanOrEqual(15);
  expect(chevronOffset).toBeLessThanOrEqual(17);
});

test("line items, compact uploads, and date fields stay readable and aligned", async ({
  page,
}) => {
  const viewport = page.viewportSize();
  await loadDemoData(page);
  const root = editorRoot(page);
  await stepToggle(page, "deliverables").click();
  await waitForUiSettle(page);

  const lineItems = root.getByTestId("line-items-list");
  await expect(lineItems).toHaveScreenshot(
    "invoice-editor-line-items.png",
    screenshotOptions
  );
  await expect(
    lineItems.locator('[data-testid="line-item-row"]').first().locator('input[type="number"]').first()
  ).toBeVisible();

  await stepToggle(page, "meta").click();
  await waitForUiSettle(page);

  const invoiceDate = root.locator('input[type="date"]').first();
  const dueDate = root.locator('input[type="date"]').nth(1);
  const invoiceDateBox = await invoiceDate.boundingBox();
  const dueDateBox = await dueDate.boundingBox();

  if ((viewport?.width ?? 0) >= 768) {
    expect(invoiceDateBox?.width ?? 0).toBeLessThanOrEqual(190);
    expect(dueDateBox?.width ?? 0).toBeLessThanOrEqual(190);
  }

  await stepToggle(page, "payment").click();
  await waitForUiSettle(page);

  const bankName = root.getByPlaceholder("Bank name");
  const qrUpload = root
    .locator('[data-step-section="payment"]')
    .locator('label:has(input[type="file"])')
    .first();
  const bankNameBox = await bankName.boundingBox();
  const qrUploadBox = await qrUpload.boundingBox();

  if ((viewport?.width ?? 0) >= 1280) {
    expect(bankNameBox?.width ?? 0).toBeGreaterThan(qrUploadBox?.width ?? 0);
  } else {
    expect((qrUploadBox?.y ?? 0)).toBeGreaterThan((bankNameBox?.y ?? 0));
  }
});

test("payment and totals stay compact with structured international bank address UI", async ({
  page,
}) => {
  const seededDraft = buildStoredDraft();
  const seededFormData = seededDraft.formData as Record<string, any>;
  const seededInternationalFormData = {
    ...seededFormData,
    client: {
      ...seededFormData.client,
      clientLocation: "international",
      clientCountry: "United States",
      clientState: "",
      clientCurrency: "USD",
      clientAddress:
        "500 Market Street\nSuite 210\nSan Francisco\n94105\nUnited States",
    },
    payment: {
      ...seededFormData.payment,
      paymentSettlementType: "forex",
      swiftBicCode: "HDFCINBB",
      ibanRoutingCode: "021000021",
      bankAddress:
        "250 Bishopsgate\nLevel 5\nLondon\nEC2M 4AA\nUnited Kingdom",
    },
  };

  await openInvoicePage(page, {
    draft: buildStoredDraft({
      currentStep: "payment",
      formData: seededInternationalFormData,
    }),
  });
  const root = editorRoot(page);
  await stepToggle(page, "payment").click();
  await waitForUiSettle(page);
  await expect(root.getByTestId("payment-settlement-control")).toBeVisible();
  await expect(root.getByTestId("international-bank-address-group")).toBeVisible();
  await expect(
    root.getByTestId("international-bank-address-group").getByPlaceholder("Address Line 1")
  ).toBeVisible();
  await expect(
    root.getByTestId("international-bank-address-group").getByPlaceholder("City / Region")
  ).toBeVisible();
  await expect(
    root.getByTestId("international-bank-address-group").getByPlaceholder("Country")
  ).toBeVisible();
  await expect(
    root.locator('[data-step-section="payment"]')
  ).toHaveScreenshot("invoice-editor-payment-section.png", screenshotOptions);
});

test("full invoice journey stays clean through floating actions and preview", async ({
  page,
}) => {
  await loadDemoData(page);
  const root = editorRoot(page);
  await expectNoHorizontalOverflow(page);

  await stepToggle(page, "totals").click();
  await waitForUiSettle(page);

  const actions = root.getByTestId("floating-editor-actions").first();
  await expect(actions).toHaveScreenshot("invoice-editor-floating-actions.png", screenshotOptions);
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expect(actions.getByRole("button", { name: /^Cancel$/i })).toBeVisible();
  await expect(actions.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
  await expect(
    actions.locator("button").filter({ hasText: /Preview & download/i }).first()
  ).toBeVisible();

  await actions
    .locator("button")
    .filter({ hasText: /Preview & download/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/invoice\/preview$/);
  await waitForUiSettle(page, 380);

  await expect(page.getByRole("link", { name: /Back to Edit/i })).toBeVisible();
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  });
  await waitForUiSettle(page, 160);
  await expect(page.getByTestId("invoice-preview-toolbar")).toHaveScreenshot(
    "invoice-preview-toolbar-top.png",
    {
      ...screenshotOptions,
      maxDiffPixels: 400,
    }
  );
});
