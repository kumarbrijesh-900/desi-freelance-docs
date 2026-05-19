import os

for root, _, files in os.walk("components/invoice"):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            old_span = 'className="hidden tooltip-text block text-[11px] text-[color:var(--text-muted)] mt-1 leading-relaxed font-normal normal-case tracking-normal w-full basis-full"'
            new_span = 'className="hidden sm:group-hover:!block tooltip-text block text-[11px] text-[color:var(--text-muted)] mt-1 leading-relaxed font-normal normal-case tracking-normal w-full basis-full"'
            
            if old_span in content:
                content = content.replace(old_span, new_span)
                
                # Add 'group' to parents
                content = content.replace('className="flex flex-wrap items-center gap-1.5 mb-2"', 'className="flex flex-wrap items-center gap-1.5 mb-2 group"')
                content = content.replace('className="flex flex-wrap items-center gap-1.5 mb-1.5"', 'className="flex flex-wrap items-center gap-1.5 mb-1.5 group"')
                content = content.replace('className="flex flex-wrap items-center gap-1.5"', 'className="flex flex-wrap items-center gap-1.5 group"')
                
                with open(path, "w") as f:
                    f.write(content)
                print(f"Updated hover states in {path}")
