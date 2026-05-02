const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://my.chidi.app/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshots/01-landing.png', fullPage: true });
  console.log('LANDING_URL:', page.url());
  console.log('LANDING_TITLE:', await page.title());
  await page.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshots/02-auth.png', fullPage: true });
  console.log('AUTH_URL:', page.url());
  console.log('AUTH_HTML_BYTES:', (await page.content()).length);
  await browser.close();
})();
