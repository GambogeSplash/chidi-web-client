/**
 * Product activity log generator. Mock until backend serves real events.
 * Same product always produces the same chronological events.
 *
 * Events: created, restocked, sold, asked-about (customer messaged about it).
 */

export type ProductActivityKind = "created" | "restocked" | "sold" | "asked"

export interface ProductActivityEvent {
  kind: ProductActivityKind
  ts: number // epoch ms
  qty?: number
  customerName?: string
}

const CUSTOMER_NAMES = [
  "Adaeze Okafor",
  "Tunde Bakare",
  "Ifeoma Eze",
  "Kemi Adebayo",
  "Olumide Sanusi",
  "Chinwe Nwosu",
  "Wanjiru Mwangi",
  "Kwame Boateng",
]

function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h)
}

const ONE_DAY = 86400000

export function deriveProductActivity(productId: string): ProductActivityEvent[] {
  const seed = hash(productId)
  const now = Date.now()

  const events: ProductActivityEvent[] = []

  // Created: 30-90 days ago
  const createdDaysAgo = 30 + (seed % 60)
  events.push({ kind: "created", ts: now - createdDaysAgo * ONE_DAY })

  // 1-3 restock events between created and now
  const restockCount = 1 + ((seed >> 4) % 3)
  for (let i = 0; i < restockCount; i++) {
    const daysAgo = Math.floor((createdDaysAgo / (restockCount + 1)) * (restockCount - i))
    const qty = 5 + ((seed >> (i + 7)) % 30)
    events.push({ kind: "restocked", ts: now - daysAgo * ONE_DAY, qty })
  }

  // 3-6 sale events sprinkled in the recent window
  const salesCount = 3 + ((seed >> 11) % 4)
  for (let i = 0; i < salesCount; i++) {
    const daysAgo = ((seed >> (i * 3 + 13)) % Math.min(createdDaysAgo, 21)) + 1
    const qty = 1 + ((seed >> (i + 17)) % 3)
    const customerName = CUSTOMER_NAMES[(seed + i) % CUSTOMER_NAMES.length]
    events.push({ kind: "sold", ts: now - daysAgo * ONE_DAY - (i * 3600 * 1000), qty, customerName })
  }

  // 1-2 "asked about" events (customer asked about this product in chat)
  const askCount = 1 + ((seed >> 19) % 2)
  for (let i = 0; i < askCount; i++) {
    const hoursAgo = 2 + ((seed >> (i + 23)) % 72)
    const customerName = CUSTOMER_NAMES[(seed + i + 4) % CUSTOMER_NAMES.length]
    events.push({ kind: "asked", ts: now - hoursAgo * 3600 * 1000, customerName })
  }

  // Newest first
  return events.sort((a, b) => b.ts - a.ts)
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  if (day < 365) return `${Math.floor(day / 30)}mo ago`
  return `${Math.floor(day / 365)}y ago`
}
