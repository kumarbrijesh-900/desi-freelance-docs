# Invoice App Recovery Strategy

Date: 2026-04-02

Scope: recovery strategy only. No implementation plan, no code changes, no refactor instructions.

## 1. SYSTEM FAILURE MODEL

The invoice app feels broken because too many layers are trying to be smart at the same time.

At the moment, the system is not a simple flow from input to form. It is a stack of overlapping systems:
- AI extraction tries to interpret messy text
- heuristic inference tries to fill gaps and guess roles
- normalization rewrites values again after extraction
- the editor UI also derives and rewrites some fields while the user types
- bootstrap and hydration logic decide what the first visible state should be

Each of those layers is individually reasonable, but together they create instability.

In practice, this means:
- one value can be extracted, then normalized, then inferred again, then merged, then re-derived during UI input
- the same field can change meaning depending on where it entered the system
- the user cannot easily predict whether the form reflects their input, an inferred default, or a later rewrite
- the app appears to have “random” bugs, but most of them are actually collisions between layers

This is why the instability is systemic, not a collection of isolated bugs.

The app currently has:
- too many write paths into invoice state
- too many hidden transformations
- too many implicit rules
- too little separation between suggestion, inference, and committed form state

The result is a system that feels unreliable even when individual functions are technically working as written.

## 2. NON-NEGOTIABLE RULES

These rules should govern all recovery work from this point onward.

1. User-entered values must never be overwritten silently.
2. Extraction output must not write directly into canonical invoice state.
3. Inference must be explicit and traceable, not hidden inside generic merge helpers.
4. A field must have one clear source of truth at any moment.
5. Normalization must not change semantic meaning of a field without an explicit decision point.
6. SSR output must be deterministic, or the page must be intentionally client-only with a clearly defined bootstrap model.
7. UI components must not perform hidden business-state correction while the user is typing unless that behavior is deliberate, minimal, and documented.
8. Mapping from extracted candidate data into form state must be the only place where autofill becomes real state.
9. Confidence must control review behavior, not only write behavior.
10. Derived defaults must be suggestions first, committed state second.

## 3. STABILIZATION PHASES

### Phase 1 — Stop Damage

Goal: stop the system from changing user data in surprising ways.

Focus:
- freeze overwrite behavior
- isolate extraction from committed form state
- stop broad inferences from silently winning over existing values

What this phase is about:
- containing the blast radius
- reducing accidental mutation
- making the pipeline legible

What success looks like:
- extraction can produce candidate values without directly destabilizing the form
- user edits stop getting unexpectedly replaced
- row-level data like line items stops being fragile

### Phase 2 — Stabilize State

Goal: define a single, understandable state model.

Focus:
- define one canonical state owner
- remove hidden inference side effects from generic merge paths
- separate defaulting, normalization, and persistence concerns

What this phase is about:
- making writes predictable
- removing non-local state mutation
- ensuring every state transition has a clear reason

What success looks like:
- form state changes are explainable
- normalization is explicit
- merge helpers stop behaving like hidden business logic engines

### Phase 3 — Clean UX

Goal: make the editor feel calm and reliable after the underlying state model is stable.

Focus:
- simplify user flow
- reduce noisy validation
- reduce layout churn and visual competition
- make autofill outcomes easier to review without forcing confusion

What this phase is about:
- trust, clarity, and completion speed
- making the stable system feel stable

What success looks like:
- the UI no longer amplifies pipeline instability
- guidance is helpful but quiet
- the editor feels predictable from top to bottom

## 4. FIRST SAFE INTERVENTION

Start here:

- File: `lib/invoice-brief-intake.ts`
- Function: `mapBriefExtractionToInvoiceForm(...)`

Why this is the safest entry point:
- it is the narrowest choke point between extracted candidate data and committed invoice state
- it is where overwrite decisions currently become real
- it is downstream of both AI extraction and heuristic extraction, so changes here can reduce damage without rewriting the parsers first
- it allows stabilization of behavior without immediately redesigning UI or bootstrap architecture

Why this should be first:
- this is where candidate data becomes user-visible state
- this is where confidence, defaults, and overwrite behavior converge
- this is where line-item index merge risk is currently concentrated
- this is the best place to stop destructive behavior before broader cleanup

What not to touch yet:
- do not touch `types/invoice.ts` `mergeInvoiceFormData(...)` first
- do not touch `components/invoice/InvoiceEditorPage.tsx` bootstrap and hydration flow first
- do not touch AI prompts or OCR mechanics first
- do not redesign section UX while the write path is still unstable

Those areas matter, but they are not the safest first intervention because they are broader and easier to destabilize further.

## 5. WHAT NOT TO FIX YET

### Hydration fixes

Avoid touching hydration first.

Why:
- current hydration symptoms are real, but they are downstream of unstable state creation and bootstrap rules
- fixing render mismatches before stabilizing state ownership can hide the wrong problem
- hydration work tends to spread quickly across many files and can create more suppression, more guards, and more complexity

### UI redesign

Avoid another UI pass right now.

Why:
- layout churn can make state problems harder to isolate
- visual cleanup can give the impression of improvement while the pipeline is still unstable
- if the underlying write model is still unpredictable, the UI will continue to feel broken no matter how polished it looks

### OCR improvements

Avoid improving screenshot extraction first.

Why:
- OCR is not the main reason the system feels unstable
- better OCR will still feed into the same unstable merge and overwrite path
- improving input quality before stabilizing mapping will increase complexity without restoring trust

### AI tuning

Avoid prompt tuning or model changes first.

Why:
- better AI interpretation will still flow into the same aggressive mapping and normalization behavior
- if the write path is unstable, stronger AI can actually increase the amount of wrong data confidently applied
- model work is expensive and noisy compared with stabilizing the deterministic handoff layer

## 6. SUCCESS CRITERIA

A stable system means:

1. No unexpected overwrites.
   - User-entered values stay put unless the user explicitly accepts a replacement.

2. Predictable form behavior.
   - The same input produces the same visible result through a traceable path.

3. Consistent data flow.
   - Input, extraction, normalization, mapping, and rendering each have one clear responsibility.

4. No hidden mutations.
   - Generic merge helpers do not silently rewrite unrelated fields.

5. Clear ownership of defaults.
   - Bootstrapped defaults, inferred suggestions, and committed values are not mixed together invisibly.

6. Stable editor rendering.
   - Initial render strategy is deliberate and understandable, not a patchwork of suppression and client-only repair.

7. Reviewable extraction behavior.
   - Confidence and ambiguity result in review states, not silent mutation.

8. Line items behave as structured data.
   - Autofill does not unpredictably overwrite rows just because their array positions happen to line up.

The goal is not to make the app “smarter” first.

The goal is to make it trustworthy first.
