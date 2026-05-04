/**
 * Deliveries — Phase 1 local delivery handoff state.
 *
 * The merchant marks an order fulfilled, then chooses *how* it gets to the
 * customer: their own rider on a bike, a courier (GIG/Sendbox/Kwik/Faramove),
 * or an on-demand provider (Glovo/Bolt). This module owns that record per
 * orderId, persists to localStorage, and broadcasts changes so the orders
 * list, chat tracking widget, and detail panel all stay in sync.
 *
 * Phase-1 scope: no real carrier API. Just structured intent + local state
 * the merchant can read across surfaces. Phase-2 swaps the courier/on-demand
 * choices for live API integrations behind the same shape.
 *
 * Storage shape (chidi:deliveries):
 *   { [orderId]: Delivery }
 *
 * Events:
 *   chidi:delivery-changed — any delivery mutated. detail = { orderId } | null
 */

"use client"

export type DeliveryMode = "own_dispatch" | "courier" | "on_demand"
export type DeliveryStatus = "scheduled" | "out_for_delivery" | "delivered" | "failed"

export type Courier = "GIG" | "SENDBOX" | "KWIK" | "FARAMOVE"
export type OnDemandProvider = "GLOVO" | "BOLT" | "FARAMOVE_ONDEMAND"

export interface Delivery {
  orderId: string
  mode: DeliveryMode
  // own_dispatch
  riderName?: string
  riderPhone?: string
  bikeNumber?: string
  // courier
  courier?: Courier
  trackingNumber?: string
  // on_demand
  provider?: OnDemandProvider
  estimatedArrival?: string // ISO
  // shared
  status: DeliveryStatus
  scheduledAt: string // ISO
  deliveredAt?: string
  notes?: string
}

const STORAGE_KEY = "chidi:deliveries"
export const DELIVERY_CHANGED_EVENT = "chidi:delivery-changed"

type Store = Record<string, Delivery>
type Listener = (orderId: string | null) => void
const listeners = new Set<Listener>()

const isBrowser = (): boolean => typeof window !== "undefined"

function readStore(): Store {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store, changedOrderId: string | null): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or privacy mode — silently no-op; in-memory state still works.
  }
  try {
    window.dispatchEvent(
      new CustomEvent(DELIVERY_CHANGED_EVENT, { detail: { orderId: changedOrderId } }),
    )
  } catch {
    // ignore
  }
  listeners.forEach((cb) => {
    try {
      cb(changedOrderId)
    } catch {
      // noop
    }
  })
}

export function getDelivery(orderId: string): Delivery | null {
  if (!orderId) return null
  return readStore()[orderId] ?? null
}

export function getAllDeliveries(): Delivery[] {
  return Object.values(readStore())
}

/**
 * Upsert. The first call for an orderId must include `mode` and `scheduledAt`
 * to be considered valid; subsequent calls patch any subset of fields.
 */
export function setDelivery(
  orderId: string,
  patch: Partial<Delivery> & { mode?: DeliveryMode },
): Delivery | null {
  if (!orderId) return null
  const store = readStore()
  const existing = store[orderId]
  const nowIso = new Date().toISOString()

  const merged: Delivery = {
    orderId,
    mode: patch.mode ?? existing?.mode ?? "own_dispatch",
    status: patch.status ?? existing?.status ?? "scheduled",
    scheduledAt: patch.scheduledAt ?? existing?.scheduledAt ?? nowIso,
    riderName: patch.riderName ?? existing?.riderName,
    riderPhone: patch.riderPhone ?? existing?.riderPhone,
    bikeNumber: patch.bikeNumber ?? existing?.bikeNumber,
    courier: patch.courier ?? existing?.courier,
    trackingNumber: patch.trackingNumber ?? existing?.trackingNumber,
    provider: patch.provider ?? existing?.provider,
    estimatedArrival: patch.estimatedArrival ?? existing?.estimatedArrival,
    deliveredAt: patch.deliveredAt ?? existing?.deliveredAt,
    notes: patch.notes ?? existing?.notes,
  }
  store[orderId] = merged
  writeStore(store, orderId)
  return merged
}

