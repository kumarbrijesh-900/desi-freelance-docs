from playwright.sync_api import sync_playwright
import json

def run(playwright):
    print("Connecting to your existing Chrome browser on port 9222...")
    try:
        browser = playwright.chromium.connect_over_cdp("http://localhost:9222")
    except Exception as e:
        print(f"Failed to connect to your existing Chrome instance: {e}")
        print("Please ensure Chrome is running with remote debugging enabled (--remote-debugging-port=9222)")
        return
        
    # Get the default context
    context = browser.contexts[0]
    page = context.new_page()
    
    # We will test a few key pages on the live site
    pages_to_test = [
        "https://lanceinvoice.xyz/dashboard",
        "https://lanceinvoice.xyz/projects",
        "https://lanceinvoice.xyz/invoices",
        "https://lanceinvoice.xyz/invoice/new"
    ]
    
    all_violations = []

    for url in pages_to_test:
        print(f"Scanning {url} in your active browser...")
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(3000) # Give extra time for JS/animations to settle
        except Exception as e:
            print(f"Failed to load {url}: {e}")
            continue
            
        safe_name = url.split("/")[-1]
        if not safe_name or safe_name == "lanceinvoice.xyz": safe_name = "home"
        
        try:
            page.screenshot(path=f'/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/{safe_name}_cdp_screenshot.png', full_page=True)
        except Exception as e:
            print(f"Warning: could not take screenshot for {url}: {e}")

        # Inject JS to compute styles and find violations
        try:
            violations = page.evaluate("""() => {
                const elements = document.querySelectorAll('*');
                const found = [];
                
                elements.forEach(el => {
                    if (el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path') return;
                    
                    const style = window.getComputedStyle(el);
                    
                    let isViolation = false;
                    let reasons = [];
                    
                    if (style.borderRadius !== '0px' && style.borderRadius !== '0%' && style.borderRadius !== '0px 0px 0px 0px') {
                        if (style.display !== 'none' && el.offsetWidth > 0 && style.visibility !== 'hidden') {
                            isViolation = true;
                            reasons.push('Radius: ' + style.borderRadius);
                        }
                    }
                    
                    if (style.boxShadow && style.boxShadow !== 'none') {
                        const shadowParts = style.boxShadow.split('px');
                        if (shadowParts.length >= 3) {
                             const blurMatch = style.boxShadow.match(/px (\\d+)px/);
                             if (blurMatch && parseInt(blurMatch[1]) > 0) {
                                 isViolation = true;
                                 reasons.push('Soft Shadow: ' + style.boxShadow);
                             }
                        }
                    }
                    
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
        except Exception as e:
            print(f"Failed to evaluate page {url}: {e}")
            
    print(f"Scan complete. Found {len(all_violations)} violations.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/cdp_visual_violations.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    # Close ONLY the tab we opened, not their whole browser
    page.close()

with sync_playwright() as playwright:
    run(playwright)
