#!/bin/bash
# Mechanical B-rule replacements for dashboard cockpit sweep.
# Applies to the 5 dashboard files ONLY (not AppHeader beyond Part A).
set -euo pipefail

DASH_FILES=(
  "app/dashboard/page.tsx"
  "components/dashboard/ProjectRail.tsx"
  "components/dashboard/LifecycleStepper.tsx"
  "components/dashboard/ActiveDrilldown.tsx"
  "components/dashboard/ProjectInvoicesLedger.tsx"
)

cd /Users/bkb/Desktop/desi-freelance-docs

for f in "${DASH_FILES[@]}"; do
  echo "=== Processing $f ==="

  # B16: font-black → font-bold (in className contexts only — whole-word in class strings)
  sed -i '' 's/font-black/font-bold/g' "$f"

  # B17: font-extrabold → font-bold
  sed -i '' 's/font-extrabold/font-bold/g' "$f"

  # B1: bg-white → bg-[color:var(--color-paper-2)]
  sed -i '' 's/bg-white/bg-[color:var(--color-paper-2)]/g' "$f"

  # B2: text-white → text-[color:var(--color-acc-ink)]
  sed -i '' 's/text-white/text-[color:var(--color-acc-ink)]/g' "$f"

  # B3: #D85A30 in className arbitrary values → color:var(--color-coral)
  # In returned strings/comparisons → var(--color-coral)
  # Case-insensitive on hex digits
  sed -i '' 's/#D85A30/var(--color-coral)/gI' "$f"
  sed -i '' 's/#d85a30/var(--color-coral)/gI' "$f"

  # B4: #FF6B5C → var(--color-coral)
  sed -i '' 's/#FF6B5C/var(--color-coral)/gI' "$f"
  sed -i '' 's/#ff6b5c/var(--color-coral)/gI' "$f"

  # B5: #BA7517 → var(--color-ochre-deep)
  sed -i '' 's/#BA7517/var(--color-ochre-deep)/gI' "$f"
  sed -i '' 's/#ba7517/var(--color-ochre-deep)/gI' "$f"

  # B6: #157a54 → var(--color-grass)
  sed -i '' 's/#157a54/var(--color-grass)/gI' "$f"

  # B7: #1e3d33 → var(--color-forest)
  sed -i '' 's/#1e3d33/var(--color-forest)/gI' "$f"

  # B8: #f0e9d6 → var(--color-acc-ink)
  sed -i '' 's/#f0e9d6/var(--color-acc-ink)/gI' "$f"

  # B9: #a99e8c → var(--color-ink-3)
  sed -i '' 's/#a99e8c/var(--color-ink-3)/gI' "$f"

  # B10: #8c8270 → var(--color-ink-3)
  sed -i '' 's/#8c8270/var(--color-ink-3)/gI' "$f"

  # B11: #e4f1ea → var(--state-success-bg)
  sed -i '' 's/#e4f1ea/var(--state-success-bg)/gI' "$f"

  # B12: #e9f1ea → var(--color-acc-soft)
  sed -i '' 's/#e9f1ea/var(--color-acc-soft)/gI' "$f"

  # B13: #f7edd6 → var(--state-warning-bg)
  sed -i '' 's/#f7edd6/var(--state-warning-bg)/gI' "$f"

  # B14: #c9bb9d → var(--color-strong)
  sed -i '' 's/#c9bb9d/var(--color-strong)/gI' "$f"

  # B15: six hex values → var(--color-soft)
  sed -i '' 's/#c7e4d4/var(--color-soft)/gI' "$f"
  sed -i '' 's/#bcd2c5/var(--color-soft)/gI' "$f"
  sed -i '' 's/#d2e0d2/var(--color-soft)/gI' "$f"
  sed -i '' 's/#cfe0db/var(--color-soft)/gI' "$f"
  sed -i '' 's/#b9cabf/var(--color-soft)/gI' "$f"
  sed -i '' 's/#cfc4ab/var(--color-soft)/gI' "$f"

  echo "  Done."
done

echo ""
echo "=== All mechanical replacements done ==="
