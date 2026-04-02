import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  locatorOrAncestorIsInert,
  openInvoicePage,
  waitForUiSettle,
} from "./helpers/invoice-editor";

const inactiveSteps = ["client", "deliverables", "payment", "meta", "totals"] as const;

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("T2.1 — Only the active step (agency) shows its form on load", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const agencySection = page.locator('[data-step-section="agency"]');
  await expect(agencySection).toHaveAttribute("data-step-state", "active");
  await expect(
    agencySection.getByPlaceholder(/Your agency or freelance brand name/i)
  ).toBeVisible();

  for (const step of inactiveSteps) {
    const section = page.locator(`[data-step-section="${step}"]`);
    const firstControl = section.locator("input, select, textarea").first();

    await expect(firstControl).not.toBeVisible();
    expect(await locatorOrAncestorIsInert(firstControl)).toBeTruthy();
  }
});

test("T2.2 — Clicking a step header activates that step", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  await page.locator('[data-step-activator="client"]').click();

  await expect(page.locator('[data-step-section="client"]')).toHaveAttribute(
    "data-step-state",
    "active"
  );
  await expect(page.locator('[data-step-section="agency"]')).not.toHaveAttribute(
    "data-step-state",
    "active"
  );
});

test("T2.3 — Completed step shows summary, not full form", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const agencySection = page.locator('[data-step-section="agency"]');
  const agencyNameInput = agencySection.getByPlaceholder(
    /Your agency or freelance brand name/i
  );

  await agencyNameInput.fill("Test Agency");
  await agencySection.getByPlaceholder("Building, street, or area").fill(
    "123 Test Street"
  );
  await agencySection.getByLabel("Agency state").selectOption("Karnataka");
  await waitForUiSettle(page, 420);

  await expect(agencySection).toHaveAttribute("data-step-state", "completed");
  await expect(agencySection.getByText("Test Agency")).toBeVisible();
  expect(await locatorOrAncestorIsInert(agencyNameInput)).toBeTruthy();
});

test("T2.4 — Tab key cannot reach fields in idle steps", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  await page
    .getByPlaceholder(/Your agency or freelance brand name/i)
    .focus();

  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab");

    const activeDetails = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return { step: null, isHiddenFormControl: false };

      const section = active.closest("[data-step-section]");
      const step = section?.getAttribute("data-step-section") ?? null;
      const isFormControl =
        active.matches("input, select, textarea") ||
        (active.matches("button") && !active.hasAttribute("data-step-activator"));

      return { step, isHiddenFormControl: isFormControl };
    });

    expect(
      !inactiveSteps.includes(activeDetails.step as (typeof inactiveSteps)[number]) ||
        !activeDetails.isHiddenFormControl
    ).toBeTruthy();
  }
});

test("T2.5 — Clicking completed step re-opens it", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const agencySection = page.locator('[data-step-section="agency"]');
  const agencyNameInput = agencySection.getByPlaceholder(
    /Your agency or freelance brand name/i
  );

  await agencyNameInput.fill("Test Agency");
  await agencySection.getByPlaceholder("Building, street, or area").fill(
    "123 Test Street"
  );
  await agencySection.getByLabel("Agency state").selectOption("Karnataka");
  await waitForUiSettle(page, 420);

  await expect(agencySection).toHaveAttribute("data-step-state", "completed");
  await page.locator('[data-step-activator="agency"]').click();

  await expect(agencySection).toHaveAttribute("data-step-state", "active");
  await expect(agencyNameInput).toBeVisible();
  await agencyNameInput.click();
  await expect(agencyNameInput).toBeFocused();
});
