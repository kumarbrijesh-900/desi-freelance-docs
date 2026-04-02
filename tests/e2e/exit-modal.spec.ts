import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  openInvoicePage,
} from "./helpers/invoice-editor";

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

async function triggerExitModal(page: Parameters<typeof openInvoicePage>[0]) {
  await page
    .getByPlaceholder(/Your agency or freelance brand name/i)
    .fill("Touched Agency");
  await page
    .getByTestId("floating-editor-actions")
    .getByRole("button", { name: /^Cancel$/i })
    .click();
}

test("T6.1 — Cancel button triggers exit modal when form is touched", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  await triggerExitModal(page);

  const modal = page.locator('div[class*="z-[300]"]').first();
  await expect(page.getByRole("heading", { name: /Leave invoice editor/i })).toBeVisible();
  await expect(modal.getByRole("button", { name: /^Cancel$/i })).toBeVisible();
  await expect(modal.getByRole("button", { name: /^Skip$/i })).toBeVisible();
  await expect(modal.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
});

test("T6.2 — Modal Cancel button closes modal without navigating", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  await triggerExitModal(page);

  const modal = page.locator('div[class*="z-[300]"]').first();
  await modal.getByRole("button", { name: /^Cancel$/i }).click();

  await expect(page.getByRole("heading", { name: /Leave invoice editor/i })).toHaveCount(0);
  await expect(page).toHaveURL(/\/invoice\/new$/);
});

test("T6.3 — Modal Skip button navigates away", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  await triggerExitModal(page);

  await page
    .locator('div[class*="z-[300]"]')
    .first()
    .getByRole("button", { name: /^Skip$/i })
    .click();

  await expect(page).not.toHaveURL(/\/invoice\/new$/);
});

test("T6.4 — Modal has correct z-index (appears above everything)", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  await triggerExitModal(page);

  const modal = page.locator('div[class*="z-[300]"]').first();
  const zIndex = await modal.evaluate((element) =>
    Number.parseInt(window.getComputedStyle(element as HTMLElement).zIndex, 10)
  );

  expect(zIndex).toBeGreaterThanOrEqual(300);
});
