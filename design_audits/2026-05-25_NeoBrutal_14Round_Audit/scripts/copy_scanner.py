from playwright.sync_api import sync_playwright
import json
import re

def run(playwright):
    print("Initiating Round 14: Tone of Voice & Copywriting Deep Scan (Port 9222)...")
    try:
        browser = playwright.chromium.connect_over_cdp("http://localhost:9222")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
        
    context = browser.contexts[0]
    page = context.new_page()
    
    urls_to_test = [
        "https://lanceinvoice.xyz/dashboard",
        "https://lanceinvoice.xyz/projects",
        "https://lanceinvoice.xyz/invoice/new"
    ]

    all_texts = set()
    structured_copy = []

    extract_js = """(contextName) => {
        const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, a, label, span, th, td');
        const found = [];
        
        elements.forEach(el => {
            // Only get direct text content to avoid duplicating parent/child text
            let text = '';
            for (let i = 0; i < el.childNodes.length; i++) {
                if (el.childNodes[i].nodeType === Node.TEXT_NODE) {
                    text += el.childNodes[i].textContent;
                }
            }
            
            text = text.replace(/\\s+/g, ' ').trim();
            
            if (text.length > 2 && !/^[0-9\\W]+$/.test(text)) {
                // Heuristic for corporate jargon flags
                const corporateFlags = ['outstanding', 'addendum', 'milestone', 'subtotal', 'issuer', 'client', 'reference', 'revision', 'settled', 'ledger', 'tax', 'domestic', 'international', 'terms'];
                let isCorporate = false;
                corporateFlags.forEach(flag => {
                    if (text.toLowerCase().includes(flag)) isCorporate = true;
                });
                
                found.push({
                    context: contextName,
                    tag: el.tagName.toLowerCase(),
                    text: text,
                    isCorporateJargon: isCorporate
                });
            }
        });
        return found;
    }"""

    for url in urls_to_test:
        print(f"\\nNavigating to {url}...")
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(2000)
            
            context_name = url.split('/')[-1] or 'home'
            texts = page.evaluate(extract_js, context_name)
            
            for item in texts:
                # Deduplicate exact text matches to keep the report clean
                if item['text'] not in all_texts:
                    all_texts.add(item['text'])
                    structured_copy.append(item)
                    
            print(f"  Extracted {len(texts)} text nodes. Running total unique strings: {len(all_texts)}")
        except Exception as e:
            print(f"  Error scanning {url}: {e}")

    print(f"\\nCopy Scan complete. Extracted {len(structured_copy)} unique UI strings.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/copy_scan.json', 'w') as f:
        json.dump(structured_copy, f, indent=2)
        
    page.close()

with sync_playwright() as playwright:
    run(playwright)
