/**
 * Real notifications producer — local-only event store + pub/sub.
 *
 * Channel-agnostic by design: every notification payload includes a `channel`
 * field where the source matters (Telegram and WhatsApp are first-class).
 * Copy in the dropdown reads "back in your Telegram inbox" or "Payment from
 * Tola on WhatsApp" — never "your WhatsApp customers" as a default.
 *
 * Producers / consumers:
 *   - addNotification(type, payload)         → producer (used by inbox-view,
 *                                                payment-confirmed listener,
 *                                                snooze-return sweep, demo seed)
 *   - markRead / markAllRead                 → consumer (notification-dropdown)
 *   - subscribe(cb)                          → consumer (anyone who wants live
 *                                                updates without polling)
 *
 * The store is `localStorage`-backed so a refresh keeps the bell honest. Old
 * notifications (>14 days) are pruned on every write to keep the store small.
 *
 * Window events listened to:
 *   - "chidi:payment-confirmed"  { customer, amount, channel, orderId? }
 *   - "chidi:snooze-returned"    { conversationId, customerName, channel }
 *   - "chidi:chidi-action"       { summary, channel? }
 *   - "chidi:mention-assigned"   { from, channel? }
 */

const STORAGE_KEY = "chidi:notifications"
const SEED_FLAG_KEY = "chidi:notifications-seeded"
const MAX_STORED = 100
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14d

export type ChidiNotificationType =
  | "new_order"
  | "payment_pending"
  | "payment_confirmed"
  | "low_stock"
  | "snooze_returned"
  | "chidi_action_taken"
  | "mention_assigned"

export type ChannelSource = "WHATSAPP" | "TELEGRAM" | "INSTAGRAM" | "SMS"

export interface ChidiNotificationPayload {
  /** Display title — short, sentence case. Channel-agnostic. */
  title: string
  /** Optional supporting line (one short clause, no period required). */
  body?: string
  /** Source channel where the event originated, when relevant. */
  channel?: ChannelSource
  /** What surface to deep-link to when the notification is clicked. */
  ref?: { type: "order" | "conversation" | "product" | "customer"; id: string }
  /** Free-form metadata for downstream consumers. */
  meta?: Record<string, unknown>
}

export interface StoredChidiNotification extends ChidiNotificationPayload {
  id: string
  type: ChidiNotificationType
  createdAt: string
  read: boolean
}

type Listener = (notifications: StoredChidiNotification[]) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): StoredChidiNotification[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as StoredChidiNotification[]
  } catch {
    return []
  }
}

function write(items: StoredChidiNotification[]): void {
  if (!isBrowser()) return
  // Prune aged-out entries + cap size before serialising.
  const cutoff = Date.now() - MAX_AGE_MS
  const pruned = items
    .filter((n) => new Date(n.createdAt).getTime() > cutoff)
    .slice(0, MAX_STORED)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
  } catch {
    /* swallow quota errors */
  }
  listeners.forEach((cb) => {
    try {
      cb(pruned)
    } catch {
      /* swallow listener errors */
    }
  })
}

export function getNotifications(): StoredChidiNotification[] {
  return read()
}

export function getUnreadCount(): number {
  return read().filter((n) => !n.read).length
}

function makeId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function addNotification(
  type: ChidiNotificationType,
  payload: ChidiNotificationPayload,
): StoredChidiNotification {
  const entry: StoredChidiNotification = {
    id: makeId(),
    type,
    createdAt: new Date().toISOString(),
    read: false,
    ...payload,
  }
  const next = [entry, ...read()]
  write(next)
  return entry
}

export function markRead(id: string): void {
  const next = read().map((n) => (n.id === id ? { ...n, read: true } : n))
  write(next)
}

export function markAllRead(): void {
  const next = read().map((n) => (n.read ? n : { ...n, read: true }))
  write(next)
}

export function dismiss(id: string): void {
  write(read().filter((n) => n.id !== id))
}

export function clearAll(): void {
  write([])
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  // Push current state immediately so subscribers don't have to fetch separately.
  cb(read())
  return () => listeners.delete(cb)
}

// =====================================================================
// Demo seed — fires once per browser so the bell shows a count on first
// load. Mixes Telegram + WhatsApp on purpose: both are first-class.
// =====================================================================

export function seedDemoNotificationsIfEmpty(): void {
  if (!isBrowser()) return
  if (window.localStorage.getItem(SEED_FLAG_KEY) === "1") return
  if (read().length > 0) {
    window.localStorage.setItem(SEED_FLAG_KEY, "1")
    return
  }
  const now = Date.now()
  const seeded: StoredChidiNotification[] = [
    {
      id: makeId(),
      type: "payment_confirmed",
      createdAt: new Date(now - 6 * 60_000).toISOString(),
      read: false,
      title: "Payment confirmed",
      body: "Tola sent ₦18,500 — order ready to fulfill.",
      channel: "WHATSAPP",
    },
    {
      id: makeId(),
      type: "new_order",
      createdAt: new Date(now - 47 * 60_000).toISOString(),
      read: false,
      title: "New order from Telegram",
      body: "Chinedu placed an order for 2× sneakers.",
      channel: "TELEGRAM",
    },
    {
      id: makeId(),
      type: "chidi_action_taken",
      createdAt: new Date(now - 3 * 60 * 60_000).toISOString(),
      read: false,
      title: "Chidi answered 4 questions overnight",
      body: "All on Telegram. Two were about restock dates — you may want to reply.",
      channel: "TELEGRAM",
    },
  ]
  write(seeded)
  try {
    window.localStorage.setItem(SEED_FLAG_KEY, "1")
  } catch {
    /* ignore */
  }
}

