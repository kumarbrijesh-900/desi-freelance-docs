import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  continueButton,
  editorRoot,
  openInvoicePage,
  stepToggle,
  waitForScrollProgress,
  waitForUiSettle,
} from "./helpers/invoice-editor";

const allSteps = [
  "agency",
  "client",
  "deliverables",
  "payment",
  "meta",
  "totals",
] as const;

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("T2.1 — All major sections stay open on load", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);

  for (const step of allSteps) {
    const section = root.locator(`[data-step-section="${step}"]`);
    await expect(section).toBeVisible();
    if (step === "totals") {
      await expect(section.getByText(/Grand total/i)).toBeVisible();
      continue;
    }
    await expect(section.locator("input, select, textarea").first()).toBeVisible();
  }
});

test("T2.2 — Clicking a section header changes highlight only", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);
  const agencySection = root.locator('[data-step-section="agency"]');
  const clientSection = root.locator('[data-step-section="client"]');

  await stepToggle(page, "client").click();

  await expect(clientSection).toHaveAttribute("data-step-state", "active");
  await expect(agencySection.locator('input, select, textarea').first()).toBeVisible();
  await expect(clientSection.locator('input, select, textarea').first()).toBeVisible();
});

test("T2.3 — Completing Agency keeps the section open and stable", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);
  const agencySection = root.locator('[data-step-section="agency"]');
  const agencyNameInput = agencySection.getByPlaceholder(
    /Your agency or freelance brand name/i
  );

  await agencyNameInput.fill("Test Agency");
  await agencySection.getByPlaceholder("Building, street, or area").fill(
    "123 Test Street"
  );
  await agencySection.getByLabel("Agency state").selectOption("Karnataka");
  await waitForUiSettle(page, 420);

  await expect(agencySection).toHaveAttribute("data-step-state", /active|completed/);
  await expect(agencyNameInput).toBeVisible();
  await expect(
    agencySection.getByPlaceholder("Building, street, or area")
  ).toBeVisible();
});

test("T2.4 — Typing in Agency does not auto-scroll or collapse later sections", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);
  const clientSection = root.locator('[data-step-section="client"]');
  const deliverablesSection = root.locator('[data-step-section="deliverables"]');
  const initialScrollY = await page.evaluate(() => window.scrollY);

  await root
    .locator('[data-step-section="agency"]')
    .getByPlaceholder(/Your agency or freelance brand name/i)
    .fill("DesiFreelanceDocs Studio");
  await waitForUiSettle(page, 180);

  const finalScrollY = await page.evaluate(() => window.scrollY);
  expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThanOrEqual(8);

  await expect(clientSection.locator("input, select, textarea").first()).toBeVisible();
  await expect(
    deliverablesSection.locator("input, select, textarea").first()
  ).toBeVisible();
});

test("T2.5 — Continue button scrolls to the next section without collapsing the form", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);
  const agencySection = root.locator('[data-step-section="agency"]');
  const clientSection = root.locator('[data-step-section="client"]');
  const paymentSection = root.locator('[data-step-section="payment"]');
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await continueButton(page, "agency").click();
  await waitForScrollProgress(page, scrollBefore, 60);
  await waitForUiSettle(page, 220);

  await expect(clientSection).toHaveAttribute("data-step-state", "active");
  await expect(agencySection.locator("input, select, textarea").first()).toBeVisible();
  await expect(clientSection.locator("input, select, textarea").first()).toBeVisible();
  await expect(paymentSection.locator("input, select, textarea").first()).toBeVisible();
});
