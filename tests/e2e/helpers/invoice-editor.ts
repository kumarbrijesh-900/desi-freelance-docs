import { expect, type Locator, type Page } from "@playwright/test";

const pageConsoleIssues = new WeakMap<Page, string[]>();

export type InvoiceStep =
  | "agency"
  | "client"
  | "deliverables"
  | "payment"
  | "meta"
  | "totals";

type BoxKey = "x" | "y" | "width" | "height";

export function isHydrationRelatedWarning(message: string) {
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

export function attachConsoleGuards(page: Page) {
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

export function assertConsoleClean(page: Page) {
  expect(pageConsoleIssues.get(page) ?? []).toEqual([]);
}

export async function waitForUiSettle(page: Page, delay = 320) {
  await page.waitForTimeout(delay);
}

export async function openInvoicePage(page: Page) {
  await page.addInitScript(() => {
    if (window.location.pathname === "/invoice/new") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
  });

  await page.goto("/invoice/new");
  await expect(
    page.getByRole("heading", { name: /Screenshot, text, or audio brief/i })
  ).toBeVisible();
  await waitForUiSettle(page);
}

export async function loadDemoData(page: Page) {
  await openInvoicePage(page);
  await page.getByRole("button", { name: /^Load Demo Data$/i }).click();
  await waitForUiSettle(page);
}

export async function extractBrief(page: Page, brief: string) {
  await openInvoicePage(page);
  await page.getByPlaceholder(/Example: Agency name:/i).fill(brief);
  await page.getByRole("button", { name: /^Extract & Autofill$/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-brief-intake-state="collapsed"]')).toBeVisible();
  await waitForUiSettle(page, 420);
}

export function stepToggle(page: Page, step: InvoiceStep) {
  return page.locator(
    `[data-step-section="${step}"] [data-step-activator="${step}"]`
  );
}

export async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });

  expect(hasHorizontalOverflow).toBeFalsy();
}

export async function expectFocusVisible(locator: Locator) {
  const focusStyles = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element as HTMLElement);
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });

  expect(
    focusStyles.boxShadow !== "none" ||
      (focusStyles.outlineStyle !== "none" && focusStyles.outlineWidth !== "0px")
  ).toBeTruthy();
}

export async function focusViaTabUntil(
  page: Page,
  locator: Locator,
  maxTabs = 20
) {
  for (let index = 0; index < maxTabs; index += 1) {
    const isFocused = await locator.evaluate(
      (element) => element === document.activeElement
    );
    if (isFocused) return;
    await page.keyboard.press("Tab");
  }

  throw new Error("Unable to reach the requested control via keyboard navigation");
}

export async function expectStableBoxAfter(
  page: Page,
  locator: Locator,
  action: () => Promise<void>,
  {
    keys = ["x", "width"],
    tolerance = 2,
    settleMs = 320,
  }: {
    keys?: BoxKey[];
    tolerance?: number;
    settleMs?: number;
  } = {}
) {
  const before = await locator.boundingBox();
  expect(before).not.toBeNull();

  await action();
  await page.waitForTimeout(settleMs);

  const after = await locator.boundingBox();
  expect(after).not.toBeNull();

  for (const key of keys) {
    expect(Math.abs((after?.[key] ?? 0) - (before?.[key] ?? 0))).toBeLessThanOrEqual(
      tolerance
    );
  }
}

export async function waitForScrollProgress(
  page: Page,
  previousScrollY: number,
  minimumDelta = 24
) {
  await page.waitForFunction(
    ({ expectedY, delta }) => window.scrollY >= expectedY + delta,
    { expectedY: previousScrollY, delta: minimumDelta }
  );
}
