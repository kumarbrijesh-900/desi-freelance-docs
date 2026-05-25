# Profile Settings + Global MSA Deep Audit

Date: 2026-05-25
Mode: sanitized repo summary
Raw evidence policy: screenshots, raw DOM JSON, authenticated profile screenshots, and live profile data are local-only and not committed.

## Scope

Checked the profile area deeply:

- Agency identity fields.
- Address and tax identity fields.
- Banking fields.
- Asset upload and crop modal.
- Contract defaults.
- Global MSA editor.
- Revision policy.
- Compliance/LUT section.
- Desktop, tablet, and mobile layouts.

Static discovery found the profile surface is mostly concentrated in:

- `app/profile/page.tsx`

Supporting profile/MSA logic lives in:

- `lib/supabase/profiles.ts`
- `lib/supabase/msas.ts`
- `lib/supabase/msa-resolver.ts`
- `lib/msa-synthesis.ts`
- `lib/msa-applied-snapshot.ts`
- `lib/default-msa.ts`

## Executive Verdict

Profile has the right business primitives for Lance:

- Agency name and address.
- GST/PAN.
- Bank details.
- Signature, logo, QR assets.
- Payment terms.
- Late fee.
- IP transfer trigger.
- Revision policy.
- Global MSA.
- LUT/export compliance.

The main launch risk is trust. Profile and Global MSA settings feed invoices and legal terms, but the UI does not yet make save reliability, legal consequences, and client-facing effects clear enough.

## Main Findings

### 1. Global MSA save can silently fail

The profile save path writes profile defaults first, then writes Global MSA content. The MSA write can fail without the UI clearly separating that failure from a successful profile save.

Risk:

- User sees a success state.
- Legal text may not actually update.
- Future invoices may use stale terms.

### 2. Profile and Global MSA saves are not atomic

Profile defaults and Global MSA content are saved through separate operations. If one succeeds and the other fails, the UI needs a partial-success recovery state.

Blueprint rule:

- Legal/payment settings cannot show a generic success state until every dependent write succeeds.

### 3. Contract numeric fields lack hard validation

Payment terms, late fee, free revisions, and extra revision fee need explicit validation.

Recommended constraints:

- Payment terms: bounded integer.
- Late fee: bounded decimal with normalized unit.
- Free revisions: bounded integer.
- Extra revision fee: bounded decimal/percentage.

### 4. Late-fee unit semantics are inconsistent

UI labels and applied snapshot units do not appear fully normalized.

Blueprint rule:

- Pick one canonical stored unit set.
- Use one client-facing language standard.
- Keep UI labels, snapshots, and legal text aligned.

### 5. Raw Global MSA text lacks an effective-terms summary

The Global MSA editor should not rely only on a raw legal textarea.

Recommended summary:

- Client pays in.
- Late fee.
- When ownership moves.
- Free edits.
- Legal city.
- Last saved/version status.

### 6. Sticky Save Profile bar interrupts form reading

The fixed save bar can visually interfere with long-form profile and MSA content, especially on mobile/tablet and during Global MSA review.

Blueprint rule:

- Sticky controls must reserve layout space and never cover editable/readable content.

### 7. Tablet and mobile profile layout needs hardening

The profile surface showed tablet horizontal overflow and mobile tab discoverability issues.

Recommended direction:

- Treat tablet as a real breakpoint.
- Replace hidden-scroll mobile profile tabs with a clearer compact switcher or stacked controls.

### 8. Upload/crop modal leaks softer UI

The crop modal and upload failure handling do not fully match the strict neo-brutal modal pattern.

Recommended direction:

- Use hard modal chrome.
- Suppress background sticky controls under modal overlays.
- Replace browser alerts with in-app error states.

## CA / Legal Lens

Settings that affect legal/payment behavior need more explicit status than ordinary form settings.

Important principles:

- Users must know what clients will accept.
- Terms need version/last-saved clarity.
- Invalid or blank compliance decisions should not silently flow into export/tax invoices.
- MSA and addendum terms need plain-language explanations without removing legal terms.

## Semantic Map

| Current Term | Keep? | Plain-language Support |
|---|---:|---|
| Master Services Agreement / MSA | Yes | Your default client contract |
| IP Transfer Trigger | Yes | When ownership moves to the client |
| Jurisdiction | Yes | Legal city for disputes |
| Late Fee Rate | Yes | Fee charged when client pays late |
| Revision Policy | Yes | Free edits and paid extra edits |
| LUT Availability | Yes | Export tax letter status |

## Recommended Blueprint Additions

1. Legal/payment settings use formal term plus plain-English meaning.
2. Legal/payment saves cannot show success until all dependent writes succeed.
3. Partial save states must be explicit.
4. Numeric contract fields require min/max/step validation.
5. Profile modals use the same neo-brutal modal token as the rest of the app.
6. Sticky controls must not cover form content.
7. Mobile profile navigation should not rely on hidden horizontal scroll.
8. Profile fields that feed invoices must expose field-level validation.
9. Global MSA needs an effective-terms preview before raw legal text.
10. Client-facing legal artifacts need version/last-saved status.

## Approval Gate

This report is audit-only. No source-code implementation is approved by this document.
