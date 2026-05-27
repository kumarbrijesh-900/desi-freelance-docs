import os

modals = [
    "components/invoice/BriefSummaryModal.tsx",
    "components/invoice/ConversionModal.tsx",
    "components/invoice/DownloadDecisionModal.tsx",
    "components/invoice/SettlementModal.tsx",
    "components/invoice/ShareLinkModal.tsx",
    "components/invoice/InvoiceEditorPage.tsx" # specifically line 3287
]

def patch_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Generic replace for <motion.div className="fixed inset-0...
    # or <div className="fixed inset-0...
    
    if "BriefSummaryModal.tsx" in filepath:
        content = content.replace(
            '<motion.div\n        initial={{ opacity: 0 }}\n        animate={{ opacity: 1 }}\n        exit={{ opacity: 0 }}\n        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"\n        onClick={(e) => {\n          if (e.target === e.currentTarget) onCancel();\n        }}\n      >',
            '<motion.div\n        role="dialog"\n        aria-modal="true"\n        aria-labelledby="brief-summary-modal-title"\n        initial={{ opacity: 0 }}\n        animate={{ opacity: 1 }}\n        exit={{ opacity: 0 }}\n        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"\n        onClick={(e) => {\n          if (e.target === e.currentTarget) onCancel();\n        }}\n      >'
        )
    elif "ConversionModal.tsx" in filepath:
        content = content.replace(
            '<div className="fixed inset-0 z-[200] flex items-center justify-center p-4">',
            '<div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="conversion-modal-title">'
        )
    elif "DownloadDecisionModal.tsx" in filepath:
        content = content.replace(
            'className="fixed inset-0 z-[70] flex items-center justify-center p-4"\n      onClick={(e) => {',
            'className="fixed inset-0 z-[70] flex items-center justify-center p-4"\n      role="dialog"\n      aria-modal="true"\n      aria-labelledby="download-modal-title"\n      onClick={(e) => {'
        )
    elif "SettlementModal.tsx" in filepath:
        content = content.replace(
            '<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">',
            '<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="settlement-modal-title">'
        )
    elif "ShareLinkModal.tsx" in filepath:
        content = content.replace(
            '<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">',
            '<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-labelledby="share-link-modal-title">'
        )
        content = content.replace(
            'className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"\n      onClick={(e) => {',
            'className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"\n      role="dialog"\n      aria-modal="true"\n      aria-labelledby="share-link-modal-title"\n      onClick={(e) => {'
        )
    elif "InvoiceEditorPage.tsx" in filepath:
        content = content.replace(
            'className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"\n          onClick={(e) => {',
            'className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"\n          role="dialog"\n          aria-modal="true"\n          aria-labelledby="exit-modal-title"\n          onClick={(e) => {'
        )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Patched {filepath}")

for modal in modals:
    patch_file(modal)

