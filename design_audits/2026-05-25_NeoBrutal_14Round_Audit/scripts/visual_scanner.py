from playwright.sync_api import sync_playwright
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    
    # We will test a few key pages
    pages_to_test = [
        "http://localhost:3000/dashboard",
        "http://localhost:3000/projects",
        "http://localhost:3000/invoices",
        "http://localhost:3000/invoice/new"
    ]
    
    all_violations = []

    for url in pages_to_test:
        print(f"Scanning {url}...")
        try:
            page.goto(url, wait_until='networkidle', timeout=15000)
        except Exception as e:
            print(f"Failed to load {url}: {e}")
            continue
            
        # Take a screenshot for visual proof
        safe_name = url.split("/")[-1]
        if not safe_name or safe_name == "3000": safe_name = "home"
        page.screenshot(path=f'/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/{safe_name}_screenshot.png', full_page=True)

        # Inject JS to compute styles and find violations
        violations = page.evaluate("""() => {
            const elements = document.querySelectorAll('*');
            const found = [];
            
            elements.forEach(el => {
                // Ignore invisible elements or svgs/paths where radius doesn't apply the same way
                if (el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path') return;
                
                const style = window.getComputedStyle(el);
                
                let isViolation = false;
                let reasons = [];
                
                // 1. Check Border Radius (should be 0px)
                if (style.borderRadius !== '0px' && style.borderRadius !== '0%' && style.borderRadius !== '0px 0px 0px 0px') {
                    // ignore generic hidden containers or script tags
                    if (style.display !== 'none' && el.offsetWidth > 0) {
                        isViolation = true;
                        reasons.push('Radius: ' + style.borderRadius);
                    }
                }
                
                // 2. Check Soft Shadows (should be solid offset, no blur)
                if (style.boxShadow && style.boxShadow !== 'none') {
                    // simple heuristic: if it has blur radius > 0, it's soft
                    // Format is usually "rgb(x, y, z) Xpx Ypx Blurpx Spreadpx"
                    const shadowParts = style.boxShadow.split('px');
                    if (shadowParts.length >= 3) {
                         // Very rough check, just grabbing the string to analyze
                         if (style.boxShadow.includes('rgba') && !style.boxShadow.includes('0px rgba')) {
                              // If it has alpha and isn't a hard 0px blur, it's likely a soft shadow
                              // Let's just log all shadows to manually review them
                         }
                         // Let's be strict: any shadow that isn't a hard black or hard color with 0 blur
                         const blurMatch = style.boxShadow.match(/px (\\d+)px/);
                         if (blurMatch && parseInt(blurMatch[1]) > 0) {
                             isViolation = true;
                             reasons.push('Soft Shadow: ' + style.boxShadow);
                         }
                    }
                }
                
                // 3. Check Backdrop Blur
                if (style.backdropFilter && style.backdropFilter !== 'none') {
                    isViolation = true;
                    reasons.push('Backdrop Filter: ' + style.backdropFilter);
                }
                
                if (isViolation) {
                    found.push({
                        tag: el.tagName,
                        className: el.className,
                        text: (el.innerText || '').substring(0, 30).replace(/\\n/g, ' '),
                        reasons: reasons
                    });
                }
            });
            return found;
        }""")
        
        for v in violations:
            all_violations.append({
                "url": url,
                **v
            })
            
    print(json.dumps(all_violations, indent=2))
    
    # Save report
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/visual_violations.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
