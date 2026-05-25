from __future__ import annotations

import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


BASE_URL = "https://lanceinvoice.xyz"
CDP_URL = "http://127.0.0.1:9222"

AUDIT_DIR = Path(__file__).resolve().parents[1]
RESULTS_DIR = AUDIT_DIR / "results"
SCREENSHOTS_DIR = AUDIT_DIR / "screenshots"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

RESULT_PATH = RESULTS_DIR / "invoice_client_surface_audit.json"

INTERNAL_TERMS = [
    "MSA Gating",
    "Effective Terms",
    "IP Rights",
    "Jurisdiction",
    "Revision rounds",
    "Extra revision fee",
    "auto-progression",
    "milestone automation",
    "Tracking disabled",
    "Hidden from master list",
    "dashboard metrics",
    "Cloud Save Failed",
    "Saved Locally",
    "schema cache",
    "PGRST",
    "Preview Mode",
    "Shared via Lance",
    "Lance can only track",
    "settled manually",
    "client_msa",
    "share_token",
]

CLIENT_FINAL_RELEVANCE = {
    "invoice_number": ["INV-", "Invoice #", "Invoice Number"],
    "agency_identity": ["From", "Agency", "Freelancer", "GSTIN", "PAN"],
    "client_identity": ["Bill To", "Client", "GSTIN", "Address"],
    "invoice_dates": ["Invoice Date", "Due Date", "Net ", "Due"],
    "commercial_lines": ["Description", "Qty", "Rate", "Amount", "Subtotal"],
    "taxes": ["CGST", "SGST", "IGST", "Tax", "GST"],
    "payment_details": ["Bank", "Account", "IFSC", "SWIFT", "IBAN", "QR"],
    "terms": ["Payment terms", "Terms", "Agreement", "MSA"],
    "signature": ["Authorized", "Signatory", "Signature"],
}


def slug(value: str, max_len: int = 70) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")
    return (cleaned or "surface")[:max_len]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def wait_ready(page: Page) -> None:
    page.wait_for_load_state("domcontentloaded", timeout=25_000)
    try:
        page.wait_for_load_state("networkidle", timeout=8_000)
    except PlaywrightTimeoutError:
        pass
    page.wait_for_timeout(900)


def safe_screenshot(page: Page, name: str, full_page: bool = True) -> str | None:
    path = SCREENSHOTS_DIR / f"{name}.png"
    try:
        page.screenshot(path=str(path), full_page=full_page)
        return str(path)
    except Exception as exc:  # noqa: BLE001
        return f"SCREENSHOT_FAILED: {exc}"


