const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "https://lanceinvoice.xyz";
const OUT_DIR = path.resolve(__dirname);
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots");
const JSON_PATH = path.join(OUT_DIR, "prelaunch_flow_visual_audit.json");
const MD_PATH = path.join(OUT_DIR, "PRELAUNCH_FLOW_AND_VISUAL_AUDIT.md");

const routes = [
  { label: "dashboard", url: "/dashboard", purpose: "Command center, project lifecycle, empty/select state" },
  { label: "projects", url: "/projects", purpose: "Projects index and project cards" },
  { label: "invoices", url: "/invoices", purpose: "Invoice ledger, filters, row navigation" },
  { label: "clients", url: "/clients", purpose: "Client list and creation surfaces" },
  { label: "profile", url: "/profile", purpose: "Profile, global MSA, bank/profile settings" },
  { label: "invoice-new", url: "/invoice/new", purpose: "Invoice wizard, Items project field, bottom bar" },
  { label: "invoice-preview", url: "/invoice/preview", purpose: "Preview/export/share surfaces when data is available" },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function markdownTable(rows, columns) {
  const header = `| ${columns.join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) =>
    `| ${columns.map((col) => String(row[col] ?? "").replace(/\n/g, "<br>").replace(/\|/g, "\\|")).join(" | ")} |`
  );
  return [header, divider, ...body].join("\n");
}

async function scanPage(page, route) {
  const result = {
    ...route,
    targetUrl: `${BASE_URL}${route.url}`,
    finalUrl: null,
    title: null,
    authState: "unknown",
    screenshot: null,
    pageHeaders: [],
    buttons: [],
    links: [],
    forms: [],
    modals: [],
    visualViolations: [],
    overflow: [],
    textFindings: [],
    navFindings: [],
    summaryText: "",
  };

  try {
    await page.goto(result.targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(1000);

    result.finalUrl = page.url();
    result.title = await page.title();
    result.authState = result.finalUrl.includes("/login") || result.finalUrl.includes("/signup")
      ? "redirected-to-auth"
      : "page-accessible";

    const screenshotPath = path.join(SCREENSHOT_DIR, `${route.label}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshot = path.relative(OUT_DIR, screenshotPath);

    const dom = await page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };

      const shortText = (value, max = 180) => (value || "").replace(/\s+/g, " ").trim().slice(0, max);
      const selectorFor = (el) => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const cls = Array.from(el.classList || []).slice(0, 4).join(".");
        return cls ? `${tag}.${cls}` : tag;
      };
      const getStyle = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          selector: selectorFor(el),
          text: shortText(el.innerText || el.textContent || "", 120),
          tag: el.tagName.toLowerCase(),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          textTransform: style.textTransform,
          letterSpacing: style.letterSpacing,
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderTopWidth: style.borderTopWidth,
          borderTopStyle: style.borderTopStyle,
          borderTopColor: style.borderTopColor,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          backgroundImage: style.backgroundImage,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
        };
      };

      const headers = Array.from(document.querySelectorAll("main h1, main h2, [role='heading'], h1, h2"))
        .filter(isVisible)
        .slice(0, 12)
        .map(getStyle);

      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(isVisible)
        .slice(0, 80)
        .map((button) => ({
          ...getStyle(button),
          disabled: button.disabled,
          ariaLabel: button.getAttribute("aria-label"),
          type: button.getAttribute("type"),
          hasOnClickAttr: button.hasAttribute("onclick"),
        }));

      const links = Array.from(document.querySelectorAll("a[href]"))
        .filter(isVisible)
        .slice(0, 80)
        .map((link) => ({
          ...getStyle(link),
          href: link.getAttribute("href"),
          target: link.getAttribute("target"),
        }));

      const forms = Array.from(document.querySelectorAll("form, input, textarea, select"))
        .filter(isVisible)
        .slice(0, 80)
        .map((el) => ({
          ...getStyle(el),
          name: el.getAttribute("name"),
          placeholder: el.getAttribute("placeholder"),
          required: el.hasAttribute("required"),
          disabled: el.hasAttribute("disabled"),
          valuePresent: Boolean(el.value),
        }));

      const modals = Array.from(document.querySelectorAll("[role='dialog'], [aria-modal='true']"))
        .filter(isVisible)
        .map(getStyle);

      const visualViolations = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .map((el) => ({ el, style: window.getComputedStyle(el), rect: el.getBoundingClientRect() }))
        .filter(({ style, rect }) => rect.width > 12 && rect.height > 12)
        .map(({ el, style }) => {
          const radius = parseFloat(style.borderTopLeftRadius || "0") || 0;
          const shadow = style.boxShadow || "none";
          const hasBlurShadow = shadow !== "none" && /rgba?\(/.test(shadow) && !/\s0(px)?\s/.test(shadow);
          const hasGradient = (style.backgroundImage || "none").includes("gradient");
          const borderWidths = [
            parseFloat(style.borderTopWidth || "0") || 0,
            parseFloat(style.borderRightWidth || "0") || 0,
            parseFloat(style.borderBottomWidth || "0") || 0,
            parseFloat(style.borderLeftWidth || "0") || 0,
          ];
          const hasOddBorder = borderWidths.some((w) => w > 0 && ![1, 2, 3, 4].includes(w));
          if (!radius && !hasBlurShadow && !hasGradient && !hasOddBorder) return null;
          return {
            selector: selectorFor(el),
            text: shortText(el.innerText || el.textContent || "", 80),
            borderRadius: style.borderRadius,
            boxShadow: shadow,
            backgroundImage: style.backgroundImage,
            borderWidths: borderWidths.join(","),
          };
        })
        .filter(Boolean)
        .slice(0, 60);

      const overflow = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .filter((el) => el.scrollWidth > el.clientWidth + 2)
        .slice(0, 40)
        .map((el) => ({
          selector: selectorFor(el),
          text: shortText(el.innerText || el.textContent || "", 80),
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
        }));

      const bodyText = shortText(document.body.innerText, 1200);
      const visibleText = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .map((el) => shortText(el.innerText || el.textContent || "", 160))
        .filter(Boolean);

      return {
        headers,
        buttons,
        links,
        forms,
        modals,
        visualViolations,
        overflow,
        bodyText,
        visibleText: Array.from(new Set(visibleText)).slice(0, 220),
      };
    });

    Object.assign(result, {
      pageHeaders: dom.headers,
      buttons: dom.buttons,
      links: dom.links,
      forms: dom.forms,
      modals: dom.modals,
      visualViolations: dom.visualViolations,
      overflow: dom.overflow,
      summaryText: dom.bodyText,
    });

    const lowerText = dom.bodyText.toLowerCase();
    if (lowerText.includes("loading")) result.textFindings.push("Loading copy present on page or during scan.");
    if (lowerText.includes("select a project")) result.textFindings.push("Project-selection empty/select state present.");
    if (lowerText.includes("payment terms: 20")) result.textFindings.push("Potential ambiguous payment terms text: 'Payment terms: 20'.");
    if (lowerText.includes("per daily")) result.textFindings.push("Potential raw late-fee unit display: 'per daily'.");
    if (lowerText.includes("optional project")) result.textFindings.push("Potential stale optional project copy.");
    if (lowerText.includes("no invoices yet") || lowerText.includes("no projects yet")) result.textFindings.push("Empty state present.");

    result.navFindings = dom.links
      .filter((link) => link.href === route.url || `${BASE_URL}${link.href}` === result.finalUrl)
      .map((link) => `Self-link visible: "${link.text || link.href}" -> ${link.href}`);
  } catch (error) {
    result.error = String(error && error.stack ? error.stack : error);
  }

  return result;
}

