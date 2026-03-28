# DesiFreelanceDocs - Integration Map

## ROOT
- app
- components
- lib
- types
- public

## APP ROUTES
app/layout.tsx
- KEEP

app/page.tsx
- REPLACE

app/create/page.tsx
- MERGE

app/api/extract/route.ts
- CREATE

app/actions/checkout.ts
- CREATE

## COMPONENTS - FLOW
components/flow/CreateDocumentWizard.tsx
- MERGE

components/flow/LicensingStep.tsx
- CREATE

components/flow/Paywall.tsx
- CREATE

components/flow/ReviewStep.tsx
- CREATE

components/flow/ProjectPresetStep.tsx
- CREATE

components/flow/BriefInputStep.tsx
- CREATE

## COMPONENTS - DOCUMENT TEMPLATES
components/documents/InvoiceTemplate.tsx
- CREATE

components/documents/ScopeTemplate.tsx
- CREATE

## COMPONENTS - UI
components/ui/button.tsx
- KEEP

components/ui/input.tsx
- KEEP

components/ui/label.tsx
- KEEP

components/ui/textarea.tsx
- KEEP

## LIB - SUPABASE / SERVICES
lib/supabase/client.ts
- CREATE

lib/supabase/server.ts
- CREATE

lib/gemini/extract.ts
- CREATE

lib/licensing/summary.ts
- CREATE

lib/utils.ts
- KEEP

## TYPES
types/document.ts
- CREATE

types/licensing.ts
- CREATE

types/database.ts
- CREATE

## CORE DATA FLOW
1. User opens app
2. User goes to create page
3. User selects project preset
4. User types or speaks raw brief
5. Voice input fills textarea where supported
6. Magic Fill sends brief to extraction API
7. API returns structured data
8. User reviews and edits extracted data
9. User completes licensing step
10. Free tier limit is checked
11. If limit reached, show Paywall
12. If allowed, save document
13. Generate invoice and scope templates
14. User downloads or continues

## SAVE DOCUMENT FIELDS
documents table should save:
- user_id
- project_type
- raw_brief
- extracted_data
- licensing_data
- is_watermarked
- created_at

## IMPORTANT NOTES
- Do not add dashboard history yet
- Do not add extra features yet
- Build only the integration path for:
  - auth / Google login
  - dashboard
  - CreateDocumentWizard
  - voice input
  - AI extraction
  - licensing step
  - free tier gating / paywall
  - saveDocument logic