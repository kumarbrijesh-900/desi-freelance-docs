from playwright.sync_api import sync_playwright
import json
import time
import os

def run(playwright):
    print("Launching headed browser...")
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    
    print("Navigating to https://lanceinvoice.xyz...")
    page.goto("https://lanceinvoice.xyz", wait_until='networkidle')
    
    # Try to bring Chromium to the front on macOS
    print("Attempting to bring browser to the foreground...")
    os.system('''osascript -e 'tell application "System Events" to set frontmost of every process whose name contains "Chromium" to true' ''')
    # Fallback to Chrome if Chromium name doesn't match
    os.system('''osascript -e 'tell application "System Events" to set frontmost of every process whose name contains "Google Chrome" to true' ''')
    
    print("\\n" + "="*50)
    print("IMPORTANT: A browser window should have opened. If you don't see it, check your dock for a 'Chromium' icon!")
    print("Please complete the sign-in process in that window.")
    print("Waiting up to 180 seconds for you to log in and reach the Dashboard...")
    print("="*50 + "\\n")
    
    try:
        page.wait_for_url("**/dashboard**", timeout=180000)
        print("Login detected! Proceeding with deep visual scan.")
    except Exception as e:
        print("Timeout waiting for login or dashboard. Proceeding anyway...")
    
    pages_to_test = [
        "https://lanceinvoice.xyz/dashboard",
        "https://lanceinvoice.xyz/projects",
        "https://lanceinvoice.xyz/invoices",
        "https://lanceinvoice.xyz/invoice/new"
    ]
    
    all_violations = []

    for url in pages_to_test:
        print(f"Scanning {url}...")
        try:
            page.goto(url, wait_until='networkidle', timeout=15000)
            page.wait_for_timeout(3000) # Give extra time for JS/animations to settle
        except Exception as e:
            print(f"Failed to load {url}: {e}")
            continue
            
        safe_name = url.split("/")[-1]
        if not safe_name or safe_name == "lanceinvoice.xyz": safe_name = "home"
        page.screenshot(path=f'/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/{safe_name}_live_screenshot_auth.png', full_page=True)

        # Inject JS to compute styles and find violations
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
            
    print(f"Scan complete. Found {len(all_violations)} violations.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/live_visual_violations_auth.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
