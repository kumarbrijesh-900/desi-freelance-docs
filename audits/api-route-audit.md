# API Route Audit

| Route | Has Zod | Auth-First | 401 on no auth | 400 on bad input | Status |
|---|---|---|---|---|---|
| `/api/brief-extract` | Yes | No | No | Yes | ❌ FAILING |
| `/api/invoice/request-milestone` | Yes | No | No | No | ❌ FAILING |
| `/api/invoice/[token]` | N/A | N/A | N/A | N/A | ⚪️ PUBLIC (GET) |
| `/api/msa-response` | No | N/A | N/A | N/A | ⚪️ PUBLIC (POST) |
| `/api/ping` | N/A | N/A | N/A | N/A | ⚪️ PUBLIC (GET) |

## Failing Routes Details

### 1. `/api/brief-extract`
- **File**: `app/api/brief-extract/route.ts`
- **Lines needing change**: After rate limiting, need to insert the Supabase session verification before executing AI logic. Currently missing auth completely.
- **Specifics**: 
  - Need to verify Supabase session and return 401 with `{"error": "Unauthorized"}` if no session.
  - Currently returns a 500 when unauthenticated requests cause downstream failures.

### 2. `/api/invoice/request-milestone`
- **File**: `app/api/invoice/request-milestone/route.ts`
- **Lines needing change**: 
  - `Line 24-26`: Missing `.format()` on Zod validation failure. Change to return field-level details.
  - Needs Supabase session verification inserted before fetching invoice from Admin client.
- **Specifics**:
  - Update `400` response to include `details: result.error.format()`.
  - Add auth verification to return `401`.
