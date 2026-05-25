from playwright.sync_api import sync_playwright
import json
import time

def run(playwright):
    print("Initiating DEEP Visual Scan over CDP (Port 9222)...")
    try:
        browser = playwright.chromium.connect_over_cdp("http://localhost:9222")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
        
    context = browser.contexts[0]
    page = context.new_page()
    
    # Extended list of pages to test
    pages_to_test = [
        "https://lanceinvoice.xyz/dashboard",
        "https://lanceinvoice.xyz/projects",
        "https://lanceinvoice.xyz/invoices",
        "https://lanceinvoice.xyz/invoice/new",
        "https://lanceinvoice.xyz/clients",
        "https://lanceinvoice.xyz/faq",
        "https://lanceinvoice.xyz/profile"
    ]
    
    all_violations = []

    # Our deep heuristics JS engine
    heuristics_js = """() => {
        const elements = document.querySelectorAll('*');
        const found = [];
        
        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (['svg', 'path', 'g', 'script', 'style', 'meta', 'link', 'head', 'html'].includes(tag)) return;
            
            const style = window.getComputedStyle(el);
            // Skip hidden elements
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) return;
            
            let isViolation = false;
            let reasons = [];
            
            // 1. Strict Radius Check
            if (style.borderRadius !== '0px' && style.borderRadius !== '0%' && style.borderRadius !== '0px 0px 0px 0px') {
                isViolation = true;
                reasons.push('Soft Radius: ' + style.borderRadius);
            }
            
            // 2. Strict Shadow Check (Must be offset, no blur, no spread unless specific)
            if (style.boxShadow && style.boxShadow !== 'none') {
                // Regex to find the blur radius (3rd length value in standard box-shadow)
                // e.g. rgb(17, 17, 24) 2px 2px 0px 0px -> matches 0px
                const shadowMatches = style.boxShadow.match(/px (\\d+)px/);
                if (shadowMatches && parseInt(shadowMatches[1]) > 0) {
                    isViolation = true;
                    reasons.push('Soft Shadow Blur: ' + style.boxShadow);
                } else if (style.boxShadow.includes('rgba') && !style.boxShadow.includes('0px rgba')) {
                    // Transparent shadows are generally a warning flag
                    reasons.push('Transparent/Soft Shadow: ' + style.boxShadow);
                }
            }
            
            // 3. Border Thickness Check (Must be 2px if it exists, or 0)
            if (style.borderWidth !== '0px' && style.borderStyle !== 'none') {
                // We allow 2px and 0px. Sometimes 1px is okay for subtle dividers but in neo-brutal it's usually 2px.
                // Let's flag 1px borders on interactive elements.
                if (['button', 'input', 'select', 'textarea'].includes(tag) || el.classList.contains('cursor-pointer')) {
                    if (style.borderTopWidth === '1px' || style.borderBottomWidth === '1px') {
                        isViolation = true;
                        reasons.push('Weak Border (1px instead of 2px) on interactive element');
                    }
                }
            }
            
            // 4. Backdrop Blur
            if (style.backdropFilter && style.backdropFilter !== 'none') {
                isViolation = true;
                reasons.push('Forbidden Backdrop Blur: ' + style.backdropFilter);
            }
            
            // 5. Background Gradients (No soft glows)
            if (style.backgroundImage && style.backgroundImage.includes('radial-gradient')) {
                if (style.backgroundImage.includes('transparent')) {
                    isViolation = true;
                    reasons.push('Atmospheric Radial Glow detected');
                }
            }
            
            // 6. Generic Grays (Warning)
            // Tailwind grays like rgb(243, 244, 246) or rgb(229, 231, 235) instead of pure white/black or theme colors
            if (style.backgroundColor === 'rgb(243, 244, 246)' || style.backgroundColor === 'rgb(229, 231, 235)') {
                isViolation = true;
                reasons.push('Generic Tailwind Gray background instead of system token');
            }
            
            if (isViolation || reasons.length > 0) {
                found.push({
                    tag: el.tagName,
                    className: el.className,
                    id: el.id || '',
                    text: (el.innerText || '').substring(0, 40).replace(/\\n/g, ' '),
                    reasons: reasons,
                    rect: el.getBoundingClientRect()
                });
            }
        });
        return found;
    }"""

    for url in pages_to_test:
        print(f"\\n--- Deep Scanning {url} ---")
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(3000) # Give extra time for JS/animations to settle
        except Exception as e:
            print(f"Skipping {url} (Load failed: {e})")
            continue
            
        safe_name = url.split("/")[-1]
        if not safe_name or safe_name == "lanceinvoice.xyz": safe_name = "home"
        
        # 1. Base Scan
        print("  Running Base Heuristics...")
        base_violations = page.evaluate(heuristics_js)
        for v in base_violations:
            all_violations.append({"url": url, "state": "base", **v})
            
        # 2. Interactive Scan: Hover all buttons
        print("  Running Interactive Scan (Hover states)...")
        buttons = page.locator('button').all()
        for i, btn in enumerate(buttons[:10]): # Limit to first 10 buttons to save time
            try:
                if btn.is_visible():
                    btn.hover(timeout=1000)
                    page.wait_for_timeout(200) # wait for transition
                    # Run heuristics just on this element to catch hover state changes
                    hover_styles = btn.evaluate("""el => {
                        const style = window.getComputedStyle(el);
                        return {
                            shadow: style.boxShadow,
                            bg: style.backgroundColor,
                            border: style.borderWidth
                        };
                    }""")
                    if hover_styles['shadow'] != 'none' and 'px' in hover_styles['shadow']:
                         # Just log the hover shadow for review
                         all_violations.append({
                             "url": url, "state": "hover",
                             "tag": "BUTTON", "text": btn.inner_text()[:30],
                             "reasons": [f"Hover Shadow triggered: {hover_styles['shadow']}"]
                         })
            except Exception:
                pass
                
        # 3. Interactive Scan: Inputs and Forms
        print("  Running Interactive Scan (Focus states)...")
        inputs = page.locator('input').all()
        for i, inp in enumerate(inputs[:5]):
            try:
                if inp.is_visible():
                    inp.focus(timeout=1000)
                    page.wait_for_timeout(200)
                    focus_styles = inp.evaluate("""el => {
                        const style = window.getComputedStyle(el);
                        return { shadow: style.boxShadow, radius: style.borderRadius };
                    }""")
                    if focus_styles['shadow'] != 'none' and 'px' in focus_styles['shadow']:
                        all_violations.append({
                             "url": url, "state": "focus",
                             "tag": "INPUT", "text": "Form Input",
                             "reasons": [f"Focus Ring/Shadow triggered: {focus_styles['shadow']}"]
                        })
            except Exception:
                pass

        # Take screenshot of the page after interactions
        try:
            page.screenshot(path=f'/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/{safe_name}_deepscan_screenshot.png', full_page=True)
        except Exception as e:
            pass

    print(f"\\nDeep Scan complete. Found {len(all_violations)} total violation events across all states.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/deep_cdp_visual_violations.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    page.close()

with sync_playwright() as playwright:
    run(playwright)
