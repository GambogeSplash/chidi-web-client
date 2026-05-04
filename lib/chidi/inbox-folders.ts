/**
 * Live Folders — auto-grouping of Inbox conversations by predicate.
 *
 * Channel-agnostic: every predicate runs against a `ChannelConversation` plus
 * an optional `FolderContext` (orders + customers loaded from existing hooks).
 * If the context isn't ready yet (still fetching), the predicate falls back to
 * a safe `false` so the folder appears empty rather than wrong.
 *
 * The merchant taps a folder chip below search to intersect the visible list
 * with that predicate. Folders compose with the existing status filter so
 * "VIPs" + "Needs attention" answers "which big spenders are waiting on me?".
 *
 * Adding a folder = push to LIVE_FOLDERS. No other code changes needed.
 */

import type { ChannelConversation } from "@/lib/api/messaging"
import type { Order } from "@/lib/api/orders"
import type { CustomerSummary } from "@/lib/types/analytics"

export type LiveFolderId =
  | "asking_restock"
  | "waiting_delivery"
  | "vips"
  | "first_time"
  | "pending_payment"

export interface FolderContext {
  /** All known orders, indexed lookups happen inside predicates. */
  orders?: Order[]
  /** All known customers (for VIP / first-time tagging). */
  customers?: CustomerSummary[]
  /** Override "now" for deterministic tests / time-aware demos. */
  now?: Date
}

export interface LiveFolder {
  id: LiveFolderId
  label: string
  /** lucide-react icon name — kept as string so this lib has zero React deps. */
  icon: "PackageSearch" | "Truck" | "Crown" | "Sparkles" | "Wallet"
  /** One-line tooltip describing what this folder catches. */
  hint: string
  predicate: (conv: ChannelConversation, ctx: FolderContext) => boolean
}

// =====================
// Helpers
// =====================

const RESTOCK_RE = /(restock|back in stock|bring back|do you still have|when will you have)/i

function lastMessageMs(conv: ChannelConversation): number {
  const stamp = conv.last_message_at || conv.last_activity || conv.updated_at
  return stamp ? new Date(stamp).getTime() : 0
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.replace(/[^\d]/g, "")
}

/** Match a conversation to a customer record by phone (last 9 digits — Lagos / NG numbers). */
function findCustomerForConv(
  conv: ChannelConversation,
  customers: CustomerSummary[] | undefined,
): CustomerSummary | undefined {
  if (!customers?.length) return undefined
  const convPhone = normalizePhone(conv.customer_id)
  if (!convPhone) return undefined
  const tail = convPhone.slice(-9)
  return customers.find((c) => {
    const p = normalizePhone(c.phone)
    return p && (p === convPhone || p.endsWith(tail) || convPhone.endsWith(p.slice(-9)))
  })
}

/** Memoised VIP cutoff (top 10% by total_spent) keyed on customers identity. */
let _vipCache: { key: CustomerSummary[] | undefined; cutoff: number } | null = null
function vipCutoff(customers: CustomerSummary[] | undefined): number {
  if (_vipCache && _vipCache.key === customers) return _vipCache.cutoff
  if (!customers?.length) {
    _vipCache = { key: customers, cutoff: Number.POSITIVE_INFINITY }
    return _vipCache.cutoff
  }
  const spends = customers
    .map((c) => c.total_spent || 0)
    .filter((n) => n > 0)
    .sort((a, b) => b - a)
  if (!spends.length) {
    _vipCache = { key: customers, cutoff: Number.POSITIVE_INFINITY }
    return _vipCache.cutoff
  }
  const idx = Math.max(0, Math.floor(spends.length * 0.1) - 1)
  const cutoff = spends[idx] ?? spends[0]
  _vipCache = { key: customers, cutoff }
  return cutoff
}

