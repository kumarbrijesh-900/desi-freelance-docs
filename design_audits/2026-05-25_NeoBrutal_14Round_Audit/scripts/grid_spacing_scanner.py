from playwright.sync_api import sync_playwright
import json

def run(playwright):
    print("Initiating Grid & Spacing Deep Scan across Breakpoints (Port 9222)...")
    try:
        browser = playwright.chromium.connect_over_cdp("http://localhost:9222")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
        
    context = browser.contexts[0]
    
    # We create a new page for resizing so we don't disrupt their exact current view dimensions too badly
    page = context.new_page()
    
    urls_to_test = [
        "https://lanceinvoice.xyz/dashboard",
        "https://lanceinvoice.xyz/projects",
        "https://lanceinvoice.xyz/invoice/new"
    ]
    
    breakpoints = [
        {"name": "Mobile", "width": 375, "height": 812},
        {"name": "Tablet", "width": 768, "height": 1024},
        {"name": "Desktop", "width": 1280, "height": 800}
    ]

    all_violations = []

    heuristics_js = """(contextName) => {
        const elements = document.querySelectorAll('*');
        const found = [];
        
        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (['svg', 'path', 'g', 'script', 'style', 'meta', 'link', 'head', 'html', 'body'].includes(tag)) return;
            
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) return;
            
            let isViolation = false;
            let reasons = [];
            
            // 1. Grid/Flex Consistency (Gestalt Proximity)
            if (style.display === 'grid' || style.display === 'flex') {
                const gap = style.gap;
                if (gap === 'normal' || gap === '0px') {
                    // It might be okay, but if it has multiple children, lack of gap can violate Gestalt Proximity
                    if (el.children.length > 1 && !['ul', 'ol', 'tr', 'table', 'tbody'].includes(tag)) {
                        // Check if children have margins to compensate. If not, it's a cramped layout
                        const childStyle = window.getComputedStyle(el.children[0]);
                        if (childStyle.margin === '0px' && childStyle.padding === '0px') {
                            isViolation = true;
                            reasons.push('Gestalt Violation: Cramped Flex/Grid without Gap or Margin');
                        }
                    }
                }
            }
            
            // 2. Padding/Margin "Magic Numbers" (CRAP Principle - Alignment/Consistency)
            // Neo-Brutalism requires stark, mathematical consistency (usually 4px, 8px, 16px, 24px, 32px)
            const checkSpacing = (val, type) => {
                if (val && val !== '0px' && val !== 'auto' && val !== 'none') {
                    const pixels = parseFloat(val);
                    if (!isNaN(pixels) && pixels > 0) {
                        // If it's not a multiple of 4, or it's a weird decimal
                        if (pixels % 4 !== 0 && pixels % 4 !== 2 && !Number.isInteger(pixels)) {
                            isViolation = true;
                            reasons.push(`Inconsistent Spacing (${type}): ${val} - Violates Mathematical Grid`);
                        }
                    }
                }
            };
            checkSpacing(style.paddingTop, 'Padding Top');
            checkSpacing(style.paddingLeft, 'Padding Left');
            checkSpacing(style.marginTop, 'Margin Top');
            checkSpacing(style.marginLeft, 'Margin Left');
            
            // 3. Container Overflows (Responsive Layout Breaks)
            if (el.scrollWidth > el.clientWidth && style.overflow !== 'hidden' && style.overflow !== 'auto' && style.overflowX !== 'auto') {
                isViolation = true;
                reasons.push(`Grid Break: Element Overflows Container (scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth})`);
            }
            
            if (isViolation) {
                found.push({
                    context: contextName,
                    tag: el.tagName,
                    className: el.className,
                    text: (el.innerText || '').substring(0, 30).replace(/\\n/g, ' '),
                    reasons: reasons
                });
            }
        });
        return found;
    }"""

    for bp in breakpoints:
        print(f"\\nSetting Viewport to {bp['name']} ({bp['width']}x{bp['height']})...")
        page.set_viewport_size({"width": bp["width"], "height": bp["height"]})
        
        for url in urls_to_test:
            print(f"  Navigating to {url}...")
            try:
                page.goto(url, wait_until='networkidle', timeout=30000)
                page.wait_for_timeout(2000)
                
                context_name = f"{bp['name']}_{url.split('/')[-1] or 'home'}"
                violations = page.evaluate(heuristics_js, context_name)
                
                # Take a screenshot for evidence
                page.screenshot(path=f'/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/layout_{context_name}.png', full_page=True)
                
                all_violations.extend(violations)
                print(f"    Found {len(violations)} layout/spacing violations.")
            except Exception as e:
                print(f"    Error scanning {url}: {e}")

    print(f"\\nGrid & Spacing Deep Scan complete. Found {len(all_violations)} total layout violations.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/grid_spacing_violations.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    page.close()

with sync_playwright() as playwright:
    run(playwright)
