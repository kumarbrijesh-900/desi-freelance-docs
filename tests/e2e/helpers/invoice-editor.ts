import { expect, type Locator, type Page } from "@playwright/test";

const pageConsoleIssues = new WeakMap<Page, string[]>();
const DRAFT_STORAGE_KEY = "invoice-editor-draft";
const PREVIEW_STORAGE_KEY = "invoice-preview-data";
const INVOICE_SEQUENCE_KEY = "invoice-sequence-by-year";

export type InvoiceStep =
  | "agency"
  | "client"
  | "deliverables"
  | "payment"
  | "meta"
  | "totals";

type BoxKey = "x" | "y" | "width" | "height";
type SequenceMap = Record<string, number>;

type DraftSeed = {
  formData: Record<string, unknown>;
  currentStep: InvoiceStep;
  savedAt: string;
};

type OpenInvoiceOptions = {
  draft?: DraftSeed | null;
  preserveSequence?: boolean;
  sequenceMap?: SequenceMap | null;
};

export function buildSeededInvoiceFormData(invoiceNumber = "INV-2026-001") {
  return {
    agency: {
      agencyName: "DesiFreelanceDocs Studio",
      address: "2nd Floor, 14 Residency Road, Bengaluru, Karnataka 560025",
      addressLine1: "2nd Floor, 14 Residency Road",
      addressLine2: "",
      city: "Bengaluru",
      pinCode: "560025",
      agencyState: "Karnataka",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      logoUrl: "/dummy-logo.svg",
      gstRegistrationStatus: "registered",
      lutAvailability: "",
      lutNumber: "",
      noLutTaxHandling: "",
    },
    client: {
      clientName: "Metro Shoes Pvt. Ltd.",
      clientAddress:
        "Phoenix Marketcity, Whitefield Main Road, Bengaluru 560048",
      clientAddressLine1: "Phoenix Marketcity, Whitefield Main Road",
      clientAddressLine2: "",
      clientCity: "Bengaluru",
      clientPinCode: "560048",
      clientPostalCode: "",
      clientEmail: "",
      clientState: "Karnataka",
      clientCountry: "",
      clientCurrency: "",
      clientGstin: "29AAACM8899L1Z2",
      clientLocation: "domestic",
      isClientSezUnit: "no",
    },
    meta: {
      invoiceNumber,
      invoiceDate: "2026-04-01",
      dueDate: "2026-04-16",
      paymentTerms: "Net 15",
    },
    lineItems: [
      {
        id: "demo-line-1",
        type: "UI/UX",
        description: "Landing Page UI Design",
        qty: 3,
        rate: 12000,
        rateUnit: "per-screen",
      },
      {
        id: "demo-line-2",
        type: "Illustration",
        description: "Editorial Illustration",
        qty: 2,
        rate: 8000,
        rateUnit: "per-item",
      },
    ],
    tax: {
      taxMode: "gst",
      taxRate: 18,
    },
    payment: {
      license: {
        isLicenseIncluded: true,
        licenseType: "exclusive-license",
        licenseDuration: "3 years",
      },
      notes:
        "50% advance received. Remaining balance due within 15 days. Final editable files and exports will be delivered after full payment.",
      paymentSettlementType: "",
      accountName: "DesiFreelanceDocs Studio",
      bankName: "HDFC Bank",
      bankAddress: "",
      accountNumber: "50200044321098",
      ifscCode: "HDFC0001122",
      swiftBicCode: "",
      ibanRoutingCode: "",
      qrCodeUrl: "/dummy-qr.svg",
    },
  };
}

export function buildStoredDraft({
  invoiceNumber = "INV-2026-001",
  currentStep = "agency",
  formData,
}: {
  invoiceNumber?: string;
  currentStep?: InvoiceStep;
  formData?: Record<string, unknown>;
} = {}): DraftSeed {
  return {
    formData: formData ?? buildSeededInvoiceFormData(invoiceNumber),
    currentStep,
    savedAt: "2026-04-02T09:30:00.000Z",
  };
}

export async function bootstrapInvoiceStorage(
  page: Page,
  {
    draft = null,
    preserveSequence = false,
    sequenceMap = null,
  }: OpenInvoiceOptions = {}
) {
  await page.addInitScript(
    ({
      draftSeed,
      keepSequence,
      nextSequenceMap,
      keys,
    }: {
      draftSeed: DraftSeed | null;
      keepSequence: boolean;
      nextSequenceMap: SequenceMap | null;
      keys: {
        draft: string;
        preview: string;
        sequence: string;
      };
    }) => {
      if (window.location.pathname !== "/invoice/new") return;

      const existingSequence = keepSequence
        ? window.localStorage.getItem(keys.sequence)
        : null;

      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.removeItem(keys.preview);

      if (keepSequence && existingSequence) {
        window.localStorage.setItem(keys.sequence, existingSequence);
      }

      if (nextSequenceMap) {
        window.localStorage.setItem(
          keys.sequence,
          JSON.stringify(nextSequenceMap)
        );
      }

      if (draftSeed) {
        window.localStorage.setItem(keys.draft, JSON.stringify(draftSeed));
      }
    },
    {
      draftSeed: draft,
      keepSequence: preserveSequence,
      nextSequenceMap: sequenceMap ?? null,
      keys: {
        draft: DRAFT_STORAGE_KEY,
        preview: PREVIEW_STORAGE_KEY,
        sequence: INVOICE_SEQUENCE_KEY,
      },
    }
  );
}

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

export async function openInvoicePage(
  page: Page,
  options: OpenInvoiceOptions = {}
) {
  await bootstrapInvoiceStorage(page, options);

  await page.goto("/invoice/new");
  await expect(
    page.getByRole("heading", { name: /Screenshot, text, or audio brief/i })
  ).toBeVisible();
  await waitForUiSettle(page);
}

export async function loadDemoData(page: Page, currentStep: InvoiceStep = "agency") {
  await openInvoicePage(page, {
    draft: buildStoredDraft({
      currentStep,
    }),
  });
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

export async function locatorOrAncestorIsInert(locator: Locator) {
  return locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) return false;
    return element.matches("[inert]") || element.closest("[inert]") !== null;
  });
}

export async function expectInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
    (viewport?.width ?? 0) + 1
  );
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
    (viewport?.height ?? 0) + 1
  );
  expect(box?.y ?? 0).toBeGreaterThanOrEqual(0);
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
