/**
 * Auto-archive for fulfilled orders — Arc-style "tidy as you go."
 *
 * Rule:
 *   A fulfilled order auto-collapses into "Past orders" when:
 *     - status === FULFILLED
 *     - fulfilled_at > 30 days ago
 *     - NOT pinned (pinned orders are explicitly kept active by the merchant)
 *
 * Manual override:
 *   The merchant can archive sooner ("park it now") or restore an
 *   auto-archived order back into the active fulfilled list. Overrides are
 *   stored per-orderId in localStorage.
 *
 *   chidi:orders-archive-overrides -> { [orderId]: "archived" | "restored" }
 *
 *   - "archived": force-show in Past orders even if < 30 days old
 *   - "restored": force-show in active even if > 30 days old
 *
 * `isArchived(order)` is the single source of truth for which side an order
 * lands on. Pinned beats archive — a pinned-but-old order stays active.
 */

import { isPinned } from "./orders-pinned"
import type { Order } from "@/lib/api/orders"

const STORAGE_KEY = "chidi:orders-archive-overrides"
export const ARCHIVE_AGE_DAYS = 30
const ARCHIVE_AGE_MS = ARCHIVE_AGE_DAYS * 86_400_000

export type ArchiveOverride = "archived" | "restored"
type OverrideStore = Record<string, ArchiveOverride>

type Listener = (store: OverrideStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): OverrideStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as OverrideStore
    return {}
  } catch {
    return {}
  }
}

function write(store: OverrideStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota / private mode — silent */
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow */
    }
  })
}

export function getOverride(orderId: string): ArchiveOverride | null {
  return read()[orderId] ?? null
}

/**
 * The single decision point: should this order live in Past orders?
 *
 * Order of precedence:
 *   1. Pinned -> never archived (merchant explicitly wants it visible)
 *   2. Manual override "restored" -> active
 *   3. Manual override "archived"  -> archived
 *   4. Age-based default (fulfilled > 30 days ago) -> archived
 *   5. Otherwise active
 */
export function isArchived(order: Order, now: Date = new Date()): boolean {
  if (order.status !== "FULFILLED") return false
  if (isPinned(order.id)) return false

  const override = getOverride(order.id)
  if (override === "restored") return false
  if (override === "archived") return true

  if (!order.fulfilled_at) return false
  const fulfilledAt = new Date(order.fulfilled_at).getTime()
  if (Number.isNaN(fulfilledAt)) return false
  return now.getTime() - fulfilledAt > ARCHIVE_AGE_MS
}

/** Force this order into Past orders right now (merchant tidy-up). */
export function manualArchive(orderId: string): void {
  if (!orderId) return
  const store = read()
  if (store[orderId] === "archived") return
  store[orderId] = "archived"
  write(store)
}

/** Pull an order back into the active fulfilled list. */
export function restore(orderId: string): void {
  if (!orderId) return
  const store = read()
  // If they restore a recent order that wasn't archived anyway, just clear
  // any prior override so it falls through to the age-based default.
  if (store[orderId] === "restored") return
  store[orderId] = "restored"
  write(store)
}

/** Drop any explicit override; order goes back to age-based default. */
export function clearOverride(orderId: string): void {
  if (!orderId) return
  const store = read()
  if (!(orderId in store)) return
  delete store[orderId]
  write(store)
}

export interface ArchiveStats {
  /** Total fulfilled orders considered (across active + archived) */
  totalFulfilled: number
  /** How many fall under Past orders right now */
  archivedCount: number
  /** How many remain in the active fulfilled list */
  activeCount: number
}

export function getArchiveStats(orders: Order[], now: Date = new Date()): ArchiveStats {
  let totalFulfilled = 0
  let archivedCount = 0
  for (const o of orders) {
    if (o.status !== "FULFILLED") continue
    totalFulfilled++
    if (isArchived(o, now)) archivedCount++
  }
  return {
    totalFulfilled,
    archivedCount,
    activeCount: totalFulfilled - archivedCount,
  }
}

/** Subscribe to override-store changes. Returns unsubscribe fn. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
