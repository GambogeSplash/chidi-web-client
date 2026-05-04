/**
 * Audience targeting for Playbook plays — audit-gap wave (2026-05-03).
 *
 * Plays were previously global ("runs on all customers"). The audit flagged
 * that as a gap: real merchants want VIP-only re-engagement, channel-scoped
 * broadcasts, first-time-only welcomes, etc.
 *
 * The vocabulary deliberately mirrors `lib/chidi/segments.ts` so a future
 * unification pass collapses the two without renaming. Where segments has
 * `channel-whatsapp`, we use `channel_whatsapp` to keep the kind safe as a
 * URL/JSON token.
 *
 * Surfaces consume:
 *   - `audienceLabel(a)`            → "VIPs only" / "Channel: Telegram"
 *   - `audienceShort(a)`            → "VIPs" — for the row chip
 *   - `audienceSize(a, customers?)` → number, with a stable fallback when the
 *     customer list isn't loaded (so the row can render counts in skeleton).
 */

import type { CustomerSummary } from "@/lib/types/analytics"

export type AudienceKind =
  | "all"
  | "vip"
  | "new"
  | "repeat"
  | "churned"
  | "first_time"
  | "channel_telegram"
  | "channel_whatsapp"

export interface PlayAudience {
  kind: AudienceKind
}

// ---------------------------------------------------------------------------
// Static estimates — used when no customer list is in scope (e.g. on the
// Playbook list page, where we don't fetch /analytics/customers). Anchored to
// the ~30-customer roster shipping in lib/chidi/mock-data.ts. Read-only.
// ---------------------------------------------------------------------------

const FALLBACK_SIZE: Record<AudienceKind, number> = {
  all: 30,
  vip: 4,
  new: 6,
  repeat: 11,
  churned: 5,
  first_time: 8,
  channel_telegram: 16,
  channel_whatsapp: 14,
}

// ---------------------------------------------------------------------------
// Catalog metadata
// ---------------------------------------------------------------------------

export const AUDIENCE_KIND_LABEL: Record<AudienceKind, string> = {
  all: "Everyone",
  vip: "VIPs only",
  new: "New customers",
  repeat: "Repeat customers",
  churned: "Churned customers",
  first_time: "First-time only",
  channel_telegram: "Channel: Telegram",
  channel_whatsapp: "Channel: WhatsApp",
}

export const AUDIENCE_KIND_HINT: Record<AudienceKind, string> = {
  all: "Every customer the play applies to",
  vip: "Top 10% by spend",
  new: "First order in the last 30 days",
  repeat: "3+ fulfilled orders",
  churned: "No order in the last 60 days",
  first_time: "Hasn't ordered yet",
  channel_telegram: "Reachable on Telegram only",
  channel_whatsapp: "Reachable on WhatsApp only",
}

export const AUDIENCE_KINDS_ORDERED: AudienceKind[] = [
  "all",
  "vip",
  "repeat",
  "new",
  "first_time",
  "churned",
  "channel_telegram",
  "channel_whatsapp",
]

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function audienceLabel(a: PlayAudience | undefined | null): string {
  if (!a) return AUDIENCE_KIND_LABEL.all
  return AUDIENCE_KIND_LABEL[a.kind] ?? AUDIENCE_KIND_LABEL.all
}

/** Compact form for the row chip — paired with the trigger summary. */
export function audienceShort(a: PlayAudience | undefined | null): string {
  if (!a || a.kind === "all") return "Everyone"
  switch (a.kind) {
    case "vip":
      return "VIPs"
    case "new":
      return "New"
    case "repeat":
      return "Repeat"
    case "churned":
      return "Churned"
    case "first_time":
      return "First-time"
    case "channel_telegram":
      return "Telegram"
    case "channel_whatsapp":
      return "WhatsApp"
  }
}

// ---------------------------------------------------------------------------
// Audience-size derivation — mirrors segments.ts predicates.
// ---------------------------------------------------------------------------

const ONE_HOUR = 60 * 60 * 1000

const daysSince = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return (Date.now() - t) / (24 * ONE_HOUR)
}

const hasChannel = (c: CustomerSummary, ch: "WHATSAPP" | "TELEGRAM"): boolean => {
  const list = (c.channels ?? []).map((x) => (x || "").toUpperCase())
  return list.includes(ch)
}

const buildVipPredicate = (customers: CustomerSummary[]) => {
  const spends = customers.map((c) => c.total_spent || 0).sort((a, b) => b - a)
  const idx = Math.max(0, Math.floor(spends.length * 0.1) - 1)
  const cutoff = Math.max(spends[idx] ?? 0, 25_000)
  return (c: CustomerSummary) => (c.total_spent || 0) >= cutoff && (c.order_count ?? 0) > 0
}

/**
 * Count customers matching the audience. Pass `customers` when available; when
 * omitted, returns a stable fallback so the UI can render "{N} match" without
 * fetching analytics data.
 */
export function audienceSize(
  a: PlayAudience | undefined | null,
  customers?: CustomerSummary[],
): number {
  const kind: AudienceKind = a?.kind ?? "all"
  if (!customers || customers.length === 0) return FALLBACK_SIZE[kind] ?? 0

  switch (kind) {
    case "all":
      return customers.length
    case "vip": {
      const isVip = buildVipPredicate(customers)
      return customers.filter(isVip).length
    }
    case "new":
      return customers.filter((c) => {
        const d = daysSince(c.first_order)
        return d !== null && d < 30
      }).length
    case "repeat":
      return customers.filter((c) => (c.order_count ?? 0) >= 3).length
    case "churned":
      return customers.filter((c) => {
        if ((c.order_count ?? 0) === 0) return false
        const d = daysSince(c.last_order)
        return d !== null && d > 60
      }).length
    case "first_time":
      return customers.filter((c) => (c.order_count ?? 0) === 0).length
    case "channel_telegram":
      return customers.filter((c) => hasChannel(c, "TELEGRAM")).length
    case "channel_whatsapp":
      return customers.filter((c) => hasChannel(c, "WHATSAPP")).length
  }
}

/** Pluralisation helper used by the sheet copy ("4 customers match"). */
export function audienceMatchCopy(n: number): string {
  if (n === 0) return "No customers match yet"
  if (n === 1) return "1 customer matches"
  return `${n} customers match`
}
