import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  expectFocusVisible,
  expectNoHorizontalOverflow,
  expectStableBoxAfter,
  extractBrief,
  focusViaTabUntil,
  loadDemoData,
  openInvoicePage,
  stepToggle,
  waitForScrollProgress,
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

  await expect(page).toHaveScreenshot("invoice-editor-shell.png", screenshotOptions);
  await expect(page.locator('[data-brief-intake-state="expanded"]')).toHaveScreenshot(
    "brief-intake-expanded.png",
    screenshotOptions
  );
});

test("desktop support rail and floating actions stay visible without competing with the form", async ({
  page,
}) => {
  await openInvoicePage(page);

  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width < 1280, "Desktop-only support rail assertion");

  const actions = page.getByTestId("floating-editor-actions");
  const rail = page.getByTestId("desktop-support-rail");

  const actionsBefore = await actions.boundingBox();
  const railBefore = await rail.boundingBox();

  await page.mouse.wheel(0, 1000);
  await waitForUiSettle(page);

  const actionsAfter = await actions.boundingBox();
  const railAfter = await rail.boundingBox();

  expect(actionsAfter?.y ?? 0).toBeLessThanOrEqual((actionsBefore?.y ?? 0) + 8);
  expect(railAfter?.y ?? 0).toBeLessThanOrEqual((railBefore?.y ?? 0) + 8);
});

test("brief intake collapse preserves layout stability and compact visual state", async ({
  page,
}) => {
  await openInvoicePage(page);
  await page.getByPlaceholder(/Example: Agency name:/i).fill(seededBrief);

  const stepper = page.getByTestId("invoice-vertical-stepper");
  await expectStableBoxAfter(page, stepper, async () => {
    await page.getByRole("button", { name: /^Hide$/i }).click();
  });

  const collapsed = page.getByTestId("brief-intake-collapsed");
  await expect(collapsed).toBeVisible();
  await expect(collapsed).toHaveScreenshot(
    "brief-intake-collapsed.png",
    screenshotOptions
  );
  await expectNoHorizontalOverflow(page);

  await expectStableBoxAfter(page, stepper, async () => {
    await page.getByRole("button", { name: /^Brief$/i }).click();
  });
});

test("post-autofill editor state stays stable and visually guided", async ({
  page,
}) => {
  await extractBrief(page, seededBrief);
  await expect(page.getByText(/Autofilled \d+ fields?/i)).toHaveCount(0, {
    timeout: 4000,
  });
  await expectNoHorizontalOverflow(page);
  await expect(
    page.locator('[data-step-section="client"][data-step-state="active"]')
  ).toBeVisible();

  await expect(page).toHaveScreenshot(
    "invoice-editor-post-autofill.png",
    screenshotOptions
  );
});

test("progressive section completion scrolls smoothly without jumpy layout shifts", async ({
  page,
}) => {
  await openInvoicePage(page);

  const previousScrollY = await page.evaluate(() => window.scrollY);
  const stepper = page.getByTestId("invoice-vertical-stepper");

  await expectStableBoxAfter(page, stepper, async () => {
    await page.getByPlaceholder(/Your agency or freelance brand name/i).fill(
      "DesiFreelanceDocs Studio"
    );
    await page.getByPlaceholder("Building, street, or area").fill(
      "14 Residency Road"
    );
    await page.getByLabel("Agency state").selectOption("Karnataka");
  });

  await expect(
    page.locator('[data-step-section="client"][data-step-state="active"]')
  ).toBeVisible();
  await waitForScrollProgress(page, previousScrollY, 40);
  await expectNoHorizontalOverflow(page);

  await expect(page).toHaveScreenshot(
    "invoice-editor-progressive-mid-form.png",
    screenshotOptions
  );
});

test("shared field focus and dropdown affordance stay aligned", async ({
  page,
}) => {
  await openInvoicePage(page);

  const agencyName = page.getByPlaceholder(/Your agency or freelance brand name/i);
  await focusViaTabUntil(page, agencyName);
  await expect(agencyName).toBeFocused();
  await expectFocusVisible(agencyName);

  const agencyState = page.getByLabel("Agency state");
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
  await stepToggle(page, "deliverables").click();
  await waitForUiSettle(page);

  await expect(page.getByTestId("line-items-list")).toHaveScreenshot(
    "invoice-editor-line-items.png",
    screenshotOptions
  );

  await stepToggle(page, "meta").click();
  await waitForUiSettle(page);

  const invoiceDate = page.locator('input[type="date"]').first();
  const dueDate = page.locator('input[type="date"]').nth(1);
  const invoiceDateBox = await invoiceDate.boundingBox();
  const dueDateBox = await dueDate.boundingBox();

  if ((viewport?.width ?? 0) >= 768) {
    expect(invoiceDateBox?.width ?? 0).toBeLessThanOrEqual(190);
    expect(dueDateBox?.width ?? 0).toBeLessThanOrEqual(190);
  }

  await stepToggle(page, "payment").click();
  await waitForUiSettle(page);

  const bankName = page.getByPlaceholder("Bank name");
  const qrUpload = page
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

test("full invoice journey stays clean through floating actions and preview", async ({
  page,
}) => {
  await loadDemoData(page);
  await expectNoHorizontalOverflow(page);

  await stepToggle(page, "totals").click();
  await waitForUiSettle(page);

  const actions = page.getByTestId("floating-editor-actions");
  await expect(actions).toHaveScreenshot("invoice-editor-floating-actions.png", screenshotOptions);
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expect(actions.getByRole("button", { name: /^Cancel$/i })).toBeVisible();
  await expect(actions.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
  await expect(
    actions.getByRole("button", { name: /Preview & Download/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /Preview & Download/i }).click();
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
