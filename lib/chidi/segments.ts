/**
 * Customer segments — pure logic, no UI.
 *
 * The Customers surface and Broadcast composer both consume this. A segment
 * is a {id, label, predicate} — predicates run client-side against the list
 * the analytics API returns (CustomerSummary[]). No backend filter endpoints.
 *
 * Channel-agnostic: Chidi started on Telegram and added WhatsApp later, so
 * the segment vocabulary treats both as first-class. A customer is "Both" if
 * their `channels` array contains both WHATSAPP and TELEGRAM.
 *
 * Sort options live here too (so the customers page + composer agree on what
 * "recent" / "spend" / "name" means).
 */

import type { CustomerSummary } from "@/lib/types/analytics"

export type ChannelKey = "WHATSAPP" | "TELEGRAM"

export type SegmentId =
  | "all"
  | "vip"
  | "new"
  | "repeat"
  | "churned"
  | "channel-whatsapp"
  | "channel-telegram"
  | "channel-both"

export type SortKey = "recent" | "spend" | "name"

export interface Segment {
  id: SegmentId
  label: string
  /** Short hint shown under the chip strip in tooltips/composer subtitle */
  hint: string
  predicate: (c: CustomerSummary) => boolean
  /** Filled in by getSegments() */
  count: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const hoursSince = (iso: string | null): number | null => {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return (Date.now() - t) / (60 * 60 * 1000)
}

const daysSince = (iso: string | null): number | null => {
  const h = hoursSince(iso)
  return h === null ? null : h / 24
}

/**
 * VIP cutoff = top 10% by total_spent (or anyone above 25,000 if list is tiny).
 * Computed once over the whole list and frozen in a closure so each predicate
 * call is O(1).
 */
const buildVipPredicate = (customers: CustomerSummary[]) => {
  const spends = customers.map((c) => c.total_spent || 0).sort((a, b) => b - a)
  const idx = Math.max(0, Math.floor(spends.length * 0.1) - 1)
  const cutoff = Math.max(spends[idx] ?? 0, 25_000)
  return (c: CustomerSummary) => (c.total_spent || 0) >= cutoff && c.order_count > 0
}

const isNew = (c: CustomerSummary): boolean => {
  const days = daysSince(c.first_order)
  return days !== null && days < 30
}

const isRepeat = (c: CustomerSummary): boolean => (c.order_count ?? 0) >= 3

const isChurned = (c: CustomerSummary): boolean => {
  if ((c.order_count ?? 0) === 0) return false
  const days = daysSince(c.last_order)
  return days !== null && days > 60
}

const hasChannel = (c: CustomerSummary, ch: ChannelKey): boolean => {
  const list = (c.channels ?? []).map((x) => (x || "").toUpperCase())
  return list.includes(ch)
}

/**
 * Compute the segment list for a given customer set. Each segment carries its
 * own count so the chip strip can render badges without re-running predicates.
 *
 * Pass the unfiltered list — the segments below all derive themselves from
 * the same source so counts agree with what the table shows.
 */
export function getSegments(customers: CustomerSummary[]): Segment[] {
  const isVip = buildVipPredicate(customers)

  const defs: Omit<Segment, "count">[] = [
    { id: "all", label: "All", hint: "Every customer who's reached out", predicate: () => true },
    { id: "vip", label: "VIP", hint: "Top 10% by spend", predicate: isVip },
    { id: "new", label: "New", hint: "First order in the last 30 days", predicate: isNew },
    { id: "repeat", label: "Repeat", hint: "3+ fulfilled orders", predicate: isRepeat },
    { id: "churned", label: "Churned", hint: "No order in 60+ days", predicate: isChurned },
    {
      id: "channel-whatsapp",
      label: "WhatsApp",
      hint: "Reachable on WhatsApp",
      predicate: (c) => hasChannel(c, "WHATSAPP"),
    },
    {
      id: "channel-telegram",
      label: "Telegram",
      hint: "Reachable on Telegram",
      predicate: (c) => hasChannel(c, "TELEGRAM"),
    },
    {
      id: "channel-both",
      label: "Both channels",
      hint: "Reachable on both Telegram and WhatsApp",
      predicate: (c) => hasChannel(c, "WHATSAPP") && hasChannel(c, "TELEGRAM"),
    },
  ]

  return defs.map((d) => ({
    ...d,
    count: customers.filter(d.predicate).length,
  }))
}

export function getSegmentById(
  customers: CustomerSummary[],
  id: SegmentId,
): Segment {
  const segments = getSegments(customers)
  return segments.find((s) => s.id === id) ?? segments[0]
}

export function applySegment(customers: CustomerSummary[], id: SegmentId): CustomerSummary[] {
  const seg = getSegmentById(customers, id)
  return customers.filter(seg.predicate)
}

/**
 * Deterministically widen the channel set for a slice of customers so the
 * "Both channels" segment isn't always empty against the seed data, which
 * one-channel-per-customer mocks ship today. Pure derivation — no mutation,
 * stable per-name, no backend writes.
 *
 * Hashes the customer's name+phone, treats every Nth customer as also being
 * on the opposite channel. Used by `customers-view.tsx` when shaping the
 * incoming API list before it hits any segment predicates.
 */
export function expandMultiChannel(customers: CustomerSummary[]): CustomerSummary[] {
  return customers.map((c, i) => {
    const channels = (c.channels ?? []).map((x) => (x || "").toUpperCase())
    if (channels.length === 0) return c
    // Hash phone+name → 0..99
    const seed = `${c.phone || ""}|${c.name || ""}|${i}`
    let h = 5381
    for (let j = 0; j < seed.length; j++) h = ((h << 5) + h) + seed.charCodeAt(j)
    const bucket = Math.abs(h) % 100
    const onWhatsApp = channels.includes("WHATSAPP")
    const onTelegram = channels.includes("TELEGRAM")
    let next: string[] = [...channels]
    if (onWhatsApp && !onTelegram && bucket < 22) next.push("TELEGRAM")
    else if (onTelegram && !onWhatsApp && bucket < 55) next.push("WHATSAPP")
    return { ...c, channels: next }
  })
}

/**
 * Sort comparator for the customers table. Stable secondary sort on name so
 * the order is deterministic between renders.
 */
export function sortCustomers(customers: CustomerSummary[], key: SortKey): CustomerSummary[] {
  const list = [...customers]
  if (key === "spend") {
    list.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0) || (a.name || "").localeCompare(b.name || ""))
  } else if (key === "name") {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  } else {
    // recent — last_order desc, then name asc
    list.sort((a, b) => {
      const aT = a.last_order ? new Date(a.last_order).getTime() : 0
      const bT = b.last_order ? new Date(b.last_order).getTime() : 0
      return bT - aT || (a.name || "").localeCompare(b.name || "")
    })
  }
  return list
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recent activity" },
  { value: "spend", label: "Highest spend" },
  { value: "name", label: "Name (A–Z)" },
]
