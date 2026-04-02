import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  expectInViewport,
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

  const actions = page.getByTestId("floating-editor-actions");
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expect(actions.getByRole("button", { name: /^Cancel$/i })).toBeVisible();
  await expect(
    actions.getByRole("button", { name: /^Save draft$/i })
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: /^Preview & download$/i })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Load Demo Data$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Clear Demo Data$/i })).toHaveCount(0);
});

test("T1.2 — Sticky toolbar stays visible on scroll", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  await page.evaluate(() => window.scrollTo(0, 9999));
  await waitForUiSettle(page);

  const actions = page.getByTestId("floating-editor-actions");
  await expectInViewport(page, actions.getByRole("button", { name: /^Cancel$/i }));
  await expectInViewport(
    page,
    actions.getByRole("button", { name: /^Save draft$/i })
  );
  await expectInViewport(
    page,
    actions.getByRole("button", { name: /^Preview & download$/i })
  );
});

test("T1.3 — Aside rail visible at tablet width (1024px)", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "tablet", "Tablet only");

  await openInvoicePage(page);

  const rail = page.getByTestId("desktop-support-rail");
  await expect(rail).toBeVisible();

  const display = await rail.evaluate(
    (element) => window.getComputedStyle(element as HTMLElement).display
  );
  expect(display).not.toBe("none");
});

test("T1.4 — Compact progress summary hidden at tablet width", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "tablet", "Tablet only");

  await openInvoicePage(page);
  await expect(page.getByTestId("compact-progress-summary")).not.toBeVisible();
});

test("T1.5 — Compact progress summary visible on mobile", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile only");

  await openInvoicePage(page);

  const summary = page.getByTestId("compact-progress-summary");
  await expect(summary).toBeVisible();

  const progressFill = summary.locator('div[style*="width"]').last();
  await expect(progressFill).toBeVisible();
  await expect(progressFill).toHaveAttribute("style", /width:\s*\d+%/i);
});

test("T1.6 — Preview & download button is disabled on fresh load", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const previewButton = page
    .getByTestId("floating-editor-actions")
    .getByRole("button", { name: /^Preview & download$/i });

  await expect(previewButton).toBeDisabled();
  await expect(previewButton).toHaveAttribute("aria-label", /Complete/i);
});
