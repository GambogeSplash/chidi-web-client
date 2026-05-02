const { chromium } = require('playwright');
const fs = require('fs');

// ---------- Fixtures ----------
const BUSINESS_SLUG = 'lagos-glow';
const INVENTORY_ID = 'inv_demo_001';
const BUSINESS_ID = 'biz_demo_001';
const USER_ID = 'usr_demo_001';
const WORKSPACE_ID = 'ws_demo_001';

const userMe = {
  user: {
    id: USER_ID,
    email: 'demo@chidi.app',
    name: 'Adaeze Okonkwo',
    businessId: BUSINESS_ID,
    businessName: 'Lagos Glow',
    businessSlug: BUSINESS_SLUG,
    phone: '+2348012345678',
    category: 'fashion',
    createdAt: '2025-12-01T10:00:00Z',
    profile: {
      business_category: 'fashion',
      description: 'Lagos-based fashion & beauty boutique',
      phone: '+2348012345678',
      whatsapp_number: '+2348012345678',
      instagram: '@lagosglow',
      address_line1: '12 Awolowo Rd',
      city: 'Lagos',
      country: 'Nigeria',
    },
    email_verified: true,
  },
  business_id: BUSINESS_ID,
  workspace_id: WORKSPACE_ID,
  inventory_id: INVENTORY_ID,
  businessName: 'Lagos Glow',
  businessSlug: BUSINESS_SLUG,
};

const product = (id, overrides) => ({
  id,
  inventory_id: INVENTORY_ID,
  sku: `SKU-${id}`,
  name: 'Unnamed',
  description: 'Sample product description used in the demo dataset.',
  category: 'fashion',
  brand: 'House Brand',
  tags: ['new', 'popular'],
  cost_price: 5000,
  selling_price: 12000,
  stock_quantity: 12,
  reserved_quantity: 0,
  low_stock_threshold: 5,
  status: 'active',
  is_featured: false,
  is_digital: false,
  has_variants: false,
  image_urls: [],
  attributes: {},
  metadata: {},
  created_at: '2026-04-01T08:00:00Z',
  updated_at: '2026-04-20T10:00:00Z',
  ...overrides,
});

