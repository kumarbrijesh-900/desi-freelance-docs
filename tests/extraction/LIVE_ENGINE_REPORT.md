# Live Engine Report — 2026-07-19

Deployed parse-brief probed via invokeBriefParserGateway (production call path).
Six fresh archetype briefs; hydrated output scored against goldens.
Raw responses: `live-engine-capture-2026-07-19.json`.

| Scenario | Checks | Provider | Version | documentId |
|---|---|---|---|---|
| D1 | 12/12 | groq-llama | parse-brief-v2 | — |
| D2 | 11/11 | groq-llama | parse-brief-v2 | — |
| D3 | 6/6 | gemini-flash | parse-brief-v2 | — |
| F1 | 8/8 | groq-llama | parse-brief-v2 | — |
| F2 | 4/5 | groq-llama | parse-brief-v2 | — |
| D4 | 7/9 | gemini-flash | parse-brief-v2 | — |
| F3 | 8/8 | groq-llama | parse-brief-v2 | — |
| F4 | 7/7 | groq-llama | parse-brief-v2 | — |
| F5 | 4/5 | groq-llama | parse-brief-v2 | — |
| F6 | 4/4 | groq-llama | parse-brief-v2 | — |

## SUMMARY: 71/75 checks passed (95%)

## Failures

### F2
- FAIL: settlement forex
### D4
- FAIL: total 300000 as item
- FAIL: E2E subtotal 300000
### F5
- FAIL: currency AED