// =====================================================================
// Window-event producers — wire once on app boot, idempotent.
// =====================================================================

let producersWired = false

interface PaymentConfirmedDetail {
  customer?: string
  customerName?: string
  amount?: number | string
  channel?: ChannelSource | string
  orderId?: string
}

interface SnoozeReturnedDetail {
  conversationId: string
  customerName?: string
  channel?: ChannelSource | string
}

interface ChidiActionDetail {
  summary: string
  channel?: ChannelSource | string
}

interface MentionAssignedDetail {
  from: string
  channel?: ChannelSource | string
  conversationId?: string
}

function asChannel(v: unknown): ChannelSource | undefined {
  if (typeof v !== "string") return undefined
  const u = v.toUpperCase()
  if (u === "WHATSAPP" || u === "TELEGRAM" || u === "INSTAGRAM" || u === "SMS") return u
  return undefined
}

function channelLabel(c?: ChannelSource | string): string {
  const ch = asChannel(c)
  if (ch === "WHATSAPP") return "WhatsApp"
  if (ch === "TELEGRAM") return "Telegram"
  if (ch === "INSTAGRAM") return "Instagram"
  if (ch === "SMS") return "SMS"
  return "your"
}

export function wireNotificationProducers(): () => void {
  if (!isBrowser()) return () => {}
  if (producersWired) return () => {}
  producersWired = true

  const onPaymentConfirmed = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as PaymentConfirmedDetail
    const customer = detail.customerName || detail.customer || "your customer"
    const ch = channelLabel(detail.channel)
    const amount = detail.amount != null ? ` (₦${detail.amount})` : ""
    addNotification("payment_confirmed", {
      title: `✓ Payment from ${customer} on ${ch}`,
      body: amount ? `Marked received${amount}.` : "Marked received.",
      channel: asChannel(detail.channel),
      ref: detail.orderId ? { type: "order", id: detail.orderId } : undefined,
    })
  }

  const onSnoozeReturned = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as SnoozeReturnedDetail
    const customer = detail.customerName || "A customer"
    const ch = channelLabel(detail.channel)
    addNotification("snooze_returned", {
      title: `${customer} is back in your ${ch} inbox`,
      body: "The snooze window ended. Pick it up when you can.",
      channel: asChannel(detail.channel),
      ref: { type: "conversation", id: detail.conversationId },
    })
  }

  const onChidiAction = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as ChidiActionDetail
    addNotification("chidi_action_taken", {
      title: detail.summary,
      channel: asChannel(detail.channel),
    })
  }

  const onMentionAssigned = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as MentionAssignedDetail
    const ch = channelLabel(detail.channel)
    addNotification("mention_assigned", {
      title: `${detail.from} pulled you into a ${ch} thread`,
      channel: asChannel(detail.channel),
      ref: detail.conversationId
        ? { type: "conversation", id: detail.conversationId }
        : undefined,
    })
  }

  window.addEventListener("chidi:payment-confirmed", onPaymentConfirmed as EventListener)
  window.addEventListener("chidi:snooze-returned", onSnoozeReturned as EventListener)
  window.addEventListener("chidi:chidi-action", onChidiAction as EventListener)
  window.addEventListener("chidi:mention-assigned", onMentionAssigned as EventListener)

  return () => {
    window.removeEventListener("chidi:payment-confirmed", onPaymentConfirmed as EventListener)
    window.removeEventListener("chidi:snooze-returned", onSnoozeReturned as EventListener)
    window.removeEventListener("chidi:chidi-action", onChidiAction as EventListener)
    window.removeEventListener("chidi:mention-assigned", onMentionAssigned as EventListener)
    producersWired = false
  }
}

// =====================================================================
// Helpers used by the dropdown UI
// =====================================================================

export type TimeBucket = "today" | "yesterday" | "older"

export function bucketOf(timestamp: string, now: Date = new Date()): TimeBucket {
  const ts = new Date(timestamp)
  const sameDay =
    ts.getFullYear() === now.getFullYear() &&
    ts.getMonth() === now.getMonth() &&
    ts.getDate() === now.getDate()
  if (sameDay) return "today"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    ts.getFullYear() === yesterday.getFullYear() &&
    ts.getMonth() === yesterday.getMonth() &&
    ts.getDate() === yesterday.getDate()
  if (isYesterday) return "yesterday"
  return "older"
}

export function formatRelative(timestamp: string, now: Date = new Date()): string {
  const ts = new Date(timestamp)
  const diffMs = now.getTime() - ts.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return ts.toLocaleDateString()
}
