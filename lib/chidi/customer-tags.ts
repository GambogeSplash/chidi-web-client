/**
 * Customer tags + private notes — local-only persistence.
 *
 * Channel-agnostic: keyed by customerId (which is already the channel-prefixed
 * identifier from the messaging API), so a Telegram customer and a WhatsApp
 * customer never collide.
 *
 * Shape:
 *   chidi:customer-tags -> { [customerId]: { tags: string[], note: string, updatedAt } }
 *
 * Why local: this is the merchant's private CRM scratchpad. The backend will
 * eventually own canonical tags; until then this gives the UI real persistence
 * without a network round-trip.
 */

const STORAGE_KEY = "chidi:customer-tags"

export interface CustomerTagsEntry {
  tags: string[]
  note: string
  updatedAt: string
}

export type CustomerTagsStore = Record<string, CustomerTagsEntry>

type Listener = (store: CustomerTagsStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function read(): CustomerTagsStore {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as CustomerTagsStore
    return {}
  } catch {
    return {}
  }
}

function write(store: CustomerTagsStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* swallow quota errors */
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* swallow listener errors */
    }
  })
}

export function getEntry(customerId: string): CustomerTagsEntry {
  const store = read()
  return store[customerId] ?? { tags: [], note: "", updatedAt: "" }
}

export function setTags(customerId: string, tags: string[]): void {
  if (!customerId) return
  const store = read()
  const cleaned = uniqueClean(tags)
  store[customerId] = {
    tags: cleaned,
    note: store[customerId]?.note ?? "",
    updatedAt: new Date().toISOString(),
  }
  write(store)
}

export function addTag(customerId: string, tag: string): CustomerTagsEntry {
  const trimmed = tag.trim()
  if (!customerId || !trimmed) return getEntry(customerId)
  const current = getEntry(customerId)
  if (current.tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
    return current
  }
  const next = uniqueClean([...current.tags, trimmed])
  setTags(customerId, next)
  return getEntry(customerId)
}

export function removeTag(customerId: string, tag: string): CustomerTagsEntry {
  if (!customerId) return getEntry(customerId)
  const current = getEntry(customerId)
  const next = current.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase())
  setTags(customerId, next)
  return getEntry(customerId)
}

export function setNote(customerId: string, note: string): void {
  if (!customerId) return
  const store = read()
  store[customerId] = {
    tags: store[customerId]?.tags ?? [],
    note,
    updatedAt: new Date().toISOString(),
  }
  write(store)
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function uniqueClean(tags: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of tags) {
    const t = raw.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/**
 * Suggested tag pills — channel-agnostic Lagos retail. Order is intentional:
 * commercial behaviors first, payment behaviors second, geography last so the
 * merchant scans top-down by importance.
 */
export const SUGGESTED_TAGS: string[] = [
  "Wholesaler",
  "Repeat",
  "VIP",
  "Cash only",
  "Transfer only",
  "Late payer",
  "Lagos Mainland",
  "Lagos Island",
]
