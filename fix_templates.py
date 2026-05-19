import os

replacements = {
    "classic.tsx": (
        '<p className="text-[16px] font-bold">{data.invoiceNumber}</p>\n            </div>',
        '<p className="text-[16px] font-bold">{data.invoiceNumber}</p>\n            </div>\n            {data.poNumber && (\n              <div className="mt-3">\n                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8A08E] mb-1">PO Number</p>\n                <p className="text-[14px] font-bold">{data.poNumber}</p>\n              </div>\n            )}'
    ),
    "brutalist.tsx": (
        '<p className="text-[13px] font-bold mt-1">{data.invoiceNumber}</p>\n          </div>',
        '<p className="text-[13px] font-bold mt-1">{data.invoiceNumber}</p>\n            {data.poNumber && <><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40 mt-2">PO</p><p className="text-[13px] font-bold mt-1">{data.poNumber}</p></>}\n          </div>'
    ),
    "sakura.tsx": (
        '<p className="text-[20px] font-bold tracking-tight">{data.invoiceNumber}</p>\n        </div>',
        '<p className="text-[20px] font-bold tracking-tight">{data.invoiceNumber}</p>\n        </div>\n        {data.poNumber && (\n          <div>\n            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B28A8A] mb-1">PO Number</p>\n            <p className="text-[16px] font-bold tracking-tight">{data.poNumber}</p>\n          </div>\n        )}'
    ),
    "coastal.tsx": (
        '<p className="text-[18px] font-bold">{data.invoiceNumber}</p>\n          </div>',
        '<p className="text-[18px] font-bold">{data.invoiceNumber}</p>\n          </div>\n          {data.poNumber && (\n            <div>\n              <p className="text-[10px] font-bold uppercase tracking-widest text-[#66A1B2] mb-1">PO Number</p>\n              <p className="text-[16px] font-bold">{data.poNumber}</p>\n            </div>\n          )}'
    ),
    "ledger.tsx": (
        '<p className="text-[18px] font-bold mt-2">{data.invoiceNumber}</p>\n        </div>',
        '<p className="text-[18px] font-bold mt-2">{data.invoiceNumber}</p>\n          {data.poNumber && <><p className="text-[10px] font-bold uppercase tracking-widest text-[#111118]/50 mt-4">PO Number</p><p className="text-[16px] font-bold mt-1">{data.poNumber}</p></>}\n        </div>'
    ),
    "mono.tsx": (
        '<p className="text-[20px] font-bold text-green-400 mt-1">{data.invoiceNumber}</p>\n          </div>',
        '<p className="text-[20px] font-bold text-green-400 mt-1">{data.invoiceNumber}</p>\n          </div>\n          {data.poNumber && (\n            <div>\n              <p className="text-[10px] uppercase tracking-widest text-gray-500">PO Number</p>\n              <p className="text-[16px] font-bold text-green-400 mt-1">{data.poNumber}</p>\n            </div>\n          )}'
    ),
    "editorial.tsx": (
        '              <span className="text-[10px] uppercase tracking-widest font-bold border-b border-[#111118] pb-1 w-full block mb-2">Invoice</span>\n              {data.invoiceNumber}\n            </div>',
        '              <span className="text-[10px] uppercase tracking-widest font-bold border-b border-[#111118] pb-1 w-full block mb-2">Invoice</span>\n              {data.invoiceNumber}\n            </div>\n            {data.poNumber && (\n              <div>\n                <span className="text-[10px] uppercase tracking-widest font-bold border-b border-[#111118] pb-1 w-full block mb-2">PO</span>\n                {data.poNumber}\n              </div>\n            )}'
    ),
    "swiss-grid.tsx": (
        '              <span className="text-[10px] font-bold uppercase text-[#111118]/40 block mb-1">Invoice</span>\n              {data.invoiceNumber}\n            </div>',
        '              <span className="text-[10px] font-bold uppercase text-[#111118]/40 block mb-1">Invoice</span>\n              {data.invoiceNumber}\n            </div>\n            {data.poNumber && (\n              <div>\n                <span className="text-[10px] font-bold uppercase text-[#111118]/40 block mb-1">PO</span>\n                {data.poNumber}\n              </div>\n            )}'
    ),
    "neon-atelier.tsx": (
        '              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block mb-2 border-b-2 border-[#111118] pb-1">Invoice</span>\n              {data.invoiceNumber}\n            </div>',
        '              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block mb-2 border-b-2 border-[#111118] pb-1">Invoice</span>\n              {data.invoiceNumber}\n            </div>\n            {data.poNumber && (\n              <div>\n                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block mb-2 border-b-2 border-[#111118] pb-1">PO</span>\n                {data.poNumber}\n              </div>\n            )}'
    ),
    "midnight.tsx": (
        '              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Invoice No.</span>\n              {data.invoiceNumber}\n            </div>',
        '              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">Invoice No.</span>\n              {data.invoiceNumber}\n            </div>\n            {data.poNumber && (\n              <div>\n                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1">PO No.</span>\n                {data.poNumber}\n              </div>\n            )}'
    ),
    "terracotta.tsx": (
        '              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 block mb-1 border-b border-[#8B4513]/20 pb-1">Invoice</span>\n              {data.invoiceNumber}\n            </div>',
        '              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 block mb-1 border-b border-[#8B4513]/20 pb-1">Invoice</span>\n              {data.invoiceNumber}\n            </div>\n            {data.poNumber && (\n              <div>\n                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 block mb-1 border-b border-[#8B4513]/20 pb-1">PO</span>\n                {data.poNumber}\n              </div>\n            )}'
    )
}

for root, _, files in os.walk("lib/templates"):
    for file in files:
        if file in replacements:
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            old_str, new_str = replacements[file]
            if old_str in content:
                content = content.replace(old_str, new_str)
                with open(path, "w") as f:
                    f.write(content)
                print(f"Updated {file}")
            else:
                print(f"Failed to find match in {file}")

