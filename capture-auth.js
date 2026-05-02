const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Mobile viewport for separate captures later
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mPage = await mobile.newPage();

  // Desktop captures
  const shots = [];
  const cap = async (name) => { await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true }); shots.push(name); };

  // 1. Sign-in tab
  await page.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  await cap('10-auth-signup-default');
  const signInTab = page.getByRole('tab', { name: /sign in/i });
  if (await signInTab.count()) { await signInTab.click(); await page.waitForTimeout(400); }
  await cap('11-auth-signin');

  // 2. Magic link link if visible (look for button or link)
  const magicLink = page.getByRole('button', { name: /magic link|email.*link/i }).or(page.getByRole('link', { name: /magic link|email.*link/i }));
  if (await magicLink.count()) { await magicLink.first().click(); await page.waitForTimeout(400); await cap('12-auth-magic-link-form'); }

  // 3. Forgot password
  await page.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  if (await signInTab.count()) { await signInTab.click(); await page.waitForTimeout(300); }
  const forgot = page.getByRole('link', { name: /forgot.*password/i }).or(page.getByRole('button', { name: /forgot.*password/i }));
  if (await forgot.count()) { await forgot.first().click(); await page.waitForTimeout(800); await cap('13-auth-forgot-password'); }

  // 4. Validation error: bad email
  await page.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  if (await signInTab.count()) { await signInTab.click(); await page.waitForTimeout(300); }
  await page.locator('input[type="email"]').first().fill('not-an-email');
  await page.locator('input[type="password"]').first().fill('x');
  const signinBtn = page.getByRole('button', { name: /^sign in$/i }).or(page.getByRole('button', { name: /^log in$/i }));
  if (await signinBtn.count()) { await signinBtn.first().click(); await page.waitForTimeout(1500); await cap('14-auth-signin-validation'); }

  // 5. Network error from prod (we know /auth/signin returns 500) - signin attempt with valid-looking creds
  await page.locator('input[type="email"]').first().fill('valid@example.com');
  await page.locator('input[type="password"]').first().fill('ValidPass1!');
  if (await signinBtn.count()) { await signinBtn.first().click(); await page.waitForTimeout(4000); await cap('15-auth-signin-server-error'); }

  // 6. Mobile auth page
  await mPage.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  await mPage.screenshot({ path: 'screenshots/16-auth-mobile.png', fullPage: true });

  // 7. Mobile landing
  await mPage.goto('https://my.chidi.app/', { waitUntil: 'networkidle' });
  await mPage.screenshot({ path: 'screenshots/17-landing-mobile.png', fullPage: true });

  console.log('SHOTS:', JSON.stringify([...shots, '16-auth-mobile', '17-landing-mobile']));
  await browser.close();
})();
