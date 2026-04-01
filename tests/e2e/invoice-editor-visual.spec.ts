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

test("brief intake collapse preserves layout stability and compact visual state", async ({
  page,
}) => {
  await openInvoicePage(page);
  await page.getByPlaceholder(/Example: Agency name:/i).fill(seededBrief);

  const stepper = page.getByTestId("invoice-vertical-stepper");
  await expectStableBoxAfter(page, stepper, async () => {
    await page.getByRole("button", { name: /^Collapse$/i }).click();
  });

  const collapsed = page.getByTestId("brief-intake-collapsed");
  await expect(collapsed).toBeVisible();
  await expect(collapsed).toHaveScreenshot(
    "brief-intake-collapsed.png",
    screenshotOptions
  );
  await expectNoHorizontalOverflow(page);

  await expectStableBoxAfter(page, stepper, async () => {
    await page.getByRole("button", { name: /^Edit$/i }).click();
  });
});

test("post-autofill editor state stays stable and visually guided", async ({
  page,
}) => {
  await extractBrief(page, seededBrief);
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

test("full invoice journey stays clean through final footer and preview", async ({
  page,
}) => {
  await loadDemoData(page);
  await expectNoHorizontalOverflow(page);

  await stepToggle(page, "totals").click();
  await waitForUiSettle(page);

  const footer = page.getByTestId("editor-footer-actions");
  await expect(footer).toHaveScreenshot("invoice-editor-final-footer.png", screenshotOptions);
  await expect(footer.getByRole("button")).toHaveCount(3);
  await expect(footer.getByRole("button", { name: /^Close$/i })).toBeVisible();
  await expect(footer.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
  await expect(
    footer.getByRole("button", { name: /Preview & Download/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /Preview & Download/i }).click();
  await expect(page).toHaveURL(/\/invoice\/preview$/);
  await waitForUiSettle(page, 380);

  await expect(page.getByRole("link", { name: /Back to Edit/i })).toBeVisible();
  await expect(page).toHaveScreenshot("invoice-preview-toolbar-top.png", screenshotOptions);
});
