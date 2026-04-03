import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  editorRoot,
  openInvoicePage,
  waitForUiSettle,
} from "./helpers/invoice-editor";

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("T1.1 — Sticky toolbar exists and has exactly 3 buttons", async ({
  page,
}) => {
  await openInvoicePage(page);

  const root = editorRoot(page);
  const actions = root.getByTestId("floating-editor-actions").first();
  const previewButton = actions
    .locator("button")
    .filter({ hasText: /Preview & download/i })
    .first();
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expect(actions.getByRole("button", { name: /^Cancel$/i })).toBeVisible();
  await expect(
    actions.getByRole("button", { name: /^Save draft$/i })
  ).toBeVisible();
  await expect(previewButton).toBeVisible();
  await expect(root.getByRole("button", { name: /^Load Demo Data$/i })).toHaveCount(0);
  await expect(root.getByRole("button", { name: /^Clear Demo Data$/i })).toHaveCount(0);

  for (const step of [
    "agency",
    "client",
    "deliverables",
    "payment",
    "meta",
    "totals",
  ] as const) {
    const section = root.locator(`[data-step-section="${step}"]`);
    await expect(section).toBeVisible();
    if (step === "totals") {
      await expect(section.getByText(/Grand total/i)).toBeVisible();
      continue;
    }
    await expect(section.locator("input, select, textarea").first()).toBeVisible();
  }
});

test("T1.2 — Sticky toolbar stays visible on scroll", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);
  const actions = root.getByTestId("floating-editor-actions").first();
  await expect(actions).toBeVisible();
  const beforeBox = await actions.boundingBox();
  await page.mouse.wheel(0, 160);
  await waitForUiSettle(page);

  await expect(actions).toBeVisible();
  const afterBox = await actions.boundingBox();
  const viewport = page.viewportSize();

  expect(afterBox?.x ?? 0).toBeGreaterThan((viewport?.width ?? 0) - ((afterBox?.width ?? 0) + 48));
  expect((afterBox?.y ?? 0) + (afterBox?.height ?? 0)).toBeGreaterThanOrEqual(
    (viewport?.height ?? 0) - 72
  );
  expect(Math.abs((afterBox?.y ?? 0) - (beforeBox?.y ?? 0))).toBeLessThanOrEqual(8);
});

test("T1.3 — Left rail is visible and positioned to the left of the form", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const root = editorRoot(page);
  const rail = root.getByTestId("desktop-support-rail").first();
  const stepper = root.getByTestId("invoice-vertical-stepper");
  await expect(rail).toBeVisible();

  const display = await rail.evaluate(
    (element) => window.getComputedStyle(element as HTMLElement).display
  );
  expect(display).not.toBe("none");
  const railBox = await rail.boundingBox();
  const stepperBox = await stepper.boundingBox();
  expect(railBox?.x ?? 0).toBeLessThan(stepperBox?.x ?? 0);
  const beforeY = railBox?.y ?? 0;
  await page.mouse.wheel(0, 800);
  await waitForUiSettle(page);
  const afterY = (await rail.boundingBox())?.y ?? 0;
  expect(Math.abs(afterY - beforeY)).toBeLessThanOrEqual(24);
  expect(afterY).toBeLessThanOrEqual(120);
  await expect(rail.getByRole("button", { name: /Agency/i })).toBeVisible();
  await expect(rail.getByText(/Ready State/i)).toHaveCount(0);
  await expect(rail.getByText(/Compliance/i)).toHaveCount(0);
  await expect(rail.getByText(/Summary/i)).toHaveCount(0);
});

test("T1.4 — Compact progress summary hidden at tablet width", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "tablet", "Tablet only");

  await openInvoicePage(page);
  await expect(
    editorRoot(page).getByTestId("compact-progress-summary").first()
  ).not.toBeVisible();
});

test("T1.5 — Compact progress summary visible on mobile", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile only");

  await openInvoicePage(page);

  const summary = editorRoot(page).getByTestId("compact-progress-summary").first();
  await expect(summary).toBeVisible();

  const progressFill = summary.locator('div[style*="width"]').last();
  await expect(progressFill).toHaveAttribute("style", /width:\s*\d+%/i);
});

test("T1.6 — Preview & download button is disabled on fresh load", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const previewButton = editorRoot(page)
    .getByTestId("floating-editor-actions")
    .locator("button")
    .filter({ hasText: /Preview & download/i })
    .first();

  await expect(previewButton).toBeDisabled();
  await expect(previewButton).toHaveAttribute("aria-label", /Complete/i);
  await expect(
    editorRoot(page)
      .getByTestId("desktop-support-rail")
      .first()
      .getByRole("button", { name: /Totals/i })
  ).toContainText(/Pending|Incomplete/i);
});
