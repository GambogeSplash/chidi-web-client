/**
 * Per-product reorder threshold overrides.
 *
 * Why a separate store?
 *   The backend serves a single low_stock_threshold per product, but the
 *   merchant often wants to nudge "alert me sooner on this fast mover" without
 *   waiting for a backend round-trip. This local override layers on top: any
 *   product with an entry here uses that number; otherwise we fall back to the
 *   product's own backend threshold (which itself defaults to the global
 *   business preference).
 *
 * Storage:
 *   chidi:reorder-thresholds -> { [productId]: number }
 *
 * Lifecycle:
 *   - `getThreshold(id, fallback)` — number override, or fallback if unset
 *   - `setThreshold(id, n)` — saves; clamps to >= 0
 *   - `clear(id)` — removes the override (revert to fallback)
 *   - `subscribe(cb)` — fan-out to React components on change
 */

const STORAGE_KEY = "chidi:reorder-thresholds"

export type ReorderThresholdStore = Record<string, number>

type Listener = (store: ReorderThresholdStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): ReorderThresholdStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      const out: ReorderThresholdStore = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
          out[k] = Math.floor(v)
        }
      }
      return out
    }
    return {}
  } catch {
    return {}
  }
}

function write(store: ReorderThresholdStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota / private mode — override is convenience, not data.
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow listener errors */
    }
  })
}

/** Returns the current per-product override store. */
export function getStore(): ReorderThresholdStore {
  return read()
}

/**
 * Returns the threshold to use for a product. If the merchant has set an
 * override locally, returns that; otherwise returns `fallbackGlobal` (which
 * the caller should pass as the product's own backend low_stock_threshold).
 */
export function getThreshold(productId: string, fallbackGlobal: number): number {
  if (!productId) return fallbackGlobal
  const store = read()
  const override = store[productId]
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override
  }
  return fallbackGlobal
}

/** Returns true if the product has a per-product override (not the fallback). */
export function hasOverride(productId: string): boolean {
  if (!productId) return false
  const store = read()
  return typeof store[productId] === "number"
}

/** Set (or replace) the per-product threshold override. */
export function setThreshold(productId: string, n: number): void {
  if (!productId) return
  if (!Number.isFinite(n) || n < 0) return
  const store = read()
  store[productId] = Math.floor(n)
  write(store)
}

/** Remove the per-product override (revert to the fallback). */
export function clear(productId: string): void {
  if (!productId) return
  const store = read()
  if (!(productId in store)) return
  delete store[productId]
  write(store)
}

/** Subscribe to override-store changes. Returns unsubscribe fn. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
