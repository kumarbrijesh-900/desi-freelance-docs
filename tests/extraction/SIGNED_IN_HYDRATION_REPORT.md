# Signed-in Hydration Report

Offline replay of `live-engine-capture-2026-07-19.json` onto a profile-shaped
base form (agency + payment prefilled as profileToAgencyDetails and
profileToPaymentDefaults would). Measures what the signed-in path discards
versus the guest path the live battery covers.

BENIGN = discarded but identical after normalising case/whitespace; the conflict
card suppresses these. REAL = the card will show a row.

| Scenario | Guest hydrated | Signed-in hydrated | Discarded | Benign | REAL |
|---|---|---|---|---|---|
| D1 | 12 | 8 | 4 | 3 | **1** |
| D2 | 15 | 8 | 6 | 4 | **2** |
| D3 | 5 | 3 | 2 | 0 | **2** |
| F1 | 15 | 13 | 2 | 1 | **1** |
| F2 | 3 | 3 | 0 | 0 | **0** |
| D4 | 5 | 5 | 0 | 0 | **0** |
| F3 | 12 | 11 | 1 | 1 | **0** |
| F4 | 8 | 8 | 0 | 0 | **0** |
| F5 | 2 | 2 | 0 | 0 | **0** |
| F6 | 5 | 5 | 0 | 0 | **0** |

## CARD FORECAST: 6 row(s) across 10 scenarios — 5 payment, 1 agency
## SUPPRESSED AS BENIGN: 9
## ASSERTIONS: 1/4 passed

### D1 — 1 card row(s)
- [payment] `payment.accountName` (Beneficiary / account name) — brief said **ruhnika@okhdfcbank**, profile kept **Ruhnika Kapoor**

### D2 — 2 card row(s)
- [payment] `payment.accountNumber` (Account number) — brief said **50200045671234**, profile kept **99998888777766**
- [payment] `payment.ifscCode` (IFSC code) — brief said **HDFC0001234**, profile kept **HDFC0000123**

### D3 — 2 card row(s)
- [agency] `agency.businessName` (Agency name) — brief said **Ruhnika Designs**, profile kept **Ruhnika Creative Studio**
- [payment] `payment.accountName` (Beneficiary / account name) — brief said **Priya Mohanty**, profile kept **Ruhnika Kapoor**

### F1 — 1 card row(s)
- [payment] `payment.bankName` (Bank name) — brief said **ICICI Bank**, profile kept **HDFC Bank**
