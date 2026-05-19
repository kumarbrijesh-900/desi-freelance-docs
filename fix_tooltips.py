import os

for root, _, files in os.walk("components/invoice"):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            old_span = '<span className="hidden text-[11px] text-[color:var(--text-muted)] mt-1 block leading-relaxed">'
            new_span = '<span className="hidden tooltip-text block text-[11px] text-[color:var(--text-muted)] mt-1 leading-relaxed font-normal normal-case tracking-normal w-full basis-full">'
            
            if old_span in content:
                content = content.replace(old_span, new_span)
                content = content.replace('className="flex items-center gap-1.5 mb-2"', 'className="flex flex-wrap items-center gap-1.5 mb-2"')
                content = content.replace('className="flex items-center gap-1.5"', 'className="flex flex-wrap items-center gap-1.5"')
                with open(path, "w") as f:
                    f.write(content)
                print(f"Updated {path}")