function buildMarkdown(audit) {
  const pageRows = audit.pages.map((page) => ({
    Page: page.label,
    Auth: page.authState,
    URL: page.finalUrl || page.targetUrl,
    "H1/H2 count": page.pageHeaders.length,
    "Visual flags": page.visualViolations.length,
    "Overflow flags": page.overflow.length,
    Screenshot: page.screenshot || "",
  }));

  const headerRows = [];
  for (const page of audit.pages) {
    const header = page.pageHeaders[0];
    headerRows.push({
      Page: page.label,
      Text: header?.text || "No visible main heading detected",
      Size: header?.fontSize || "",
      Weight: header?.fontWeight || "",
      Transform: header?.textTransform || "",
      "Letter spacing": header?.letterSpacing || "",
      Color: header?.color || "",
    });
  }

  const findings = audit.findings.map((finding) => ({
    Severity: finding.severity,
    Area: finding.area,
    Finding: finding.finding,
    Recommendation: finding.recommendation,
  }));

  return `# Pre-launch Flow and Visual Audit

Generated: ${audit.generatedAt}

Scope: production session at ${BASE_URL}, using the already-running authenticated Chrome context over CDP.

## Executive Summary

${audit.executiveSummary.map((item) => `- ${item}`).join("\n")}

## Page Coverage

${markdownTable(pageRows, ["Page", "Auth", "URL", "H1/H2 count", "Visual flags", "Overflow flags", "Screenshot"])}

## Page Header Consistency

${markdownTable(headerRows, ["Page", "Text", "Size", "Weight", "Transform", "Letter spacing", "Color"])}

## Findings

${markdownTable(findings, ["Severity", "Area", "Finding", "Recommendation"])}

## Flow Verification Notes

${audit.flowNotes.map((item) => `- ${item}`).join("\n")}

## SQL Guidance

${audit.sqlGuidance.map((item) => `- ${item}`).join("\n")}

## Raw Artifacts

- Consolidated JSON: \`${path.basename(JSON_PATH)}\`
- Screenshots: \`screenshots/*.png\`

## Important Constraints

- No production data was modified by this audit.
- No invoice was sent from the audit script.
- No Supabase SQL was executed by this audit.
- Existing local code changes outside audit artifacts were not staged or committed.
`;
}

