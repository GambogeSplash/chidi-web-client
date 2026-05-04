/**
 * Pinned orders — Arc-style "keep this within reach" for the Orders surface.
 *
 * Why pin instead of star/favorite?
 *   Pinning is action-oriented: "keep this above the fold while I work it."
 *   Stars accumulate forever; pins are deliberately scarce and ephemeral.
 *
 * Why a hard cap of 8?
 *   Orders are higher-stakes than chat threads — a pin should mean
 *   "this one specifically needs my eye." Past 8, the section stops being
 *   scannable and starts being a graveyard, so the oldest pin drops off when
 *   a new one is added. Inbox snooze has no cap (it's a queue), but pins are
 *   a slot-based focus surface, like the Arc command bar.
 *
 * Storage:
 *   chidi:orders-pinned -> string[] of orderIds, newest pin first
 *
 * Lifecycle:
 *   - `pin(id)`     — adds to front; if length > MAX, oldest drops
 *   - `unpin(id)`   — removes the entry
 *   - `togglePin(id)` — convenience wrapper for the row UI
 *   - `isPinned(id)`  — fast boolean check
 *   - `subscribe(cb)` — fan-out to React components on change
 */

const STORAGE_KEY = "chidi:orders-pinned"
export const MAX_PINNED_ORDERS = 8

type Listener = (ids: string[]) => void
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
      // Defensive: filter to strings + dedupe while preserving order
      const seen = new Set<string>()
      const out: string[] = []
      for (const v of parsed) {
        if (typeof v === "string" && !seen.has(v)) {
          seen.add(v)
          out.push(v)
        }
      }
      return out
    }
    return []
  } catch {
    return []
  }
}

function write(ids: string[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Quota / private mode — pin is convenience, not data.
  }
  listeners.forEach((cb) => {
    try {
      cb(ids)
    } catch {
      /* swallow listener errors */
    }
  })
}

/** Returns the current pinned-order id list (newest first). */
export function getPinned(): string[] {
  return read()
}

export function isPinned(id: string): boolean {
  return read().includes(id)
}

/** Pin an order. No-op if already pinned (returns existing list). */
export function pin(id: string): string[] {
  if (!id) return read()
  const current = read()
  if (current.includes(id)) return current
  // Newest pin goes to the front so the section ordering matches recency
  // of merchant intent. Drop oldest beyond cap.
  const next = [id, ...current].slice(0, MAX_PINNED_ORDERS)
  write(next)
  return next
}

/** Unpin an order. No-op if not pinned. */
export function unpin(id: string): string[] {
  if (!id) return read()
  const current = read()
  if (!current.includes(id)) return current
  const next = current.filter((x) => x !== id)
  write(next)
  return next
}

/** Toggle the pin state. Returns the new pinned state of the id. */
export function togglePin(id: string): boolean {
  if (isPinned(id)) {
    unpin(id)
    return false
  }
  pin(id)
  return true
}

/** Subscribe to pin-list changes. Returns unsubscribe fn. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
