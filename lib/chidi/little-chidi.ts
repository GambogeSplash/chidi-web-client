/**
 * Little Chidi — helpers for the Arc-style "Little Arc" peek overlay.
 *
 * This module owns:
 *   - the localStorage `recent peeks` ring (cap 20)
 *   - the last-used tab persistence
 *   - the public `openLittleChidi()` event helper that any surface can fire
 *     to summon the overlay (e.g. a Boost, a notification action, a deep link)
 *
 * Anything visual lives in `components/chidi/little-chidi.tsx`. The provider
 * (`little-chidi-provider.tsx`) wires the global hotkey + portal mount.
 */

export type LittleChidiResultType = "order" | "customer" | "product" | "conversation"

export type LittleChidiTab = "all" | "orders" | "customers" | "products" | "conversations"

export interface RecentPeek {
  type: LittleChidiResultType
  id: string
  title: string
  /** ISO timestamp */
  peekedAt: string
}

const RECENT_KEY = "chidi:little-chidi-recent"
const TAB_KEY = "chidi:little-chidi-tab"
const RECENT_CAP = 20

const isBrowser = () => typeof window !== "undefined"

// =============================================================================
// Recent peeks store
// =============================================================================

export function getRecentPeeks(): RecentPeek[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (p): p is RecentPeek =>
          p &&
          typeof p === "object" &&
          typeof p.id === "string" &&
          typeof p.title === "string" &&
          typeof p.peekedAt === "string" &&
          (p.type === "order" ||
            p.type === "customer" ||
            p.type === "product" ||
            p.type === "conversation"),
      )
      .slice(0, RECENT_CAP)
  } catch {
    return []
  }
}

/**
 * Move a peek to the top of the recent list (or insert it). De-duped by
 * `${type}:${id}` so the same item never appears twice.
 */
export function recordPeek(input: { type: LittleChidiResultType; id: string; title: string }): void {
  if (!isBrowser()) return
  try {
    const current = getRecentPeeks()
    const key = `${input.type}:${input.id}`
    const filtered = current.filter((p) => `${p.type}:${p.id}` !== key)
    const next: RecentPeek[] = [
      { type: input.type, id: input.id, title: input.title, peekedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, RECENT_CAP)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    // Notify any open overlay so the Recent footer refreshes live.
    window.dispatchEvent(new CustomEvent("chidi:little-chidi-recent-changed"))
  } catch {
    // localStorage can throw in private mode / quota errors — silently degrade
  }
}

/**
 * Build a fast lookup map from `${type}:${id}` → recency rank (0 = most recent).
 * Used by the search ranker to boost recently-peeked items.
 */
export function buildRecencyMap(): Map<string, number> {
  const peeks = getRecentPeeks()
  const map = new Map<string, number>()
  peeks.forEach((p, i) => {
    map.set(`${p.type}:${p.id}`, i)
  })
  return map
}

// =============================================================================
// Last-used tab
// =============================================================================

const VALID_TABS: LittleChidiTab[] = ["all", "orders", "customers", "products", "conversations"]

export function getLastTab(): LittleChidiTab {
  if (!isBrowser()) return "all"
  try {
    const raw = window.localStorage.getItem(TAB_KEY)
    if (raw && (VALID_TABS as string[]).includes(raw)) return raw as LittleChidiTab
  } catch {
    /* noop */
  }
  return "all"
}

export function setLastTab(tab: LittleChidiTab): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(TAB_KEY, tab)
  } catch {
    /* noop */
  }
}

// =============================================================================
// Public open helper — any surface can summon Little Chidi
// =============================================================================

export interface OpenLittleChidiOptions {
  /** Optional pre-filled query so callers can deep-link a peek (e.g. "/peek 4521") */
  query?: string
  /** Optional starting tab override */
  tab?: LittleChidiTab
}

export const LITTLE_CHIDI_OPEN_EVENT = "chidi:open-little-chidi"

export function openLittleChidi(options?: OpenLittleChidiOptions): void {
  if (!isBrowser()) return
  window.dispatchEvent(
    new CustomEvent<OpenLittleChidiOptions>(LITTLE_CHIDI_OPEN_EVENT, { detail: options ?? {} }),
  )
}

// =============================================================================
// Hotkey detection — single source of truth so the help overlay + the listener
// agree on what `⌘.` actually means.
// =============================================================================

/** True if the given keydown event is the Little Chidi summon hotkey (⌘. / Ctrl+.). */
export function isLittleChidiHotkey(e: KeyboardEvent): boolean {
  // The event's `.key` is "." even when shift is held; we deliberately do NOT
  // require shift so the gesture stays one-handed.
  if (e.key !== ".") return false
  return !!(e.metaKey || e.ctrlKey)
}

/** True if the given event target is something the merchant is typing into. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}
