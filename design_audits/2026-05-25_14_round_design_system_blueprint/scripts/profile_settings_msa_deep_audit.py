from __future__ import annotations

import base64
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright

from invoice_client_surface_audit import (
    AUDIT_DIR,
    BASE_URL,
    CDP_URL,
    RESULTS_DIR,
    SCREENSHOTS_DIR,
    capture_dom,
    safe_screenshot,
    slug,
    wait_ready,
)


RESULT_PATH = RESULTS_DIR / "profile_settings_msa_deep_audit.json"
TEMP_PNG = Path("/private/tmp/lance-profile-audit-image.png")

PROFILE_TERMS = [
    "Your Profile",
    "Agency Details",
    "Payment Defaults",
    "Global Contract Defaults",
    "Revision Policy",
    "Global MSA Document",
    "Export Compliance",
    "LUT",
    "Master Services Agreement",
    "MSA",
    "IP Transfer Trigger",
    "Jurisdiction",
    "Save Profile",
    "Discard",
    "Upload Logo",
    "Upload Digital Signature",
    "Upload Payment QR Code",
    "Optimize Your Logo",
]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_temp_png() -> str:
    # 4x4 opaque lime PNG.
    png_base64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGNk+M+ABzAw"
        "MDAwMDAAABQAAQABJzQnWQAAAABJRU5ErkJggg=="
    )
    TEMP_PNG.write_bytes(base64.b64decode(png_base64))
    return str(TEMP_PNG)


def visible_input_inventory(page) -> list[dict[str, Any]]:
    script = """
    () => {
      const isVisible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const labelFor = (el) => {
        if (el.id) {
          const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (explicit) return explicit.innerText.trim();
        }
        const wrap = el.closest('label');
        if (wrap) return wrap.innerText.trim();
        let cursor = el.parentElement;
        for (let i = 0; cursor && i < 3; i += 1, cursor = cursor.parentElement) {
          const lab = cursor.querySelector('label');
          if (lab) return lab.innerText.trim();
        }
        return '';
      };
      return Array.from(document.querySelectorAll('input, textarea, select'))
        .filter(isVisible)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          label: labelFor(el).replace(/\\s+/g, ' ').slice(0, 160),
          placeholder: el.getAttribute('placeholder') || '',
          valueLength: String(el.value || '').length,
          valueSample: String(el.value || '').slice(0, 24),
          min: el.getAttribute('min'),
          max: el.getAttribute('max'),
          step: el.getAttribute('step'),
          maxLength: el.getAttribute('maxlength'),
          required: el.required,
          autocomplete: el.getAttribute('autocomplete'),
          ariaLabel: el.getAttribute('aria-label'),
        }));
    }
    """
    return page.evaluate(script)


def profile_layout_metrics(page) -> dict[str, Any]:
    script = """
    () => {
      const els = Array.from(document.querySelectorAll('main, section, form, [class*="grid"], [class*="fixed"], [class*="sticky"], button, input, textarea, select'));
      const anomalies = [];
      const boxes = els.map((el) => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const item = {
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.value || el.getAttribute('placeholder') || '').replace(/\\s+/g, ' ').trim().slice(0, 100),
          className: String(el.className || '').slice(0, 180),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          display: cs.display,
          position: cs.position,
          gap: cs.gap,
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
          border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
          radius: cs.borderRadius,
          shadow: cs.boxShadow,
          overflowX: el.scrollWidth > el.clientWidth,
          overflowY: el.scrollHeight > el.clientHeight,
        };
        if ((cs.display === 'flex' || cs.display === 'grid') && (!cs.gap || cs.gap === 'normal' || cs.gap === '0px')) {
          anomalies.push({ type: 'missing_gap', ...item });
        }
        if (el.scrollWidth > el.clientWidth + 1) anomalies.push({ type: 'horizontal_overflow', ...item, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
        if (cs.borderRadius !== '0px' && cs.borderRadius !== '0px 0px 0px 0px') anomalies.push({ type: 'radius', ...item });
        if (cs.boxShadow && cs.boxShadow !== 'none' && /rgba?\\([^)]*\\)\\s+[-0-9.]+px\\s+[-0-9.]+px\\s+(?!0px)/.test(cs.boxShadow)) anomalies.push({ type: 'soft_shadow', ...item });
        return item;
      }).slice(0, 420);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        bodyScrollWidth: document.body.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
        boxes,
        anomalies: anomalies.slice(0, 220),
      };
    }
    """
    return page.evaluate(script)


def profile_semantic_scan(page) -> dict[str, Any]:
    script = """
    ({ terms }) => {
      const body = document.body.innerText || '';
      const buttons = Array.from(document.querySelectorAll('button, a')).map((el) => ({
        text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim(),
        tag: el.tagName.toLowerCase(),
        href: el.href || null,
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
      })).filter((x) => x.text || x.href);
      const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((el) => el.innerText.trim()).filter(Boolean);
      return {
        termHits: terms.map((term) => ({ term, count: body.toLowerCase().split(term.toLowerCase()).length - 1 })).filter((x) => x.count > 0),
        headings,
        buttons,
        bodySample: body.replace(/\\s+/g, ' ').slice(0, 5000),
        textLength: body.length,
      };
    }
    """
    return page.evaluate(script, {"terms": PROFILE_TERMS})


