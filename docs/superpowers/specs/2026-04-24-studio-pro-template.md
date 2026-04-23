# Design Spec: "Studio Pro" Invoice Template

**Date**: 2026-04-24
**Topic**: High-fidelity replacement for the legacy "Neon Atelier" template.
**Goal**: Create a contemporary, print-perfect, and WCAG-compliant design inspired by premium creative studio aesthetics.

---

## 1. Visual Language & Aesthetic

### 1.1 Palette (Studio Pro)
- **Primary Base**: `#FAF9F6` (Gallery White) — A warm, premium neutral.
- **Structural Power**: `#2D5BFF` (Electric Cobalt) — High-contrast, vibrant but professional. Used for the header accent and grand total.
- **Highlight Accent**: `#FF725E` (Vivid Coral) — Small geometric markers and payment highlight lines.
- **Anchor Color**: `#111118` (Obsidian) — Used for primary headings, table headers, and status tags.
- **Secondary Accent**: `#00C896` (Modern Teal) — For "Billed To" client indicators.

### 1.2 Typography
- **Headings & Impact**: `Outfit` (Geometric Sans-Serif). Weights: 700 (Bold), 900 (Black).
- **Body & Data**: `Inter` (Clean Sans-Serif). Weights: 400 (Regular), 600 (Semi-Bold).
- **Financial Numbers**: `Inter` with tabular-nums or `Outfit` for large totals.

---

## 2. Layout Structure (A4-Optimized)

### 2.1 Dimensions
- **Width**: `210mm`
- **Minimum Height**: `297mm`
- **Margins**: `20mm` safe zone for standard office printers.

### 2.2 Component Sections
- **Header**: Asymmetric top-right cobalt block containing Invoice ID and Date. Left-aligned Agency branding with Terracotta accent bar.
- **Parties**: "Billed To" card with Teal left border. Asymmetric "Project Description" block on the right.
- **Items Table**: Solid Obsidian header row. 1px light dividers. 4px thick charcoal bottom border for the header.
- **Totals**: "Bento-style" summary. Subtotal and Tax in a light gray box, Grand Total in a solid Cobalt block.
- **Footer**: Solid Coral accent bar above payment details. Professional signature area.

---

## 3. Data Integration & Compliance

### 3.1 Agency Details
- Agency Name, Address, GSTIN (conditionally shown), PAN, and State Code.
- Dynamic Logo rendering (auto-invert logic if background is dark).

### 3.2 Client Details
- Client Name, Address, and Client Tax Label/ID (GSTIN/VAT).

### 3.3 Line Items
- Full support for: Description, SAC/HSN Code, Qty, Rate, Unit, and Total Amount.
- SAC code displayed in micro-labels for professional compliance.

### 3.4 Financials
- Subtotal, Tax (dynamic label), and Grand Total.
- "Amount in Words" rendered in high-contrast Obsidian text.
- Reverse Charge (RCM) status indicator in the compliance footer.

---

## 4. Technical Implementation

- **File**: `/lib/templates/neon-atelier.tsx` (Content replacement).
- **Registry**: Update `lib/templates/registry.ts` to rename display label to **"Studio Pro"**.
- **Styles**: Use Vanilla CSS / Tailwind classes within the React component.
- **Printing**: Ensure the Cobalt and Coral accents are preserved in print-mode but optimized for standard ink usage.

---

## 5. Success Criteria
1. **WCAG AA Compliance**: No text-to-background contrast ratio below 4.5:1.
2. **A4 Compatibility**: No content clipping during browser print or PDF export.
3. **Data Completeness**: Every field from the `InvoiceData` object must be accounted for.