def capture_dom(page: Page, label: str) -> dict[str, Any]:
    script = """
    ({ label, internalTerms, relevance }) => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || 1) > 0.01 &&
          rect.width > 0 &&
          rect.height > 0;
      };
      const textOf = (el) => (el?.innerText || el?.textContent || '').replace(/\\s+/g, ' ').trim();
      const bodyText = textOf(document.body);
      const invoiceSheet = document.querySelector('.invoice-sheet');
      const invoiceSheetText = textOf(invoiceSheet);
      const visibleElements = Array.from(document.querySelectorAll('body *')).filter(isVisible);
      const visibleButtons = visibleElements
        .filter((el) => ['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button')
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: textOf(el).slice(0, 160),
          href: el.href || null,
          aria: el.getAttribute('aria-label'),
          disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        }))
        .filter((item) => item.text || item.aria || item.href)
        .slice(0, 100);
      const dialogs = visibleElements
        .filter((el) => el.getAttribute('role') === 'dialog' || /fixed/.test(el.className || '') && (el.innerText || '').length > 80)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: String(el.className || '').slice(0, 220),
          text: textOf(el).slice(0, 2200),
        }))
        .slice(0, 12);
      const printHidden = visibleElements
        .filter((el) => String(el.className || '').includes('print:hidden'))
        .map((el) => textOf(el).slice(0, 500))
        .filter(Boolean)
        .slice(0, 40);
      const internalHits = internalTerms
        .map((term) => {
          const haystack = `${bodyText}\\n${invoiceSheetText}`;
          const count = haystack.toLowerCase().split(term.toLowerCase()).length - 1;
          return { term, count };
        })
        .filter((item) => item.count > 0);
      const textLines = Array.from(new Set(bodyText.split(/[\\n]+|(?<=\\.)\\s+/).map((s) => s.trim()).filter(Boolean))).slice(0, 350);
      const checklist = Object.fromEntries(Object.entries(relevance).map(([key, needles]) => {
        const found = needles.some((needle) => bodyText.toLowerCase().includes(String(needle).toLowerCase()) || invoiceSheetText.toLowerCase().includes(String(needle).toLowerCase()));
        return [key, found];
      }));
      const invoiceChecklist = Object.fromEntries(Object.entries(relevance).map(([key, needles]) => {
        const found = needles.some((needle) => invoiceSheetText.toLowerCase().includes(String(needle).toLowerCase()));
        return [key, found];
      }));
      const anchors = Array.from(document.querySelectorAll('a')).map((a) => ({
        text: textOf(a).slice(0, 160),
        href: a.href,
      })).filter((a) => a.href).slice(0, 200);
      const templates = Array.from(document.querySelectorAll('aside button, [data-template-id], button')).map((button) => textOf(button)).filter(Boolean);
      return {
        label,
        url: location.href,
        title: document.title,
        bodyTextLength: bodyText.length,
        bodyTextSample: bodyText.slice(0, 6000),
        invoiceSheetTextLength: invoiceSheetText.length,
        invoiceSheetText: invoiceSheetText.slice(0, 9000),
        checklist,
        invoiceChecklist,
        internalHits,
        dialogs,
        visibleButtons,
        printHidden,
        anchors,
        templates: Array.from(new Set(templates)).slice(0, 80),
        textLines,
      };
    }
    """
    return page.evaluate(
        script,
        {
            "label": label,
            "internalTerms": INTERNAL_TERMS,
            "relevance": CLIENT_FINAL_RELEVANCE,
        },
    )


def collect_invoice_candidates(api_payloads: list[dict[str, Any]], hrefs: list[str]) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for payload in api_payloads:
        if "rest/v1/invoices" not in payload.get("url", ""):
            continue
        data = payload.get("json")
        rows = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
        for row in rows:
            invoice_id = row.get("id")
            if not invoice_id:
                continue
            by_id[invoice_id] = {
                "id": invoice_id,
                "invoice_number": row.get("invoice_number"),
                "status": row.get("status"),
                "msa_status": row.get("msa_status"),
                "share_token": row.get("share_token"),
                "parent_invoice_id": row.get("parent_invoice_id"),
                "milestone_index": row.get("milestone_index"),
                "template_id": row.get("template_id"),
                "source": "supabase_response",
            }

    for href in hrefs:
        match = re.search(r"/invoice/preview\\?id=([a-f0-9-]{20,})", href)
        if match:
            invoice_id = match.group(1)
            by_id.setdefault(invoice_id, {"id": invoice_id, "source": "href"})
        match = re.search(r"/invoice/([a-f0-9-]{20,})/client-preview", href)
        if match:
            invoice_id = match.group(1)
            by_id.setdefault(invoice_id, {"id": invoice_id, "source": "href"})

    candidates = list(by_id.values())
    candidates.sort(
        key=lambda row: (
            0 if row.get("share_token") else 1,
            0 if row.get("parent_invoice_id") else 1,
            str(row.get("invoice_number") or ""),
        )
    )
    return candidates


