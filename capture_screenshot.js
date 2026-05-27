const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);
  
  const artifactDir = '/Users/bkb/.gemini/antigravity-ide/brain/981671ee-6169-45ba-985c-d2b5ff4652aa';
  const screenshotPath = path.join(artifactDir, 'landing_page_screenshot.png');
  
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  await browser.close();
  console.log(`Screenshot saved to ${screenshotPath}`);
})();
