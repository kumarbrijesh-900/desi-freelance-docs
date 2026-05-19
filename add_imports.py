import os
import re

files = [
    "components/invoice/AgencyDetailsSection.tsx",
    "components/invoice/InvoiceMetaSection.tsx",
    "components/invoice/EditorContent.tsx",
    "components/invoice/InvoiceEditorPage.tsx",
    "components/invoice/TermsPaymentSection.tsx",
    "components/invoice/ClientDetailsSection.tsx",
    "components/invoice/DeliverablesSection.tsx",
    "components/invoice/TotalsTaxesSection.tsx"
]

import_statement = 'import { AppTooltip } from "@/components/ui/AppTooltip";\n'

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    if 'import { AppTooltip }' not in content:
        import_match = re.search(r'import\s+.*?;?\n', content)
        if import_match:
            end_pos = import_match.end()
            new_content = content[:end_pos] + import_statement + content[end_pos:]
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Added import to {filepath}")

