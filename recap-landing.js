const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://my.chidi.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200); // let 1400ms-delayed animations finish
  await page.screenshot({ path: 'screenshots/70-landing-full-anim.png', fullPage: true });

  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mp = await m.newPage();
  await mp.goto('https://my.chidi.app/', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(2200);
  await mp.screenshot({ path: 'screenshots/71-landing-mobile-full-anim.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
