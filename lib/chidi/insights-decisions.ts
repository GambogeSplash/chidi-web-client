/**
 * Decisions — the new Insights model. Each card poses ONE decision the merchant
 * should make today, with the supporting numbers (paired with last-period
 * baselines), Chidi's recommendation, and a primary action.
 *
 * Authored against the mock data in /lib/chidi/mock-data.ts so Insights and
 * Orders/Inventory/Customers all tell the same story.
 */

export type DecisionKind =
  | "restock"
  | "price"
  | "pause"
  | "promote"
  | "follow_up"
  | "channel_shift"
  | "schedule"

export type DecisionUrgency = "now" | "this_week" | "watch"

export interface DecisionMetric {
  label: string
  value: string
  baseline?: string
  /** Direction relative to baseline: up = good, down = needs attention. */
  direction?: "up" | "down" | "flat"
}

/**
 * Inline chart attached to a decision. Discriminated union so the renderer
 * can switch on `type`. Keep these light — one chart per card max, ~140px
 * tall on desktop. The chart is supporting evidence, never the headline.
 */
export type DecisionChart =
  | {
      type: "depletion"
      /** Last 14 days of daily-units-sold for the SKU. The chart projects
          when stock hits zero based on the rolling pace. */
      sold_per_day: number[]
      stock_now: number
      stock_unit: string
    }
  | {
      type: "weekday_bars"
      /** 7 entries, Sunday-first, of revenue (or units) by day-of-week */
      values: number[]
      label: string
    }
  | {
      type: "channel_donut"
      slices: Array<{ label: string; value: number; color?: string }>
    }
  | {
      type: "trend_compare"
      /** Two parallel series: current vs prior period. Same length. */
      current: number[]
      prior: number[]
      label?: string
    }
  | {
      type: "price_volume"
      /** Mock price tests + units sold at each — proxy for elasticity */
      points: Array<{ price: number; units: number; current?: boolean; suggested?: boolean }>
    }

export interface Decision {
  id: string
  kind: DecisionKind
  urgency: DecisionUrgency
  /** The question the merchant has to answer */
  question: string
  /** Why it's being asked, in plain language */
  why: string
  /** 2-4 metrics that support the decision, paired with last-period baseline */
  metrics: DecisionMetric[]
  /** Optional inline chart that adds visual evidence under the metrics */
  chart?: DecisionChart
  /** Chidi's recommended next move */
  recommendation: string
  /** Primary CTA label + (optional) secondary */
  action: { label: string; deep_link?: string }
  secondary?: { label: string; deep_link?: string }
}

export const DECISION_KIND_LABEL: Record<DecisionKind, string> = {
  restock: "Restock",
  price: "Pricing",
  pause: "Pause",
  promote: "Promote",
  follow_up: "Follow up",
  channel_shift: "Channel mix",
  schedule: "Schedule",
}

export const DECISION_URGENCY_LABEL: Record<DecisionUrgency, string> = {
  now: "Decide today",
  this_week: "This week",
  watch: "Worth watching",
}

// =============================================================================
// The decisions — anchored to mock-data so the numbers are consistent
// =============================================================================

