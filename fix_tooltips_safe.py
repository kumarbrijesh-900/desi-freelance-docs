import os
import re

tooltip_pattern = re.compile(
    r'<button[^>]*onClick=\{\(e\)\s*=>\s*\{[^}]*classList\.toggle\("hidden"\)[^}]*\}\}[^>]*>\s*\?\s*</button>\s*<span[^>]*hidden[^>]*>(.*?)</span>',
    re.DOTALL
)

import_statement = 'import { AppTooltip } from "@/components/ui/AppTooltip";\n'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if 'classList.toggle("hidden")' not in content:
        return

    # Replace tooltips safely using \g<1> for the group
    new_content = tooltip_pattern.sub(r'<AppTooltip content={<>\g<1></>} />', content)

    if new_content != content:
        # Add import if missing
        if 'AppTooltip' not in new_content:
            # Add after first import
            import_match = re.search(r'import\s+.*?;?\n', new_content)
            if import_match:
                end_pos = import_match.end()
                new_content = new_content[:end_pos] + import_statement + new_content[end_pos:]
            else:
                new_content = import_statement + new_content

        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk("components"):
    for file in files:
        if file.endswith(".tsx"):
            process_file(os.path.join(root, file))

