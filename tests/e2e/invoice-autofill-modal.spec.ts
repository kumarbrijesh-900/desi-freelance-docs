import { expect, test } from "@playwright/test";

async function openAutofillModal(page: import("@playwright/test").Page, brief: string) {
  await page.goto("/invoice/new");
  await page
    .getByPlaceholder(/Example: Agency name:/i)
    .fill(brief);
  await page.getByRole("button", { name: /Extract & Autofill/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  return dialog;
}

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
