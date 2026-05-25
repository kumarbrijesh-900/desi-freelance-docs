from playwright.sync_api import sync_playwright
import json

def run(playwright):
    print("Initiating Round 13: WCAG, Visual Consistency & Whitespace Deep Scan (Port 9222)...")
    try:
        browser = playwright.chromium.connect_over_cdp("http://localhost:9222")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
        
    context = browser.contexts[0]
    page = context.new_page()
    
    urls_to_test = [
        "https://lanceinvoice.xyz/dashboard",
        "https://lanceinvoice.xyz/invoice/new"
    ]

    all_violations = []

    heuristics_js = """(contextName) => {
        const elements = document.querySelectorAll('*');
        const found = [];
        
        // Helper to parse rgb/rgba
        function parseColor(colorStr) {
            const m = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
            if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
            return [255, 255, 255];
        }
        
        // Relative Luminance for WCAG
        function luminance(r, g, b) {
            const a = [r, g, b].map(function (v) {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }
        
        // Contrast Ratio
        function contrastRatio(color1, color2) {
            const lum1 = luminance(...color1);
            const lum2 = luminance(...color2);
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
        }

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (['svg', 'path', 'g', 'script', 'style', 'meta', 'link', 'head', 'html', 'body'].includes(tag)) return;
            
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) return;
            
            let isViolation = false;
            let reasons = [];
            
            // 1. WCAG Contrast Check (simplified)
            if (el.innerText && el.innerText.trim().length > 0 && el.children.length === 0) {
                const fg = parseColor(style.color);
                // For bg, we might need to look up the tree, but let's assume the element has a bg or the app bg is Canvas
                let bgStr = style.backgroundColor;
                if (bgStr === 'rgba(0, 0, 0, 0)' || bgStr === 'transparent') {
                    // Fallback to Canvas or Surface
                    bgStr = 'rgb(250, 251, 252)'; 
                }
                const bg = parseColor(bgStr);
                
                const ratio = contrastRatio(fg, bg);
                // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
                const fontSize = parseFloat(style.fontSize);
                const reqRatio = fontSize >= 18 ? 3.0 : 4.5;
                
                if (ratio < reqRatio) {
                    isViolation = true;
                    reasons.push(`WCAG Contrast Violation: Ratio is ${ratio.toFixed(2)}:1 (Requires ${reqRatio}:1)`);
                }
                
                // WCAG: Missing ARIA/Labels on interactive elements
                if (['button', 'a', 'input'].includes(tag)) {
                    const hasText = el.innerText && el.innerText.trim().length > 0;
                    const hasAria = el.hasAttribute('aria-label') || el.hasAttribute('title');
                    if (!hasText && !hasAria) {
                        isViolation = true;
                        reasons.push('WCAG Accessibility Violation: Interactive element lacks readable text or ARIA label');
                    }
                }
            }
            
            // 2. Unnecessary Whitespace
            const checkExcessiveSpacing = (val, type) => {
                if (val && val !== 'auto') {
                    const pixels = parseFloat(val);
                    if (!isNaN(pixels) && pixels > 80) { // 80px+ is considered excessive dead space without specific intent
                        isViolation = true;
                        reasons.push(`Unnecessary Whitespace (${type}): ${val}`);
                    }
                }
            };
            checkExcessiveSpacing(style.paddingTop, 'padding-top');
            checkExcessiveSpacing(style.paddingBottom, 'padding-bottom');
            checkExcessiveSpacing(style.marginTop, 'margin-top');
            checkExcessiveSpacing(style.marginBottom, 'margin-bottom');
            
            // Empty space elements
            if (el.children.length === 0 && (!el.innerText || el.innerText.trim() === '') && !['input', 'img', 'hr', 'br'].includes(tag)) {
                if (el.offsetHeight > 40 || el.offsetWidth > 100) {
                    if (style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderStyle === 'none' && style.backgroundImage === 'none') {
                        isViolation = true;
                        reasons.push(`Dead Spacer Element: Unnecessary empty space block (${el.offsetWidth}x${el.offsetHeight}px)`);
                    }
                }
            }
            
            // 3. Visual Inconsistency (Font size outliers, line height traps)
            const fontSize = parseFloat(style.fontSize);
            // Non-standard font sizes
            if (!isNaN(fontSize) && [11, 13, 15, 17, 19, 21, 23].includes(fontSize)) {
                isViolation = true;
                reasons.push(`Visual Inconsistency: Non-standard font size (${fontSize}px) breaks typographical scale`);
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

    for url in urls_to_test:
        print(f"\\nNavigating to {url}...")
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(2000)
            
            context_name = f"WCAG_{url.split('/')[-1] or 'home'}"
            violations = page.evaluate(heuristics_js, context_name)
            
            all_violations.extend(violations)
            print(f"  Found {len(violations)} WCAG/Consistency violations.")
        except Exception as e:
            print(f"  Error scanning {url}: {e}")

    print(f"\\nDeep Scan complete. Found {len(all_violations)} total violations.")
    
    with open('/Users/bkb/.gemini/antigravity-ide/brain/d50b46cf-9f1f-4d39-b731-91138f9befbc/scratch/wcag_spacing_violations.json', 'w') as f:
        json.dump(all_violations, f, indent=2)
        
    page.close()

with sync_playwright() as playwright:
    run(playwright)
