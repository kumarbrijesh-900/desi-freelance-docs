# Canonical Architecture Note

## Canonical product direction

This repo is converging on an **invoice-first architecture**.

Canonical product flow:

- `/invoice/new`
- `/invoice/preview`
- `/api/brief-extract`

Legacy product flow:

- `/create`
- `/api/extract`
- the document-wizard stack in `components/flow/*`

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
- related invoice inference and normalization helpers under `lib/`

### Shared UI primitives

- `components/ui/*`
- `components/AppHeader.tsx`
- `components/LogoutButton.tsx`
- `lib/ui-foundation.ts`
- `lib/layout-foundation.ts`

## Legacy folders and files

These areas are frozen and should not receive new feature work:

- `app/create/page.tsx`
- `components/flow/*`
- `components/documents/*`
- `app/api/extract/route.ts`
- `lib/extract-document-data.ts`
- `types/document.ts`

## Boundary rules

1. New product work must target the canonical invoice-first flow.
2. Do not add new features to the `/create` route or document-wizard stack.
3. Do not build new invoice behavior on top of `types/document.ts`.
4. Do not add new extraction behavior to `/api/extract`; invoice extraction belongs in `/api/brief-extract`.
5. Shared primitives in `components/ui/*` may be reused by both stacks, but business logic should not cross the canonical/legacy boundary.

## Cross-dependency note

Current audit status:

- No canonical invoice flow files were found importing `components/flow/*`, `components/documents/*`, `types/document.ts`, or `lib/extract-document-data.ts`.
- The legacy stack is currently self-contained enough to freeze safely.

## Related audit docs

- `audits/architecture-convergence-audit.md`
- `audits/canonical-architecture-blueprint.md`
- `audits/migration-todo-map.md`
