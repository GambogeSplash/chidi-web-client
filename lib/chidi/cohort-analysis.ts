/**
 * cohort-analysis — repeat-rate / cohort buckets for the Insights surface.
 *
 * The single most useful retail signal a Lagos shop owner reads about her own
 * customers is "are these new buyers or my regulars?" Polished analytics tools
 * burn a whole tab on this; we get the headline answer in four buckets.
 *
 * Pure functions, no React. Inputs are the same shapes the Insights view
 * already pulls from `useCustomers()` — so we don't need a new endpoint.
 *
 * Bucket logic (definitions, locked):
 *
 *   New     — first order in the last 30 days
 *   Repeat  — 2 or more orders AND last order in the last 60 days
 *   VIP     — top 10% of customers by total_spent (computed across all)
 *   Churned — has ever ordered, but no order in the last 60 days
 *
 * A single customer is assigned to ONE bucket using a priority order so the
 * sums always add up:
 *
 *   VIP > Repeat > New > Churned > (uncategorized — silently dropped)
 *
 * VIP wins because it's the most actionable signal (these are the people who
 * pay your rent). Repeat beats New because a 30-day-old customer who's already
 * back is closer to "regular" than to "fresh prospect". Churned is last
 * because by definition they have nothing in the recent window.
 */

import type { CustomerSummary } from "@/lib/types/analytics"

// ============================================================================
// Public types
// ============================================================================

export type CohortBucketLabel = "New" | "Repeat" | "VIP" | "Churned"

export interface CohortBucket {
  label: CohortBucketLabel
  value: number
  percent: number
  // A token-name string the consumer maps to a colour. We keep the token
  // mapping in the component layer (cohort card) so this file stays
  // dependency-free. See InsightsCohortCard for the var() lookup.
  tone: "win" | "info" | "vip" | "muted"
  /**
   * One-line voice subtitle for this bucket. Used by the cohort card to
   * surface a humanish tooltip without needing extra copy in the view.
   */
  caption: string
}

export interface CohortReport {
  buckets: CohortBucket[]
  totalCustomers: number
  /**
   * Percent of customers whose last order is in the last 60 days. Captures
   * "are people coming back?" — independent of bucket assignment.
   */
  repeatRate: number
  /**
   * Percent of customers in the VIP bucket. Always ~10% by definition, but
   * surfaces 0 when the dataset is too small to have a meaningful top decile.
   */
  vipShare: number
  /**
   * Synthetic "vs last month" delta on repeat rate. The mock-data API doesn't
   * give us a prior-period customer cohort, so we approximate by re-running
   * the bucket logic on customers whose first_order is older than 30 days.
   * Returns null when the prior cohort is too small (< 3 customers) to read.
   */
  repeatRateDelta: number | null
  /**
   * One-sentence summary suitable for placement under the chart. Generated
   * from the numbers — no LLM, just template strings — so the voice stays
   * Chidi-ish without runtime cost.
   */
  voiceSummary: string
}

// ============================================================================
// Bucket logic
// ============================================================================

const DAY_MS = 1000 * 60 * 60 * 24

function daysAgo(iso: string | null, now: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((now - t) / DAY_MS))
}

/**
 * Compute the spend threshold that puts a customer in the top 10%. We sort
 * descending and take the value at index ceil(n * 0.1) - 1. For tiny lists
 * (n < 5) we fall back to "highest single spender" so the bucket isn't empty
 * for a brand-new shop.
 */
function vipThreshold(spends: number[]): number {
  if (spends.length === 0) return Infinity
  const sorted = [...spends].sort((a, b) => b - a)
  if (sorted.length < 5) return sorted[0]
  const idx = Math.max(0, Math.ceil(sorted.length * 0.1) - 1)
  return sorted[idx]
}

type BucketAssignment = CohortBucketLabel | null

/**
 * Assign one customer to one bucket with the priority described in the
 * file header. Pure — used by both the current-period and the prior-period
 * pass.
 */
function assignBucket(
  c: CustomerSummary,
  now: number,
  vipMin: number,
): BucketAssignment {
  const lastDays = daysAgo(c.last_order, now)
  const firstDays = daysAgo(c.first_order, now)

  // VIP wins outright — any spend at or above the threshold, regardless of
  // recency. A churned VIP is still a VIP from a "who matters" standpoint.
  if (c.total_spent >= vipMin && c.total_spent > 0) return "VIP"

  // Repeat — 2+ orders, recent.
  if (c.order_count >= 2 && lastDays !== null && lastDays <= 60) return "Repeat"

  // New — first order in the last 30 days. We use first_order so customers
  // who placed multiple orders in the last 30 still count as "Repeat" if they
  // qualify. A first-time buyer in the window who has only 1 order is "New".
  if (firstDays !== null && firstDays <= 30) return "New"

  // Churned — they've ordered before, but the last one was over 60 days ago.
  if (lastDays !== null && lastDays > 60) return "Churned"

  // Edge: no orders ever recorded — uncommon for the customers list since it
  // aggregates from orders, but defensive.
  return null
}

// ============================================================================
// Public helper
// ============================================================================

