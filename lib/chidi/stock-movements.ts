/**
 * Stock movements ledger — auditable record of every stock-quantity change.
 *
 * Why a ledger?
 *   "Why is my stock count wrong?" is the #1 reason a merchant stops trusting
 *   their inventory. A movement record per change gives them a chronological
 *   answer: received 12 from supplier, sold 3, marked 1 damaged.
 *
 * Why local?
 *   Backend will eventually own this. Until then, every adjustment from the
 *   inline editable cell + every manual entry from the panel form lands here so
 *   the UI can show real continuity instead of a black box.
 *
 * Storage:
 *   chidi:stock-movements -> StockMovement[] (newest first)
 *   Capped at MAX_MOVEMENTS — oldest pruned.
 *
 * Seeding:
 *   On first ever read (no key in storage), we drop in 5–10 deterministic
 *   demo movements per product so the panel never opens to an empty state on
 *   a freshly-loaded demo. Seeded movements span the last ~14 days.
 */

const STORAGE_KEY = "chidi:stock-movements"
const SEEDED_FLAG = "chidi:stock-movements:seeded"
export const MAX_MOVEMENTS = 500

export type StockMovementKind = "received" | "sold" | "damaged" | "adjustment"

export interface StockMovement {
  id: string
  productId: string
  kind: StockMovementKind
  /** Signed quantity. Positive for received/positive adjustment, negative for sold/damaged/negative adjustment. */
  qty: number
  note?: string
  /** Unix ms timestamp. */
  at: number
}

type Listener = (movements: StockMovement[]) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): StockMovement[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: StockMovement[] = []
    for (const v of parsed) {
      if (
        v &&
        typeof v === "object" &&
        typeof v.id === "string" &&
        typeof v.productId === "string" &&
        typeof v.qty === "number" &&
        typeof v.at === "number" &&
        (v.kind === "received" || v.kind === "sold" || v.kind === "damaged" || v.kind === "adjustment")
      ) {
        out.push({
          id: v.id,
          productId: v.productId,
          kind: v.kind,
          qty: v.qty,
          note: typeof v.note === "string" ? v.note : undefined,
          at: v.at,
        })
      }
    }
    return out
  } catch {
    return []
  }
}

function write(movements: StockMovement[]): void {
  if (!isBrowser()) return
  // Keep newest first, cap at MAX_MOVEMENTS.
  const next = movements.slice(0, MAX_MOVEMENTS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota / private mode — ledger is best-effort.
  }
  listeners.forEach((cb) => {
    try {
      cb(next)
    } catch {
      /* swallow listener errors */
    }
  })
}

function makeId(): string {
  // crypto.randomUUID isn't available in every test env; mix time + random.
  return `mv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Append a movement record. Returns the created movement. */
export function recordMovement(
  productId: string,
  kind: StockMovementKind,
  qty: number,
  note?: string,
): StockMovement | null {
  if (!productId || !Number.isFinite(qty) || qty === 0) return null
  const m: StockMovement = {
    id: makeId(),
    productId,
    kind,
    qty: Math.trunc(qty),
    note: note?.trim() ? note.trim() : undefined,
    at: Date.now(),
  }
  const current = read()
  write([m, ...current])
  return m
}

/** Returns movements for a single product, newest first. */
export function getMovements(productId: string): StockMovement[] {
  if (!productId) return []
  return read().filter((m) => m.productId === productId)
}

/** Returns ALL movements, newest first. */
export function getAllMovements(): StockMovement[] {
  return read()
}

/** Subscribe to ledger changes. Returns unsubscribe fn. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Seed demo movements per product on first ever load. Idempotent: gated by
 * SEEDED_FLAG so subsequent loads (or same-session re-mounts) don't multiply
 * the ledger. Uses a deterministic hash per productId so the same demo product
 * always shows the same history across reloads.
 */
export function seedDemoMovementsIfNeeded(productIds: string[]): void {
  if (!isBrowser() || productIds.length === 0) return
  try {
    if (window.localStorage.getItem(SEEDED_FLAG)) return
  } catch {
    return
  }

  const now = Date.now()
  const dayMs = 86_400_000
  const seeded: StockMovement[] = []

  for (const id of productIds) {
    // Hash productId → deterministic seed
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i)
    const seed = Math.abs(h)
    const count = 5 + (seed % 6) // 5–10 movements

    for (let i = 0; i < count; i++) {
      const r = (seed * (i + 7)) >>> 0
      const kindIdx = r % 4
      const kind: StockMovementKind =
        kindIdx === 0 ? "received" : kindIdx === 1 ? "sold" : kindIdx === 2 ? "damaged" : "adjustment"

      // Magnitudes: receivers come in larger, damages small.
      const baseQty =
        kind === "received" ? 5 + (r % 20) :
        kind === "sold" ? 1 + (r % 5) :
        kind === "damaged" ? 1 + (r % 2) :
        1 + (r % 4)

      const sign = kind === "received" ? 1 : kind === "adjustment" ? (r % 2 === 0 ? 1 : -1) : -1
      const qty = sign * baseQty

      const daysAgo = (((seed >> (i + 1)) % 14) + i * 0.7)
      const at = now - Math.floor(daysAgo * dayMs) - ((r % 6) * 3_600_000)

      const note =
        kind === "received" ? "Restock from supplier" :
        kind === "sold" ? undefined :
        kind === "damaged" ? "Found damaged in storage" :
        "Manual adjustment"

      seeded.push({
        id: `seed_${id.slice(-6)}_${i}`,
        productId: id,
        kind,
        qty,
        note,
        at,
      })
    }
  }

  // Newest first — sort by `at` descending.
  seeded.sort((a, b) => b.at - a.at)
  const merged = [...seeded, ...read()].slice(0, MAX_MOVEMENTS)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    window.localStorage.setItem(SEEDED_FLAG, "1")
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => {
    try {
      cb(merged)
    } catch {
      /* swallow */
    }
  })
}

/** Human label for a movement kind — single source of truth for UI copy. */
export const MOVEMENT_LABELS: Record<StockMovementKind, string> = {
  received: "Received",
  sold: "Sold",
  damaged: "Damaged",
  adjustment: "Adjustment",
}
