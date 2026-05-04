/**
 * Play staleness — Arc-style "tidy as you go" for the Playbook.
 *
 * Tracks when each play last fired. Plays that haven't run in 30+ days
 * collapse into a "Quiet plays" accordion below "Always running" so the
 * merchant's stage stays focused on what's actually working.
 *
 * Storage:
 *   chidi:plays-last-fired -> { [playId]: ISO timestamp }
 *
 * Lifecycle:
 *   - markFired(playId)  — called by enactment (Today decisions, Always
 *     running plays). Resets the staleness clock.
 *   - getLastFired(id)   — last-fired ISO or null
 *   - isStale(id)        — true if no fire in 30+ days (and we have a record)
 *   - partitionByStaleness(plays) — splits an array into { active, stale }
 *
 * Seeding:
 *   On first read in the browser we plant current-day timestamps for the
 *   first 4 plays (the ones with featured / active states most merchants
 *   would care about). This keeps the demo from starting with EVERYTHING
 *   stale, which would render the Quiet section as the page's default.
 *
 *   Subsequent reads use whatever's in localStorage — the seed only fills
 *   gaps; it never overwrites a real fire.
 *
 * Phase-2 (real backend): replace the localStorage layer with a write to
 * `/api/playbook/plays/:id/fired` and a read from the same endpoint. The
 * helpers' signatures stay identical.
 */

import { PLAYS } from "./playbook-plays"

const STORAGE_KEY = "chidi:plays-last-fired"
export const STALE_DAYS = 30
const STALE_MS = STALE_DAYS * 86_400_000

// First 4 PLAYS get a current-day seed so the demo doesn't open with the
// entire library marked stale. Order matches PLAYS authoring order.
const SEED_COUNT = 4

type Listener = (store: Record<string, string>) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

let didSeed = false

function read(): Record<string, string> {
  if (!isBrowser()) return {}
  let store: Record<string, string> = {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        store = parsed as Record<string, string>
      }
    }
  } catch {
    /* parse failed — start fresh */
  }
  if (!didSeed) {
    didSeed = true
    const nowIso = new Date().toISOString()
    let dirty = false
    for (let i = 0; i < Math.min(SEED_COUNT, PLAYS.length); i++) {
      const pid = PLAYS[i].id
      if (!store[pid]) {
        store[pid] = nowIso
        dirty = true
      }
    }
    if (dirty) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      } catch {
        /* quota / private mode — silent */
      }
    }
  }
  return store
}

function write(store: Record<string, string>): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* silent */
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow listener errors */
    }
  })
}

/** Mark a play as fired right now. Resets its staleness clock. */
export function markFired(playId: string, atIso?: string): void {
  if (!playId) return
  const store = read()
  store[playId] = atIso ?? new Date().toISOString()
  write(store)
}

/** Mark several plays as fired in one go (useful on enactment chains). */
export function markFiredMany(playIds: string[], atIso?: string): void {
  if (!playIds || playIds.length === 0) return
  const store = read()
  const stamp = atIso ?? new Date().toISOString()
  for (const id of playIds) {
    if (id) store[id] = stamp
  }
  write(store)
}

export function getLastFired(playId: string): string | null {
  return read()[playId] ?? null
}

/**
 * A play is stale when:
 *   - we have a recorded last-fired, AND
 *   - it's older than STALE_DAYS.
 *
 * If we have NO record (the merchant has never run it / never seeded), we
 * still consider it stale — a play that has never moved is exactly the
 * kind of thing the Quiet accordion exists to surface.
 */
export function isStale(playId: string): boolean {
  const last = getLastFired(playId)
  if (!last) return true
  const t = new Date(last).getTime()
  if (!Number.isFinite(t)) return true
  return Date.now() - t >= STALE_MS
}

/** Days since the play last fired. Returns null if never fired. */
export function daysSinceFired(playId: string): number | null {
  const last = getLastFired(playId)
  if (!last) return null
  const t = new Date(last).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

/**
 * Friendly "last fired Xd ago" string — handles "today", "Xd", and "never".
 */
export function lastFiredLabel(playId: string): string {
  const days = daysSinceFired(playId)
  if (days === null) return "Hasn't fired yet"
  if (days === 0) return "Fired today"
  if (days === 1) return "Fired 1d ago"
  return `Fired ${days}d ago`
}

/** Partition plays into active vs. stale lists, preserving input order. */
export function partitionByStaleness<T extends { id: string }>(plays: T[]): {
  active: T[]
  stale: T[]
} {
  const active: T[] = []
  const stale: T[] = []
  for (const p of plays) {
    if (isStale(p.id)) stale.push(p)
    else active.push(p)
  }
  return { active, stale }
}

/** Subscribe to last-fired changes. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export const PLAY_STALENESS_STORAGE_KEY = STORAGE_KEY
