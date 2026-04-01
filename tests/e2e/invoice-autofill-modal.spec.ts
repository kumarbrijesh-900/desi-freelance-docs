import { expect, test } from "@playwright/test";

async function openInvoicePage(page: import("@playwright/test").Page) {
  await page.goto("/invoice/new");
  await expect(
    page.getByRole("heading", { name: /Screenshot, text, or audio brief/i })
  ).toBeVisible();
}

async function openAutofillModal(page: import("@playwright/test").Page, brief: string) {
  await openInvoicePage(page);
  await page
    .getByPlaceholder(/Example: Agency name:/i)
    .fill(brief);
  await page.getByRole("button", { name: /Extract & Autofill/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  return dialog;
}

test("brief intake is expanded on a fresh invoice and shows the main controls", async ({
  page,
}) => {
  await openInvoicePage(page);

  await expect(
    page.getByRole("button", { name: /^Extract & Autofill$/i })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^Speak Brief$/i })
  ).toBeVisible();
  await expect(
    page.getByText(/Drop a screenshot here/i)
  ).toBeVisible();
});

test("brief intake can collapse and expand without losing typed text", async ({
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
  await expect(
    page.locator('[data-brief-intake-state="collapsed"]')
  ).toBeVisible();
  await expect(briefField).toHaveCount(0);
  await expect(page.getByText(/Paste a brief, upload a screenshot/i)).toHaveCount(0);
  await expect(page.getByText(/Drop a screenshot here/i)).toHaveCount(0);

  await page.getByRole("button", { name: /^Expand$/i }).click();
  await expect(briefField).toHaveValue("Agency name: DesiFreelanceDocs Studio");
  await expect(page.getByText("brief-screenshot.png")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Speak Brief$/i })
  ).toBeVisible();
  await expect(page.getByText(/Drop a screenshot here/i)).toBeVisible();
});

test("autofill modal appears and Fill Missing Details opens completion mode", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    "Invoice for Metro Shoes Pvt. Ltd. Landing page design, net 15."
  );

  await expect(
    dialog.getByRole("heading", { name: /Finish the invoice from extracted details/i })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Fill Missing Details/i })
  ).toBeVisible();

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  await expect(
    dialog.getByRole("heading", { name: /Complete the remaining invoice details/i })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Preview & Download/i })
  ).toHaveCount(0);
  await expect(dialog.getByText(/^Needs confirmation$/)).toHaveCount(0);
  await expect(dialog.getByText(/^Confidently filled$/)).toHaveCount(0);
  await expect(dialog.getByText(/^Missing required fields$/)).toHaveCount(0);
});

test("agency name is autofilled from conversational brief language", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    "We are DesiFreelanceDocs Studio in Bengaluru. Invoice for Metro Shoes Pvt. Ltd. Net 15."
  );

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  await expect(
    dialog.locator('input[placeholder="Your agency or freelance brand name"]')
  ).toHaveCount(0);
});

test("Agency Name Enter moves focus to Agency Address and the step stays active until all fields are valid", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    "Invoice for Metro Shoes Pvt. Ltd. Need this billed this week."
  );

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  const agencyNameInput = dialog.locator(
    'input[placeholder="Your agency or freelance brand name"]'
  );
  const agencyAddressTextarea = dialog.locator(
    'textarea[placeholder="Business address"]'
  );

  await agencyNameInput.fill("DesiFreelanceDocs Studio");
  await agencyNameInput.press("Enter");

  await expect(agencyAddressTextarea.first()).toBeFocused();

  await agencyAddressTextarea.first().fill("14 Residency Road");
  await expect(dialog.locator("select").first()).toBeVisible();
  await expect(agencyAddressTextarea.first()).toBeFocused();
});

test("Typing into Agency Address does not auto-advance while the textarea is still focused", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    [
      "Agency name: DesiFreelanceDocs Studio",
      "Agency state: Karnataka",
      "Client name: Metro Shoes Pvt. Ltd.",
      "Payment terms: Net 15",
      "Invoice number: INV-2026-001",
    ].join("\n")
  );

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  const agencyAddressTextarea = dialog.locator(
    'textarea[placeholder="Business address"]'
  );
  await agencyAddressTextarea.first().fill("14 R");

  await expect
    .poll(() =>
      page.evaluate(
        () => document.activeElement?.getAttribute("placeholder") ?? ""
      )
    )
    .toBe("Business address");
  await expect(dialog.getByText(/^Agency Details$/).first()).toBeVisible();
});

