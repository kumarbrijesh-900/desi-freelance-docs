import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  briefIntakeExpanded,
  editorRoot,
  openInvoicePage,
} from "./helpers/invoice-editor";

function expandedToggle(page: Parameters<typeof openInvoicePage>[0]) {
  return briefIntakeExpanded(page)
    .getByRole("button", { name: /Hide/i })
    .first();
}

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("T4.1 — Collapse toggle never says Expand", async ({ page }) => {
  await openInvoicePage(page);

  await expect(expandedToggle(page)).not.toContainText(/Expand/i);
  await expandedToggle(page).click();

  const collapsedToggle = editorRoot(page)
    .getByTestId("brief-intake-collapsed")
    .getByRole("button");
  await expect(collapsedToggle).not.toContainText(/Expand/i);

  await collapsedToggle.click();
  await expect(expandedToggle(page)).not.toContainText(/Expand/i);
});

test("T4.2 — Collapsed state shows Brief label", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  await expandedToggle(page).click();

  await expect(
    editorRoot(page).getByTestId("brief-intake-collapsed").getByRole("button")
  ).toContainText("Brief");
});

test("T4.3 — Expanded state shows Hide label", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);
  await expect(expandedToggle(page)).toContainText("Hide");
});

test("T4.4 — Brief card has reduced opacity when not hovered", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const wrapper = briefIntakeExpanded(page)
    .locator('xpath=ancestor::div[contains(@class,"opacity-80")]')
    .first();

  await expect(wrapper).toHaveClass(/opacity-80/);
});
