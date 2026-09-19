# Live Engine Report — 2026-07-19

Deployed parse-brief probed via invokeBriefParserGateway (production call path).
Six fresh archetype briefs; hydrated output scored against goldens.
Raw responses: `live-engine-capture-2026-07-19.json`.

| Scenario | Checks | Provider | Version | documentId |
|---|---|---|---|---|
| D1 | 12/12 | gemini-flash | parse-brief-v2 | — |
| D2 | 11/11 | gemini-flash | parse-brief-v2 | — |
| D3 | 6/6 | gemini-flash | parse-brief-v2 | — |
| F1 | 8/8 | gemini-flash | parse-brief-v2 | — |
| F2 | 5/5 | gemini-flash | parse-brief-v2 | — |
| D4 | 7/9 | gemini-flash | parse-brief-v2 | — |
| F3 | 8/8 | gemini-flash | parse-brief-v2 | — |
| F4 | 7/7 | gemini-flash | parse-brief-v2 | — |
| F5 | 5/5 | gemini-flash | parse-brief-v2 | — |
| F6 | 4/4 | gemini-flash | parse-brief-v2 | — |

## SUMMARY: 73/75 checks passed (97%)

## Failures

### D4
- FAIL: total 300000 as item
- FAIL: E2E subtotal 300000