export const DECISIONS: Decision[] = [
  {
    id: "dec-restock-wax-print",
    kind: "restock",
    urgency: "now",
    question: "Reorder African Wax Print Fabric this week?",
    why: "Wax print is your top-grossing SKU and it's selling 3.4× faster than last month.",
    metrics: [
      { label: "Units sold (30d)", value: "82", baseline: "vs 51 prior 30d", direction: "up" },
      { label: "In stock", value: "38 yards", baseline: "≈ 14 days at current pace", direction: "down" },
      { label: "Avg order qty", value: "8.2 yards", baseline: "vs 4.1 prior 30d", direction: "up" },
      { label: "Revenue (30d)", value: "₦262,400", baseline: "vs ₦163,200 prior", direction: "up" },
    ],
    recommendation:
      "Order 60 yards before Friday. Your supplier needs 4 days lead and your last 4 Saturdays averaged 12 yards each.",
    chart: {
      type: "depletion",
      sold_per_day: [2, 3, 2, 4, 3, 5, 12, 2, 2, 3, 4, 3, 6, 11],
      stock_now: 38,
      stock_unit: "yards",
    },
    action: { label: "Draft supplier message", deep_link: "/inventory" },
    secondary: { label: "View product history" },
  },
  {
    id: "dec-pause-iphone-case",
    kind: "pause",
    urgency: "this_week",
    question: "Pull the iPhone 14 Clear Case from the catalog?",
    why: "Out of stock for 45 days, never restocked. Costing you customer disappointment.",
    metrics: [
      { label: "Days out of stock", value: "45", baseline: "since last restock", direction: "down" },
      { label: "Customers asked", value: "7", baseline: "in 30d", direction: "down" },
      { label: "Margin/unit", value: "₦3,000", baseline: "67% margin", direction: "flat" },
    ],
    recommendation:
      "Pull it. If you can't restock by next week, hide it from the live catalog so customers stop hitting a wall.",
    chart: {
      type: "trend_compare",
      current: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      prior: [1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 0, 1, 0, 1],
      label: "Daily units sold (current 14d vs prior 14d)",
    },
    action: { label: "Hide from catalog", deep_link: "/inventory" },
    secondary: { label: "Restock instead" },
  },
  {
    id: "dec-price-bluetooth",
    kind: "price",
    urgency: "this_week",
    question: "Raise Bluetooth Earbuds price to ₦22,000?",
    why: "Selling at ₦18,500. Three customers paid full price without negotiating in the last 10 days.",
    metrics: [
      { label: "Current price", value: "₦18,500", baseline: "margin: ₦10,000 (54%)", direction: "flat" },
      { label: "Suggested", value: "₦22,000", baseline: "margin: ₦13,500 (61%)", direction: "up" },
      { label: "Units sold (30d)", value: "8", baseline: "vs 4 prior 30d", direction: "up" },
      { label: "Last 3 sales", value: "All paid in full", baseline: "no haggling", direction: "up" },
    ],
    recommendation:
      "Test ₦22,000 for the next 2 weeks. If volume holds (it will), you've added ₦28k/month in margin from this SKU alone.",
    chart: {
      type: "price_volume",
      points: [
        { price: 16500, units: 9 },
        { price: 17500, units: 8 },
        { price: 18500, units: 8, current: true },
        { price: 20000, units: 7 },
        { price: 22000, units: 7, suggested: true },
        { price: 24000, units: 5 },
      ],
    },
    action: { label: "Update price" },
    secondary: { label: "A/B for 7 days" },
  },
  {
    id: "dec-followup-pending",
    kind: "follow_up",
    urgency: "now",
    question: "Chase the 3 pending payments older than 24h?",
    why: "Holding ₦98,500 in stock for orders that haven't paid. 47% of cold pendings come back when nudged.",
    metrics: [
      { label: "Cold orders", value: "3", baseline: "≥24h pending", direction: "down" },
      { label: "Value held", value: "₦98,500", baseline: "stock locked up", direction: "down" },
      { label: "Recovery rate", value: "47%", baseline: "30-day avg", direction: "up" },
    ],
    recommendation:
      "Run the \"Chase the cold pending payment\" play. It pays itself back in 12 hours on average.",
    action: { label: "Run play now", deep_link: "/notebook" },
    secondary: { label: "Mark all cancelled" },
  },
  {
    id: "dec-promote-saturday",
    kind: "schedule",
    urgency: "this_week",
    question: "Feature wax print on your status this Saturday?",
    why: "Saturdays are 1.85× your average day, and wax print is your wedge product right now.",
    metrics: [
      { label: "Avg Saturday revenue", value: "₦47,200", baseline: "vs ₦25,500 avg day", direction: "up" },
      { label: "Wax print/Saturday", value: "12 yards", baseline: "vs 4 weekday avg", direction: "up" },
      { label: "Stock on hand", value: "38 yards", baseline: "enough for 3 Saturdays", direction: "flat" },
    ],
    recommendation:
      "Post a status Friday evening with the bestselling print + bundle pricing. The Saturday-prep play has won 4/4 times.",
    chart: {
      type: "weekday_bars",
      values: [34_200, 14_500, 18_700, 22_100, 26_400, 31_800, 47_200],
      label: "Avg daily revenue by weekday (NGN)",
    },
    action: { label: "Run Saturday-prep play", deep_link: "/notebook" },
  },
  {
    id: "dec-vip-checkin",
    kind: "follow_up",
    urgency: "this_week",
    question: "Bring back Adaeze before she goes cold?",
    why: "Top spender. 6 weeks since her last order. Pattern: she usually buys every 4.",
    metrics: [
      { label: "Total spent (90d)", value: "₦42,800", baseline: "rank #1 of 30 customers", direction: "up" },
      { label: "Days since last order", value: "42", baseline: "vs 28-day avg", direction: "down" },
      { label: "Reply rate", value: "92%", baseline: "from past nudges", direction: "up" },
    ],
    recommendation:
      "Send a personal note tied to her last buy. Don't lead with a discount, lead with a new arrival you'd actually pick for her.",
    action: { label: "Run VIP check-in play", deep_link: "/notebook" },
    secondary: { label: "View her timeline" },
  },
  {
    id: "dec-channel-mix",
    kind: "channel_shift",
    urgency: "watch",
    question: "Keep both channels balanced or lean into one?",
    why: "Telegram brings ~55% of orders this period and WhatsApp ~45%. Both are healthy; the customer mix and basket sizes differ slightly between the two.",
    metrics: [
      { label: "Telegram orders (30d)", value: "28", baseline: "vs 22 WhatsApp", direction: "up" },
      { label: "Telegram AOV", value: "₦18,500", baseline: "vs ₦17,940 WhatsApp", direction: "up" },
      { label: "Combined revenue", value: "₦912,900", baseline: "97% of total channel mix", direction: "up" },
    ],
    recommendation:
      "Keep posting evenly to both. If one channel slips below 35% of order count for two consecutive weeks, that's the signal to investigate.",
    chart: {
      type: "channel_donut",
      slices: [
        { label: "Telegram", value: 518_200, color: "#26A5E4" },
        { label: "WhatsApp", value: 394_700, color: "#25D366" },
        { label: "Instagram", value: 29_100, color: "#E1306C" },
      ],
    },
    action: { label: "Set a watcher" },
    secondary: { label: "Compare channels" },
  },
  {
    id: "dec-clearance-stale",
    kind: "promote",
    urgency: "this_week",
    question: "Mark down the 3 stale items 20%?",
    why: "Cash sitting on the shelf. Three SKUs haven't moved in 38+ days.",
    metrics: [
      { label: "Stale SKUs", value: "3", baseline: "≥38 days no movement", direction: "down" },
      { label: "Cash locked up", value: "₦64,400", baseline: "at cost basis", direction: "down" },
      { label: "Clearance win rate", value: "63%", baseline: "from past markdowns", direction: "up" },
    ],
    recommendation:
      "Run the clearance play on the necklace and bonnet. Skip the iPhone case — pull it instead, it won't move.",
    action: { label: "Run clearance play", deep_link: "/notebook" },
  },
]

export const decisionsByUrgency = (): Record<DecisionUrgency, Decision[]> => {
  const out: Record<DecisionUrgency, Decision[]> = { now: [], this_week: [], watch: [] }
  for (const d of DECISIONS) out[d.urgency].push(d)
  return out
}
