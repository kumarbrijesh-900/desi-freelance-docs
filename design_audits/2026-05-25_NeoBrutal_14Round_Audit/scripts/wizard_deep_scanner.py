from playwright.sync_api import sync_playwright
import json
import time

def run(playwright):
    print("Initiating HYPER-DEEP Wizard Scan over CDP (Port 9222)...")
    try:
        browser = playwright.chromium.connect_over_cdp("http://localhost:9222")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
        
    context = browser.contexts[0]
    page = context.new_page()
    
    url = "https://lanceinvoice.xyz/invoice/new"
    all_violations = []

    heuristics_js = """(stepName) => {
        const elements = document.querySelectorAll('*');
        const found = [];
        
        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (['svg', 'path', 'g', 'script', 'style', 'meta', 'link', 'head', 'html', 'body'].includes(tag)) return;
            
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) return;
            
            let isViolation = false;
            let reasons = [];
            
            // 1. Strict Radius Check
            if (style.borderRadius !== '0px' && style.borderRadius !== '0%' && style.borderRadius !== '0px 0px 0px 0px') {
                isViolation = true;
                reasons.push('Soft Radius: ' + style.borderRadius);
            }
            
            // 2. Strict Shadow Check
            if (style.boxShadow && style.boxShadow !== 'none') {
                const shadowMatches = style.boxShadow.match(/px (\\d+)px/);
                if (shadowMatches && parseInt(shadowMatches[1]) > 0) {
                    isViolation = true;
                    reasons.push('Soft Shadow Blur: ' + style.boxShadow);
                }
            }
            
            // 3. Border Thickness Check
            if (style.borderWidth !== '0px' && style.borderStyle !== 'none') {
                if (['button', 'input', 'select', 'textarea'].includes(tag) || el.classList.contains('cursor-pointer')) {
                    if (style.borderTopWidth === '1px' || style.borderBottomWidth === '1px') {
                        isViolation = true;
                        reasons.push('Weak Border (1px instead of 2px)');
                    }
                }
            }
            
            // 4. Backdrop Blur
            if (style.backdropFilter && style.backdropFilter !== 'none') {
                isViolation = true;
                reasons.push('Backdrop Blur: ' + style.backdropFilter);
            }
            
            // 5. Glows
            if (style.backgroundImage && style.backgroundImage.includes('radial-gradient') && style.backgroundImage.includes('transparent')) {
                isViolation = true;
                reasons.push('Radial Glow');
            }
            
            if (isViolation) {
                found.push({
                    step: stepName,
                    tag: el.tagName,
                    className: el.className,
                    text: (el.innerText || '').substring(0, 40).replace(/\\n/g, ' '),
                    reasons: reasons
                });
            }
        });
        return found;
    }"""

    print(f"\\n--- Deep Scanning Wizard: {url} ---")
    try:
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(3000)
    except Exception as e:
        print(f"Failed to load {url}")
        page.close()
        return

    def scan_current_state(step_name):
        print(f"  Scanning DOM state: {step_name}...")
        try:
            page.screenshot(path=f'/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/wizard_{step_name}.png', full_page=True)
            violations = page.evaluate(heuristics_js, step_name)
            all_violations.extend(violations)
            print(f"    Found {len(violations)} violations in this state.")
        except Exception as e:
            print(f"    Failed to scan state {step_name}: {e}")

    # 1. Base Scan of Step 1
    scan_current_state("Step_1_Initial")
    
    # 2. Iterate through all Step Rail items to mount different sections of the wizard
    try:
        step_buttons = page.locator('button.invoice-step-rail-item').all()
        print(f"Found {len(step_buttons)} wizard steps to navigate.")
        
        for i, btn in enumerate(step_buttons):
            if i == 0: continue # Already on step 1
            print(f"  Clicking Wizard Step {i+1}...")
            btn.scroll_into_view_if_needed()
            btn.click()
            page.wait_for_timeout(2000) # Wait for section to expand/mount
            scan_current_state(f"Step_{i+1}_Expanded")
    except Exception as e:
        print(f"Error navigating steps: {e}")

    # 3. Find and click "Add Item" or "Add Milestone" buttons to trigger dynamic sub-forms
    try:
        add_buttons = page.locator('button:has-text("ADD ITEM"), button:has-text("ADD MILESTONE"), button:has-text("+")').all()
        print(f"Found {len(add_buttons)} dynamic addition buttons.")
        for i, btn in enumerate(add_buttons[:3]): # Limit to 3 to avoid infinite loops
            if btn.is_visible():
                print(f"  Clicking dynamic button {i+1}...")
                btn.scroll_into_view_if_needed()
                btn.click()
                page.wait_for_timeout(1500)
                scan_current_state(f"Dynamic_Subform_Opened_{i+1}")
    except Exception as e:
        pass

    # 4. Trigger tooltips / popovers by clicking the "?" info buttons
    try:
        info_buttons = page.locator('button:has-text("?")').all()
        if info_buttons:
            print(f"  Triggering Tooltip...")
            info_buttons[0].scroll_into_view_if_needed()
            info_buttons[0].hover()
            page.wait_for_timeout(1000)
            scan_current_state("Tooltip_Hovered")
    except Exception:
        pass

    print(f"\\nWizard Deep Scan complete. Found {len(all_violations)} total violation events across all wizard steps.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/wizard_deep_violations.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    page.close()

with sync_playwright() as playwright:
    run(playwright)
