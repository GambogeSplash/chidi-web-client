/**
 * Mock data router — when dev-bypass auth is active and the API at
 * localhost:8000 isn't running, intercept apiClient.request and return
 * realistic Lagos-merchant data so the dashboard actually shows what the
 * product looks like in use.
 *
 * Returns null for endpoints we don't mock; the API client then falls
 * through to the real fetch (which will fail gracefully and show empty
 * states — also fine).
 */

import { isDevBypassActive } from "./dev-bypass"

// =============================================================================
// Catalog of merchant data — feels real, won't change between page loads
// =============================================================================

const NOW = Date.now()
const ONE_HOUR = 60 * 60 * 1000
const ONE_DAY = 24 * ONE_HOUR

const isoMinusHours = (h: number) => new Date(NOW - h * ONE_HOUR).toISOString()
const isoMinusDays = (d: number) => new Date(NOW - d * ONE_DAY).toISOString()

// ---- Products (Lagos fashion + electronics shop) -----------------------------

// Real Pexels CDN URLs — all verified 200 OK + free for commercial use without
// attribution. Sized 400x400 cropped to feel like product shots.
const px = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`

const PRODUCTS = [
  { id: "p-1", name: "Red Adidas Sneakers, Size 42", category: "sneakers", cost: 12000, sell: 18000, stock: 4, reorder: 5, image: px("31688982"), sku: "BFS-SNK-0001" },
  { id: "p-2", name: "Matte Lipstick Set (5 colors)", category: "beauty", cost: 4200, sell: 7500, stock: 22, reorder: 8, image: px("7256082"), sku: "BFS-BTY-0002" },
  { id: "p-3", name: "African Wax Print Fabric (per yard)", category: "fabric", cost: 1800, sell: 3200, stock: 38, reorder: 12, image: px("8655018"), sku: "BFS-FAB-0003" },
  { id: "p-4", name: "iPhone 14 Clear Case", category: "accessories", cost: 1500, sell: 4500, stock: 0, reorder: 6, image: px("7360460"), sku: "BFS-ACC-0004" },
  { id: "p-5", name: "Headwrap, Ankara assorted", category: "fashion", cost: 1200, sell: 3500, stock: 14, reorder: 6, image: px("8559848"), sku: "BFS-FSH-0005" },
  { id: "p-6", name: "Bluetooth Earbuds (Pro)", category: "electronics", cost: 8500, sell: 18500, stock: 7, reorder: 4, image: px("33298188"), sku: "BFS-ELC-0006" },
  { id: "p-7", name: "Shea Butter, 250g jar", category: "beauty", cost: 1500, sell: 3800, stock: 18, reorder: 8, image: px("11284698"), sku: "BFS-BTY-0007" },
  { id: "p-8", name: "Kente Tote Bag", category: "fashion", cost: 3500, sell: 9500, stock: 6, reorder: 4, image: px("9393350"), sku: "BFS-FSH-0008" },
  { id: "p-9", name: "Powerbank 20000mAh", category: "electronics", cost: 6800, sell: 14500, stock: 11, reorder: 5, image: px("3921718"), sku: "BFS-ELC-0009" },
  { id: "p-10", name: "Lagos Tee, White Unisex", category: "fashion", cost: 2800, sell: 6500, stock: 3, reorder: 6, image: px("12025472"), sku: "BFS-FSH-0010" },
  { id: "p-11", name: "Hair Bonnet, Silk-feel", category: "beauty", cost: 800, sell: 2500, stock: 26, reorder: 10, image: px("7897135"), sku: "BFS-BTY-0011" },
  { id: "p-12", name: "Beaded Necklace, Coral", category: "fashion", cost: 2200, sell: 5800, stock: 9, reorder: 5, image: px("33539866"), sku: "BFS-FSH-0012" },
  { id: "p-13", name: "Ankara Two-Piece Set, Size M", category: "fashion", cost: 5500, sell: 14500, stock: 5, reorder: 4, image: px("8475594"), sku: "BFS-FSH-0013" },
  { id: "p-14", name: "Black Wireless Mouse", category: "electronics", cost: 2200, sell: 5500, stock: 16, reorder: 6, image: px("4498151"), sku: "BFS-ELC-0014" },
  { id: "p-15", name: "Body Lotion, Cocoa & Honey", category: "beauty", cost: 2400, sell: 5800, stock: 12, reorder: 6, image: px("4202926"), sku: "BFS-BTY-0015" },
  { id: "p-16", name: "Aso-Oke Gele, Royal Blue", category: "fashion", cost: 4800, sell: 11500, stock: 8, reorder: 4, image: px("7691125"), sku: "BFS-FSH-0016" },
  { id: "p-17", name: "USB-C Fast Charger 25W", category: "electronics", cost: 1800, sell: 4800, stock: 1, reorder: 8, image: px("4071882"), sku: "BFS-ELC-0017" },
  { id: "p-18", name: "Gold Hoop Earrings, Pair", category: "fashion", cost: 1400, sell: 4200, stock: 19, reorder: 6, image: px("9428825"), sku: "BFS-FSH-0018" },
  { id: "p-19", name: "Adire Fabric Bundle (3 yards)", category: "fabric", cost: 4500, sell: 9800, stock: 11, reorder: 4, image: px("6760143"), sku: "BFS-FAB-0019" },
  { id: "p-20", name: "Nike Air Force, Size 41", category: "sneakers", cost: 28000, sell: 42000, stock: 2, reorder: 3, image: px("19090/pexels-photo"), sku: "BFS-SNK-0020" },
  { id: "p-21", name: "Eyelash Set, Mink Style", category: "beauty", cost: 600, sell: 1800, stock: 34, reorder: 12, image: px("4750247"), sku: "BFS-BTY-0021" },
  { id: "p-22", name: "Beach Tote, Raffia", category: "fashion", cost: 3200, sell: 8500, stock: 7, reorder: 4, image: px("7679720"), sku: "BFS-FSH-0022" },
  { id: "p-23", name: "Phone Tripod Stand", category: "electronics", cost: 2600, sell: 6500, stock: 13, reorder: 5, image: px("5081397"), sku: "BFS-ELC-0023" },
  { id: "p-24", name: "Black Soap Bar, 100g", category: "beauty", cost: 450, sell: 1500, stock: 42, reorder: 15, image: px("6621335"), sku: "BFS-BTY-0024" },
  { id: "p-25", name: "Crochet Crop Top, One Size", category: "fashion", cost: 2900, sell: 7800, stock: 0, reorder: 5, image: px("8533218"), sku: "BFS-FSH-0025" },
]

const toBackendProduct = (p: typeof PRODUCTS[number]) => ({
  id: p.id,
  inventory_id: "dev-inventory",
  sku: p.sku,
  name: p.name,
  description: undefined,
  category: p.category,
  subcategory: undefined,
  brand: undefined,
  tags: [],
  cost_price: p.cost,
  selling_price: p.sell,
  discount_price: undefined,
  stock_quantity: p.stock,
  reserved_quantity: 0,
  low_stock_threshold: p.reorder,
  max_stock_level: undefined,
  status: p.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
  is_featured: false,
  is_digital: false,
  has_variants: false,
  weight: undefined,
  image_urls: p.image ? [p.image] : [],
  barcode: undefined,
  supplier_info: undefined,
  attributes: undefined,
  metadata: undefined,
  created_at: isoMinusDays(30),
  updated_at: isoMinusDays(2),
  last_restocked: isoMinusDays(5),
})

// ---- Customers + conversations ----------------------------------------------

const CUSTOMERS = [
  { name: "Adaeze Okafor", id: "+2348012345678", channel: "WHATSAPP" as const },
  { name: "Tunde Bakare", id: "+2348023456789", channel: "WHATSAPP" as const },
  { name: "Ifeoma Eze", id: "+2348034567890", channel: "WHATSAPP" as const },
  { name: "Kemi Adebayo", id: "+2348045678901", channel: "WHATSAPP" as const },
  { name: "Olumide Sanusi", id: "+2348056789012", channel: "WHATSAPP" as const },
  { name: "Chinwe Nwosu", id: "+2348067890123", channel: "TELEGRAM" as const },
  { name: "Wanjiru Mwangi", id: "+254712345678", channel: "WHATSAPP" as const },
  { name: "Kwame Boateng", id: "+233245678901", channel: "WHATSAPP" as const },
  { name: "Funke Adesanya", id: "+2348078901234", channel: "WHATSAPP" as const },
  { name: "Emeka Obi", id: "+2348089012345", channel: "WHATSAPP" as const },
  { name: "Aisha Mohammed", id: "+2348090123456", channel: "WHATSAPP" as const },
  { name: "Bola Tinubu-Lewis", id: "+2348101234567", channel: "WHATSAPP" as const },
  { name: "Ngozi Iweala", id: "+2348112345678", channel: "TELEGRAM" as const },
  { name: "Yemi Aluko", id: "+2348123456789", channel: "WHATSAPP" as const },
  { name: "Hassan Sule", id: "+2348134567890", channel: "WHATSAPP" as const },
  { name: "Blessing Okoro", id: "+2348145678901", channel: "WHATSAPP" as const },
  { name: "Damilola Owolabi", id: "+2348156789012", channel: "WHATSAPP" as const },
  { name: "Samuel Eto'o-Jr", id: "+237677123456", channel: "WHATSAPP" as const },
  { name: "Patience Jonathan", id: "+2348167890123", channel: "WHATSAPP" as const },
  { name: "Thabo Mbeki-Jnr", id: "+27821234567", channel: "TELEGRAM" as const },
  { name: "Folake Olamide", id: "+2348178901234", channel: "WHATSAPP" as const },
  { name: "Chiamaka Okonkwo", id: "+2348189012345", channel: "WHATSAPP" as const },
  { name: "Tobi Akinwumi", id: "+2348190123456", channel: "WHATSAPP" as const },
  { name: "Zainab Yusuf", id: "+2348201234567", channel: "WHATSAPP" as const },
  { name: "Uche Nnamdi", id: "+2348212345678", channel: "WHATSAPP" as const },
  { name: "Ayodeji Balogun", id: "+2348223456789", channel: "WHATSAPP" as const },
  { name: "Sade Lawal", id: "+2348234567890", channel: "WHATSAPP" as const },
  { name: "Joel Mensah", id: "+233244567890", channel: "WHATSAPP" as const },
  { name: "Esther Acheampong", id: "+233205678901", channel: "WHATSAPP" as const },
  { name: "Maryam Bello", id: "+2348245678901", channel: "WHATSAPP" as const },
]

const CONV_PREVIEWS = [
  "Yes, I'll send the transfer this evening",
  "Do you still have the red Adidas size 42?",
  "Wholesale prices for 20+ yards?",
  "The item I got yesterday, wrong size",
  "Thanks, my sister loved it",
  "Are the powerbanks original?",
  "Delivery to Nairobi possible?",
  "Send me your account details please",
  "How much for 5 lipstick sets?",
  "Can I exchange for a different size?",
  "Are you open on Sundays?",
  "Just placed the order, sending now",
  "Loved the bonnet, thank you",
  "Do you ship to Abuja?",
  "Need it before Saturday, possible?",
  "What sizes do you have for the tee?",
  "Beaded necklace, do you have blue?",
  "Powerbank not charging fully",
  "Picture of the fabric please?",
  "I'll come pick up tomorrow",
  "How much is the headwrap?",
  "Earbuds came clean, thank you",
  "Do you have larger jars?",
  "Can you reserve for me till Friday?",
  "Refund processed yet?",
  "Discount on bulk orders?",
  "Need three of those tees, white",
  "Sending payment now",
  "Issue with delivery, where is my order?",
  "Just looking, thanks for now",
]

const CONV_HOURS = [0.04, 0.13, 1, 3, 28, 2, 5, 0.5, 0.25, 4, 7, 36, 12, 0.08, 1.5, 9, 24, 6, 18, 0.7, 50, 0.4, 11, 16, 72, 2.5, 8, 0.6, 30, 96]
const CONV_UNREAD = [1, 3, 0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0, 4, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 2, 1, 0, 0]
const CONV_STATUSES: Array<"NEEDS_HUMAN" | "ACTIVE" | "RESOLVED"> = ["ACTIVE", "NEEDS_HUMAN", "ACTIVE", "NEEDS_HUMAN", "RESOLVED", "ACTIVE", "ACTIVE", "RESOLVED"]
const CONV_INTENTS = ["PURCHASE_INTENT", "QUESTION", "PURCHASE_INTENT", "COMPLAINT", "GREETING", "PURCHASE_INTENT", "QUESTION", "PURCHASE_INTENT"]

const CONVERSATIONS = CUSTOMERS.map((c, idx) => {
  const status = CONV_STATUSES[idx % CONV_STATUSES.length]
  const intent = CONV_INTENTS[idx % CONV_INTENTS.length]
  const preview = CONV_PREVIEWS[idx % CONV_PREVIEWS.length]
  const hoursAgo = CONV_HOURS[idx % CONV_HOURS.length]
  const unread = CONV_UNREAD[idx % CONV_UNREAD.length]
  return {
    id: `conv-${idx + 1}`,
    business_id: "dev-business",
    customer_id: c.id,
    customer_name: c.name,
    channel_type: c.channel,
    channel_thread_id: c.id,
    status,
    last_message_preview: preview,
    last_message_at: isoMinusHours(hoursAgo),
    last_activity: isoMinusHours(hoursAgo),
    last_intent: intent,
    unread_count: unread,
    created_at: isoMinusDays((idx % 14) + 1),
  }
})

const NEEDS_HUMAN_COUNT = CONVERSATIONS.filter((c) => c.status === "NEEDS_HUMAN").length

// ---- Orders ------------------------------------------------------------------

const ORDERS = [
  // ========= PENDING PAYMENTS (8) — drives Morning Brief "X waiting on payment"
  { customerIdx: 0, status: "PENDING_PAYMENT", items: [["p-1", 1, 18000]], hoursAgo: 0.5 },
  { customerIdx: 3, status: "PENDING_PAYMENT", items: [["p-7", 2, 3800]], hoursAgo: 4 },
  { customerIdx: 6, status: "PENDING_PAYMENT", items: [["p-3", 12, 3200]], hoursAgo: 22 },
  { customerIdx: 8, status: "PENDING_PAYMENT", items: [["p-13", 1, 14500]], hoursAgo: 1.5 },
  { customerIdx: 11, status: "PENDING_PAYMENT", items: [["p-20", 1, 42000]], hoursAgo: 8 },
  { customerIdx: 17, status: "PENDING_PAYMENT", items: [["p-19", 1, 9800], ["p-16", 1, 11500]], hoursAgo: 15 },
  { customerIdx: 22, status: "PENDING_PAYMENT", items: [["p-2", 3, 7500]], hoursAgo: 36 },
  { customerIdx: 28, status: "PENDING_PAYMENT", items: [["p-22", 2, 8500]], hoursAgo: 48 },

  // ========= CONFIRMED (waiting fulfillment) (12)
  { customerIdx: 2, status: "CONFIRMED", items: [["p-3", 20, 3200], ["p-5", 4, 3500]], hoursAgo: 6 },
  { customerIdx: 4, status: "CONFIRMED", items: [["p-2", 1, 7500]], hoursAgo: 11 },
  { customerIdx: 7, status: "CONFIRMED", items: [["p-12", 1, 5800]], hoursAgo: 14 },
  { customerIdx: 5, status: "CONFIRMED", items: [["p-9", 1, 14500]], hoursAgo: 30 },
  { customerIdx: 9, status: "CONFIRMED", items: [["p-15", 2, 5800]], hoursAgo: 18 },
  { customerIdx: 12, status: "CONFIRMED", items: [["p-13", 1, 14500], ["p-18", 1, 4200]], hoursAgo: 24 },
  { customerIdx: 14, status: "CONFIRMED", items: [["p-6", 1, 18500]], hoursAgo: 9 },
  { customerIdx: 19, status: "CONFIRMED", items: [["p-19", 2, 9800]], hoursAgo: 33 },
  { customerIdx: 21, status: "CONFIRMED", items: [["p-3", 15, 3200]], hoursAgo: 42 },
  { customerIdx: 24, status: "CONFIRMED", items: [["p-22", 1, 8500], ["p-21", 2, 1800]], hoursAgo: 16 },
  { customerIdx: 26, status: "CONFIRMED", items: [["p-23", 1, 6500]], hoursAgo: 50 },
  { customerIdx: 29, status: "CONFIRMED", items: [["p-7", 3, 3800], ["p-24", 5, 1500]], hoursAgo: 7 },

  // ========= FULFILLED (24) — drives weekly + monthly revenue
  { customerIdx: 0, status: "FULFILLED", items: [["p-2", 1, 7500], ["p-11", 2, 2500]], hoursAgo: 36 },
  { customerIdx: 1, status: "FULFILLED", items: [["p-6", 1, 18500]], hoursAgo: 48 },
  { customerIdx: 4, status: "FULFILLED", items: [["p-8", 1, 9500]], hoursAgo: 60 },
  { customerIdx: 7, status: "FULFILLED", items: [["p-1", 1, 18000]], hoursAgo: 72 },
  { customerIdx: 5, status: "FULFILLED", items: [["p-3", 6, 3200]], hoursAgo: 96 },
  { customerIdx: 0, status: "FULFILLED", items: [["p-10", 2, 6500]], hoursAgo: 110 },
  { customerIdx: 2, status: "FULFILLED", items: [["p-7", 4, 3800]], hoursAgo: 130 },
  { customerIdx: 6, status: "FULFILLED", items: [["p-3", 8, 3200], ["p-5", 2, 3500]], hoursAgo: 150 },
  { customerIdx: 10, status: "FULFILLED", items: [["p-13", 1, 14500]], hoursAgo: 90 },
  { customerIdx: 13, status: "FULFILLED", items: [["p-2", 1, 7500], ["p-21", 1, 1800]], hoursAgo: 75 },
  { customerIdx: 15, status: "FULFILLED", items: [["p-14", 2, 5500]], hoursAgo: 120 },
  { customerIdx: 16, status: "FULFILLED", items: [["p-3", 10, 3200]], hoursAgo: 144 },
  { customerIdx: 18, status: "FULFILLED", items: [["p-22", 1, 8500]], hoursAgo: 200 },
  { customerIdx: 20, status: "FULFILLED", items: [["p-15", 3, 5800]], hoursAgo: 168 },
  { customerIdx: 23, status: "FULFILLED", items: [["p-7", 2, 3800], ["p-24", 4, 1500]], hoursAgo: 220 },
  { customerIdx: 25, status: "FULFILLED", items: [["p-6", 1, 18500], ["p-9", 1, 14500]], hoursAgo: 250 },
  { customerIdx: 27, status: "FULFILLED", items: [["p-18", 3, 4200]], hoursAgo: 280 },
  { customerIdx: 11, status: "FULFILLED", items: [["p-3", 4, 3200], ["p-2", 1, 7500]], hoursAgo: 310 },
  { customerIdx: 8, status: "FULFILLED", items: [["p-23", 1, 6500]], hoursAgo: 340 },
  { customerIdx: 14, status: "FULFILLED", items: [["p-9", 1, 14500]], hoursAgo: 380 },
  { customerIdx: 0, status: "FULFILLED", items: [["p-3", 5, 3200], ["p-7", 1, 3800]], hoursAgo: 420 },
  { customerIdx: 4, status: "FULFILLED", items: [["p-21", 2, 1800], ["p-24", 3, 1500]], hoursAgo: 460 },
  { customerIdx: 21, status: "FULFILLED", items: [["p-19", 1, 9800]], hoursAgo: 500 },
  { customerIdx: 17, status: "FULFILLED", items: [["p-22", 1, 8500], ["p-18", 1, 4200]], hoursAgo: 540 },

  // ========= CANCELLED (4)
  { customerIdx: 3, status: "CANCELLED", items: [["p-4", 1, 4500]], hoursAgo: 80 },
  { customerIdx: 1, status: "CANCELLED", items: [["p-12", 1, 5800]], hoursAgo: 192 },
  { customerIdx: 19, status: "CANCELLED", items: [["p-25", 1, 7800]], hoursAgo: 110 },
  { customerIdx: 25, status: "CANCELLED", items: [["p-17", 2, 4800]], hoursAgo: 230 },
]

const buildOrders = () =>
  ORDERS.map((o, idx) => {
    const customer = CUSTOMERS[o.customerIdx]
    const total = (o.items as Array<[string, number, number]>).reduce(
      (sum, [, qty, price]) => sum + qty * price,
      0,
    )
    const created = isoMinusHours(o.hoursAgo)
    return {
      id: `ord-${idx + 1}`,
      conversation_id: `conv-${o.customerIdx + 1}`,
      business_id: "dev-business",
      customer_name: customer.name,
      customer_phone: customer.id,
      customer_email: `${customer.name.toLowerCase().replace(/\s/g, ".")}@example.com`,
      delivery_address: idx % 3 === 0 ? "12 Adeola Odeku, VI, Lagos" : idx % 3 === 1 ? "47 Awolowo Rd, Ikoyi, Lagos" : "8 Glover Rd, Ikoyi, Lagos",
      currency: "NGN",
      total,
      status: o.status,
      channel: customer.channel,
      items: (o.items as Array<[string, number, number]>).map(([pid, qty, price]) => {
        const product = PRODUCTS.find((p) => p.id === pid)!
        return {
          product_id: pid,
          product_name: product.name,
          quantity: qty,
          unit_price: price,
          image_url: product.image,
        }
      }),
      created_at: created,
      confirmed_at: o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED" ? created : undefined,
      fulfilled_at: o.status === "FULFILLED" ? created : undefined,
      cancelled_at: o.status === "CANCELLED" ? created : undefined,
      notes: undefined,
    }
  })

// ---- Sales overview / analytics ---------------------------------------------

const periodDays = (period: string): number => {
  if (period === "7d") return 7
  if (period === "90d") return 90
  return 30
}

const buildSalesOverview = (period: string) => {
  const days = periodDays(period)
  // Scale base figures by period so longer windows feel bigger. Baselines
  // tuned to the denser ORDERS array (~50 orders) so KPIs match what's
  // visible in the orders/customers tabs.
  const scale = days / 30
  const revenue = Math.round(912_400 * scale)
  const orderCount = Math.max(1, Math.round(52 * scale))
  const avg = Math.round(revenue / orderCount)
  return {
    period,
    revenue: { current: revenue, previous: Math.round(revenue * 0.84), percent_change: 18.4 },
    orders: { current: orderCount, previous: Math.max(orderCount - 4, 0), percent_change: 33.3 },
    avg_order_value: { current: avg, previous: Math.round(avg * 0.92), percent_change: 8.7 },
    fulfillment_rate: { current: 92, previous: 88, percent_change: 4.5 },
    generated_at: new Date().toISOString(),
  }
}

// Deterministic pseudo-random so trend lines look real but don't jitter on
// every render. Seeded by date string + period to keep periods distinct.
const seededRandom = (seed: string) => {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const buildSalesTrend = (period: string) => {
  const days = periodDays(period)
  const rng = seededRandom(`trend-${period}`)
  const points = Array.from({ length: days }, (_, i) => {
    const date = new Date(NOW - (days - 1 - i) * ONE_DAY)
    const dow = date.getDay()
    // Lagos shopping pattern: Sat highest, Sun + Fri strong, Mon quiet
    const dayWeight =
      dow === 6 ? 1.85 :
      dow === 0 ? 1.35 :
      dow === 5 ? 1.45 :
      dow === 1 ? 0.55 :
      1.0
    const base = 7_500 + rng() * 9_500
    const revenue = Math.round(base * dayWeight)
    const orderBase = dow === 6 ? 4 : dow === 1 ? 1 : 2
    return {
      date: date.toISOString().slice(0, 10),
      revenue,
      order_count: Math.max(1, orderBase + Math.floor(rng() * 2)),
    }
  })
  return { period, data: points, generated_at: new Date().toISOString() }
}

const buildTopProducts = (period: string, limit: number) => {
  const scale = periodDays(period) / 30
  const lookup = (id: string) => PRODUCTS.find((p) => p.id === id)
  const seed = [
    { product_id: "p-3", units_sold: Math.round(82 * scale), revenue: Math.round(262_400 * scale) },
    { product_id: "p-6", units_sold: Math.round(8 * scale), revenue: Math.round(148_000 * scale) },
    { product_id: "p-13", units_sold: Math.round(6 * scale), revenue: Math.round(87_000 * scale) },
    { product_id: "p-9", units_sold: Math.round(5 * scale), revenue: Math.round(72_500 * scale) },
    { product_id: "p-19", units_sold: Math.round(6 * scale), revenue: Math.round(58_800 * scale) },
    { product_id: "p-15", units_sold: Math.round(8 * scale), revenue: Math.round(46_400 * scale) },
    { product_id: "p-22", units_sold: Math.round(5 * scale), revenue: Math.round(42_500 * scale) },
    { product_id: "p-2", units_sold: Math.round(5 * scale), revenue: Math.round(37_500 * scale) },
    { product_id: "p-5", units_sold: Math.round(10 * scale), revenue: Math.round(35_000 * scale) },
    { product_id: "p-7", units_sold: Math.round(8 * scale), revenue: Math.round(30_400 * scale) },
  ]
  const all = seed.map((s) => {
    const p = lookup(s.product_id)
    return {
      product_id: s.product_id,
      product_name: p?.name ?? s.product_id,
      units_sold: s.units_sold,
      revenue: s.revenue,
      image_url: p?.image ?? null,
    }
  })
  return {
    period,
    top_products: all.slice(0, limit),
    stale_products: [
      { id: "p-4", name: "iPhone 14 Clear Case", sku: "BFS-ACC-0004", selling_price: 4500, stock_quantity: 0, last_restocked: isoMinusDays(45) },
      { id: "p-12", name: "Beaded Necklace, Coral", sku: "BFS-FSH-0012", selling_price: 5800, stock_quantity: 9, last_restocked: isoMinusDays(52) },
      { id: "p-11", name: "Hair Bonnet, Silk-feel", sku: "BFS-BTY-0011", selling_price: 2500, stock_quantity: 26, last_restocked: isoMinusDays(38) },
      { id: "p-21", name: "Eyelash Set, Mink Style", sku: "BFS-BTY-0021", selling_price: 1800, stock_quantity: 34, last_restocked: isoMinusDays(60) },
      { id: "p-24", name: "Black Soap Bar, 100g", sku: "BFS-BTY-0024", selling_price: 1500, stock_quantity: 42, last_restocked: isoMinusDays(70) },
    ],
    generated_at: new Date().toISOString(),
  }
}

const buildChannelMix = (period: string) => {
  const scale = periodDays(period) / 30
  const channels = [
    { channel: "WHATSAPP", order_count: Math.round(43 * scale), revenue: Math.round(786_900 * scale) },
    { channel: "TELEGRAM", order_count: Math.round(7 * scale), revenue: Math.round(96_400 * scale) },
    { channel: "INSTAGRAM", order_count: Math.round(2 * scale), revenue: Math.round(29_100 * scale) },
  ]
  const totalRev = channels.reduce((s, c) => s + c.revenue, 0)
  const totalOrders = channels.reduce((s, c) => s + c.order_count, 0)
  return {
    period,
    channels: channels.map((c) => ({
      channel: c.channel,
      order_count: c.order_count,
      revenue: c.revenue,
      order_percentage: totalOrders ? (c.order_count / totalOrders) * 100 : 0,
      revenue_percentage: totalRev ? (c.revenue / totalRev) * 100 : 0,
    })),
    totals: { orders: totalOrders, revenue: totalRev },
    generated_at: new Date().toISOString(),
  }
}

// ---- Customers (aggregated from CUSTOMERS + ORDERS) -------------------------

const buildCustomerList = () => {
  const customerStats = CUSTOMERS.map((c, idx) => {
    const customerOrders = ORDERS.filter((o) => o.customerIdx === idx)
    const fulfilled = customerOrders.filter((o) => o.status === "FULFILLED")
    const totalSpent = fulfilled.reduce((sum, o) => {
      return sum + (o.items as Array<[string, number, number]>).reduce(
        (s, [, qty, price]) => s + qty * price,
        0,
      )
    }, 0)
    const orderCount = fulfilled.length
    const orderTimes = customerOrders.map((o) => o.hoursAgo)
    const lastOrderHours = orderTimes.length ? Math.min(...orderTimes) : null
    const firstOrderHours = orderTimes.length ? Math.max(...orderTimes) : null
    return {
      phone: c.id,
      name: c.name,
      email: `${c.name.toLowerCase().replace(/\s/g, ".")}@example.com`,
      address: idx % 3 === 0 ? "12 Adeola Odeku, VI, Lagos" : idx % 3 === 1 ? "47 Awolowo Rd, Ikoyi, Lagos" : "8 Glover Rd, Ikoyi, Lagos",
      order_count: orderCount,
      total_spent: totalSpent,
      last_order: lastOrderHours !== null ? isoMinusHours(lastOrderHours) : null,
      first_order: firstOrderHours !== null ? isoMinusHours(firstOrderHours) : null,
      channels: [c.channel],
      is_vip: totalSpent >= 25_000,
    }
  })
  return customerStats
}

const buildCustomersResponse = (params: { search?: string; sort_by?: string; limit?: string; offset?: string }) => {
  let list = buildCustomerList()
  if (params.search) {
    const q = params.search.toLowerCase()
    list = list.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || "").toLowerCase().includes(q),
    )
  }
  const sort = params.sort_by || "total_spent"
  list = [...list].sort((a, b) => {
    if (sort === "order_count") return b.order_count - a.order_count
    if (sort === "name") return (a.name || "").localeCompare(b.name || "")
    if (sort === "last_order") {
      const aT = a.last_order ? new Date(a.last_order).getTime() : 0
      const bT = b.last_order ? new Date(b.last_order).getTime() : 0
      return bT - aT
    }
    return b.total_spent - a.total_spent
  })
  const limit = params.limit ? parseInt(params.limit) : 50
  const offset = params.offset ? parseInt(params.offset) : 0
  return {
    customers: list.slice(offset, offset + limit),
    total: list.length,
    limit,
    offset,
    generated_at: new Date().toISOString(),
  }
}

const buildCustomerDetail = (phone: string) => {
  const c = buildCustomerList().find((cust) => cust.phone === phone)
  if (!c) return null
  const orders = buildOrders().filter((o) => o.customer_phone === phone)
  return {
    customer: {
      phone: c.phone,
      name: c.name,
      email: c.email,
      address: c.address,
      order_count: c.order_count,
      total_spent: c.total_spent,
      avg_order_value: c.order_count ? Math.round(c.total_spent / c.order_count) : 0,
      last_order: c.last_order,
      first_order: c.first_order,
      channels: c.channels,
    },
    orders: orders.map((o) => ({
      id: o.id,
      items: o.items,
      subtotal: o.total,
      total: o.total,
      currency: o.currency,
      status: o.status,
      channel: c.channels[0],
      notes: o.notes ?? null,
      created_at: o.created_at,
      confirmed_at: o.confirmed_at ?? null,
      fulfilled_at: o.fulfilled_at ?? null,
      cancelled_at: o.cancelled_at ?? null,
    })),
    interactions: [],
    entity: null,
    generated_at: new Date().toISOString(),
  }
}

// ---- AI memory observations -------------------------------------------------

// Memory items must be strictly derivable from the data we already serve
// elsewhere on the page. No invented specifics, no advisory copy.
const MEMORIES = [
  {
    id: "mem-1",
    content: "Saturdays consistently carry the week in your sales trend.",
    summary: "Saturdays carry the week.",
    memory_type: "semantic" as const,
    importance_score: 0.92,
    access_count: 14,
    created_at: isoMinusDays(2),
    source_type: "trend_analysis",
  },
  {
    id: "mem-2",
    content: "Adaeze Okafor has the highest total spend among your customers this period.",
    summary: "Adaeze is your top-spending customer.",
    memory_type: "semantic" as const,
    importance_score: 0.88,
    access_count: 9,
    created_at: isoMinusDays(3),
    source_type: "customer_pattern",
  },
  {
    id: "mem-3",
    content: "African Wax Print Fabric is your top-grossing product in the current period.",
    summary: "Wax print leads top sellers.",
    memory_type: "semantic" as const,
    importance_score: 0.85,
    access_count: 7,
    created_at: isoMinusDays(5),
    source_type: "product_analysis",
  },
  {
    id: "mem-4",
    content: "Three orders are sitting in PENDING_PAYMENT status, the oldest over 22 hours.",
    summary: "Pending payments are sitting.",
    memory_type: "episodic" as const,
    importance_score: 0.78,
    access_count: 4,
    created_at: isoMinusDays(1),
    source_type: "order_followup",
  },
  {
    id: "mem-5",
    content: "WhatsApp accounts for the majority of period revenue across all your channels.",
    summary: "WhatsApp leads your channel mix.",
    memory_type: "semantic" as const,
    importance_score: 0.82,
    access_count: 6,
    created_at: isoMinusDays(4),
    source_type: "channel_analysis",
  },
]

const buildMemoriesList = (params: { limit?: string; offset?: string; memory_type?: string }) => {
  let list = [...MEMORIES]
  if (params.memory_type) {
    list = list.filter((m) => m.memory_type === params.memory_type)
  }
  const limit = params.limit ? parseInt(params.limit) : 5
  const offset = params.offset ? parseInt(params.offset) : 0
  return {
    memories: list.slice(offset, offset + limit),
    total: list.length,
    limit,
    offset,
  }
}

// ---- Notifications -----------------------------------------------------------

const NOTIFICATIONS = [
  { id: "n-1", type: "stock", title: "Low stock alert", message: "Lagos Tee — White is down to 3 units", priority: "HIGH", read: false, created_at: isoMinusHours(0.2), reference_type: "product", reference_id: "p-10" },
  { id: "n-2", type: "stock", title: "Out of stock", message: "iPhone 14 Clear Case is sold out", priority: "HIGH", read: false, created_at: isoMinusHours(2), reference_type: "product", reference_id: "p-4" },
  { id: "n-3", type: "system", title: "Payment received", message: "Tunde Bakare paid ₦18,500 for Bluetooth Earbuds", priority: "MEDIUM", read: false, created_at: isoMinusHours(4) },
  { id: "n-4", type: "activity", title: "New customer", message: "Wanjiru Mwangi sent her first message", priority: "LOW", read: true, created_at: isoMinusHours(8) },
]

// ---- Connections (channels) -------------------------------------------------

const CONNECTIONS = {
  total: 1,
  connections: [
    {
      id: "conn-1",
      channel_type: "WHATSAPP",
      handle: "+234 800 000 0000",
      status: "CONNECTED",
      ai_enabled: true,
      created_at: isoMinusDays(20),
    },
  ],
}

// =============================================================================
// Router — match endpoint and return mock data (or null to fall through)
// =============================================================================

interface MockRouter {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: RegExp
  respond: (match: RegExpMatchArray, body?: any, query?: Record<string, string>) => any
}

const routes: MockRouter[] = [
  // Products
  { method: "GET", path: /^\/api\/inventory\/[^/]+\/products(\?|$)/, respond: () => PRODUCTS.map(toBackendProduct) },
  { method: "GET", path: /^\/api\/inventory\/[^/]+\/products\/with-variations/, respond: () => PRODUCTS.map(toBackendProduct) },
  { method: "GET", path: /^\/api\/inventory\/[^/]+\/products\/([^/]+)$/, respond: (m) => {
    const p = PRODUCTS.find((p) => p.id === m[1])
    return p ? toBackendProduct(p) : null
  }},
  { method: "GET", path: /^\/api\/inventory\/[^/]+\/stats/, respond: () => ({
    total_products: PRODUCTS.length,
    total_value: PRODUCTS.reduce((sum, p) => sum + p.cost * p.stock, 0),
    in_stock: PRODUCTS.filter((p) => p.stock > p.reorder).length,
    low_stock: PRODUCTS.filter((p) => p.stock > 0 && p.stock <= p.reorder).length,
    out_of_stock: PRODUCTS.filter((p) => p.stock === 0).length,
  })},

  // Conversations — handle both /api/messaging/conversations (real API_BASE)
  // and bare /conversations so the mock layer matches whatever path the
  // caller composes. Same applies to Connections below.
  { method: "GET", path: /^\/(?:api\/messaging\/)?conversations(\?|$)/, respond: (m, _b, q) => {
    let conversations = [...CONVERSATIONS]
    if (q?.status) conversations = conversations.filter((c) => c.status === q.status)
    if (q?.channel) conversations = conversations.filter((c) => c.channel_type === q.channel)
    return {
      conversations,
      total: conversations.length,
      needs_human_count: NEEDS_HUMAN_COUNT,
    }
  }},
  { method: "GET", path: /^\/(?:api\/messaging\/)?conversations\/([^/]+)$/, respond: (m) => CONVERSATIONS.find((c) => c.id === m[1]) },
  { method: "GET", path: /^\/(?:api\/messaging\/)?conversations\/([^/]+)\/messages/, respond: (m) => {
    const conv = CONVERSATIONS.find((c) => c.id === m[1])
    if (!conv) return { messages: [] }
    // Build a 4-message thread
    return {
      messages: [
        { id: `${m[1]}-msg-1`, conversation_id: m[1], sender_type: "CUSTOMER", direction: "INBOUND", content: conv.last_message_preview, created_at: conv.last_message_at, delivered: true, read: true },
        { id: `${m[1]}-msg-2`, conversation_id: m[1], sender_type: "AI", direction: "OUTBOUND", content: "Let me check that for you right now — one moment.", created_at: isoMinusHours(2), delivered: true, read: true, confidence: 0.92 },
        { id: `${m[1]}-msg-3`, conversation_id: m[1], sender_type: "AI", direction: "OUTBOUND", content: "Yes, we have it in stock. Would you like me to set one aside?", created_at: isoMinusHours(1.9), delivered: true, read: true, confidence: 0.88 },
        { id: `${m[1]}-msg-4`, conversation_id: m[1], sender_type: "CUSTOMER", direction: "INBOUND", content: "Yes please, I'll pay this evening.", created_at: isoMinusHours(0.5), delivered: true, read: true },
      ],
    }
  }},

  // Connections (channels) — same dual-path treatment as conversations.
  { method: "GET", path: /^\/(?:api\/messaging\/)?connections(\?|$)/, respond: () => CONNECTIONS },
  { method: "GET", path: /^\/(?:api\/messaging\/)?connections\/[^/]+\/status/, respond: () => ({ connected: true, status: "CONNECTED" }) },

  // Orders
  { method: "GET", path: /^\/api\/orders(\?|$)/, respond: (m, _b, q) => {
    let orders = buildOrders()
    if (q?.status) orders = orders.filter((o) => o.status === q.status)
    return { orders, total: orders.length }
  }},
  { method: "GET", path: /^\/api\/orders\/([^/]+)$/, respond: (m) => buildOrders().find((o) => o.id === m[1]) },
  { method: "POST", path: /^\/api\/orders\/([^/]+)\/fulfill/, respond: (m) => {
    const o = buildOrders().find((o) => o.id === m[1])
    return o ? { ...o, status: "FULFILLED", fulfilled_at: new Date().toISOString() } : null
  }},

  // Analytics — note: real apiClient calls hit /analytics/... (no /api prefix)
  { method: "GET", path: /^\/analytics\/sales-overview\?period=([^&]+)/, respond: (m) => buildSalesOverview(m[1]) },
  { method: "GET", path: /^\/analytics\/sales-trend\?period=([^&]+)/, respond: (m) => buildSalesTrend(m[1]) },
  { method: "GET", path: /^\/analytics\/top-products\?period=([^&]+)&limit=(\d+)/, respond: (m) => buildTopProducts(m[1], parseInt(m[2])) },
  { method: "GET", path: /^\/analytics\/channel-mix\?period=([^&]+)/, respond: (m) => buildChannelMix(m[1]) },
  { method: "GET", path: /^\/analytics\/customers\/([^/?]+)/, respond: (m) => buildCustomerDetail(decodeURIComponent(m[1])) },
  { method: "GET", path: /^\/analytics\/customers(\?|$)/, respond: (_m, _b, q) => buildCustomersResponse(q || {}) },

  // AI memory observations (insights footer)
  { method: "GET", path: /^\/api\/insights\/memories\/list(\?|$)/, respond: (_m, _b, q) => buildMemoriesList(q || {}) },

  // Notifications. The endpoint returns a bare array (not wrapped).
  { method: "GET", path: /^\/api\/notifications\/count/, respond: () => ({ unread_count: NOTIFICATIONS.filter((n) => !n.read).length }) },
  { method: "GET", path: /^\/api\/notifications(\?|$)/, respond: () => NOTIFICATIONS },

  // Settings (let real fetches fail — those are user-modify surfaces)
]

// Public API ------------------------------------------------------------------

export const isMockable = (): boolean => isDevBypassActive()

export interface MockedResponse {
  matched: boolean
  data?: any
}

/**
 * Try to satisfy a request with mock data. Returns matched=false if no route
 * matches; the caller (apiClient) then performs the real fetch.
 */
export const tryMock = (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: any,
): MockedResponse => {
  if (!isMockable()) return { matched: false }

  // Parse query string into a plain object
  const [pathPart, queryPart] = endpoint.split("?")
  const query: Record<string, string> = {}
  if (queryPart) {
    queryPart.split("&").forEach((pair) => {
      const [k, v] = pair.split("=")
      query[k] = decodeURIComponent(v ?? "")
    })
  }

  // Match against the full endpoint (so query-param matching can also hit)
  for (const route of routes) {
    if (route.method !== method) continue
    const m = endpoint.match(route.path) || pathPart.match(route.path)
    if (m) {
      try {
        const data = (route.respond as any)(m, body, query)
        if (data === null) {
          return { matched: true, data: { detail: "Not found" } }
        }
        return { matched: true, data }
      } catch (e) {
        return { matched: false }
      }
    }
  }
  return { matched: false }
}
