const { chromium } = require('playwright');
const path = require('path');

const routes = [
  { name: 'home', path: '/' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'invoices', path: '/invoices' },
  { name: 'clients', path: '/clients' },
  { name: 'invoice_new', path: '/invoice/new' },
  { name: 'invoice_id', path: '/invoice/preview' }
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  
  const artifactDir = '/Users/bkb/.gemini/antigravity-ide/brain/981671ee-6169-45ba-985c-d2b5ff4652aa';

  // Wait for the dev server to be ready
  for (const route of routes) {
    console.log(`Taking screenshot of ${route.name}...`);
    await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(4000);
    const screenshotPath = path.join(artifactDir, `screenshot_${route.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved to ${screenshotPath}`);
  }
  
  await browser.close();
})();
