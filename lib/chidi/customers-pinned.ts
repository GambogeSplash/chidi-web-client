/**
 * Pinned customers — Arc-style "keep this within reach" for the Customers surface.
 *
 * Why pin instead of star/favorite?
 *   Pinning is action-oriented: "keep this person at the top while I work them."
 *   Stars accumulate forever; pins are deliberately scarce and ephemeral.
 *
 * Why a hard cap of 12?
 *   Customers naturally collect more "tier-A" relationships than orders do
 *   (a wholesaler, a couple of repeat VIPs, a press contact, a personal
 *   shopper, etc.) so the cap is slightly higher than the orders/inventory
 *   pin caps. Past 12 the section becomes a mini-Rolodex rather than a
 *   shortcut. Oldest pin drops off when a new one is added.
 *
 * Key choice:
 *   We pin by `customer.phone` because that's the stable customer key in
 *   the mock-data + analytics responses (no separate customer id exists).
 *
 * Storage:
 *   chidi:customers-pinned -> string[] of customer phones, newest pin first
 *
 * Lifecycle:
 *   - `pin(phone)`       — adds to front; if length > MAX, oldest drops
 *   - `unpin(phone)`     — removes the entry
 *   - `togglePin(phone)` — convenience wrapper for the row UI
 *   - `isPinned(phone)`  — fast boolean check
 *   - `subscribe(cb)`    — fan-out to React components on change
 */

const STORAGE_KEY = "chidi:customers-pinned"
export const MAX_PINNED_CUSTOMERS = 12

type Listener = (phones: string[]) => void
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

function write(phones: string[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(phones))
  } catch {
    // Quota / private mode — pin is convenience, not data.
  }
  listeners.forEach((cb) => {
    try {
      cb(phones)
    } catch {
      /* swallow listener errors */
    }
  })
}

/** Returns the current pinned-customer phone list (newest first). */
export function getPinned(): string[] {
  return read()
}

export function isPinned(phone: string): boolean {
  return read().includes(phone)
}

/** Pin a customer by phone. No-op if already pinned. */
export function pin(phone: string): string[] {
  if (!phone) return read()
  const current = read()
  if (current.includes(phone)) return current
  const next = [phone, ...current].slice(0, MAX_PINNED_CUSTOMERS)
  write(next)
  return next
}

/** Unpin a customer by phone. No-op if not pinned. */
export function unpin(phone: string): string[] {
  if (!phone) return read()
  const current = read()
  if (!current.includes(phone)) return current
  const next = current.filter((x) => x !== phone)
  write(next)
  return next
}

/** Toggle the pin state. Returns the new pinned state of the phone. */
export function togglePin(phone: string): boolean {
  if (isPinned(phone)) {
    unpin(phone)
    return false
  }
  pin(phone)
  return true
}

/** Subscribe to pin-list changes. Returns unsubscribe fn. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