const products = [
  product('p1', { name: 'Ankara Wrap Dress', category: 'fashion', brand: 'Afrique Couture', selling_price: 18500, cost_price: 9000, stock_quantity: 24, image_urls: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400'] }),
  product('p2', { name: 'JBL Tune 510BT Headphones', category: 'electronics', brand: 'JBL', selling_price: 32000, cost_price: 22000, stock_quantity: 4, low_stock_threshold: 5, image_urls: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400'] }),
  product('p3', { name: 'The Ordinary Niacinamide 10%', category: 'beauty', brand: 'The Ordinary', selling_price: 8500, cost_price: 5200, stock_quantity: 0, image_urls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400'] }),
  product('p4', { name: 'Nike Air Max 270', category: 'fashion', brand: 'Nike', selling_price: 95000, cost_price: 65000, stock_quantity: 7, image_urls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'] }),
  product('p5', { name: 'Shea Butter Body Lotion 250ml', category: 'beauty', brand: 'House Brand', selling_price: 4500, cost_price: 1800, stock_quantity: 38, image_urls: ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400'] }),
  product('p6', { name: 'Wireless Fast Charger 20W', category: 'electronics', brand: 'House Brand', selling_price: 11500, cost_price: 6000, stock_quantity: 18, image_urls: ['https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400'] }),
];

const conversations = [
  { id: 'c1', connection_id: 'conn1', customer_id: '+2348091112233', customer_name: 'Ifeoma Eze', status: 'open', last_activity: new Date(Date.now()-1000*60*4).toISOString(), context_expires_at: new Date(Date.now()+1000*60*60*23).toISOString(), last_intent: 'PURCHASE_INTENT', unread_count: 2, channel_type: 'WHATSAPP', created_at: '2026-04-26T10:00:00Z', updated_at: new Date().toISOString() },
  { id: 'c2', connection_id: 'conn1', customer_id: '+2348091116655', customer_name: 'Tunde Bakare', status: 'open', last_activity: new Date(Date.now()-1000*60*22).toISOString(), context_expires_at: new Date(Date.now()+1000*60*60*22).toISOString(), last_intent: 'QUESTION', unread_count: 0, channel_type: 'WHATSAPP', created_at: '2026-04-25T10:00:00Z', updated_at: new Date().toISOString() },
  { id: 'c3', connection_id: 'conn1', customer_id: '+2348091119988', customer_name: 'Chiamaka Obi', status: 'needs_human', last_activity: new Date(Date.now()-1000*60*60*2).toISOString(), context_expires_at: new Date(Date.now()+1000*60*60*1).toISOString(), last_intent: 'COMPLAINT', unread_count: 1, channel_type: 'WHATSAPP', created_at: '2026-04-24T10:00:00Z', updated_at: new Date().toISOString() },
  { id: 'c4', connection_id: 'conn1', customer_id: '+2348091114477', customer_name: 'Femi Adeyemi', status: 'resolved', last_activity: new Date(Date.now()-1000*60*60*6).toISOString(), context_expires_at: new Date(Date.now()-1000*60*60*1).toISOString(), unread_count: 0, channel_type: 'WHATSAPP', created_at: '2026-04-23T10:00:00Z', updated_at: new Date().toISOString() },
];

const messagesFor = (cid) => ({
  conversation: conversations.find(c => c.id === cid) || conversations[0],
  total: 4,
  messages: [
    { id: 'm1', conversation_id: cid, direction: 'INBOUND', sender_type: 'CUSTOMER', content: 'Hi, do you still have the Ankara wrap dress in size 12?', delivered: true, read: true, created_at: new Date(Date.now()-1000*60*30).toISOString(), updated_at: new Date().toISOString() },
    { id: 'm2', conversation_id: cid, direction: 'OUTBOUND', sender_type: 'AI', content: "Yes! We have the Ankara wrap dress in stock. It's ₦18,500. Would you like me to reserve one for you?", delivered: true, read: true, created_at: new Date(Date.now()-1000*60*29).toISOString(), updated_at: new Date().toISOString() },
    { id: 'm3', conversation_id: cid, direction: 'INBOUND', sender_type: 'CUSTOMER', content: 'Yes please. Can you deliver to Lekki Phase 1?', delivered: true, read: true, created_at: new Date(Date.now()-1000*60*8).toISOString(), updated_at: new Date().toISOString() },
    { id: 'm4', conversation_id: cid, direction: 'OUTBOUND', sender_type: 'AI', content: 'Lekki Phase 1 delivery is ₦2,500 (same-day if you order before 2pm). Want me to confirm the order?', delivered: true, read: false, created_at: new Date(Date.now()-1000*60*4).toISOString(), updated_at: new Date().toISOString() },
  ],
});

const orders = [
  { id: 'o1', order_number: 'ORD-2026-0142', customer_name: 'Ifeoma Eze', customer_phone: '+2348091112233', status: 'pending_verification', total_amount: 21000, currency: 'NGN', items: [{ product_name: 'Ankara Wrap Dress', quantity: 1, unit_price: 18500 }], delivery_address: 'Lekki Phase 1, Lagos', created_at: new Date(Date.now()-1000*60*15).toISOString() },
  { id: 'o2', order_number: 'ORD-2026-0141', customer_name: 'Tunde Bakare', customer_phone: '+2348091116655', status: 'paid', total_amount: 32000, currency: 'NGN', items: [{ product_name: 'JBL Tune 510BT Headphones', quantity: 1, unit_price: 32000 }], delivery_address: 'Yaba, Lagos', created_at: new Date(Date.now()-1000*60*60*4).toISOString() },
  { id: 'o3', order_number: 'ORD-2026-0140', customer_name: 'Chiamaka Obi', customer_phone: '+2348091119988', status: 'fulfilled', total_amount: 13000, currency: 'NGN', items: [{ product_name: 'Shea Butter Body Lotion 250ml', quantity: 2, unit_price: 4500 }, { product_name: 'Wireless Fast Charger 20W', quantity: 1, unit_price: 11500 }], delivery_address: 'Surulere, Lagos', created_at: new Date(Date.now()-1000*60*60*30).toISOString() },
  { id: 'o4', order_number: 'ORD-2026-0139', customer_name: 'Femi Adeyemi', customer_phone: '+2348091114477', status: 'cancelled', total_amount: 95000, currency: 'NGN', items: [{ product_name: 'Nike Air Max 270', quantity: 1, unit_price: 95000 }], delivery_address: 'Ikoyi, Lagos', created_at: new Date(Date.now()-1000*60*60*48).toISOString() },
];

const notifications = [
  { id: 'n1', user_id: USER_ID, business_id: BUSINESS_ID, type: 'NEW_ORDER', title: 'New order needs verification', body: 'Ifeoma Eze placed an order for ₦21,000.', is_read: false, created_at: new Date(Date.now()-1000*60*15).toISOString() },
  { id: 'n2', user_id: USER_ID, business_id: BUSINESS_ID, type: 'LOW_STOCK', title: 'Low stock: JBL Tune 510BT', body: 'Only 4 units left (threshold 5).', is_read: false, created_at: new Date(Date.now()-1000*60*60*2).toISOString() },
  { id: 'n3', user_id: USER_ID, business_id: BUSINESS_ID, type: 'CUSTOMER_REPLY', title: 'New customer reply', body: 'Chiamaka Obi sent a new message.', is_read: true, created_at: new Date(Date.now()-1000*60*60*5).toISOString() },
];

const channelConnections = {
  total: 1,
  connections: [
    {
      id: 'conn1',
      business_id: BUSINESS_ID,
      channel_type: 'WHATSAPP',
      channel_identifier: '+2348012345678',
      credentials: {},
      status: 'CONNECTED',
      ai_enabled: true,
      after_hours_only: false,
      context_timeout_hours: 24,
      platform_metadata: { display_name: 'Lagos Glow WhatsApp' },
      connected_at: '2026-03-12T08:00:00Z',
      last_message_at: new Date(Date.now()-1000*60*4).toISOString(),
      created_at: '2026-03-12T08:00:00Z',
      updated_at: new Date().toISOString(),
    },
  ],
};

// ---------- Mock route handler ----------
const installMocks = async (page) => {
  await page.route(/.*/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const u = new URL(url);
    const path = u.pathname;
    const isApi = u.host.includes('localhost:8000') || path.startsWith('/api/') || path.startsWith('/auth/');

    if (!isApi) return route.continue();

    let body = {};
    if (path === '/auth/me') body = userMe;
    else if (path.match(/\/api\/inventory\/.+\/products$/)) body = products;
    else if (path.match(/\/api\/inventory\/.+\/products\/.+/)) body = products[0];
    else if (path === '/api/messaging/connections') body = channelConnections;
    else if (path.match(/\/api\/messaging\/connections\/.+\/status/)) body = { connected: true, channel_type: 'WHATSAPP', display_name: 'Lagos Glow WhatsApp', status: 'connected', is_active: true, last_message_at: new Date().toISOString() };
    else if (path === '/api/messaging/conversations') body = { conversations, total: conversations.length, needs_human_count: 1 };
    else if (path.match(/\/api\/messaging\/conversations\/[^\/]+$/)) body = conversations[0];
    else if (path.match(/\/api\/messaging\/conversations\/[^\/]+\/messages/)) {
      const cid = path.split('/')[4];
      body = messagesFor(cid);
    }
    else if (path === '/api/orders' || path.match(/\/api\/orders$/)) body = { orders, total: orders.length };
    else if (path.match(/\/api\/orders\/.+/)) body = orders[0];
    else if (path === '/api/notifications') body = notifications;
    else if (path === '/api/notifications/count') body = { unread_count: 2, total_count: notifications.length };
    else if (path.match(/\/api\/business\/[^\/]+\/profile/)) body = userMe.user.profile;
    else if (path.match(/\/api\/business\/[^\/]+\/policies$/)) body = { policies: [] };
    else if (path === '/api/whatsapp/setup-status') body = { connected: true, configured: true };
    else if (path === '/api/whatsapp/provider-config') body = { provider: 'meta', verified: true };
    else if (path === '/api/settings/account') body = { full_name: userMe.user.name, email: userMe.user.email, phone: userMe.user.phone, language: 'en', timezone: 'Africa/Lagos' };
    else if (path === '/api/settings/security') body = { mfa_enabled: false, last_login_at: new Date().toISOString(), active_sessions: 1 };
    else if (path === '/auth/refresh') body = { access_token: 'fake', refresh_token: 'fake', token_type: 'bearer', expires_in: 3600 };
    else body = method === 'GET' ? [] : { ok: true };

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
};

const SHOTS = [];
const cap = async (page, name) => {
  await page.waitForTimeout(800); // let layout settle
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  SHOTS.push(name);
  console.log('SHOT', name);
};

const closeAnyModal = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"], [data-state="open"]').forEach(el => {
      try { el.remove(); } catch(e){}
    });
    document.querySelectorAll('.bg-black\\/40, .backdrop-blur-sm').forEach(el => {
      const p = el.closest('div.fixed');
      if (p) try { p.remove(); } catch(e){}
    });
  });
  await page.waitForTimeout(200);
};

const step = async (label, fn) => {
  try { await fn(); }
  catch (e) { console.log(`STEP_FAIL ${label}: ${e.message.split('\n')[0]}`); }
};

(async () => {
  const browser = await chromium.launch();

  // ============== DESKTOP ==============
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([
    { name: 'chidi_logged_in', value: 'true', domain: 'localhost', path: '/' },
    { name: 'chidi_access_token', value: 'fake-jwt-token', domain: 'localhost', path: '/' },
  ]);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE_ERROR:', e.message));
  page.on('console', m => { const t = m.text(); if (/error|Error|fail/i.test(t) && !/console|warn|deprecation/i.test(t)) console.log('PG:', t.slice(0, 200)); });
  await installMocks(page);

  // Seed localStorage so productsAPI finds the inventory id
  await page.goto('http://localhost:3003/');
  await page.evaluate((data) => {
    localStorage.setItem('chidi_inventory_id', data.inventoryId);
    localStorage.setItem('chidi_business_id', data.businessId);
  }, { inventoryId: INVENTORY_ID, businessId: BUSINESS_ID });

  const DASH = `http://localhost:3003/dashboard/${BUSINESS_SLUG}`;
  const goDash = async () => { await page.goto(DASH, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2200); };
  const clickTab = async (label) => {
    await goDash();
    const tab = page.locator(`button:has-text("${label}")`).first();
    if (await tab.count()) await tab.click();
    await page.waitForTimeout(1500);
  };

  // 1. Landing & onboarding
  await step('landing', async () => { await page.goto('http://localhost:3003/', { waitUntil: 'domcontentloaded' }); await cap(page, '30-landing-local'); });
  await step('onboarding', async () => { await page.goto('http://localhost:3003/onboarding', { waitUntil: 'domcontentloaded' }); await cap(page, '31-onboarding'); });

  // 2. Inbox (default)
  await step('inbox-default', async () => { await goDash(); await cap(page, '40-dashboard-inbox'); });
  await step('inbox-conversation', async () => {
    await goDash();
    const convoItem = page.locator('text=Ifeoma Eze').first();
    if (await convoItem.count()) { await convoItem.click(); await page.waitForTimeout(1200); await cap(page, '41-inbox-conversation-open'); }
  });

  // 3. Inventory
  await step('inventory', async () => { await clickTab('Inventory'); await cap(page, '42-inventory'); });
  await step('add-product-modal', async () => {
    await clickTab('Inventory');
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("Add product"), button:has-text("New product")').first();
    if (await addBtn.count()) { await addBtn.click(); await page.waitForTimeout(800); await cap(page, '43-add-product-modal'); }
  });
  await step('product-detail', async () => {
    await clickTab('Inventory');
    const card = page.locator('text=Ankara Wrap Dress').first();
    if (await card.count()) { await card.click(); await page.waitForTimeout(800); await cap(page, '44-product-detail'); }
  });
  await step('bulk-import', async () => {
    await clickTab('Inventory');
    const importBtn = page.locator('button:has-text("Import"), button:has-text("Bulk")').first();
    if (await importBtn.count()) { await importBtn.click(); await page.waitForTimeout(800); await cap(page, '45-bulk-import'); }
  });

  // 4. Orders
  await step('orders', async () => { await clickTab('Orders'); await cap(page, '46-orders'); });
  await step('order-detail', async () => {
    await clickTab('Orders');
    const firstOrder = page.locator('text=ORD-2026-0142').first();
    if (await firstOrder.count()) { await firstOrder.click({ trial: false }); await page.waitForTimeout(800); await cap(page, '47-order-detail'); }
  });

  // 5. Copilot, Insights, Chidi (whatever the 5th tab is)
  await step('copilot', async () => { await clickTab('Copilot'); await cap(page, '48-copilot'); });
  await step('insights', async () => { await clickTab('Insights'); await cap(page, '49-insights'); });
  await step('chidi-tab', async () => { await clickTab('Chidi'); await cap(page, '50-chidi-tab'); });

  // 6. Notifications dropdown
  await step('notifications', async () => {
    await goDash();
    const bell = page.locator('button:has(svg.lucide-bell), button[aria-label*="otification"], header button:has(.lucide)').first();
    if (await bell.count()) { await bell.click(); await page.waitForTimeout(600); await cap(page, '51-notifications'); }
  });

  // 7. Settings & WhatsApp pages
  await step('settings', async () => { await page.goto(`${DASH}/settings`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); await cap(page, '52-settings'); });
  await step('whatsapp', async () => { await page.goto(`${DASH}/whatsapp`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); await cap(page, '53-whatsapp-settings'); });

  await ctx.close();

  // ============== MOBILE ==============
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
  await m.addCookies([
    { name: 'chidi_logged_in', value: 'true', domain: 'localhost', path: '/' },
    { name: 'chidi_access_token', value: 'fake-jwt-token', domain: 'localhost', path: '/' },
  ]);
  const mp = await m.newPage();
  await installMocks(mp);
  await mp.goto('http://localhost:3003/');
  await mp.evaluate((data) => {
    localStorage.setItem('chidi_inventory_id', data.inventoryId);
    localStorage.setItem('chidi_business_id', data.businessId);
  }, { inventoryId: INVENTORY_ID, businessId: BUSINESS_ID });

  const MDASH = `http://localhost:3003/dashboard/${BUSINESS_SLUG}`;
  const mGo = async () => { await mp.goto(MDASH, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(2200); };
  const mTab = async (label) => {
    await mGo();
    const t = mp.locator(`button:has-text("${label}")`).first();
    if (await t.count()) await t.click();
    await mp.waitForTimeout(1200);
  };

  await step('m-inbox', async () => { await mGo(); await cap(mp, '60-mobile-inbox'); });
  await step('m-inbox-convo', async () => {
    await mGo();
    const c = mp.locator('text=Ifeoma Eze').first();
    if (await c.count()) { await c.click(); await mp.waitForTimeout(1000); await cap(mp, '61-mobile-conversation'); }
  });
  await step('m-inventory', async () => { await mTab('Inventory'); await cap(mp, '62-mobile-inventory'); });
  await step('m-orders', async () => { await mTab('Orders'); await cap(mp, '63-mobile-orders'); });
  await step('m-copilot', async () => { await mTab('Copilot'); await cap(mp, '64-mobile-copilot'); });
  await step('m-insights', async () => { await mTab('Insights'); await cap(mp, '65-mobile-insights'); });
  await step('m-chidi', async () => { await mTab('Chidi'); await cap(mp, '66-mobile-chidi-tab'); });
  await step('m-settings', async () => { await mp.goto(`${MDASH}/settings`, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(1500); await cap(mp, '67-mobile-settings'); });

  console.log('---DONE---');
  console.log('SHOTS:', JSON.stringify(SHOTS));
  fs.writeFileSync('shot-list.json', JSON.stringify(SHOTS));
  await browser.close();
})();