test("multiline address fields keep normal Enter behavior instead of submitting or advancing", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    [
      "Agency name: DesiFreelanceDocs Studio",
      "Agency state: Karnataka",
      "Client name: Metro Shoes Pvt. Ltd.",
      "Payment terms: Net 15",
      "Invoice number: INV-2026-001",
    ].join("\n")
  );

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  const agencyAddressTextarea = dialog
    .locator('textarea[placeholder="Business address"]')
    .first();
  await agencyAddressTextarea.fill("14 Residency Road");
  await agencyAddressTextarea.press("Enter");
  await page.keyboard.type("Bengaluru");

  await expect(agencyAddressTextarea).toHaveValue(
    "14 Residency Road\nBengaluru"
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.activeElement?.getAttribute("placeholder") ?? ""
      )
    )
    .toBe("Business address");
});

test("Domestic and International toggle states are obvious and switch the step content", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    [
      "Agency name: DesiFreelanceDocs Studio",
      "Agency address: 14 Residency Road, Bengaluru, Karnataka",
      "Client name: Acme Labs",
      "Payment terms: Net 15",
      "Invoice number: INV-2026-001",
      "Invoice date: 2026-04-01",
      "Due date: 2026-04-15",
    ].join("\n")
  );

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  const clientLocationGroup = dialog.getByRole("radiogroup", {
    name: "Client Location",
  });
  const domestic = clientLocationGroup.getByRole("radio", {
    name: "Domestic (India)",
  });
  const international = clientLocationGroup.getByRole("radio", {
    name: "International",
  });

  await expect(domestic).toBeChecked();
  await international.click();

  await expect(international).toBeChecked();
  await expect(dialog.getByText(/^Country \*$/)).toBeVisible();
});

test("GST registration toggle is visually and functionally obvious on the main form", async ({
  page,
}) => {
  await openInvoicePage(page);

  const registered = page.getByRole("radio", {
    name: "Registered under GST",
  });
  const notRegistered = page.getByRole("radio", {
    name: "Not registered",
  });

  await expect(notRegistered).toBeChecked();
  await page.getByText(/^Registered under GST$/).click();

  await expect(registered).toBeChecked();
  await expect(page.getByText(/^GSTIN$/)).toBeVisible();
});

test("Preview stays gated until the required modal fields are completed", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
    page,
    "Invoice for Metro Shoes Pvt. Ltd. Need this billed this week."
  );

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  await expect(
    dialog.getByRole("button", { name: /Preview & Download/i })
  ).toHaveCount(0);
  await expect(
    dialog.getByText(/required fields still need attention/i).first()
  ).toBeVisible();
});

test("Preview & Download appears once the last missing mandatory field is completed", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
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

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();
  await dialog
    .locator('textarea[placeholder="Client billing address"]')
    .first()
    .fill("Phoenix Marketcity, Bengaluru, Karnataka");

  await expect(
    dialog.getByRole("button", { name: /Preview & Download/i })
  ).toBeVisible();
});

test("final completion state shows only Close, Save Draft, and Preview & Download", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
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

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();
  await dialog
    .locator('textarea[placeholder="Client billing address"]')
    .first()
    .fill("Phoenix Marketcity, Bengaluru, Karnataka");

  const footer = dialog.getByTestId("autofill-modal-footer-actions");
  await expect(footer.getByRole("button")).toHaveCount(3);
  await expect(footer.getByRole("button", { name: /^Close$/i })).toBeVisible();
  await expect(
    footer.getByRole("button", { name: /^Save Draft$/i })
  ).toBeVisible();
  await expect(
    footer.getByRole("button", { name: /Preview & Download/i })
  ).toBeVisible();
  await expect(footer.getByText(/Manual Check/i)).toHaveCount(0);
  await expect(footer.getByText(/Back to Summary/i)).toHaveCount(0);
  await expect(
    footer.locator('[data-button-variant="primary"]', {
      hasText: "Preview & Download",
    })
  ).toBeVisible();
});

test("Save Draft is available in the final completion state and closes the modal safely", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
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

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();
  await dialog
    .locator('textarea[placeholder="Client billing address"]')
    .first()
    .fill("Phoenix Marketcity, Bengaluru, Karnataka");

  await dialog.getByRole("button", { name: /^Save Draft$/i }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/invoice\/new$/);
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("invoice-editor-draft"))
    )
    .not.toBeNull();
});

test("Close dismisses the ready-to-preview autofill modal without changing the page", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
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

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();
  await dialog
    .locator('textarea[placeholder="Client billing address"]')
    .first()
    .fill("Phoenix Marketcity, Bengaluru, Karnataka");

  await dialog.getByRole("button", { name: /^Close$/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/invoice\/new$/);
});

test("conversational Bangalore agency context infers Karnataka so agency state is not left missing", async ({
  page,
}) => {
  const dialog = await openAutofillModal(
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

  await dialog.getByRole("button", { name: /Fill Missing Details/i }).click();

  await expect(
    dialog.locator('textarea[placeholder="Business address"]').first()
  ).toBeVisible();
  await expect(dialog.getByText(/^Agency State \*$/)).toHaveCount(0);
});
