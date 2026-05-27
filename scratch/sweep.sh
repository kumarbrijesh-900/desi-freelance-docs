#!/bin/bash
echo "=== 1. TypeScript 'as any' casts in wizard files (type safety holes) ==="
grep -n "as any" components/invoice/InvoiceEditorPage.tsx components/invoice/DeliverablesSection.tsx components/invoice/AgencyDetailsSection.tsx components/invoice/TermsPaymentSection.tsx 2>/dev/null | head -30

echo "=== 2. Console.log/warn/error left in wizard (should be cleaned for prod) ==="
grep -n "console\.\(log\|warn\|error\)" components/invoice/InvoiceEditorPage.tsx components/invoice/DeliverablesSection.tsx components/invoice/AgencyDetailsSection.tsx components/invoice/TermsPaymentSection.tsx 2>/dev/null | head -30

echo "=== 3. TODO/FIXME/HACK still in wizard files ==="
grep -n "TODO\|FIXME\|HACK\|PLACEHOLDER\|XXX" components/invoice/InvoiceEditorPage.tsx components/invoice/DeliverablesSection.tsx components/invoice/AgencyDetailsSection.tsx components/invoice/TermsPaymentSection.tsx 2>/dev/null | head -20

echo "=== 4. Unreachable code or empty blocks ==="
grep -n "() => {}\|// eslint-disable\|@ts-ignore\|@ts-expect-error" components/invoice/InvoiceEditorPage.tsx components/invoice/DeliverablesSection.tsx components/invoice/AgencyDetailsSection.tsx components/invoice/TermsPaymentSection.tsx 2>/dev/null | head -20

echo "=== 5. Check for duplicate imports or unused imports ==="
head -50 components/invoice/InvoiceEditorPage.tsx
echo "--- DeliverablesSection ---"
head -30 components/invoice/DeliverablesSection.tsx
echo "--- AgencyDetailsSection ---"
head -30 components/invoice/AgencyDetailsSection.tsx
echo "--- TermsPaymentSection ---"
head -30 components/invoice/TermsPaymentSection.tsx

echo "=== 6. Check EditorContent references still exist after file deletion ==="
grep -rn "EditorContent" components/ app/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"

echo "=== 7. Check project name flows through to save ==="
grep -n "projectName\|project_name\|onProjectNameChange" components/invoice/DeliverablesSection.tsx components/invoice/InvoiceEditorPage.tsx 2>/dev/null | head -20

echo "=== 8. Verify fresh=1 param usage is consistent ==="
grep -rn "fresh=1\|fresh\b" components/ app/ --include="*.tsx" | grep -v node_modules | grep -v ".next" | head -15

echo "=== 9. Check delete handlers exist for milestone and line items ==="
grep -n "Trash2\|handleDeleteMilestone\|handleRemoveMilestone\|handleDeleteLineItem\|handleRemoveLineItem\|removeMilestone\|removeLineItem" components/invoice/DeliverablesSection.tsx 2>/dev/null | head -15

echo "=== 10. Check profile retry pattern is complete ==="
grep -B2 -A10 "attempt.*<.*3\|retry\|for.*let.*attempt" components/invoice/InvoiceEditorPage.tsx 2>/dev/null | head -30

echo "=== 11. Verify step validation includes project name ==="
grep -B3 -A5 "projectName\|MANDATORY\|COMPLETE\|READY\|stepReady\|stepValid\|isComplete" components/invoice/InvoiceEditorPage.tsx 2>/dev/null | grep -i "project\|item\|step.*3\|deliverable" | head -15

echo "=== 12. Check no stale references to removed EditorContent.tsx ==="
grep -rn "from.*EditorContent\|import.*EditorContent" components/ app/ lib/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"
