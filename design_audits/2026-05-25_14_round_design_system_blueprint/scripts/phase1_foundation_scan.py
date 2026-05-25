#!/usr/bin/env python3
"""
Phase 1 foundation scanner for Lance.

Contract:
- Connect to an already-running Chrome over CDP.
- Do not launch a new browser.
- Use browser.contexts[0] and open a new tab inside the authenticated context.
- Actively navigate audit URLs; do not scan whichever tab is currently active.
- Use Playwright Python sync_api.
- Extract DOM heuristics for rounds 1-4:
  1. Soft UI violations
  2. Computed color inventory
  3. Border thickness/style violations
  4. Foundation summary
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

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

CDP_ENDPOINT = os.environ.get("CDP_ENDPOINT", "http://127.0.0.1:9222")
OUTPUT_JSON = RESULTS_DIR / "phase1_foundation_scan.json"
MAX_ELEMENTS_PER_PAGE = int(os.environ.get("MAX_ELEMENTS_PER_PAGE", "4500"))
TARGET_URLS = [
    url.strip()
    for url in os.environ.get(
        "AUDIT_TARGET_URLS",
        ",".join(
            [
                "https://lanceinvoice.xyz/dashboard",
                "https://lanceinvoice.xyz/projects",
                "https://lanceinvoice.xyz/invoices",
                "https://lanceinvoice.xyz/clients",
                "https://lanceinvoice.xyz/invoice/new",
            ]
        ),
    ).split(",")
    if url.strip()
]
ALLOWED_HOSTS = {
    host.strip().lower()
    for host in os.environ.get(
        "AUDIT_ALLOWED_HOSTS",
        "lanceinvoice.xyz,www.lanceinvoice.xyz,localhost,127.0.0.1",
    ).split(",")
    if host.strip()
}


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_").lower()
    return cleaned[:80] or "page"


def is_allowed_page_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    return any(host == allowed or host.endswith(f".{allowed}") for allowed in ALLOWED_HOSTS)


def append_design_system_summary(report: Dict[str, Any]) -> None:
    """Append a concise scan summary while preserving the blueprint scaffold."""
    summary = report["summary"]
    lines = [
        "",
        "## Scan Log: Phase 1 Foundation",
        "",
        f"Run timestamp: `{report['run_timestamp']}`",
        f"CDP endpoint: `{report['cdp_endpoint']}`",
        f"Navigation strategy: `{report['navigation_strategy']}`",
        f"Pages scanned: `{summary['pages_scanned']}`",
        f"Elements inspected: `{summary['elements_inspected']}`",
        "",
        "Target URLs:",
        "",
    ]

    for url in report["target_urls"]:
        lines.append(f"- `{url}`")

    lines.extend([
        "",
        "| Metric | Count |",
        "|---|---:|",
        f"| Soft UI violations | {summary['soft_ui_violation_count']} |",
        f"| Border contract violations | {summary['border_violation_count']} |",
        f"| Unique background colors | {summary['unique_background_colors']} |",
        f"| Unique text colors | {summary['unique_text_colors']} |",
        f"| Unique border colors | {summary['unique_border_colors']} |",
        "",
        "Top background colors:",
        "",
    ])

    for item in report["color_inventory"]["background_colors"][:12]:
        lines.append(f"- `{item['value']}` — {item['count']} elements")

    lines.extend(
        [
            "",
            "Top text colors:",
            "",
        ]
    )
    for item in report["color_inventory"]["text_colors"][:12]:
        lines.append(f"- `{item['value']}` — {item['count']} elements")

    lines.extend(
        [
            "",
            "Initial Phase 1 interpretation:",
            "",
            "- Treat these as observed facts only; final token decisions require all 14 rounds.",
            "- Soft UI and border-contract violations need manual review before refactor work.",
            "- No source code changes have been made by this audit.",
            "",
        ]
    )

    DESIGN_SYSTEM_PATH.write_text(
        DESIGN_SYSTEM_PATH.read_text(encoding="utf-8") + "\n".join(lines),
        encoding="utf-8",
    )


def scan_page(page: Any, page_index: int, requested_url: str) -> Dict[str, Any]:
    try:
        page.goto(requested_url, wait_until="networkidle", timeout=30000)
    except PlaywrightTimeoutError:
        pass

    try:
        page.wait_for_load_state("domcontentloaded", timeout=8000)
    except PlaywrightTimeoutError:
        pass

    page.wait_for_timeout(750)
    title = page.title()
    url = page.url
    requested_path = urlparse(requested_url).path.strip("/") or "home"
    screenshot_name = f"phase1_{page_index:02d}_{slugify(requested_path)}.png"
    screenshot_path = SCREENSHOTS_DIR / screenshot_name
    page.screenshot(path=str(screenshot_path), full_page=True)

    dom_result = page.evaluate(
        """
        ({ maxElements, requestedUrl }) => {
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
                if (siblings.length > 1) {
                  part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
                }
              }
              parts.unshift(part);
              node = parent;
            }
            return parts.join(" > ");
          };

          const isVisible = (el, style) => {
            const rect = el.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number(style.opacity || 1) !== 0 &&
              rect.width > 0 &&
              rect.height > 0
            );
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

          const bump = (map, key, sample) => {
            if (!key) return;
            if (!map[key]) map[key] = { value: key, count: 0, samples: [] };
            map[key].count += 1;
            if (map[key].samples.length < 5 && sample) map[key].samples.push(sample);
          };

          const colorMaps = {
            background: {},
            text: {},
            border: {},
          };
          const softViolations = [];
          const borderViolations = [];
          const inspected = [];
          const elements = Array.from(document.querySelectorAll("body *"))
            .filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName))
            .slice(0, maxElements);

          for (const el of elements) {
            const style = window.getComputedStyle(el);
            if (!isVisible(el, style)) continue;
            const selector = getSelector(el);
            const text = (el.innerText || el.getAttribute("aria-label") || "").replace(/\\s+/g, " ").trim().slice(0, 120);
            const rect = el.getBoundingClientRect();
            const sample = { selector, tag: el.tagName.toLowerCase(), text };

            inspected.push(sample);
            bump(colorMaps.background, colorToHex(style.backgroundColor), sample);
            bump(colorMaps.text, colorToHex(style.color), sample);

            const borderSides = ["Top", "Right", "Bottom", "Left"].map((side) => {
              const width = parsePx(style[`border${side}Width`]);
              const borderStyle = style[`border${side}Style`];
              const color = colorToHex(style[`border${side}Color`]);
              if (width > 0 && borderStyle !== "none") bump(colorMaps.border, color, sample);
              return { side: side.toLowerCase(), width, style: borderStyle, color };
            });

            const radii = [
              style.borderTopLeftRadius,
              style.borderTopRightRadius,
              style.borderBottomRightRadius,
              style.borderBottomLeftRadius,
            ];
            const radiusValues = radii.map(parsePx);
            const radiusViolation = radiusValues.some((value) => value > 0);
            const shadowViolations = shadowBlurViolations(style.boxShadow);
            const gradientViolation = hasGradient(style.backgroundImage);
            const filterViolation = hasBlurFilter(style.filter) || hasBlurFilter(style.backdropFilter);

            if (radiusViolation || shadowViolations.length || gradientViolation || filterViolation) {
              softViolations.push({
                selector,
                tag: el.tagName.toLowerCase(),
                text,
                rect: {
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
                reasons: {
                  border_radius: radiusViolation ? radii : null,
                  soft_box_shadow: shadowViolations.length ? shadowViolations : null,
                  gradient_background: gradientViolation ? style.backgroundImage : null,
                  blur_filter: filterViolation
                    ? { filter: style.filter, backdrop_filter: style.backdropFilter }
                    : null,
                },
              });
            }

            for (const border of borderSides) {
              if (border.width <= 0 || border.style === "none") continue;
              const allowedWidth = border.width === 2 || border.width === 4;
              const allowedStyle = border.style === "solid";
              if (!allowedWidth || !allowedStyle) {
                borderViolations.push({
                  selector,
                  tag: el.tagName.toLowerCase(),
                  text,
                  side: border.side,
                  width: border.width,
                  style: border.style,
                  color: border.color,
                  expected: "2px solid or 4px solid",
                });
              }
            }
          }

          const mapToSortedArray = (map) =>
            Object.values(map).sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));

          return {
            requested_url: requestedUrl,
            url: window.location.href,
            title: document.title,
            elements_inspected: inspected.length,
            soft_ui_violations: softViolations,
            border_violations: borderViolations,
            color_inventory: {
              background_colors: mapToSortedArray(colorMaps.background),
              text_colors: mapToSortedArray(colorMaps.text),
              border_colors: mapToSortedArray(colorMaps.border),
            },
          };
        }
        """,
        {"maxElements": MAX_ELEMENTS_PER_PAGE, "requestedUrl": requested_url},
    )

    dom_result["requested_url"] = requested_url
    dom_result["screenshot"] = str(screenshot_path.relative_to(AUDIT_ROOT))
    return dom_result


def main() -> int:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    run_timestamp = datetime.now(timezone.utc).isoformat()

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.connect_over_cdp(CDP_ENDPOINT)
        except Exception as exc:
            print(f"Failed to connect to existing Chrome over CDP at {CDP_ENDPOINT}: {exc}", file=sys.stderr)
            print("Start Chrome with --remote-debugging-port=9222, then rerun.", file=sys.stderr)
            return 2

        if not browser.contexts:
            print("Connected to Chrome, but no browser contexts were available.", file=sys.stderr)
            return 3

        invalid_targets = [url for url in TARGET_URLS if not is_allowed_page_url(url)]
        if invalid_targets:
            print(f"Refusing to scan URLs outside allowed hosts: {invalid_targets}", file=sys.stderr)
            print(f"Allowed hosts: {sorted(ALLOWED_HOSTS)}", file=sys.stderr)
            return 4

        context = browser.contexts[0]
        page_reports: List[Dict[str, Any]] = []
        page = context.new_page()
        try:
            for index, target_url in enumerate(TARGET_URLS, start=1):
                print(f"Scanning target {index}: {target_url}")
                try:
                    page_reports.append(scan_page(page, index, target_url))
                except Exception as exc:
                    page_reports.append(
                        {
                            "requested_url": target_url,
                            "url": page.url,
                            "title": "",
                            "error": str(exc),
                            "elements_inspected": 0,
                            "soft_ui_violations": [],
                            "border_violations": [],
                            "color_inventory": {
                                "background_colors": [],
                                "text_colors": [],
                                "border_colors": [],
                            },
                        }
                    )
        finally:
            page.close()

    background_colors: Dict[str, Dict[str, Any]] = {}
    text_colors: Dict[str, Dict[str, Any]] = {}
    border_colors: Dict[str, Dict[str, Any]] = {}

    def merge_colors(target: Dict[str, Dict[str, Any]], entries: List[Dict[str, Any]]) -> None:
        for entry in entries:
            key = entry["value"]
            if key not in target:
                target[key] = {"value": key, "count": 0, "samples": []}
            target[key]["count"] += entry["count"]
            target[key]["samples"].extend(entry.get("samples", [])[: max(0, 5 - len(target[key]["samples"]))])

    for page_report in page_reports:
        inventory = page_report["color_inventory"]
        merge_colors(background_colors, inventory["background_colors"])
        merge_colors(text_colors, inventory["text_colors"])
        merge_colors(border_colors, inventory["border_colors"])

    sort_colors = lambda values: sorted(values, key=lambda item: (-item["count"], item["value"]))
    total_elements = sum(page.get("elements_inspected", 0) for page in page_reports)
    total_soft = sum(len(page.get("soft_ui_violations", [])) for page in page_reports)
    total_borders = sum(len(page.get("border_violations", [])) for page in page_reports)

    report = {
        "run_timestamp": run_timestamp,
        "cdp_endpoint": CDP_ENDPOINT,
        "navigation_strategy": "browser.contexts[0].new_page(); page.goto(target_url); page.close()",
        "target_urls": TARGET_URLS,
        "max_elements_per_page": MAX_ELEMENTS_PER_PAGE,
        "summary": {
            "pages_scanned": len(page_reports),
            "elements_inspected": total_elements,
            "soft_ui_violation_count": total_soft,
            "border_violation_count": total_borders,
            "unique_background_colors": len(background_colors),
            "unique_text_colors": len(text_colors),
            "unique_border_colors": len(border_colors),
        },
        "color_inventory": {
            "background_colors": sort_colors(list(background_colors.values())),
            "text_colors": sort_colors(list(text_colors.values())),
            "border_colors": sort_colors(list(border_colors.values())),
        },
        "pages": page_reports,
    }

    OUTPUT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    append_design_system_summary(report)

    print(f"Wrote JSON: {OUTPUT_JSON}")
    print(f"Updated blueprint: {DESIGN_SYSTEM_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