(async () => {
  ensureDir(SCREENSHOT_DIR);

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  if (!context) throw new Error("No Chrome context found on CDP connection.");

  const page = await context.newPage();
  const pages = [];

  for (const route of routes) {
    pages.push(await scanPage(page, route));
  }

  const headerSizes = new Set(pages.map((pageResult) => pageResult.pageHeaders[0]?.fontSize).filter(Boolean));
  const headerTransforms = new Set(pages.map((pageResult) => pageResult.pageHeaders[0]?.textTransform).filter(Boolean));
  const inaccessible = pages.filter((pageResult) => pageResult.authState === "redirected-to-auth");
  const staleTerms = pages.flatMap((pageResult) => pageResult.textFindings.map((finding) => ({ page: pageResult.label, finding })));

  const audit = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    pages,
    executiveSummary: [
      inaccessible.length === 0
        ? "Authenticated production pages were accessible in the existing Chrome session."
        : `${inaccessible.length} route(s) redirected to auth; sign-in/session coverage needs manual confirmation.`,
      headerSizes.size <= 1 && headerTransforms.size <= 1
        ? "Primary page headers appear mostly consistent by computed typography."
        : "Primary page headers are inconsistent across routes; standardize page chrome before launch.",
      staleTerms.length === 0
        ? "No obvious stale 'per daily', 'Payment terms: 20', or optional-project copy was visible in scanned pages."
        : "Potential stale copy was detected and should be reviewed.",
      "Invoice send/share was not clicked to avoid sending live emails; verify with a controlled test recipient.",
    ],
    findings: [],
    flowNotes: [
      "Auth check: pages were opened in the existing authenticated Chrome context. If a page redirects to /login, session persistence is broken or the account lacks access.",
      "Create invoice check: /invoice/new loaded as a route; a full form-submit flow should be run with a deliberate test invoice and test email before launch.",
      "Share check: no live send action was performed. Use a test recipient, then verify invoices.shared_at/share_token and the client share URL.",
      "Client-facing check: /invoice/preview was scanned if available, but final validation requires opening a real share token in an unauthenticated/incognito session.",
      "Milestone check: dashboard/project pages were scanned. Triggering scheduled/send-now actions was not performed in this audit.",
    ],
    sqlGuidance: [
      "No SQL is needed just to confirm header styling or button behavior.",
      "Use read-only SQL after a controlled test send to verify invoices, projects, clients, invoice_milestones, and share_token rows.",
      "Run migrations/backfills only when a schema or historical-data issue is explicitly identified.",
    ],
  };

  if (headerSizes.size > 1 || headerTransforms.size > 1) {
    audit.findings.push({
      severity: "P1",
      area: "Global page chrome",
      finding: `Primary heading styles vary. Sizes found: ${Array.from(headerSizes).join(", ") || "none"}; transforms: ${Array.from(headerTransforms).join(", ") || "none"}.`,
      recommendation: "Create a shared PageHeader component/token set and migrate dashboard, projects, invoices, clients, profile, invoice editor, and preview pages onto it.",
    });
  }

  for (const pageResult of pages) {
    if (pageResult.authState === "redirected-to-auth") {
      audit.findings.push({
        severity: "P0",
        area: pageResult.label,
        finding: `${pageResult.label} redirected to auth during an authenticated-session audit.`,
        recommendation: "Confirm sign-in state, route protection, and Supabase session refresh behavior.",
      });
    }
    if (pageResult.visualViolations.length > 20) {
      audit.findings.push({
        severity: "P2",
        area: pageResult.label,
        finding: `${pageResult.visualViolations.length} visual-rule flags detected, mostly radius/shadow/gradient/border irregularities.`,
        recommendation: "Review screenshot and raw JSON; separate intentional app chrome from accidental soft UI.",
      });
    }
    if (pageResult.overflow.length > 0) {
      audit.findings.push({
        severity: "P1",
        area: pageResult.label,
        finding: `${pageResult.overflow.length} horizontal overflow candidates detected.`,
        recommendation: "Check mobile and tablet responsive behavior for the listed selectors in raw JSON.",
      });
    }
    for (const textFinding of pageResult.textFindings) {
      audit.findings.push({
        severity: textFinding.includes("Potential") ? "P1" : "P3",
        area: pageResult.label,
        finding: textFinding,
        recommendation: "Review visible copy in the screenshot and normalize to the launch copy standard.",
      });
    }
    for (const navFinding of pageResult.navFindings) {
      audit.findings.push({
        severity: "P2",
        area: pageResult.label,
        finding: navFinding,
        recommendation: "Self-links are acceptable for nav active states, but action CTAs should use refresh/hard reset if they are meant to restart a flow.",
      });
    }
  }

  if (audit.findings.length === 0) {
    audit.findings.push({
      severity: "Info",
      area: "Audit",
      finding: "No automated findings were generated.",
      recommendation: "Proceed with manual smoke test for send/share actions.",
    });
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(audit, null, 2));
  fs.writeFileSync(MD_PATH, buildMarkdown(audit));

  await page.close();
  await browser.close();

  console.log(JSON.stringify({
    ok: true,
    json: JSON_PATH,
    markdown: MD_PATH,
    pages: pages.length,
    findings: audit.findings.length,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
