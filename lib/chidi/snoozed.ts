/**
 * Snoozed conversations — local-only persistence for "quiet this thread until X".
 *
 * Channel-agnostic: the same store handles WhatsApp + Telegram conversations
 * (and anything we add later). Keys are conversation IDs which already include
 * the channel context, so nothing in here ever needs to branch on channel.
 *
 * Shape:
 *   chidi:snoozed -> { [conversationId]: { until: ISOString, snoozedAt: ISOString } }
 *
 * Lifecycle:
 *   - `snoozeConversation` writes the entry + notifies subscribers
 *   - `unsnoozeConversation` removes it
 *   - `getActiveSnoozes()` filters out entries whose `until` is in the past
 *   - `sweepExpired()` returns the IDs that just expired AND removes them so
 *     callers can fire "back in your inbox" notifications exactly once
 *
 * The poll loop lives in `inbox-view.tsx` (every 30s, honors visibilitychange).
 */

const STORAGE_KEY = "chidi:snoozed"

export interface SnoozeEntry {
  /** ISO timestamp — when the conversation should return to the inbox */
  until: string
  /** ISO timestamp — when the merchant tapped snooze */
  snoozedAt: string
  /** Optional human-readable label for analytics / undo toast */
  label?: string
  /** Channel where this thread lives — kept for the "back in your {channel} inbox" copy */
  channel?: string
  /** Customer display name — for the same notification copy */
  customerName?: string
}

export type SnoozeStore = Record<string, SnoozeEntry>

type Listener = (store: SnoozeStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): SnoozeStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as SnoozeStore
    return {}
  } catch {
    return {}
  }
}

function write(store: SnoozeStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private mode — silently ignore. Snooze is convenience.
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow listener errors */
    }
  })
}

export function getSnoozeStore(): SnoozeStore {
  return read()
}

/** All currently-active snoozes (until is in the future). */
export function getActiveSnoozes(now: Date = new Date()): SnoozeStore {
  const store = read()
  const out: SnoozeStore = {}
  const cutoff = now.getTime()
  for (const [id, entry] of Object.entries(store)) {
    if (new Date(entry.until).getTime() > cutoff) out[id] = entry
  }
  return out
}

export function isSnoozed(conversationId: string, now: Date = new Date()): boolean {
  const entry = read()[conversationId]
  if (!entry) return false
  return new Date(entry.until).getTime() > now.getTime()
}

export function getSnooze(conversationId: string): SnoozeEntry | null {
  const entry = read()[conversationId]
  return entry ?? null
}

export function snoozeConversation(
  conversationId: string,
  until: Date,
  meta: { label?: string; channel?: string; customerName?: string } = {},
): SnoozeEntry {
  const store = read()
  const entry: SnoozeEntry = {
    until: until.toISOString(),
    snoozedAt: new Date().toISOString(),
    ...meta,
  }
  store[conversationId] = entry
  write(store)
  return entry
}

export function unsnoozeConversation(conversationId: string): void {
  const store = read()
  if (!(conversationId in store)) return
  delete store[conversationId]
  write(store)
}

/**
 * Remove every entry whose `until` has already passed. Returns the entries
 * that were just removed so callers can fire one "back in your inbox"
 * notification per expired snooze (idempotent — once removed, won't re-fire).
 */
export function sweepExpired(now: Date = new Date()): Array<{ conversationId: string } & SnoozeEntry> {
  const store = read()
  const expired: Array<{ conversationId: string } & SnoozeEntry> = []
  const cutoff = now.getTime()
  for (const [id, entry] of Object.entries(store)) {
    if (new Date(entry.until).getTime() <= cutoff) {
      expired.push({ conversationId: id, ...entry })
      delete store[id]
    }
  }
  if (expired.length) write(store)
  return expired
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// =====================
// Snooze duration presets — Lagos-friendly defaults.
// =====================

export type SnoozePresetId = "1h" | "4h" | "tomorrow" | "next_mon" | "custom"

export interface SnoozePreset {
  id: SnoozePresetId
  label: string
  /** Returns the absolute "until" date for this preset, or null for custom. */
  resolve: (now?: Date) => Date | null
}

function nextMorningAt(hour: number, base: Date): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d
}

function nextWeekdayAt(targetDay: number, hour: number, base: Date): Date {
  // 0 = Sun, 1 = Mon, ...
  const d = new Date(base)
  const current = d.getDay()
  let delta = (targetDay - current + 7) % 7
  if (delta === 0) delta = 7 // never "today"
  d.setDate(d.getDate() + delta)
  d.setHours(hour, 0, 0, 0)
  return d
}

export const SNOOZE_PRESETS: SnoozePreset[] = [
  { id: "1h", label: "1 hour", resolve: (now = new Date()) => new Date(now.getTime() + 60 * 60 * 1000) },
  { id: "4h", label: "4 hours", resolve: (now = new Date()) => new Date(now.getTime() + 4 * 60 * 60 * 1000) },
  { id: "tomorrow", label: "Tomorrow 9am", resolve: (now = new Date()) => nextMorningAt(9, now) },
  { id: "next_mon", label: "Next Monday 9am", resolve: (now = new Date()) => nextWeekdayAt(1, 9, now) },
  { id: "custom", label: "Custom…", resolve: () => null },
]

export function formatSnoozeUntil(until: string | Date): string {
  const d = typeof until === "string" ? new Date(until) : until
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  if (diffMs <= 0) return "now"
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 60) return `in ${diffMins}m`
  const diffHours = Math.round(diffMs / 3_600_000)
  if (diffHours < 24) return `in ${diffHours}h`
  // tomorrow / specific weekday
  const sameYear = d.getFullYear() === now.getFullYear()
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { weekday: "short", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  return d.toLocaleString(undefined, opts)
}
