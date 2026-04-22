# Archived — Legacy Code

> **Archived:** 2026-04-23
> **Reason:** Architecture convergence to invoice-first flow

This directory contains code from the legacy `/create` document-wizard architecture.
It is preserved for reference only. **Do not import from `_archived/` in production code.**

## What's Here

| Directory | Original Location | Contents |
|-----------|-------------------|----------|
| `legacy-flow/` | `components/flow/` | CreateDocumentWizard, BriefInputStep, LicensingStep, Paywall, ReviewStep, ProjectPresetStep, VoiceInputButton, GenerateButtons |
| `legacy-documents/` | `components/documents/` | InvoiceTemplate, ScopeTemplate, WatermarkedNotice |
| `legacy-api/` | `app/api/extract/`, `app/create/` | Legacy extraction endpoint, legacy create page |
| `legacy-types/` | `types/` | `document.ts` (legacy document schema), `licensing.ts` (dead file) |
| `legacy-lib/` | `lib/` | `extract-document-data.ts`, `licensing-summary.ts` |
| `root-debris/` | project root | Debug artifacts, test outputs, scratch files |

## Canonical Architecture

All new work targets:
- `app/invoice/new/page.tsx` — Invoice editor
- `app/invoice/preview/page.tsx` — Invoice preview & PDF export
- `app/api/brief-extract/route.ts` — Smart extraction API
- `components/invoice/*` — Invoice UI components
- `lib/` — Extraction, compliance, inference, and UI utilities
- `types/invoice.ts` — Canonical domain types
