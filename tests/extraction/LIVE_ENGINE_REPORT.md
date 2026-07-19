# Live Engine Report — 2026-07-19

Deployed parse-brief probed via invokeBriefParserGateway (production call path).
Six fresh archetype briefs; hydrated output scored against goldens.
Raw responses: `live-engine-capture-2026-07-19.json`.

| Scenario | Checks | Provider | Version | documentId |
|---|---|---|---|---|
| D1 | 8/9 | gemini-flash | parse-brief-v2 | — |
| D2 | 9/9 | gemini-flash | parse-brief-v2 | — |
| D3 | 6/6 | gemini-flash | parse-brief-v2 | — |
| F1 | 7/7 | gemini-flash | parse-brief-v2 | — |
| F2 | 4/4 | gemini-flash | parse-brief-v2 | — |
| D4 | 6/7 | groq-llama | parse-brief-v2 | — |

## SUMMARY: 40/42 checks passed (95%)

## Failures

### D1
- FAIL: UPI accountName
### D4
- FAIL: milestone amounts populated (120000/120000/60000)
