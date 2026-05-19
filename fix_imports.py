import os

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

    # Remove the bad injection
    content = content.replace('import {\n' + import_statement, 'import {\n')
    content = content.replace(import_statement, '')

    # Prepend properly after 'use client'; if it exists
    if content.startswith('"use client";'):
        content = content.replace('"use client";\n', '"use client";\n' + import_statement, 1)
    elif content.startswith("'use client';"):
        content = content.replace("'use client';\n", "'use client';\n" + import_statement, 1)
    else:
        content = import_statement + content

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed {filepath}")

