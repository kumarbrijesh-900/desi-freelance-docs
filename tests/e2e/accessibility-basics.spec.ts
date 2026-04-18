import { expect, test } from "@playwright/test";
import {
  assertConsoleClean,
  attachConsoleGuards,
  editorRoot,
  openInvoicePage,
} from "./helpers/invoice-editor";

test.beforeEach(async ({ page }) => {
  attachConsoleGuards(page);
});

test.afterEach(async ({ page }) => {
  assertConsoleClean(page);
});

test("T5.1 — All buttons have accessible labels", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const unlabeledButtons = await editorRoot(page).locator("button").evaluateAll((elements) =>
    elements
      .map((element) => {
        const button = element as HTMLButtonElement;
        const text = button.textContent?.trim() ?? "";
        const ariaLabel = button.getAttribute("aria-label")?.trim() ?? "";
        const labelledBy = button.getAttribute("aria-labelledby")?.trim() ?? "";

        if (text || ariaLabel || labelledBy) {
          return null;
        }

        return button.outerHTML.slice(0, 160);
      })
      .filter(Boolean)
  );

  expect(unlabeledButtons).toEqual([]);
});

test("T5.2 — All form inputs have associated labels", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const unlabeledFields = await page
    .locator("main")
    .last()
    .locator("input, select, textarea")
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          const id = field.id;
          const byFor = id
            ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
            : null;
          const byWrapper = field.closest("label");
          const byNearestFieldGroup = (() => {
            let current: HTMLElement | null = field.parentElement;
            let depth = 0;

            while (current && depth < 3) {
              const label = current.querySelector("label");
              if (label) {
                return label;
              }
              current = current.parentElement;
              depth += 1;
            }

            return null;
          })();
          const ariaLabel = field.getAttribute("aria-label")?.trim() ?? "";
          const labelledBy = field.getAttribute("aria-labelledby")?.trim() ?? "";

          if (byFor || byWrapper || byNearestFieldGroup || ariaLabel || labelledBy) {
            return null;
          }

          return {
            tag: field.tagName.toLowerCase(),
            name: field.getAttribute("name"),
            placeholder: field.getAttribute("placeholder"),
            type: "type" in field ? field.type : null,
          };
        })
        .filter(Boolean)
    );

  expect(unlabeledFields).toEqual([]);
});

test("T5.3 — Preview button aria-label is contextual", async (
  { page },
  testInfo
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  await expect(
    editorRoot(page)
      .getByTestId("floating-editor-actions")
      .locator("button")
      .filter({ hasText: /^Preview$/i })
      .first()
  ).toHaveAttribute("aria-label", /Complete/i);
});

test("T5.4 — No keyboard trap exists", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");

  await openInvoicePage(page);

  const firstFocusable = editorRoot(page)
    .getByTestId("floating-editor-actions")
    .getByRole("button", { name: /^Close$/i });
  await firstFocusable.focus();

  const getSignature = () =>
    page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return "__none__";

      const text = active.textContent?.trim() ?? "";
      const ariaLabel = active.getAttribute("aria-label")?.trim() ?? "";
      const id = active.id || "";
      const step = active.closest("[data-step-section]")?.getAttribute("data-step-section") ?? "";

      return [active.tagName.toLowerCase(), id, ariaLabel, text, step].join("|");
    });

  const startSignature = await getSignature();
  let movedFocus = false;
  let stalledFocusCount = 0;
  let previousSignature = startSignature;

  for (let index = 0; index < 50; index += 1) {
    await page.keyboard.press("Tab");
    const currentSignature = await getSignature();

    if (currentSignature !== previousSignature) {
      movedFocus = true;
      stalledFocusCount = 0;
    } else {
      stalledFocusCount += 1;
    }

    if (stalledFocusCount >= 5) {
      break;
    }

    previousSignature = currentSignature;
  }

  expect(movedFocus).toBeTruthy();
  expect(stalledFocusCount).toBeLessThan(5);
});
