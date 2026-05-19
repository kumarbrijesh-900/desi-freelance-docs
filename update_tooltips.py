import os
import re

pattern = re.compile(r'<span[^>]*?className="[^"]*?cursor-help[^"]*?"[^>]*?title="([^"]+)"[^>]*?>\s*\?\s*</span>', re.DOTALL)

def replacement(match):
    text = match.group(1)
    return f'''<button
  type="button"
  onClick={{(e) => {{
    e.preventDefault();
    const el = e.currentTarget.nextElementSibling;
    if (el) el.classList.toggle("hidden");
  }}}}
  className="inline-flex h-4 w-4 items-center justify-center border border-[color:var(--border-subtle)] text-[9px] text-[color:var(--text-muted)] cursor-help shrink-0"
>?</button>
<span className="hidden text-[11px] text-[color:var(--text-muted)] mt-1 block leading-relaxed">
  {text}
</span>'''

for root, _, files in os.walk("components/invoice"):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            new_content = pattern.sub(replacement, content)
            if new_content != content:
                with open(path, "w") as f:
                    f.write(new_content)
                print(f"Updated {path}")
