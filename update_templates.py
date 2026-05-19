import os
import re

replacements = {
    "sakura.tsx": (
        r'(<p className="text-\[20px\] font-bold tracking-tight">\{data\.invoiceNumber\}</p>)',
        r'\1\n          {data.poNumber && <><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E11D48] mb-1 mt-3">PO Number</p><p className="text-[16px] font-bold tracking-tight">{data.poNumber}</p></>}'
    ),
    "coastal.tsx": (
        r'(<p className="text-\[18px\] font-bold">\{data\.invoiceNumber\}</p>)',
        r'\1\n            {data.poNumber && <><p className="text-[11px] font-bold uppercase tracking-[0.15em] mt-3">PO Number</p><p className="text-[16px] font-bold">{data.poNumber}</p></>}'
    ),
    "ledger.tsx": (
        r'(<p className="text-\[18px\] font-bold mt-2">\{data\.invoiceNumber\}</p>)',
        r'\1\n        {data.poNumber && <><p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8B7355] mt-4">PO Number</p><p className="text-[16px] font-bold mt-1">{data.poNumber}</p></>}'
    ),
    "mono.tsx": (
        r'(<p className="text-\[20px\] font-bold text-green-400 mt-1">\{data\.invoiceNumber\}</p>)',
        r'\1\n            {data.poNumber && <><p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest mt-3">PO Number</p><p className="text-[16px] font-bold text-green-400 mt-1">{data.poNumber}</p></>}'
    ),
    "editorial.tsx": (
        r'(\{data\.invoiceNumber\}\n\s*</p>)',
        r'\1\n            {data.poNumber && <><p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#999]">PO Number</p><p className="font-[\'Georgia\',_serif] text-[24px] text-[#27272F]">{data.poNumber}</p></>}'
    ),
    "swiss-grid.tsx": (
        r'(\{data\.invoiceNumber\}\n\s*</p>)',
        r'\1\n          {data.poNumber && <><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1D3557]/60 mt-3">PO Number</p><p className="text-[16px] font-bold tracking-tight text-[#1D3557]">{data.poNumber}</p></>}'
    ),
    "neon-atelier.tsx": (
        r'(\{data\.invoiceNumber\}\n\s*</div>)',
        r'\1\n            {data.poNumber && <><span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block mb-2 border-b-2 border-[#111118] pb-1 mt-6">PO Number</span><div className="font-outfit text-[16px] font-bold tracking-wider">{data.poNumber}</div></>}'
    ),
    "midnight.tsx": (
        r'(\{data\.invoiceNumber\}\n\s*</p>)',
        r'\1\n            {data.poNumber && <><p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#F0F0F5]/50 print:text-[#888]">PO Number</p><p className="text-[18px] font-bold text-[#F0F0F5] print:text-[#111]">{data.poNumber}</p></>}'
    ),
    "terracotta.tsx": (
        r'(\{data\.invoiceNumber\}\n\s*</p>)',
        r'\1\n            {data.poNumber && <><p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 print:text-[#888]">PO Number</p><p className="text-[18px] font-bold text-[#3D2517]">{data.poNumber}</p></>}'
    )
}

for root, _, files in os.walk("lib/templates"):
    for file in files:
        if file in replacements:
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            pattern, repl = replacements[file]
            new_content = re.sub(pattern, repl, content)
            
            if new_content != content:
                with open(path, "w") as f:
                    f.write(new_content)
                print(f"Updated {file}")
            else:
                print(f"Failed to match in {file}")

