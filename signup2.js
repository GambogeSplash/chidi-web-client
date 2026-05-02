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
  page.on('console', m => { const t=m.text(); if(t.includes('AUTH')||t.includes('error')||t.includes('Error')||t.includes('signup')) console.log('CONSOLE:', t); });
  page.on('response', r => { if (r.url().includes('chidi.app') || r.url().includes('supabase')) { const u=r.url(); const s=r.status(); if (s >= 400 || u.includes('signup') || u.includes('auth')) console.log('NET:', s, u); } });

  await page.goto('https://my.chidi.app/auth', { waitUntil: 'networkidle' });
  const signUpTab = page.getByRole('tab', { name: /sign up/i });
  if (await signUpTab.count()) await signUpTab.click().catch(()=>{});
  await page.waitForTimeout(300);

  await page.getByPlaceholder(/Ciroma|Full Name|name/i).first().fill(fullName);
  await page.getByPlaceholder(/example@email\.com|email/i).first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  const submitPromise = page.waitForURL(/.*/, { timeout: 30000 }).catch(()=>null);
  await page.getByRole('button', { name: /create account/i }).click();
  // wait up to 30s for navigation OR for a verification screen
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const url = page.url();
    const bodyTxt = await page.evaluate(() => document.body.innerText).catch(()=> '');
    if (url !== 'https://my.chidi.app/auth' || /verif|check.*email|sent|confirm/i.test(bodyTxt)) {
      console.log(`SIGNAL at ${i+1}s: url=${url}`);
      break;
    }
  }
  console.log('FINAL_URL:', page.url());
  await page.screenshot({ path: 'screenshots/05-after-signup2.png', fullPage: true });
  const txt = await page.evaluate(() => document.body.innerText);
  console.log('---PAGE TEXT---');
  console.log(txt.slice(0, 2000));
  await browser.close();

  // persist creds for next steps
  require('fs').writeFileSync('test-account.json', JSON.stringify({ email, password, fullName, ts }, null, 2));
})();
