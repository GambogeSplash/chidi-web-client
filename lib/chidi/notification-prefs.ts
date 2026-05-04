/**
 * Notification channel routing — per-type matrix of which channel each
 * kind of notification fans out to (push / email / WhatsApp). Replaces
 * the single global notification toggle that used to live in user-settings.
 *
 * Shape:
 *   chidi:notification-prefs -> {
 *     prefs:    { [type]: { push, email, whatsapp } },
 *     quietHours: { enabled, start, end }
 *   }
 *
 * Defaults (per spec): push on, email off, whatsapp on for high-priority
 * types (new_order, payment_pending, mention_assigned). Lower-priority
 * types (low_stock, snooze_returned, chidi_action_taken) get push only.
 */

import type { ChidiNotificationType } from "./notifications"

const STORAGE_KEY = "chidi:notification-prefs"

export type NotifChannel = "push" | "email" | "whatsapp"

export interface ChannelMatrix {
  push: boolean
  email: boolean
  whatsapp: boolean
}

export interface QuietHours {
  enabled: boolean
  start: string // "HH:MM"
  end: string // "HH:MM"
}

/** Notification types the merchant can route. Mirrors `notifications.ts`
 *  but excludes payment_confirmed (informational receipt — always pushes). */
export const ROUTED_TYPES: ChidiNotificationType[] = [
  "new_order",
  "payment_pending",
  "low_stock",
  "snooze_returned",
  "chidi_action_taken",
  "mention_assigned",
]

export const TYPE_LABELS: Record<ChidiNotificationType, string> = {
  new_order: "New order",
  payment_pending: "Payment pending",
  payment_confirmed: "Payment confirmed",
  low_stock: "Low stock",
  snooze_returned: "Snoozed customer returns",
  chidi_action_taken: "Chidi took action",
  mention_assigned: "Mentions and handoffs",
}

/** High-priority — gets WhatsApp + push by default. */
const HIGH_PRIORITY = new Set<ChidiNotificationType>([
  "new_order",
  "payment_pending",
  "mention_assigned",
])

export interface NotificationPrefsStore {
  prefs: Partial<Record<ChidiNotificationType, ChannelMatrix>>
  quietHours: QuietHours
}

type Listener = (store: NotificationPrefsStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function defaultMatrix(type: ChidiNotificationType): ChannelMatrix {
  const high = HIGH_PRIORITY.has(type)
  return {
    push: true,
    email: false,
    whatsapp: high,
  }
}

function defaultStore(): NotificationPrefsStore {
  const prefs: Partial<Record<ChidiNotificationType, ChannelMatrix>> = {}
  for (const t of ROUTED_TYPES) {
    prefs[t] = defaultMatrix(t)
  }
  return {
    prefs,
    quietHours: { enabled: false, start: "22:00", end: "07:00" },
  }
}

function read(): NotificationPrefsStore {
  if (!isBrowser()) return defaultStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return defaultStore()
    // Merge with defaults so newly-added types pick up sane prefs.
    const base = defaultStore()
    const merged: NotificationPrefsStore = {
      prefs: { ...base.prefs, ...(parsed.prefs ?? {}) },
      quietHours: { ...base.quietHours, ...(parsed.quietHours ?? {}) },
    }
    return merged
  } catch {
    return defaultStore()
  }
}

function write(store: NotificationPrefsStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* swallow quota */
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* ignore */
    }
  })
}

export function getPrefs(): NotificationPrefsStore {
  return read()
}

export function setChannel(
  type: ChidiNotificationType,
  channel: NotifChannel,
  enabled: boolean,
): void {
  const store = read()
  const current = store.prefs[type] ?? defaultMatrix(type)
  store.prefs[type] = { ...current, [channel]: enabled }
  write(store)
}

export function setQuietHours(qh: Partial<QuietHours>): void {
  const store = read()
  store.quietHours = { ...store.quietHours, ...qh }
  write(store)
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  cb(read())
  return () => listeners.delete(cb)
}

export function defaultMatrixFor(type: ChidiNotificationType): ChannelMatrix {
  return defaultMatrix(type)
}
