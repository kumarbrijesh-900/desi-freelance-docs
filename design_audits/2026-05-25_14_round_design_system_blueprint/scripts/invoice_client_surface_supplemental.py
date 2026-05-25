from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright

from invoice_client_surface_audit import (
    AUDIT_DIR,
    BASE_URL,
    CDP_URL,
    INTERNAL_TERMS,
    RESULTS_DIR,
    SCREENSHOTS_DIR,
    capture_dom,
    safe_screenshot,
    slug,
    wait_ready,
)


PRIMARY_RESULT = RESULTS_DIR / "invoice_client_surface_audit.json"
SUPPLEMENTAL_RESULT = RESULTS_DIR / "invoice_client_surface_supplemental.json"


def pick(candidates: list[dict[str, Any]], predicate) -> dict[str, Any] | None:
    for candidate in candidates:
        if predicate(candidate):
            return candidate
    return None


def open_and_scan(page, path: str, label: str, screenshots: list[dict[str, str | None]]) -> dict[str, Any]:
    url = path if path.startswith("http") else f"{BASE_URL}{path}"
    page.goto(url, wait_until="domcontentloaded", timeout=45_000)
    wait_ready(page)
    shot = safe_screenshot(page, slug(label), full_page=True)
    screenshots.append({"label": label, "path": shot})
    return capture_dom(page, label)


def click_text(page, pattern: str, timeout: int = 8_000) -> bool:
    try:
        loc = page.get_by_text(re.compile(pattern, re.I)).first
        loc.wait_for(state="visible", timeout=timeout)
        loc.click(timeout=timeout)
        page.wait_for_timeout(1400)
        return True
    except Exception:  # noqa: BLE001
        return False


def main() -> None:
    primary = json.loads(PRIMARY_RESULT.read_text(encoding="utf-8"))
    candidates = primary.get("invoice_candidates", [])

    share_candidate = pick(
        candidates,
        lambda c: str(c.get("status", "")).lower() == "draft"
        and str(c.get("msa_status", "")).lower() == "pending",
    ) or pick(
        candidates,
        lambda c: str(c.get("status", "")).lower() == "draft",
    ) or pick(candidates, lambda c: c.get("id"))
    pending_parent = pick(
        candidates,
        lambda c: c.get("share_token") and not c.get("parent_invoice_id") and str(c.get("msa_status", "")).lower() == "pending",
    )
    accepted_parent = pick(
        candidates,
        lambda c: c.get("share_token") and not c.get("parent_invoice_id") and str(c.get("msa_status", "")).lower() == "accepted",
    )
    proposed_parent = pick(
        candidates,
        lambda c: c.get("share_token") and not c.get("parent_invoice_id") and str(c.get("msa_status", "")).lower() == "proposed",
    )

    audit: dict[str, Any] = {
        "method": "Supplemental targeted scan for share modal and public/client share states.",
        "selected": {
            "share_candidate": share_candidate,
            "pending_parent": pending_parent,
            "accepted_parent": accepted_parent,
            "proposed_parent": proposed_parent,
        },
        "pages": [],
        "modals": [],
        "network_errors": [],
        "screenshots": [],
        "notes": [],
    }

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP_URL)
        context = browser.contexts[0]
        page = context.new_page()

        def handle_response(response):
            if "supabase.co/rest/v1/" not in response.url and "/api/" not in response.url:
                return
            if response.status < 400:
                return
            payload = {
                "url": response.url,
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
            if share_candidate:
                audit["pages"].append(open_and_scan(
                    page,
                    f"/invoice/preview?id={share_candidate['id']}",
                    f"supplemental_share_candidate_preview_{share_candidate.get('invoice_number') or share_candidate['id']}",
                    audit["screenshots"],
                ))
                if click_text(page, r"Share Invoice"):
                    scan = capture_dom(page, "supplemental_share_modal_or_save_error")
                    scan["screenshot"] = safe_screenshot(page, "supplemental_share_modal_or_save_error", full_page=False)
                    audit["modals"].append(scan)
                else:
                    audit["notes"].append("Could not click Share Invoice on share_candidate preview.")

            for label, candidate in [
                ("pending_public_share", pending_parent),
                ("accepted_public_share", accepted_parent),
                ("proposed_public_share", proposed_parent),
            ]:
                if not candidate:
                    audit["notes"].append(f"No candidate found for {label}.")
                    continue
                token = candidate.get("share_token")
                if token:
                    audit["pages"].append(open_and_scan(
                        page,
                        f"/share/{token}",
                        f"supplemental_{label}_{candidate.get('invoice_number') or token}",
                        audit["screenshots"],
                    ))
                audit["pages"].append(open_and_scan(
                    page,
                    f"/invoice/{candidate['id']}/client-preview",
                    f"supplemental_agency_preview_{label}_{candidate.get('invoice_number') or candidate['id']}",
                    audit["screenshots"],
                ))
        finally:
            page.close()
            browser.close()

    SUPPLEMENTAL_RESULT.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(str(SUPPLEMENTAL_RESULT))


if __name__ == "__main__":
    main()
