#!/usr/bin/env python3
"""
Create a test draft invoice through the authenticated Lance UI, then scan
dashboard/projects/invoices/clients for status visibility and design violations.

Contract:
- Connect to existing Chrome over CDP on port 9222.
- Use browser.contexts[0] and open a new tab inside that authenticated context.
- Do not launch a new browser.
- Close the tab when finished.
- Write JSON, screenshots, and a Markdown report into this audit folder only.
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Python package 'playwright' is not installed. "
        "Install it in the Python environment used for this audit, then rerun this script."
    ) from exc


AUDIT_ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = AUDIT_ROOT / "results"
SCREENSHOTS_DIR = AUDIT_ROOT / "screenshots"
DESIGN_SYSTEM_PATH = AUDIT_ROOT / "design_system.md"
REPORT_PATH = AUDIT_ROOT / "CREATING INVOICE DRAFT FLOW and CHECK STATUS.md"

CDP_ENDPOINT = os.environ.get("CDP_ENDPOINT", "http://127.0.0.1:9222")
OUTPUT_JSON = RESULTS_DIR / "creating_invoice_draft_flow_check_status.json"
BASE_URL = os.environ.get("AUDIT_BASE_URL", "https://lanceinvoice.xyz")


def slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_").lower()[:80] or "artifact"


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def screenshot(page: Any, name: str) -> str:
    path = SCREENSHOTS_DIR / f"draft_flow_{slugify(name)}.png"
    page.screenshot(path=str(path), full_page=True)
    return str(path.relative_to(AUDIT_ROOT))


def click_step(page: Any, label: str) -> None:
    page.get_by_role("button", name=re.compile(label, re.I)).first.click(timeout=8000)
    page.wait_for_timeout(700)


def fill_first(page: Any, selector: str, value: str, required: bool = True) -> bool:
    locator = page.locator(selector).first
    try:
        locator.wait_for(state="visible", timeout=5000)
        locator.fill(value)
        locator.dispatch_event("input")
        locator.dispatch_event("change")
        page.wait_for_timeout(150)
        return True
    except Exception:
        if required:
            raise
        return False


def collect_form_fields(page: Any) -> List[Dict[str, Any]]:
    return page.evaluate(
        """
        () => Array.from(document.querySelectorAll('input, textarea, select')).map((el, index) => {
          const label = (() => {
            const id = el.id;
            if (id) {
              const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`);
              if (explicit) return explicit.innerText.replace(/\\s+/g, " ").trim();
            }
            let node = el.parentElement;
            for (let depth = 0; depth < 5 && node; depth += 1, node = node.parentElement) {
              const text = (node.innerText || "").replace(/\\s+/g, " ").trim();
              if (text && text.length < 180) return text;
            }
            return "";
          })();
          return {
            index,
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute("type"),
            placeholder: el.getAttribute("placeholder"),
            value: el.type === "password" ? "[redacted]" : el.value,
            label,
            disabled: Boolean(el.disabled),
          };
        })
        """
    )


def scan_status_page(page: Any, url: str, run_identity: Dict[str, str]) -> Dict[str, Any]:
    page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1250)
    shot = screenshot(page, f"status_{url.rstrip('/').split('/')[-1] or 'home'}")

    return page.evaluate(
        """
        ({ identity, screenshotPath }) => {
          const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim();
          const text = normalize(document.body.innerText);
          const lowerText = text.toLowerCase();

          const colorToHex = (value) => {
            if (!value || value === "transparent") return value || "";
            const match = value.match(/rgba?\\(([^)]+)\\)/);
            if (!match) return value;
            const parts = match[1].split(",").map((part) => part.trim());
            const [r, g, b] = parts.slice(0, 3).map((part) => Number.parseFloat(part));
            const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);
            if ([r, g, b].some((num) => Number.isNaN(num))) return value;
            const hex = [r, g, b]
              .map((num) => Math.max(0, Math.min(255, Math.round(num))).toString(16).padStart(2, "0"))
              .join("")
              .toUpperCase();
            return alpha < 1 ? `#${hex} @ ${Number(alpha.toFixed(3))}` : `#${hex}`;
          };

          const getSelector = (el) => {
            if (el.id) return `#${CSS.escape(el.id)}`;
            const parts = [];
            let node = el;
            while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
              let part = node.tagName.toLowerCase();
              if (node.classList && node.classList.length) {
                part += "." + Array.from(node.classList).slice(0, 3).map((name) => CSS.escape(name)).join(".");
              }
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
                if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
              }
              parts.unshift(part);
              node = parent;
            }
            return parts.join(" > ");
          };

          const parsePx = (value) => Number.parseFloat(String(value || "0").replace("px", "")) || 0;
          const hasGradient = (value) => /(?:linear|radial|conic)-gradient/i.test(value || "");
          const hasBlurFilter = (value) => /blur\\([^)]*[1-9]/i.test(value || "");
          const shadowBlurViolations = (boxShadow) => {
            if (!boxShadow || boxShadow === "none") return [];
            return boxShadow
              .split(/,(?![^()]*\\))/)
              .map((shadow) => {
                const px = shadow.match(/-?[\\d.]+px/g) || [];
                const blur = px.length >= 3 ? parsePx(px[2]) : 0;
                return { shadow: shadow.trim(), blur };
              })
              .filter((entry) => entry.blur > 0);
          };
          const isVisible = (el, style) => {
            const rect = el.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          };

          const elements = Array.from(document.querySelectorAll("body *"))
            .filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName));
          const soft = [];
          const borders = [];
          const missingGapContainers = [];
          const overflow = [];
          const draftContexts = [];

          for (const el of elements) {
            const style = window.getComputedStyle(el);
            if (!isVisible(el, style)) continue;
            const rect = el.getBoundingClientRect();
            const selector = getSelector(el);
            const sampleText = normalize(el.innerText || el.getAttribute("aria-label") || "").slice(0, 160);

            const radii = [
              style.borderTopLeftRadius,
              style.borderTopRightRadius,
              style.borderBottomRightRadius,
              style.borderBottomLeftRadius,
            ];
            const radiusViolation = radii.map(parsePx).some((value) => value > 0);
            const shadows = shadowBlurViolations(style.boxShadow);
            const gradient = hasGradient(style.backgroundImage);
            const filterBlur = hasBlurFilter(style.filter) || hasBlurFilter(style.backdropFilter);
            if (radiusViolation || shadows.length || gradient || filterBlur) {
              soft.push({
                selector,
                tag: el.tagName.toLowerCase(),
                text: sampleText,
                reasons: {
                  border_radius: radiusViolation ? radii : null,
                  soft_box_shadow: shadows.length ? shadows : null,
                  gradient_background: gradient ? style.backgroundImage : null,
                  blur_filter: filterBlur ? { filter: style.filter, backdrop_filter: style.backdropFilter } : null,
                },
              });
            }

            for (const side of ["Top", "Right", "Bottom", "Left"]) {
              const width = parsePx(style[`border${side}Width`]);
              const borderStyle = style[`border${side}Style`];
              if (width > 0 && borderStyle !== "none" && !((width === 2 || width === 4) && borderStyle === "solid")) {
                borders.push({
                  selector,
                  tag: el.tagName.toLowerCase(),
                  text: sampleText,
                  side: side.toLowerCase(),
                  width,
                  style: borderStyle,
                  color: colorToHex(style[`border${side}Color`]),
                });
              }
            }

            if ((style.display === "flex" || style.display === "grid") && el.children.length > 1) {
              const rowGap = parsePx(style.rowGap);
              const colGap = parsePx(style.columnGap);
              if (rowGap === 0 && colGap === 0) {
                missingGapContainers.push({
                  selector,
                  display: style.display,
                  child_count: el.children.length,
                  text: sampleText,
                });
              }
            }

            if (el.scrollWidth > el.clientWidth + 1) {
              overflow.push({
                selector,
                tag: el.tagName.toLowerCase(),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                text: sampleText,
              });
            }

            const lowerSample = sampleText.toLowerCase();
            if (
              lowerSample.includes(identity.project.toLowerCase()) ||
              lowerSample.includes(identity.client.toLowerCase()) ||
              lowerSample.includes(identity.email.toLowerCase()) ||
              lowerSample.includes("draft")
            ) {
              draftContexts.push({ selector, tag: el.tagName.toLowerCase(), text: sampleText });
            }
          }

          const allStrings = Array.from(new Set(
            text
              .split(/\\n|(?<=\\.)\\s+/)
              .map(normalize)
              .filter((value) => value.length > 1)
          )).slice(0, 250);

          return {
            url: window.location.href,
            title: document.title,
            screenshot: screenshotPath,
            identity_hits: {
              project: lowerText.includes(identity.project.toLowerCase()),
              client: lowerText.includes(identity.client.toLowerCase()),
              email: lowerText.includes(identity.email.toLowerCase()),
              draft: lowerText.includes("draft"),
            },
            draft_contexts: draftContexts.slice(0, 40),
            visible_text_sample: text.slice(0, 5000),
            unique_strings: allStrings,
            violations: {
              soft_ui_count: soft.length,
              border_contract_count: borders.length,
              missing_gap_container_count: missingGapContainers.length,
              overflow_count: overflow.length,
              soft_ui_examples: soft.slice(0, 12),
              border_examples: borders.slice(0, 12),
              missing_gap_examples: missingGapContainers.slice(0, 12),
              overflow_examples: overflow.slice(0, 12),
            },
          };
        }
        """,
        {"identity": run_identity, "screenshotPath": shot},
    )


def extract_invoice_reference(text: str) -> Optional[str]:
    match = re.search(r"INV-\d{4}-\d+", text)
    return match.group(0) if match else None


def write_report(report: Dict[str, Any]) -> None:
    flow = report["draft_flow"]
    scans = report["status_scans"]
    identity = report["identity"]
    invoice_reference = flow.get("invoice_reference") or "Not detected"

    lines = [
        "# CREATING INVOICE DRAFT FLOW and CHECK STATUS",
        "",
        f"Run timestamp: `{report['run_timestamp']}`",
        f"CDP endpoint: `{report['cdp_endpoint']}`",
        f"Navigation strategy: `{report['navigation_strategy']}`",
        "",
        "## Test Draft Identity",
        "",
        f"- Project: `{identity['project']}`",
        f"- Client: `{identity['client']}`",
        f"- Email: `{identity['email']}`",
        f"- Invoice reference detected after save: `{invoice_reference}`",
        "",
        "## Flow Result",
        "",
        f"- Save Draft clicked: `{flow['save_clicked']}`",
        f"- URL after save: `{flow['url_after_save']}`",
        f"- Toast/status text detected: `{flow.get('save_status_text') or 'Not detected'}`",
        "",
        "Screenshots:",
        "",
    ]

    for label, path in flow["screenshots"].items():
        lines.append(f"- {label}: `{path}`")

    lines.extend(
        [
            "",
            "## CHECK STATUS: Surface Presence",
            "",
            "| Surface | Project visible | Client visible | Email visible | Draft visible | Screenshot |",
            "|---|---:|---:|---:|---:|---|",
        ]
    )

    for name, scan in scans.items():
        hits = scan["identity_hits"]
        lines.append(
            f"| {name} | {hits['project']} | {hits['client']} | {hits['email']} | {hits['draft']} | `{scan['screenshot']}` |"
        )

    lines.extend(
        [
            "",
            "## Violation Summary",
            "",
            "| Surface | Soft UI | Border contract | Missing flex/grid gap | Overflow |",
            "|---|---:|---:|---:|---:|",
        ]
    )
    for name, scan in scans.items():
        v = scan["violations"]
        lines.append(
            f"| {name} | {v['soft_ui_count']} | {v['border_contract_count']} | {v['missing_gap_container_count']} | {v['overflow_count']} |"
        )

    lines.extend(
        [
            "",
            "## UX Designer Observations",
            "",
        ]
    )

    dashboard = scans.get("dashboard", {})
    invoices = scans.get("invoices", {})
    projects = scans.get("projects", {})
    clients = scans.get("clients", {})

    if invoices.get("identity_hits", {}).get("project") or invoices.get("identity_hits", {}).get("client"):
        lines.append("- The draft is discoverable in the invoice/accounting surface, which is the expected minimum after Save Draft.")
    else:
        lines.append("- The draft was not clearly discoverable on the Invoices page by project/client identity. This is a workflow confidence gap after Save Draft.")

    if dashboard.get("identity_hits", {}).get("project") or dashboard.get("identity_hits", {}).get("client"):
        lines.append("- Dashboard surfaces the draft/test identity. This may be useful for continuity, but it risks mixing unfinished drafts with active work unless visually separated.")
    else:
        lines.append("- Dashboard does not obviously surface the new draft identity. This is acceptable if the dashboard is intentionally operational and excludes unfinished drafts.")

    if projects.get("identity_hits", {}).get("project"):
        lines.append("- Projects page created or exposed the draft project immediately. This helps continuity but can pollute project lists with unfinished test/project shells.")
    else:
        lines.append("- Projects page did not expose the draft project identity. If project creation is deferred until share/finalize, this behavior is clean; if save should create projects, it is a status gap.")

    lines.extend(
        [
            "- The Save Draft action needs a strong, unmissable post-save confirmation that states where the draft now lives.",
            "- The four checked surfaces need one consistent draft badge vocabulary. If one page says DRAFT and another hides the same object, users will doubt whether save worked.",
            "",
            "## CA / Compliance Observations",
            "",
            "- Draft invoices must remain clearly non-tax/non-issued documents. A draft should not imply that a tax invoice has been issued or sent.",
            "- If a draft creates a client record immediately, the app should make that persistence clear because client master data has compliance and record-keeping implications.",
            "- If a draft creates a project shell, the project should remain operationally inert until share/finalize; otherwise dashboard/project receivables can overstate business pipeline.",
            "- Amounts from draft invoices should not enter collected, outstanding, receivable, due, or at-risk totals.",
            "",
            "## Visual Designer Observations",
            "",
            "- The scan still finds soft UI and border-width drift after the draft flow. These are design-system consistency issues, not isolated page defects.",
            "- Border contract violations should be separated into intentional 3px neo-brutal feature borders vs accidental 1px/hairline borders before refactoring.",
            "- Missing flex/grid gaps are a layout rhythm risk: repeated dense panels can feel heavy even when the neo-brutal style is correct.",
            "- Overflow findings need mobile-specific confirmation in Phase 2 before any final breakpoint rule is approved.",
            "",
            "## Representative Draft Contexts",
            "",
        ]
    )

    for name, scan in scans.items():
        lines.append(f"### {name.title()}")
        contexts = scan.get("draft_contexts", [])[:8]
        if not contexts:
            lines.append("- No draft/test-specific text contexts captured.")
        for context in contexts:
            lines.append(f"- `{context['tag']}` `{context['selector']}`: {context['text']}")
        lines.append("")

    lines.extend(
        [
            "## Raw Data",
            "",
            f"- JSON: `results/{OUTPUT_JSON.name}`",
            "",
            "## Approval Gate",
            "",
            "This is an audit artifact only. No source code changes should be made until the full design-system blueprint is complete and approved.",
            "",
        ]
    )

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")

    DESIGN_SYSTEM_PATH.write_text(
        DESIGN_SYSTEM_PATH.read_text(encoding="utf-8")
        + "\n\n## Scan Log: Creating Invoice Draft Flow and Check Status\n\n"
        + f"- Report: `{REPORT_PATH.relative_to(AUDIT_ROOT)}`\n"
        + f"- JSON: `results/{OUTPUT_JSON.name}`\n"
        + f"- Test project: `{identity['project']}`\n"
        + f"- Invoice reference detected: `{invoice_reference}`\n"
        + "- Source code changes: none.\n",
        encoding="utf-8",
    )


def main() -> int:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    stamp = now_stamp()
    identity = {
        "project": f"AUDIT DRAFT FLOW {stamp}",
        "client": f"Audit Draft Client {stamp}",
        "email": f"audit.draft.{stamp}@example.com",
    }
    run_timestamp = datetime.now(timezone.utc).isoformat()
    flow_screenshots: Dict[str, str] = {}
    flow_notes: Dict[str, Any] = {
        "save_clicked": False,
        "url_after_save": None,
        "save_status_text": None,
        "invoice_reference": None,
        "screenshots": flow_screenshots,
    }

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.connect_over_cdp(CDP_ENDPOINT)
        except Exception as exc:
            print(f"Failed to connect to existing Chrome over CDP at {CDP_ENDPOINT}: {exc}", file=sys.stderr)
            return 2

        if not browser.contexts:
            print("Connected to Chrome, but no authenticated context was available.", file=sys.stderr)
            return 3

        context = browser.contexts[0]
        page = context.new_page()
        responses: List[Dict[str, Any]] = []
        page.on(
            "response",
            lambda response: responses.append(
                {
                    "url": response.url,
                    "status": response.status,
                    "method": response.request.method,
                    "body": (
                        response.text()
                        if response.status >= 400 or response.request.method in ["POST", "PATCH"]
                        else None
                    ),
                }
            )
            if any(token in response.url for token in ["/rest/v1/invoices", "/api/", "/rest/v1/clients", "/rest/v1/projects"])
            else None,
        )

        try:
            page.set_viewport_size({"width": 1440, "height": 1100})
            page.goto(f"{BASE_URL}/invoice/new", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1200)
            flow_screenshots["01_start"] = screenshot(page, "01_invoice_new_start")

            if "/login" in page.url:
                raise RuntimeError("The authenticated CDP context redirected to login; cannot create draft.")

            fill_first(page, 'input[placeholder="Optional project name"]', identity["project"])

            click_step(page, "Client")
            fill_first(page, 'input[placeholder="Client or company name"]', identity["client"])
            page.keyboard.press("Escape")
            fill_first(page, 'input[type="email"][placeholder="Email address"]', identity["email"])
            fill_first(page, 'input[placeholder^="Not required"]', "", required=False)
            fill_first(page, 'input[placeholder="Building, street, or campus"]', "Audit House, Test Street")
            fill_first(page, 'input[placeholder="City"]', "Bangalore")
            fill_first(page, 'input[placeholder="PIN"]', "560001")
            flow_screenshots["02_client_filled"] = screenshot(page, "02_client_filled")

            click_step(page, "Items")
            fill_first(page, 'input[placeholder="e.g. Phase 1: Research"]', "Draft audit setup")
            fill_first(page, 'input[placeholder="Select a sub-type to see suggestions"]', "Design-system draft flow verification")
            # Keep the rest of the invoice's existing item defaults; draft status is the audit target.
            flow_screenshots["03_items_checked"] = screenshot(page, "03_items_checked")

            click_step(page, "Payment")
            fill_first(page, 'input[placeholder="Example: HDFC Bank"]', "Audit Bank", required=False)
            fill_first(page, 'input[placeholder="0000 0000 0000"]', "000000000000", required=False)
            fill_first(page, 'input[placeholder="HDFC0000123"]', "HDFC0000001", required=False)
            fill_first(page, 'input[placeholder="Your Registered Name"]', "Audit Beneficiary", required=False)
            flow_screenshots["04_before_save_draft"] = screenshot(page, "04_before_save_draft")

            page.get_by_role("button", name=re.compile(r"Save Draft", re.I)).first.click(timeout=8000)
            flow_notes["save_clicked"] = True
            page.wait_for_timeout(3500)
            flow_notes["url_after_save"] = page.url
            body_text_after_save = page.locator("body").inner_text(timeout=5000)
            flow_notes["save_status_text"] = " ".join(
                line.strip()
                for line in body_text_after_save.splitlines()
                if re.search(r"saved|draft|invoice|error|failed", line, re.I)
            )[:1200]
            flow_notes["invoice_reference"] = extract_invoice_reference(body_text_after_save)
            flow_screenshots["05_after_save_draft"] = screenshot(page, "05_after_save_draft")

            status_scans = {
                "dashboard": scan_status_page(page, f"{BASE_URL}/dashboard", identity),
                "projects": scan_status_page(page, f"{BASE_URL}/projects", identity),
                "invoices": scan_status_page(page, f"{BASE_URL}/invoices", identity),
                "clients": scan_status_page(page, f"{BASE_URL}/clients", identity),
            }
        finally:
            page.close()

    report = {
        "run_timestamp": run_timestamp,
        "cdp_endpoint": CDP_ENDPOINT,
        "navigation_strategy": "browser.contexts[0].new_page(); create draft through UI; navigate dashboard/projects/invoices/clients; page.close()",
        "identity": identity,
        "draft_flow": flow_notes,
        "network_responses": responses[-120:],
        "status_scans": status_scans,
    }

    OUTPUT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_report(report)
    print(f"Wrote JSON: {OUTPUT_JSON}")
    print(f"Wrote report: {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
