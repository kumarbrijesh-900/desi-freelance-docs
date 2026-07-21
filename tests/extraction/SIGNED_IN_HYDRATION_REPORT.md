# Signed-in Hydration Report

Offline replay of `live-engine-capture-2026-07-19.json` onto a profile-shaped
base form (payment prefilled as profileToPaymentDefaults would). Measures what
the signed-in path discards versus the guest path the live battery covers.

| Scenario | Guest hydrated | Signed-in hydrated | Signed-in preserved | Brief values LOST |
|---|---|---|---|---|
| D1 | 12 | 11 | 1 | 1 |
| D2 | 15 | 12 | 3 | 3 |
| D3 | 5 | 4 | 1 | 1 |
| F1 | 15 | 14 | 1 | 1 |
| F2 | 3 | 3 | 0 | 0 |
| D4 | 5 | 5 | 0 | 0 |
| F3 | 12 | 12 | 0 | 0 |
| F4 | 8 | 8 | 0 | 0 |
| F5 | 2 | 2 | 0 | 0 |
| F6 | 5 | 5 | 0 | 0 |

## ASSERTIONS: 1/4 passed

### D1 — 1 brief value(s) discarded
- `payment.accountName` (Beneficiary / account name) — brief said **ruhnika@okhdfcbank**, profile kept **Ruhnika Kapoor**

### D2 — 3 brief value(s) discarded
- `payment.bankName` (Bank name) — brief said **HDFC Bank**, profile kept **HDFC Bank**
- `payment.accountNumber` (Account number) — brief said **50200045671234**, profile kept **99998888777766**
- `payment.ifscCode` (IFSC code) — brief said **HDFC0001234**, profile kept **HDFC0000123**

### D3 — 1 brief value(s) discarded
- `payment.accountName` (Beneficiary / account name) — brief said **Priya Mohanty**, profile kept **Ruhnika Kapoor**

### F1 — 1 brief value(s) discarded
- `payment.bankName` (Bank name) — brief said **ICICI Bank**, profile kept **HDFC Bank**
