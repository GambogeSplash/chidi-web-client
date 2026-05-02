const { chromium } = require('playwright');
(async () => {
  const ts = Date.now();
  const email = `john.wnyingifa+chiditest${ts}@gmail.com`;
  const password = `ChidiTest${ts}!`;
  const fullName = 'Chidi Critique Tester';
  console.log('EMAIL:', email);
  console.log('PASSWORD:', password);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => console.log('PAGE_CONSOLE:', m.type(), m.text()));

  await page.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  // Make sure Sign Up tab is active
  const signUpTab = page.getByRole('tab', { name: /sign up/i });
  if (await signUpTab.count()) await signUpTab.click().catch(()=>{});
  await page.waitForTimeout(300);

  await page.getByPlaceholder(/Ciroma|Full Name|name/i).first().fill(fullName);
  await page.getByPlaceholder(/example@email\.com|email/i).first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.screenshot({ path: 'screenshots/03-signup-filled.png', fullPage: true });

  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForTimeout(5000);
  console.log('AFTER_SUBMIT_URL:', page.url());
  await page.screenshot({ path: 'screenshots/04-after-signup.png', fullPage: true });

  await browser.close();
})();