/** Index orders by conversation_id for cheap predicate lookups. */
function ordersByConv(orders: Order[] | undefined): Map<string, Order[]> {
  const m = new Map<string, Order[]>()
  if (!orders) return m
  for (const o of orders) {
    if (!o.conversation_id) continue
    const arr = m.get(o.conversation_id) ?? []
    arr.push(o)
    m.set(o.conversation_id, arr)
  }
  return m
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// =====================
// Folder definitions
// =====================

export const LIVE_FOLDERS: LiveFolder[] = [
  {
    id: "asking_restock",
    label: "Asking about restock",
    icon: "PackageSearch",
    hint: "Customers asking when items come back.",
    predicate: (conv) => {
      const peek = conv.last_message_preview || ""
      return RESTOCK_RE.test(peek)
    },
  },
  {
    id: "waiting_delivery",
    label: "Waiting for delivery",
    icon: "Truck",
    hint: "Fulfilled in the last 7 days, no follow-up from you in 24h.",
    predicate: (conv, ctx) => {
      if (!ctx.orders?.length) return false
      const now = (ctx.now ?? new Date()).getTime()
      const convOrders = ctx.orders.filter((o) => o.conversation_id === conv.id)
      const recentlyFulfilled = convOrders.some((o) => {
        if (o.status !== "FULFILLED" || !o.fulfilled_at) return false
        const t = new Date(o.fulfilled_at).getTime()
        return now - t <= SEVEN_DAYS_MS
      })
      if (!recentlyFulfilled) return false
      // No merchant message in the last 24h. We approximate "merchant message"
      // as last_activity having moved within 24h on a conversation that the
      // merchant owns — without per-message direction here we use the
      // inverse: if last_activity is OLDER than 24h, no recent touch.
      const lastTouch = lastMessageMs(conv)
      return now - lastTouch >= ONE_DAY_MS
    },
  },
  {
    id: "vips",
    label: "VIPs",
    icon: "Crown",
    hint: "Top 10% of spend.",
    predicate: (conv, ctx) => {
      const customer = findCustomerForConv(conv, ctx.customers)
      if (!customer) return false
      const cutoff = vipCutoff(ctx.customers)
      if (!isFinite(cutoff)) return false
      return (customer.total_spent || 0) >= cutoff && (customer.order_count || 0) > 0
    },
  },
  {
    id: "first_time",
    label: "First-time",
    icon: "Sparkles",
    hint: "Brand-new customers (no orders yet) who reached out this week.",
    predicate: (conv, ctx) => {
      const now = (ctx.now ?? new Date()).getTime()
      const lastTouch = lastMessageMs(conv)
      if (!lastTouch || now - lastTouch > SEVEN_DAYS_MS) return false
      const customer = findCustomerForConv(conv, ctx.customers)
      // No record at all = brand new. Record with 0 orders also counts.
      return !customer || (customer.order_count ?? 0) === 0
    },
  },
  {
    id: "pending_payment",
    label: "Pending payment",
    icon: "Wallet",
    hint: "Has an order awaiting payment confirmation.",
    predicate: (conv, ctx) => {
      if (!ctx.orders?.length) return false
      return ctx.orders.some(
        (o) => o.conversation_id === conv.id && o.status === "PENDING_PAYMENT",
      )
    },
  },
]

/** Get a folder by id. */
export function getFolder(folderId: LiveFolderId): LiveFolder | undefined {
  return LIVE_FOLDERS.find((f) => f.id === folderId)
}

/** Apply a folder predicate against a list of conversations. */
export function applyFolder(
  folderId: LiveFolderId,
  conversations: ChannelConversation[],
  ctx: FolderContext = {},
): ChannelConversation[] {
  const folder = getFolder(folderId)
  if (!folder) return conversations
  return conversations.filter((c) => folder.predicate(c, ctx))
}

/** Compute counts for every folder against a list of conversations. */
export function computeFolderCounts(
  conversations: ChannelConversation[],
  ctx: FolderContext = {},
): Record<LiveFolderId, number> {
  // Pre-index orders once for cheaper repeat lookups inside predicates.
  ordersByConv(ctx.orders) // warms; predicates re-filter for clarity
  const out = {
    asking_restock: 0,
    waiting_delivery: 0,
    vips: 0,
    first_time: 0,
    pending_payment: 0,
  } as Record<LiveFolderId, number>
  for (const conv of conversations) {
    for (const folder of LIVE_FOLDERS) {
      if (folder.predicate(conv, ctx)) out[folder.id]++
    }
  }
  return out
}

// =====================
// Lightweight pub/sub for folder counts
// =====================

type CountsListener = (counts: Record<LiveFolderId, number>) => void
const countsListeners = new Set<CountsListener>()

/** Subscribe to count emissions. Counts are pushed by `emitCounts` from
 * inbox-view's effect that already watches conversation list changes. */
export function subscribeToCounts(cb: CountsListener): () => void {
  countsListeners.add(cb)
  return () => {
    countsListeners.delete(cb)
  }
}

/** Compute fresh counts and push them to all subscribers. */
export function emitCounts(
  conversations: ChannelConversation[],
  ctx: FolderContext = {},
): Record<LiveFolderId, number> {
  const counts = computeFolderCounts(conversations, ctx)
  countsListeners.forEach((cb) => {
    try {
      cb(counts)
    } catch {
      /* swallow listener errors */
    }
  })
  return counts
}
