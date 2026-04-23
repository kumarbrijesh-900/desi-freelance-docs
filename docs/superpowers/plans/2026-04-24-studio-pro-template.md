# Studio Pro Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Neon Atelier" template with a high-fidelity, A4-optimized "Studio Pro" design featuring a vibrant multi-accent palette and modern geometric typography.

**Architecture:** Update global font configuration to include Outfit and Inter, rename the template metadata in the registry, and rewrite the template component with strict A4 constraints and dynamic database wiring.

**Tech Stack:** Next.js (App Router), Tailwind CSS, Next Font (Google Fonts).

---

### Task 1: Font Integration
**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add Outfit and Inter fonts**
  Import `Outfit` and `Inter` from `next/font/google` and add them to the `RootLayout` variable list and class names.
- [ ] **Step 2: Commit**
  ```bash
  git commit -m "style: add Outfit and Inter fonts for Studio Pro template"
  ```

### Task 2: Update Template Registry
**Files:**
- Modify: `lib/templates/registry.ts`

- [ ] **Step 1: Rename Neon Atelier to Studio Pro**
  Update the `name`, `description`, and `palette` for the template with ID `neon-atelier`.
- [ ] **Step 2: Commit**
  ```bash
  git commit -m "feat: rename Neon Atelier to Studio Pro in registry"
  ```

### Task 3: Implement Studio Pro Component
**Files:**
- Modify: `lib/templates/neon-atelier.tsx`

- [ ] **Step 1: Rewrite template with A4 constraints**
  Implement the full "Studio Pro" design using the `InvoiceTemplateProps` interface. Ensure all database fields (GST, SAC, Bank info) are wired.
- [ ] **Step 2: Commit**
  ```bash
  git commit -m "feat: implement Studio Pro template design"
  ```

### Task 4: Verification & Final Polish
**Files:**
- Manual Verification

- [ ] **Step 1: Verify in Preview Screen**
  Check the `invoice/preview` page to ensure the new template renders correctly with real data.
- [ ] **Step 2: Check Print Preview**
  Trigger a print command (Ctrl+P) to verify A4 alignment and color fidelity.
- [ ] **Step 3: Commit**
  ```bash
  git commit -m "chore: final verification of Studio Pro template"
  ```
