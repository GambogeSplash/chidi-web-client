/**
 * Spaces — multi-business workspace switcher.
 *
 * Local-only for now. Real multi-tenant memberships live backend-side
 * (organization → membership → business), but the merchant-facing switcher
 * UX only needs a small list of {id, name, slug, color} entries to feel
 * complete. Once the API exists this file becomes a thin adapter; the rest
 * of the UI doesn't need to change.
 *
 * Channel-agnostic by design — a "space" is just a shop. Whether it talks
 * to customers over WhatsApp, Telegram, or both is a per-space concern that
 * the channel views handle on their own.
 *
 * Storage shape (chidi:spaces):
 *   [{ id, name, slug, color, avatarSeed, pinnedAt }]
 *
 * Active-space pointer (chidi:active-space):
 *   "<spaceId>"
 *
 * Events:
 *   chidi:spaces-changed  — list mutated (add/remove/rename)
 *   chidi:space-switched  — active space changed; detail = { space }
 *   chidi:accent-changed  — convenience event for the theme provider; detail = { color }
 */

const SPACES_KEY = "chidi:spaces"
const ACTIVE_KEY = "chidi:active-space"

/** Seven warm accents — drawn from the Lagos-paper palette so any choice
 *  still feels "Chidi". Never raw chartreuse or neon — we're a paper-warm
 *  brand, not a neon dashboard. */
export const SPACE_ACCENTS = [
  { id: "sunset", value: "#E55B3C", label: "Sunset" },
  { id: "honey", value: "#E8A33D", label: "Honey" },
  { id: "sage", value: "#7FB47F", label: "Sage" },
  { id: "royal", value: "#3B5FB5", label: "Royal" },
  { id: "plum", value: "#9B6FAF", label: "Plum" },
  { id: "teal", value: "#2DA1A5", label: "Teal" },
] as const

export type SpaceAccentId = (typeof SPACE_ACCENTS)[number]["id"]

export interface Space {
  id: string
  name: string
  /** URL slug — what gets pushed into router.push(`/dashboard/${slug}`). */
  slug: string
  /** Accent color hex — propagated to the theme provider via chidi:accent-changed. */
  color: string
  /** Avatar seed — passed to BusinessAvatar so the same name always renders the
   *  same generative mark. */
  avatarSeed: string
  /** ISO timestamp — kept for future "favorites" reordering. */
  pinnedAt: string
}

type Listener = (spaces: Space[]) => void
const listeners = new Set<Listener>()

function safeRead(): Space[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SPACES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is Space =>
        s &&
        typeof s === "object" &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        typeof s.slug === "string" &&
        typeof s.color === "string",
    )
  } catch {
    return []
  }
}

function safeWrite(spaces: Space[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SPACES_KEY, JSON.stringify(spaces))
    window.dispatchEvent(new CustomEvent("chidi:spaces-changed"))
    listeners.forEach((cb) => {
      try {
        cb(spaces)
      } catch {
        // noop
      }
    })
  } catch {
    // localStorage full / private mode — no-op
  }
}

export function listSpaces(): Space[] {
  return safeRead()
}

/**
 * Seed the demo spaces on first load. The current authed business is always
 * the FIRST/primary space. Two mock peer-spaces follow so the switcher has
 * something to show — they're inert (no real data) but route-clickable to
 * demonstrate the UX.
 */
export function ensureSeeded(currentBusiness: { name: string; slug: string }): Space[] {
  const existing = safeRead()
  // Always reconcile the primary space with the current authed business so
  // that if the merchant renames their shop, the switcher reflects it.
  const primaryId = "space-primary"
  const primary: Space = {
    id: primaryId,
    name: currentBusiness.name,
    slug: currentBusiness.slug,
    color: SPACE_ACCENTS[1].value, // honey — the chidi-win warm tone
    avatarSeed: currentBusiness.name,
    pinnedAt: new Date(0).toISOString(),
  }

  if (existing.length > 0) {
    // Update primary in place if name/slug drifted.
    const next = existing.map((s) => (s.id === primaryId ? { ...s, name: primary.name, slug: primary.slug } : s))
    if (!next.some((s) => s.id === primaryId)) {
      next.unshift(primary)
      safeWrite(next)
      return next
    }
    safeWrite(next)
    return next
  }

  const seeded: Space[] = [
    primary,
    {
      id: "space-tola",
      name: "Tola Fashion",
      slug: "tola-fashion",
      color: SPACE_ACCENTS[3].value, // royal
      avatarSeed: "Tola Fashion",
      pinnedAt: new Date(1).toISOString(),
    },
    {
      id: "space-edison",
      name: "Edison Electronics",
      slug: "edison-electronics",
      color: SPACE_ACCENTS[5].value, // teal
      avatarSeed: "Edison Electronics",
      pinnedAt: new Date(2).toISOString(),
    },
  ]
  safeWrite(seeded)
  return seeded
}

export function getActiveSpaceId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACTIVE_KEY)
}

export function setActiveSpaceId(id: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ACTIVE_KEY, id)
  const space = safeRead().find((s) => s.id === id)
  if (space) {
    window.dispatchEvent(new CustomEvent("chidi:space-switched", { detail: { space } }))
    window.dispatchEvent(new CustomEvent("chidi:accent-changed", { detail: { color: space.color } }))
  }
}

export interface AddSpaceInput {
  name: string
  color: string
}

export function addSpace(input: AddSpaceInput): Space {
  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `shop-${Date.now().toString(36)}`
  const space: Space = {
    id: `space-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim() || "New shop",
    slug,
    color: input.color,
    avatarSeed: input.name.trim() || "New shop",
    pinnedAt: new Date().toISOString(),
  }
  const next = [...safeRead(), space]
  safeWrite(next)
  return space
}

export function removeSpace(id: string) {
  const next = safeRead().filter((s) => s.id !== id)
  safeWrite(next)
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  if (typeof window !== "undefined") {
    const onEvt = () => cb(safeRead())
    window.addEventListener("chidi:spaces-changed", onEvt)
    window.addEventListener("storage", onEvt)
    return () => {
      listeners.delete(cb)
      window.removeEventListener("chidi:spaces-changed", onEvt)
      window.removeEventListener("storage", onEvt)
    }
  }
  return () => {
    listeners.delete(cb)
  }
}

export const SPACES_STORAGE_KEY = SPACES_KEY
export const ACTIVE_SPACE_STORAGE_KEY = ACTIVE_KEY
