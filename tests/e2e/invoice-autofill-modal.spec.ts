import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  briefIntakeExpanded,
  editorRoot,
  expectStableBoxAfter,
  expectNoHorizontalOverflow,
  extractBrief,
  loadDemoData,
  openInvoicePage,
  stepToggle,
} from "./helpers/invoice-editor";

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("invoice editor loads cleanly without hydration warnings or console errors", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  await expect(
    root.locator('[data-step-section="agency"][data-step-state="active"]')
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("brief intake collapses into a compact 48px-style summary row", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  const briefField = briefIntakeExpanded(page).locator("textarea").first();
  await briefField.fill("Agency name: DesiFreelanceDocs Studio");
  await briefIntakeExpanded(page).getByRole("button", { name: /^Hide$/i }).click();

  const collapsed = root.getByTestId("brief-intake-collapsed");
  await expect(collapsed).toBeVisible();
  await expect(collapsed).toContainText("Brief");
  await expect(collapsed.getByRole("button", { name: /^Brief$/i })).toBeVisible();

  const box = await collapsed.boundingBox();
  expect(box?.height ?? 0).toBeLessThanOrEqual(56);
});

test("collapsed intake preserves entered text and uploaded image state", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  const briefField = briefIntakeExpanded(page).locator("textarea").first();
  await briefField.fill("Agency name: DesiFreelanceDocs Studio");
  await briefIntakeExpanded(page)
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "brief-screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-image"),
    });

  await briefIntakeExpanded(page).getByRole("button", { name: /^Hide$/i }).click();
  await expect(root.getByTestId("brief-intake-collapsed")).toBeVisible();

  await root.getByTestId("brief-intake-collapsed").getByRole("button", { name: /^Brief$/i }).click();
  await expect(briefField).toHaveValue("Agency name: DesiFreelanceDocs Studio");
  await expect(root.getByText("brief-screenshot.png")).toBeVisible();
});

test("extract and autofill routes directly into the inline vertical stepper without a modal", async ({
  page,
}) => {
  await extractBrief(
    page,
    [
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
    ].join("\n")
  );
  const root = editorRoot(page);

  await expect(root.getByTestId("invoice-vertical-stepper")).toBeVisible();
  await expect(root.locator('[data-step-state="active"]')).toHaveCount(1);
  await expect(root.locator('[data-step-section="client"]')).toBeVisible();
  await expect(root.locator('[data-step-section="agency"]')).toBeVisible();
});

test("progressive flow keeps sections visible without auto-scroll", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);
  const agencySection = root.locator('[data-step-section="agency"]');
  const stepper = root.getByTestId("invoice-vertical-stepper");

  await expectStableBoxAfter(
    page,
    stepper,
    async () => {
      await root.getByPlaceholder(/Your agency or freelance brand name/i).fill(
        "DesiFreelanceDocs Studio"
      );
      await root.getByPlaceholder("Building, street, or area").fill(
        "14 Residency Road"
      );
      await root.getByLabel("Agency state").selectOption("Karnataka");
    },
    {
      keys: ["x", "width", "height"],
      tolerance: 4,
      settleMs: 220,
    }
  );

  await expect(root.locator('[data-step-state="active"]')).toHaveCount(1);
  await expect(root.locator('[data-step-section="client"]')).toBeVisible();
  await expect(root.locator('[data-step-section="agency"]')).toBeVisible();
  await expect(
    agencySection.getByPlaceholder("Building, street, or area")
  ).toBeVisible();
});

test("single-line Enter advances to the next structured field", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  const agencyName = root.getByPlaceholder(/Your agency or freelance brand name/i);
  await agencyName.fill("DesiFreelanceDocs Studio");
  await agencyName.press("Enter");

  await expect(root.getByPlaceholder("Building, street, or area")).toBeFocused();
});

test("textarea fields keep normal Enter behavior and do not auto-advance", async ({
  page,
}) => {
  await loadDemoData(page);
  const root = editorRoot(page);
  await stepToggle(page, "payment").click();

  const notes = root.getByPlaceholder(
    /Example: 1.5% monthly late fee applies/i
  );
  await notes.fill("Line one");
  await notes.press("Enter");
  await page.keyboard.type("Line two");

  await expect(notes).toBeFocused();
  await expect(notes).toHaveValue(/Line one\s*Line two/i);
});

test("structured address inputs are used inline after autofill", async ({
  page,
}) => {
  await extractBrief(
    page,
    [
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
    ].join("\n")
  );
  const root = editorRoot(page);

  const activeClientStep = root.locator('[data-step-section="client"]');
  await expect(activeClientStep.getByPlaceholder("Building, street, or campus name")).toBeVisible();
  await expect(activeClientStep.getByPlaceholder("560048")).toBeVisible();
  await expect(activeClientStep.getByLabel("Client state")).toBeVisible();
});

test("dropdown selections work cleanly in the structured address flow", async ({
  page,
}) => {
  await openInvoicePage(page);
  const root = editorRoot(page);

  await root.getByLabel("Agency state").selectOption("Delhi");
  await expect(root.getByLabel("Agency state")).toHaveValue("Delhi");
});

test("the editor layout stays within the viewport without horizontal scrolling", async ({
  page,
}) => {
  await openInvoicePage(page);
  await expectNoHorizontalOverflow(page);
});

test("floating action cluster shows only Cancel, Save Draft, and Preview & Download", async ({
  page,
}) => {
  await loadDemoData(page);
  const root = editorRoot(page);
  await stepToggle(page, "totals").click();

  const actions = root.getByTestId("floating-editor-actions");
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expect(actions.getByRole("button", { name: /^Cancel$/i })).toBeVisible();
  await expect(actions.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
  await expect(
    actions.locator("button").filter({ hasText: /Preview & download/i }).first()
  ).toBeVisible();
  await expect(actions.getByRole("button", { name: /^Back$/i })).toHaveCount(0);
  await expect(actions.getByRole("button", { name: /^Continue$/i })).toHaveCount(0);
});

test("conversational Bangalore agency context still infers Karnataka inline", async ({
  page,
}) => {
  await extractBrief(
    page,
    [
      "bhai invoice banana hai for Metro Shoes.",
      "hum DesiFreelanceDocs Studio, Residency Road Bangalore se.",
      "client bhi Bangalore mein hai.",
      "Client name: Metro Shoes Pvt. Ltd.",
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
    ].join("\n")
  );
  const root = editorRoot(page);

  await stepToggle(page, "agency").click();
  await expect(root.getByLabel("Agency state")).toHaveValue("Karnataka");
});

test("Preview & Download from the editor opens the formal preview flow with the final toolbar actions", async ({
  page,
}) => {
  await loadDemoData(page);
  const root = editorRoot(page);
  await stepToggle(page, "totals").click();

  await root
    .getByTestId("floating-editor-actions")
    .locator("button")
    .filter({ hasText: /Preview & download/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/invoice\/preview$/);

  await expect(page.getByRole("link", { name: /Back to Edit/i })).toBeVisible();
  const previewToolbar = page.getByTestId("invoice-preview-toolbar");
  await expect(
    previewToolbar.getByRole("button", { name: /^Save Draft$/i })
  ).toBeVisible();
  await expect(
    previewToolbar.getByRole("button", { name: /^Print$/i })
  ).toBeVisible();
  await expect(
    previewToolbar.getByRole("button", { name: /Export PDF/i })
  ).toBeVisible();
});
