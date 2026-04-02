import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  bootstrapInvoiceStorage,
  buildStoredDraft,
  openInvoicePage,
} from "./helpers/invoice-editor";

const INVOICE_SEQUENCE_KEY = "invoice-sequence-by-year";

function getInvoiceSequence(invoiceNumber: string) {
  return Number(invoiceNumber.split("-").at(-1));
}

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("T3.1 — Invoice number is set on page load without flash", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await bootstrapInvoiceStorage(page);
  await page.goto("/invoice/new", { waitUntil: "domcontentloaded" });

  const invoiceField = page.locator('input[placeholder="INV-2026-001"]').first();
  const value = await invoiceField.inputValue();

  expect(value).not.toBe("");
  expect(value).toMatch(/^INV-\d{4}-\d{3}$/);
});

test("T3.2 — Invoice number does not change on draft restore", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page, {
    draft: buildStoredDraft({
      invoiceNumber: "INV-2025-042",
      currentStep: "meta",
    }),
  });

  await expect(
    page.locator('input[placeholder="INV-2026-001"]').first()
  ).toHaveValue("INV-2025-042");
});

test("T3.3 — Invoice sequence counter increments correctly", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  const firstValue = await page
    .locator('input[placeholder="INV-2026-001"]')
    .first()
    .inputValue();

  await page.evaluate((sequenceKey) => {
    const sequence = window.localStorage.getItem(sequenceKey);
    window.localStorage.clear();
    window.sessionStorage.clear();
    if (sequence) {
      window.localStorage.setItem(sequenceKey, sequence);
    }
  }, INVOICE_SEQUENCE_KEY);

  const secondPage = await page.context().newPage();
  attachConsoleGuards(secondPage);

  try {
    await openInvoicePage(secondPage, { preserveSequence: true });
    const secondValue = await secondPage
      .locator('input[placeholder="INV-2026-001"]')
      .first()
      .inputValue();

    expect(getInvoiceSequence(secondValue)).toBe(getInvoiceSequence(firstValue) + 1);
    assertConsoleClean(secondPage);
  } finally {
    await secondPage.close();
  }
});