/**
 * cohortAnalysis — primary export. Pass the same `CustomerSummary[]` the
 * existing customers view uses. Order list is accepted but unused for now —
 * it's part of the signature so callers can keep calling it when we wire
 * order-level fidelity later (e.g. last-30-day order count for "Repeat").
 */
export function cohortAnalysis(
  customers: CustomerSummary[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _orders?: unknown[],
  // Inject a clock so tests can pin the date. Defaults to "now" for callers.
  now: number = Date.now(),
): CohortReport {
  const total = customers.length

  // No customers → return a zeroed report so the UI can render an empty state
  // instead of crashing on division-by-zero.
  if (total === 0) {
    return {
      buckets: emptyBuckets(),
      totalCustomers: 0,
      repeatRate: 0,
      vipShare: 0,
      repeatRateDelta: null,
      voiceSummary: "No customers yet — this fills in once orders start landing.",
    }
  }

  const vipMin = vipThreshold(customers.map((c) => c.total_spent))

  // Current-period bucket counts.
  const counts: Record<CohortBucketLabel, number> = {
    New: 0,
    Repeat: 0,
    VIP: 0,
    Churned: 0,
  }
  let repeatLanded = 0 // anyone whose last order is in the last 60 days

  for (const c of customers) {
    const bucket = assignBucket(c, now, vipMin)
    if (bucket) counts[bucket] += 1
    const lastDays = daysAgo(c.last_order, now)
    if (lastDays !== null && lastDays <= 60) repeatLanded += 1
  }

  // Prior-period delta — re-run the bucket logic against a clock 30 days ago
  // and only on customers whose first_order is also at least 30 days back, so
  // we don't compare against a window that hadn't "happened" yet.
  const priorNow = now - 30 * DAY_MS
  const priorCustomers = customers.filter((c) => {
    const fd = daysAgo(c.first_order, priorNow)
    return fd !== null
  })
  let priorRepeatLanded = 0
  if (priorCustomers.length >= 3) {
    for (const c of priorCustomers) {
      const lastDays = daysAgo(c.last_order, priorNow)
      if (lastDays !== null && lastDays <= 60) priorRepeatLanded += 1
    }
  }

  const repeatRate = round1((repeatLanded / total) * 100)
  const priorRepeatRate =
    priorCustomers.length >= 3
      ? round1((priorRepeatLanded / priorCustomers.length) * 100)
      : null
  const repeatRateDelta =
    priorRepeatRate === null ? null : round1(repeatRate - priorRepeatRate)

  const buckets: CohortBucket[] = (
    ["New", "Repeat", "VIP", "Churned"] as const
  ).map((label) => ({
    label,
    value: counts[label],
    percent: round1((counts[label] / total) * 100),
    tone: bucketTone(label),
    caption: bucketCaption(label, counts[label], total),
  }))

  const vipShare = round1((counts.VIP / total) * 100)

  return {
    buckets,
    totalCustomers: total,
    repeatRate,
    vipShare,
    repeatRateDelta,
    voiceSummary: voice(repeatRate, repeatRateDelta, counts, total),
  }
}

// ============================================================================
// Internal — captions, tones, voice
// ============================================================================

function bucketTone(label: CohortBucketLabel): CohortBucket["tone"] {
  switch (label) {
    case "VIP":
      return "vip"
    case "Repeat":
      return "win"
    case "New":
      return "info"
    case "Churned":
      return "muted"
  }
}

function bucketCaption(
  label: CohortBucketLabel,
  value: number,
  total: number,
): string {
  if (total === 0 || value === 0) {
    if (label === "New") return "No new customers this month."
    if (label === "Repeat") return "No regulars yet."
    if (label === "VIP") return "Top 10% will land here once you have ~10+ buyers."
    return "Nobody's gone quiet — yet."
  }
  switch (label) {
    case "New":
      return `${value} ${value === 1 ? "person" : "people"} just discovered you.`
    case "Repeat":
      return `${value} regular${value === 1 ? "" : "s"} keeping the lights on.`
    case "VIP":
      return `Top ${value} spender${value === 1 ? "" : "s"} — your rent payers.`
    case "Churned":
      return `${value} ${value === 1 ? "person" : "people"} haven't bought in 60+ days.`
  }
}

function voice(
  repeatRate: number,
  delta: number | null,
  counts: Record<CohortBucketLabel, number>,
  total: number,
): string {
  if (total === 0) return "No customers yet."
  const head = `Repeat rate is ${repeatRate}%`
  if (delta === null || Math.abs(delta) < 0.5) {
    if (counts.VIP > 0) {
      return `${head} — ${counts.VIP} VIP${counts.VIP === 1 ? "" : "s"} carrying the shop.`
    }
    if (counts.New > counts.Repeat) {
      return `${head} — mostly new buyers right now.`
    }
    return `${head} — steady this month.`
  }
  const dir = delta > 0 ? "better" : "softer"
  return `${head} — ${dir} than last month by ${Math.abs(delta)} pts.`
}

function round1(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 10) / 10
}

function emptyBuckets(): CohortBucket[] {
  return (["New", "Repeat", "VIP", "Churned"] as const).map((label) => ({
    label,
    value: 0,
    percent: 0,
    tone: bucketTone(label),
    caption: bucketCaption(label, 0, 0),
  }))
}
