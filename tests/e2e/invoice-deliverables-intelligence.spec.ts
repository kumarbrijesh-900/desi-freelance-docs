import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  editorRoot,
  loadDemoData,
  waitForUiSettle,
} from "./helpers/invoice-editor";

test.describe("invoice deliverables intelligence", () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleGuards(page);
    await loadDemoData(page, "deliverables");
  });

  test.afterEach(async ({ page }) => {
    assertConsoleClean(page);
  });

  test("keeps description suggestions and SAC validation live through preview", async ({
    page,
  }) => {
    const deliverablesStep = editorRoot(page).locator(
      '[data-step-section="deliverables"]'
    );
    const firstRow = deliverablesStep.getByTestId("line-item-row").first();
    const previewButton = editorRoot(page)
      .getByTestId("floating-editor-actions")
      .locator("button")
      .last();
    const mappedSuggestion = firstRow.getByRole("option", {
      name: /product photography set with retouched selects/i,
    });

    await expect(mappedSuggestion).toBeHidden();

    await firstRow.locator("select").first().selectOption("Photography");
    await expect(firstRow.getByText(/^SAC$/)).toBeVisible();
    await expect(firstRow.getByText(/^998387$/)).toBeVisible();
    await expect(mappedSuggestion).toBeHidden();

    const descriptionInput = firstRow.locator('input[type="text"]').first();
    await descriptionInput.focus();
    await expect(mappedSuggestion).toBeVisible();
    await mappedSuggestion.click();
    await expect(descriptionInput).toHaveValue(
      "Product photography set with retouched selects"
    );

    await descriptionInput.fill("Custom product photography coverage");
    await expect(descriptionInput).toHaveValue(
      "Custom product photography coverage"
    );

    await firstRow.locator("select").first().selectOption("Other");
    const sacInput = firstRow.getByPlaceholder("6-digit SAC");
    await expect(sacInput).toBeVisible();
    await expect(previewButton).toBeDisabled();

    await sacInput.fill("998599");
    await waitForUiSettle(page);
    await expect(previewButton).toBeEnabled();

    await previewButton.click();
    await expect(page).toHaveURL(/\/invoice\/preview$/);
    await expect(page.getByText("SAC 998599")).toBeVisible();
  });
});
