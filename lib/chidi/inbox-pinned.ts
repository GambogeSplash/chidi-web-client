/**
 * Pinned conversations — local-only, channel-agnostic.
 *
 * The merchant pins WhatsApp / Telegram (or any future channel) threads they
 * want to keep at the top of the Inbox. Stored in localStorage as an ordered
 * list of conversation IDs (most-recently-pinned first). Hard cap at
 * MAX_PINS — when full, the oldest pin is dropped silently so the gesture
 * never feels rejected.
 *
 * Shape:
 *   chidi:inbox-pinned -> string[]
 *
 * Lifecycle:
 *   - `pin(id)` adds (or moves to front)
 *   - `unpin(id)` removes
 *   - `togglePin(id)` flips state, returns new state
 *   - `getPinned()` returns the ordered array (front = most-recently-pinned)
 *   - `subscribe(cb)` notifies on any mutation; returns disposer
 */

const STORAGE_KEY = "chidi:inbox-pinned"

/** Maximum number of pinned conversations. Older pins drop off when exceeded. */
export const MAX_PINS = 12

type Listener = (pinned: string[]) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string")
    }
    return []
  } catch {
    return []
  }
}

function write(pinned: string[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned))
  } catch {
    // Quota or private mode — ignore. Pins are convenience.
  }
  listeners.forEach((cb) => {
    try {
      cb(pinned)
    } catch {
      /* swallow listener errors */
    }
  })
}

/** Returns the ordered list of pinned conversation IDs (front = newest pin). */
export function getPinned(): string[] {
  return read()
}

export function isPinned(conversationId: string): boolean {
  return read().includes(conversationId)
}

/**
 * Pin a conversation. If already pinned, it's moved to the front (recency).
 * Enforces MAX_PINS by trimming the oldest entries.
 */
export function pin(conversationId: string): string[] {
  const current = read()
  const next = [conversationId, ...current.filter((id) => id !== conversationId)]
  if (next.length > MAX_PINS) next.length = MAX_PINS
  write(next)
  return next
}

export function unpin(conversationId: string): string[] {
  const current = read()
  if (!current.includes(conversationId)) return current
  const next = current.filter((id) => id !== conversationId)
  write(next)
  return next
}

/** Flip pin state. Returns true if the conversation is now pinned. */
export function togglePin(conversationId: string): boolean {
  if (isPinned(conversationId)) {
    unpin(conversationId)
    return false
  }
  pin(conversationId)
  return true
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
