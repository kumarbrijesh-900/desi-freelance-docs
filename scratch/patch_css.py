import re

with open('app/globals.css', 'r') as f:
    content = f.read()

# Add print media query and mobile media query to the end

additions = """

/* --- Responsive Breakpoint Overrides --- */
@media (max-width: 768px) {
  :root {
    --brutal-border-width: 1px;
    --brutal-shadow-resting: 2px 2px 0 var(--brutal-border-color);
    --brutal-shadow-pressed: 1px 1px 0 var(--brutal-border-color);
  }
}

/* --- Expanded Print Styles --- */
@media print {
  @page {
    margin: 1.5cm;
    size: A4;
  }
  
  :root {
    /* Flatten shadows to subtle borders for printing */
    --brutal-border-width: 1px !important;
    --brutal-shadow-resting: none !important;
    --brutal-shadow-pressed: none !important;
    --color-lime-warm: transparent !important; /* Save ink */
  }

  body {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide all non-essential UI */
  nav, header, .sidebar, .print\\:hidden, button, [role="button"], .invoice-action-dock, .app-dropzone-surface, [aria-modal="true"] {
    display: none !important;
  }
  
  /* Ensure main content takes up full width without layout shifts */
  main, .app-layout-main {
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  
  /* Hard flattening of existing brutalist classes that might have been hardcoded */
  .shadow-\\[4px_4px_0_\\#111118\\], .shadow-\\[4px_4px_0_\\#000000\\], .shadow-\\[var\\(--brutal-shadow-resting\\)\\] {
    box-shadow: none !important;
    border: 1px solid black !important;
  }
}
"""

if "/* --- Expanded Print Styles --- */" not in content:
    content += additions

with open('app/globals.css', 'w') as f:
    f.write(content)