def scan_state(page, label: str, screenshots: list[dict[str, str | None]]) -> dict[str, Any]:
    screenshot = safe_screenshot(page, slug(label), full_page=True)
    screenshots.append({"label": label, "path": screenshot})
    dom = capture_dom(page, label)
    return {
        "label": label,
        "url": page.url,
        "screenshot": screenshot,
        "dom": dom,
        "inputs": visible_input_inventory(page),
        "layout": profile_layout_metrics(page),
        "semantics": profile_semantic_scan(page),
    }


def click_text(page, pattern: str, timeout: int = 7_000) -> bool:
    try:
        loc = page.get_by_text(re.compile(pattern, re.I)).first
        loc.wait_for(state="visible", timeout=timeout)
        loc.click(timeout=timeout)
        page.wait_for_timeout(700)
        return True
    except Exception:  # noqa: BLE001
        return False


def collect_static_profile_source() -> dict[str, Any]:
    root = AUDIT_DIR.parents[1]
    files = [
        "app/profile/page.tsx",
        "lib/supabase/profiles.ts",
        "lib/supabase/msas.ts",
        "lib/supabase/msa-resolver.ts",
        "lib/msa-synthesis.ts",
        "lib/msa-applied-snapshot.ts",
        "lib/default-msa.ts",
    ]
    terms = [
        "alert(",
        "window.location.reload",
        "console.error",
        "client_msas",
        "upsertProfile",
        "globalMsa",
        "setSaveState(\"success\")",
        "Number(e.target.value)",
        "maxlength",
        "required",
        "aria",
        "rounded",
        "shadow-sm",
        "border-b-3",
        "per annum",
        "annually",
        "monthly",
    ]
    hits: list[dict[str, Any]] = []
    line_counts: dict[str, int] = {}
    for rel in files:
        path = root / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        line_counts[rel] = len(text.splitlines())
        for index, line in enumerate(text.splitlines(), start=1):
            for term in terms:
                if term in line:
                    hits.append({"file": rel, "line": index, "term": term, "text": line.strip()[:220]})
    return {"files": files, "line_counts": line_counts, "hits": hits}


def main() -> None:
    audit: dict[str, Any] = {
        "created_at": now_iso(),
        "base_url": BASE_URL,
        "method": "Authenticated Chrome CDP profile/settings scan. No save actions executed.",
        "static_source": collect_static_profile_source(),
        "states": [],
        "network_errors": [],
        "screenshots": [],
        "notes": [],
    }

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP_URL)
        if not browser.contexts:
            raise RuntimeError("No existing Chrome context on CDP.")
        context = browser.contexts[0]
        page = context.new_page()
        page.set_viewport_size({"width": 1440, "height": 980})

        def handle_response(response):
            url = response.url
            if "supabase.co/rest/v1/" not in url and "/api/" not in url:
                return
            if response.status < 400:
                return
            payload = {
                "url": url,
                "status": response.status,
                "method": response.request.method,
            }
            try:
                payload["text_sample"] = response.text()[:2200]
            except Exception as exc:  # noqa: BLE001
                payload["read_error"] = str(exc)
            audit["network_errors"].append(payload)

        page.on("response", handle_response)

        try:
            page.goto(f"{BASE_URL}/profile", wait_until="domcontentloaded", timeout=45_000)
            wait_ready(page)
            audit["states"].append(scan_state(page, "profile_desktop_agency", audit["screenshots"]))

            # Open crop modal via first visible file input. Do not save/upload.
            try:
                test_png = ensure_temp_png()
                file_inputs = page.locator("input[type='file']")
                if file_inputs.count() > 0:
                    file_inputs.first.set_input_files(test_png)
                    page.wait_for_timeout(1200)
                    audit["states"].append(scan_state(page, "profile_desktop_crop_modal_logo", audit["screenshots"]))
                    click_text(page, r"Cancel", timeout=3_000)
                    page.wait_for_timeout(500)
                else:
                    audit["notes"].append("No file input found for crop modal scan.")
            except Exception as exc:  # noqa: BLE001
                audit["notes"].append(f"Crop modal scan failed: {exc}")

            for tab_label, scan_label in [
                ("Banking", "profile_desktop_banking"),
                ("Contract & MSA", "profile_desktop_contract"),
            ]:
                click_text(page, tab_label)
                audit["states"].append(scan_state(page, scan_label, audit["screenshots"]))

            if click_text(page, r"View/Edit MSA Document"):
                audit["states"].append(scan_state(page, "profile_desktop_contract_msa_expanded", audit["screenshots"]))
            else:
                audit["notes"].append("Could not expand Global MSA Document.")

            click_text(page, r"Compliance")
            audit["states"].append(scan_state(page, "profile_desktop_compliance", audit["screenshots"]))
            if click_text(page, r"Expand LUT Details"):
                audit["states"].append(scan_state(page, "profile_desktop_compliance_lut_expanded", audit["screenshots"]))

            # Tablet/mobile layout spot checks.
            for width, height, label in [
                (768, 960, "profile_tablet_contract_msa"),
                (375, 812, "profile_mobile_agency"),
            ]:
                page.set_viewport_size({"width": width, "height": height})
                page.goto(f"{BASE_URL}/profile", wait_until="domcontentloaded", timeout=45_000)
                wait_ready(page)
                if "contract" in label:
                    click_text(page, r"Contract & MSA")
                    click_text(page, r"View/Edit MSA Document")
                audit["states"].append(scan_state(page, label, audit["screenshots"]))
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