export function markOutForDelivery(orderId: string): Delivery | null {
  return setDelivery(orderId, { status: "out_for_delivery" })
}

export function markDelivered(orderId: string): Delivery | null {
  return setDelivery(orderId, {
    status: "delivered",
    deliveredAt: new Date().toISOString(),
  })
}

export function clearDelivery(orderId: string): void {
  const store = readStore()
  if (orderId in store) {
    delete store[orderId]
    writeStore(store, orderId)
  }
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  if (isBrowser()) {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<{ orderId: string | null }>).detail
      cb(detail?.orderId ?? null)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) cb(null)
    }
    window.addEventListener(DELIVERY_CHANGED_EVENT, onEvt as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      listeners.delete(cb)
      window.removeEventListener(DELIVERY_CHANGED_EVENT, onEvt as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }
  return () => {
    listeners.delete(cb)
  }
}

// =============================================================================
// Courier + provider catalogues
// =============================================================================

export const COURIERS: Array<{
  id: Courier
  label: string
  /** Brand color used for the tiny pill on order rows. */
  color: string
}> = [
  { id: "GIG", label: "GIG Logistics", color: "#FFC107" },
  { id: "SENDBOX", label: "Sendbox", color: "#0F62FE" },
  { id: "KWIK", label: "Kwik", color: "#FF6F00" },
  { id: "FARAMOVE", label: "Faramove", color: "#1F9D55" },
]

export const ON_DEMAND_PROVIDERS: Array<{
  id: OnDemandProvider
  label: string
  color: string
}> = [
  { id: "GLOVO", label: "Glovo", color: "#FFC244" },
  { id: "BOLT", label: "Bolt", color: "#34D186" },
  { id: "FARAMOVE_ONDEMAND", label: "Faramove on-demand", color: "#1F9D55" },
]

export function courierLabel(id?: Courier | null): string {
  if (!id) return ""
  return COURIERS.find((c) => c.id === id)?.label ?? id
}

export function courierColor(id?: Courier | null): string {
  if (!id) return "#9CA3AF"
  return COURIERS.find((c) => c.id === id)?.color ?? "#9CA3AF"
}

export function providerLabel(id?: OnDemandProvider | null): string {
  if (!id) return ""
  return ON_DEMAND_PROVIDERS.find((p) => p.id === id)?.label ?? id
}

export function providerColor(id?: OnDemandProvider | null): string {
  if (!id) return "#9CA3AF"
  return ON_DEMAND_PROVIDERS.find((p) => p.id === id)?.color ?? "#9CA3AF"
}

// =============================================================================
// Display helpers
// =============================================================================

export function modeLabel(mode: DeliveryMode): string {
  if (mode === "own_dispatch") return "In-house dispatch"
  if (mode === "courier") return "Courier"
  return "On-demand bike"
}

/**
 * Best-effort "12 min" / "1 hr 30 min" string from an ISO timestamp.
 * Returns "" if no timestamp or already past.
 */
export function formatEtaFromIso(iso?: string | null): string {
  if (!iso) return ""
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return "any minute"
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `~${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  if (rem === 0) return `~${hrs} hr`
  return `~${hrs}h ${rem}m`
}

/**
 * Compact one-line status for the order row pill.
 * Examples: "Tunde · ~30 min", "GIG · #ABC123", "Glovo · ~12 min"
 */
export function deliverySummary(d: Delivery): string {
  if (d.mode === "own_dispatch") {
    const who = d.riderName?.trim() || "Rider"
    const eta = formatEtaFromIso(d.estimatedArrival)
    return eta ? `${who} · ${eta}` : who
  }
  if (d.mode === "courier") {
    const c = courierLabel(d.courier) || "Courier"
    if (d.trackingNumber?.trim()) return `${c} · #${d.trackingNumber.trim()}`
    return c
  }
  const p = providerLabel(d.provider) || "On-demand"
  const eta = formatEtaFromIso(d.estimatedArrival)
  return eta ? `${p} · ${eta}` : p
}
