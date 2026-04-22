# Canonical Architecture Note

## Canonical product direction

This repo runs an **invoice-first architecture**.

Canonical product flow:

- `/invoice/new`
- `/invoice/preview`
- `/api/brief-extract`

## Canonical folders and files

These are the canonical areas for new product work:

### Invoice domain model

- `types/invoice.ts`

### Invoice editor flow

- `app/invoice/new/page.tsx`
- `components/invoice/*`

### Preview / export flow

- `app/invoice/preview/page.tsx`

### Extraction boundary

- `app/api/brief-extract/route.ts`
- `lib/invoice-brief-intake.ts`
- `lib/ai-brief-extractor.ts`
- `lib/brief-parser-gateway.ts`
- `lib/invoice-parsed-extraction-hydration.ts`
- related invoice inference and normalization helpers under `lib/`

### Shared UI primitives

- `components/ui/*`
- `components/AppHeader.tsx`
- `components/LogoutButton.tsx`
- `lib/ui-foundation.ts`
- `lib/layout-foundation.ts`

## Legacy code

Legacy code has been archived to `_archived/` (2026-04-23).
See `_archived/README.md` for details.

Do not import from `_archived/` in production code.

## Boundary rules

1. New product work must target the canonical invoice-first flow.
2. Shared primitives in `components/ui/*` may be reused, but business logic must not cross into archived code.
3. The extraction pipeline lives exclusively under `/api/brief-extract` and the `lib/` extraction modules.

## Related docs

- `KT.md` — Knowledge transfer document
- `audits/` — Architecture audit history