def collect_static_inventory() -> dict[str, Any]:
    template_dir = AUDIT_DIR.parents[1] / "lib" / "templates"
    components_dir = AUDIT_DIR.parents[1] / "components" / "invoice"
    app_dir = AUDIT_DIR.parents[1] / "app"
    template_files = sorted(p.name for p in template_dir.glob("*.tsx"))
    modal_files = sorted(p.name for p in components_dir.glob("*Modal.tsx"))
    route_files = [
        "app/invoice/preview/page.tsx",
        "app/invoice/[id]/client-preview/page.tsx",
        "app/share/[token]/page.tsx",
    ]
    source_hits: list[dict[str, str]] = []
    for rel in [
        "lib/templates/template-data.ts",
        "lib/templates/MilestoneSummaryBlock.tsx",
        "components/invoice/ShareLinkModal.tsx",
        "components/invoice/DownloadDecisionModal.tsx",
        "components/invoice/share/SharedMsaPreviewContent.tsx",
        "components/invoice/share/MSAAcceptanceModal.tsx",
    ]:
        path = AUDIT_DIR.parents[1] / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for term in INTERNAL_TERMS + ["Milestone 1", "projectName", "isDraft: false"]:
            if term in text:
                source_hits.append({"file": rel, "term": term})
    return {
        "template_files": template_files,
        "modal_files": modal_files,
        "route_files": route_files,
        "source_hits": source_hits,
        "paths_checked": {
            "templates": str(template_dir),
            "components": str(components_dir),
            "app": str(app_dir),
        },
    }


def open_url(page: Page, path_or_url: str, label: str, screenshots: list[dict[str, str | None]]) -> dict[str, Any]:
    url = path_or_url if path_or_url.startswith("http") else f"{BASE_URL}{path_or_url}"
    page.goto(url, wait_until="domcontentloaded", timeout=45_000)
    wait_ready(page)
    shot = safe_screenshot(page, slug(label))
    screenshots.append({"label": label, "path": shot})
    return capture_dom(page, label)


def click_first_enabled(page: Page, text_pattern: str, timeout: int = 6_000) -> bool:
    locator = page.get_by_text(re.compile(text_pattern, re.I)).first
    try:
        target = locator
        target.wait_for(state="visible", timeout=timeout)
        target.click(timeout=timeout)
        page.wait_for_timeout(1200)
        return True
    except Exception:  # noqa: BLE001
        return False


