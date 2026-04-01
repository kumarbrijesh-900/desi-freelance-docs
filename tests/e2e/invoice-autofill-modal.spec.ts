import { expect, test, type Page } from "@playwright/test";

const pageConsoleIssues = new WeakMap<Page, string[]>();

function isHydrationRelatedWarning(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("hydration") ||
    text.includes("did not match") ||
    text.includes("server rendered html") ||
    text.includes("text content does not match") ||
    text.includes("classname") ||
    text.includes("expected server html")
  );
}

function attachConsoleGuards(page: Page) {
  const issues: string[] = [];
  pageConsoleIssues.set(page, issues);

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") {
      issues.push(`console.error: ${text}`);
      return;
    }

    if (message.type() === "warning" && isHydrationRelatedWarning(text)) {
      issues.push(`console.warning: ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });
}

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  expect(pageConsoleIssues.get(page) ?? []).toEqual([]);
});

async function openInvoicePage(page: import("@playwright/test").Page) {
  await page.goto("/invoice/new");
  await expect(
    page.getByRole("heading", { name: /Screenshot, text, or audio brief/i })
  ).toBeVisible();
}

async function extractBrief(
  page: import("@playwright/test").Page,
  brief: string
) {
  await openInvoicePage(page);
  await page.getByPlaceholder(/Example: Agency name:/i).fill(brief);
  await page.getByRole("button", { name: /^Extract & Autofill$/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-brief-intake-state="collapsed"]')).toBeVisible();
}

function stepToggle(
  page: import("@playwright/test").Page,
  step: "agency" | "client" | "deliverables" | "payment" | "meta" | "totals"
) {
  return page.locator(`[data-step-section="${step}"] > button`);
}

test("brief intake collapses into a compact 48px-style summary row", async ({
  page,
}) => {
  await openInvoicePage(page);

  const briefField = page.getByPlaceholder(/Example: Agency name:/i);
  await briefField.fill("Agency name: DesiFreelanceDocs Studio");
  await page.getByRole("button", { name: /^Collapse$/i }).click();

  const collapsed = page.getByTestId("brief-intake-collapsed");
  await expect(collapsed).toBeVisible();
  await expect(collapsed).toContainText("Brief");
  await expect(collapsed.getByRole("button", { name: /^Edit$/i })).toBeVisible();

  const box = await collapsed.boundingBox();
  expect(box?.height ?? 0).toBeLessThanOrEqual(56);
});

test("collapsed intake preserves entered text and uploaded image state", async ({
  page,
}) => {
  await openInvoicePage(page);

  const briefField = page.getByPlaceholder(/Example: Agency name:/i);
  await briefField.fill("Agency name: DesiFreelanceDocs Studio");
  await page
    .locator('[data-brief-intake-state="expanded"] input[type="file"]')
    .first()
    .setInputFiles({
      name: "brief-screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-image"),
    });

  await page.getByRole("button", { name: /^Collapse$/i }).click();
  await expect(page.getByTestId("brief-intake-collapsed")).toBeVisible();

  await page.getByRole("button", { name: /^Edit$/i }).click();
  await expect(briefField).toHaveValue("Agency name: DesiFreelanceDocs Studio");
  await expect(page.getByText("brief-screenshot.png")).toBeVisible();
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

  await expect(page.locator('[data-step-state="active"]')).toHaveCount(1);
  await expect(
    page.locator('[data-step-section="client"][data-step-state="active"]')
  ).toBeVisible();
  await expect(
    page.locator('[data-step-section="agency"][data-step-state="completed"]')
  ).toBeVisible();
});

test("progressive flow keeps completed sections visible and scrolls to the next unlocked section", async ({
  page,
}) => {
  await openInvoicePage(page);

  const agencySection = page.locator('[data-step-section="agency"]');
  await page.getByPlaceholder(/Your agency or freelance brand name/i).fill(
    "DesiFreelanceDocs Studio"
  );
  await page.getByPlaceholder("Building, street, or area").fill(
    "14 Residency Road"
  );
  await page.getByLabel("Agency state").selectOption("Karnataka");

  await expect(page.locator('[data-step-state="active"]')).toHaveCount(1);
  await expect(
    page.locator('[data-step-section="client"][data-step-state="active"]')
  ).toBeVisible();
  await expect(
    page.locator('[data-step-section="agency"][data-step-state="completed"]')
  ).toBeVisible();
  await expect(
    agencySection.getByPlaceholder("Building, street, or area")
  ).toBeVisible();

  await page.waitForFunction(() => window.scrollY > 40);
});

test("single-line Enter advances to the next structured field", async ({
  page,
}) => {
  await openInvoicePage(page);

  const agencyName = page.getByPlaceholder(/Your agency or freelance brand name/i);
  await agencyName.fill("DesiFreelanceDocs Studio");
  await agencyName.press("Enter");

  await expect(page.getByPlaceholder("560025")).toBeFocused();
});

test("textarea fields keep normal Enter behavior and do not auto-advance", async ({
  page,
}) => {
  await openInvoicePage(page);
  await page.getByRole("button", { name: /^Load Demo Data$/i }).click();
  await stepToggle(page, "payment").click();

  const notes = page.getByPlaceholder(
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

  const activeClientStep = page.locator(
    '[data-step-section="client"][data-step-state="active"]'
  );
  await expect(activeClientStep.getByPlaceholder("Building, street, or campus name")).toBeVisible();
  await expect(activeClientStep.getByPlaceholder("560048")).toBeVisible();
  await expect(activeClientStep.getByLabel("Client state")).toBeVisible();
});

test("dropdown selections work cleanly in the structured address flow", async ({
  page,
}) => {
  await openInvoicePage(page);

  await page.getByLabel("Agency state").selectOption("Delhi");
  await expect(page.getByLabel("Agency state")).toHaveValue("Delhi");
});

test("the editor layout stays within the viewport without horizontal scrolling", async ({
  page,
}) => {
  await openInvoicePage(page);

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });

  expect(hasHorizontalOverflow).toBeFalsy();
});

test("final totals step shows only Close, Save Draft, and Preview & Download", async ({
  page,
}) => {
  await openInvoicePage(page);
  await page.getByRole("button", { name: /^Load Demo Data$/i }).click();
  await stepToggle(page, "totals").click();

  const footer = page.getByTestId("editor-footer-actions");
  await expect(footer.getByRole("button")).toHaveCount(3);
  await expect(footer.getByRole("button", { name: /^Close$/i })).toBeVisible();
  await expect(footer.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
  await expect(
    footer.getByRole("button", { name: /Preview & Download/i })
  ).toBeVisible();
  await expect(footer.getByRole("button", { name: /^Back$/i })).toHaveCount(0);
  await expect(footer.getByRole("button", { name: /^Continue$/i })).toHaveCount(0);
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

  await stepToggle(page, "agency").click();
  await expect(page.getByLabel("Agency state")).toHaveValue("Karnataka");
});

test("Preview & Download from the editor opens the formal preview flow with the final toolbar actions", async ({
  page,
}) => {
  await openInvoicePage(page);
  await page.getByRole("button", { name: /^Load Demo Data$/i }).click();
  await stepToggle(page, "totals").click();

  await page.getByRole("button", { name: /Preview & Download/i }).click();
  await expect(page).toHaveURL(/\/invoice\/preview$/);

  await expect(page.getByRole("link", { name: /Back to Edit/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Save Draft$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Print$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Export PDF/i })).toBeVisible();
});
