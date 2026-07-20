# Live Engine Report — 2026-07-19

Deployed parse-brief probed via invokeBriefParserGateway (production call path).
Six fresh archetype briefs; hydrated output scored against goldens.
Raw responses: `live-engine-capture-2026-07-19.json`.

| Scenario | Checks | Provider | Version | documentId |
|---|---|---|---|---|
| D1 | 10/12 | gemini-flash | parse-brief-v2 | — |
| D2 | 9/11 | gemini-flash | parse-brief-v2 | — |
| D3 | 5/6 | groq-llama | parse-brief-v2 | — |
| F1 | 8/8 | gemini-flash | parse-brief-v2 | — |
| F2 | 5/5 | gemini-flash | parse-brief-v2 | — |
| D4 | 8/9 | groq-llama | parse-brief-v2 | — |
| F3 | 7/8 | gemini-flash | parse-brief-v2 | — |
| F4 | 6/7 | gemini-flash | parse-brief-v2 | — |
| F5 | 3/5 | groq-llama | parse-brief-v2 | — |
| F6 | 3/4 | gemini-flash | parse-brief-v2 | — |

## SUMMARY: 64/75 checks passed (85%)

## Failures

### D1
- FAIL: E2E subtotal 150000
- FAIL: E2E intra-state CGST+SGST split
### D2
- FAIL: E2E subtotal 240000
- FAIL: E2E inter-state IGST only
### D3
- FAIL: payee stays payee
### D4
- FAIL: E2E subtotal 300000
### F3
- FAIL: E2E subtotal 6000
### F4
- FAIL: E2E subtotal 3400
### F5
- FAIL: international
- FAIL: currency AED
### F6
- FAIL: explicit INR survives