def main() -> None:
    audit: dict[str, Any] = {
        "created_at": now_iso(),
        "base_url": BASE_URL,
        "method": "Chrome CDP authenticated context, new tabs per scan, no destructive client actions.",
        "static_inventory": collect_static_inventory(),
        "api_payloads": [],
        "pages": [],
        "template_scans": [],
        "modal_scans": [],
        "screenshots": [],
        "network_errors": [],
        "invoice_candidates": [],
        "notes": [],
    }

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP_URL)
        if not browser.contexts:
            raise RuntimeError("No existing Chrome contexts found on CDP port 9222.")
        context = browser.contexts[0]
        page = context.new_page()

        def handle_response(response):
            url = response.url
            if "supabase.co/rest/v1/" not in url and "/api/" not in url:
                return
            payload: dict[str, Any] = {
                "url": url,
                "status": response.status,
                "method": response.request.method,
            }
            try:
                text = response.text()
                payload["text_sample"] = text[:2500]
                try:
                    payload["json"] = json.loads(text)
                except Exception:
                    pass
            except Exception as exc:  # noqa: BLE001
                payload["read_error"] = str(exc)
            audit["api_payloads"].append(payload)
            if response.status >= 400:
                audit["network_errors"].append(payload)

        page.on("response", handle_response)

        try:
            for path, label in [
                ("/dashboard", "invoice_surface_dashboard"),
                ("/projects", "invoice_surface_projects"),
                ("/invoices", "invoice_surface_invoices"),
                ("/clients", "invoice_surface_clients"),
            ]:
                audit["pages"].append(open_url(page, path, label, audit["screenshots"]))

            hrefs: list[str] = []
            for page_scan in audit["pages"]:
                hrefs.extend([a.get("href", "") for a in page_scan.get("anchors", [])])
            candidates = collect_invoice_candidates(audit["api_payloads"], hrefs)
            audit["invoice_candidates"] = candidates[:20]

            if not candidates:
                audit["notes"].append("No persisted invoice id found from UI links or Supabase invoice responses; preview/share route scans limited.")
            else:
                candidate = candidates[0]
                invoice_id = candidate["id"]
                audit["selected_invoice"] = candidate

                preview_scan = open_url(
                    page,
                    f"/invoice/preview?id={invoice_id}",
                    f"invoice_preview_{candidate.get('invoice_number') or invoice_id}",
                    audit["screenshots"],
                )
                audit["pages"].append(preview_scan)

                # Template picker scan: click every template option visible in the right rail.
                template_buttons = page.locator("aside button")
                template_count = min(template_buttons.count(), 16)
                for index in range(template_count):
                    try:
                        button = template_buttons.nth(index)
                        template_name = button.inner_text(timeout=2_000).strip() or f"template_{index + 1}"
                        button.click(timeout=4_000)
                        page.wait_for_timeout(700)
                        scan = capture_dom(page, f"template_{index + 1}_{template_name}")
                        shot = safe_screenshot(page, f"invoice_template_{index + 1:02d}_{slug(template_name, 40)}", full_page=False)
                        scan["screenshot"] = shot
                        audit["template_scans"].append(scan)
                    except Exception as exc:  # noqa: BLE001
                        audit["template_scans"].append({
                            "label": f"template_{index + 1}",
                            "error": str(exc),
                        })

                # Print media scan on the selected template.
                try:
                    page.emulate_media(media="print")
                    page.wait_for_timeout(600)
                    print_scan = capture_dom(page, "invoice_preview_print_media")
                    print_scan["screenshot"] = safe_screenshot(page, "invoice_preview_print_media", full_page=True)
                    audit["pages"].append(print_scan)
                finally:
                    page.emulate_media(media="screen")
                    page.wait_for_timeout(400)

                # Download decision modal.
                if click_first_enabled(page, r"Export PDF"):
                    modal_scan = capture_dom(page, "download_decision_modal")
                    modal_scan["screenshot"] = safe_screenshot(page, "modal_download_decision", full_page=False)
                    audit["modal_scans"].append(modal_scan)
                    click_first_enabled(page, r"Cancel", timeout=2_000)
                else:
                    audit["notes"].append("Could not open Export PDF / Download Decision modal from preview.")

                # Share modal. Do not click Send.
                if click_first_enabled(page, r"Share Invoice"):
                    modal_scan = capture_dom(page, "share_invoice_modal_or_error")
                    modal_scan["screenshot"] = safe_screenshot(page, "modal_share_invoice_or_error", full_page=False)
                    audit["modal_scans"].append(modal_scan)
                    # Close modal if it opened.
                    try:
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(500)
                    except Exception:
                        pass
                else:
                    audit["notes"].append("Share Invoice button was not clickable or not visible.")

                # Agency client-preview route.
                client_preview_scan = open_url(
                    page,
                    f"/invoice/{invoice_id}/client-preview",
                    f"agency_client_preview_{candidate.get('invoice_number') or invoice_id}",
                    audit["screenshots"],
                )
                audit["pages"].append(client_preview_scan)
                if client_preview_scan.get("dialogs"):
                    audit["modal_scans"].append({
                        **client_preview_scan,
                        "label": "agency_client_preview_msa_modal",
                    })

                # Public share route if a token already exists.
                token = candidate.get("share_token")
                if token:
                    public_scan = open_url(
                        page,
                        f"/share/{token}",
                        f"public_share_{candidate.get('invoice_number') or token}",
                        audit["screenshots"],
                    )
                    audit["pages"].append(public_scan)
                    try:
                        page.emulate_media(media="print")
                        page.wait_for_timeout(600)
                        public_print = capture_dom(page, "public_share_print_media")
                        public_print["screenshot"] = safe_screenshot(page, "public_share_print_media", full_page=True)
                        audit["pages"].append(public_print)
                    finally:
                        page.emulate_media(media="screen")
                else:
                    audit["notes"].append("Selected invoice has no share_token in captured responses, so public /share/[token] scan was skipped.")
        finally:
            try:
                page.close()
            except Exception:
                pass
            browser.close()

    RESULT_PATH.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(str(RESULT_PATH))


if __name__ == "__main__":
    main()
