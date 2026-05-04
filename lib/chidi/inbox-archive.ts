/**
 * Inbox auto-archive — 60-day quiet sweep with manual override.
 *
 * Rule: a conversation is auto-archived when its `last_message_at` (or
 * `last_activity` fallback) is older than `AUTO_ARCHIVE_DAYS` AND it isn't
 * pinned AND it isn't currently `NEEDS_HUMAN`. Pinning protects forever.
 *
 * Manual overrides are stored in localStorage so the merchant can:
 *   - archive a thread sooner (before the 60-day cutoff hits)
 *   - restore an auto-archived thread back into the live inbox
 *
 * Shape:
 *   chidi:inbox-archive-overrides -> {
 *     [conversationId]: { archivedAt?: ISOString, restoredAt?: ISOString }
 *   }
 *
 * Resolution order: explicit `restoredAt` wins → explicit `archivedAt` wins →
 * fall through to the 60-day age check.
 */

import type { ChannelConversation } from "@/lib/api/messaging"
import { isPinned } from "./inbox-pinned"

const STORAGE_KEY = "chidi:inbox-archive-overrides"

/** Default age cutoff in days. Channel-agnostic. */
export const AUTO_ARCHIVE_DAYS = 60
const AUTO_ARCHIVE_MS = AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000

export interface ArchiveOverride {
  /** Set when the merchant manually archived this thread. */
  archivedAt?: string
  /** Set when the merchant restored an archived thread. Beats `archivedAt`. */
  restoredAt?: string
}

export type ArchiveOverridesStore = Record<string, ArchiveOverride>

type Listener = (store: ArchiveOverridesStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): ArchiveOverridesStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as ArchiveOverridesStore
    return {}
  } catch {
    return {}
  }
}

function write(store: ArchiveOverridesStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota / private mode — silent.
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow listener errors */
    }
  })
}

export function getOverrides(): ArchiveOverridesStore {
  return read()
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function lastMessageMs(conv: ChannelConversation): number {
  const stamp = conv.last_message_at || conv.last_activity || conv.updated_at
  return stamp ? new Date(stamp).getTime() : 0
}

/**
 * Returns true if the conversation should be hidden from the live inbox view
 * (manually archived, or auto-archived by the 60d rule). Pinned + NEEDS_HUMAN
 * threads never archive — they always need to stay visible.
 */
export function isArchived(
  conv: ChannelConversation,
  now: Date = new Date(),
  overrides: ArchiveOverridesStore = read(),
): boolean {
  if (isPinned(conv.id)) return false
  if (conv.status === "NEEDS_HUMAN") return false

  const override = overrides[conv.id]
  if (override?.restoredAt) {
    // Explicit restore — only re-archive when the merchant manually does it,
    // OR the conversation goes silent for another full 60 days after the
    // restore moment (whichever comes later).
    const restoredAt = new Date(override.restoredAt).getTime()
    const lastTouch = lastMessageMs(conv)
    if (lastTouch > restoredAt) return false // new activity since restore
    return now.getTime() - restoredAt >= AUTO_ARCHIVE_MS
  }
  if (override?.archivedAt) return true

  const lastTouch = lastMessageMs(conv)
  if (!lastTouch) return false
  return now.getTime() - lastTouch >= AUTO_ARCHIVE_MS
}

/** Manually archive a conversation immediately (skips the 60d cutoff). */
export function manualArchive(conversationId: string): void {
  const store = read()
  store[conversationId] = {
    ...store[conversationId],
    archivedAt: new Date().toISOString(),
    restoredAt: undefined,
  }
  write(store)
}

/** Restore an archived conversation (manual or auto) back to the live inbox. */
export function restore(conversationId: string): void {
  const store = read()
  store[conversationId] = {
    ...store[conversationId],
    restoredAt: new Date().toISOString(),
    archivedAt: undefined,
  }
  write(store)
}

/**
 * Drop the override entry entirely so the conversation falls back to the pure
 * 60-day rule. Useful for "reset to default" UX (not surfaced today, but cheap
 * to expose later).
 */
export function clearOverride(conversationId: string): void {
  const store = read()
  if (!(conversationId in store)) return
  delete store[conversationId]
  write(store)
}

export interface ArchiveStats {
  /** Count of conversations currently archived (auto + manual). */
  archived: number
  /** Count of conversations with a manual archive override. */
  manualOverrides: number
  /** Count of conversations with a manual restore override. */
  restoreOverrides: number
  /** ISO date of the cutoff — anything older auto-archives. */
  cutoffISO: string
}

/**
 * Stats for the Archive surface header / debug. Pass the current
 * conversation list to count how many will be filtered out today.
 */
export function getArchiveStats(
  conversations: ChannelConversation[] = [],
  now: Date = new Date(),
): ArchiveStats {
  const overrides = read()
  let archived = 0
  let manualOverrides = 0
  let restoreOverrides = 0
  for (const o of Object.values(overrides)) {
    if (o.archivedAt) manualOverrides++
    if (o.restoredAt) restoreOverrides++
  }
  for (const conv of conversations) {
    if (isArchived(conv, now, overrides)) archived++
  }
  const cutoff = new Date(now.getTime() - AUTO_ARCHIVE_MS)
  return {
    archived,
    manualOverrides,
    restoreOverrides,
    cutoffISO: cutoff.toISOString(),
  }
}

/**
 * Split a conversation list into `live` (visible in default inbox) and
 * `archived` (60d quiet OR manually archived). Cheap O(n) — call once per
 * render with the same `now`.
 */
export function partitionByArchive(
  conversations: ChannelConversation[],
  now: Date = new Date(),
): { live: ChannelConversation[]; archived: ChannelConversation[] } {
  const overrides = read()
  const live: ChannelConversation[] = []
  const archived: ChannelConversation[] = []
  for (const conv of conversations) {
    if (isArchived(conv, now, overrides)) archived.push(conv)
    else live.push(conv)
  }
  return { live, archived }
}
