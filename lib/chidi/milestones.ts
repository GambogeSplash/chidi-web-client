/**
 * Milestone tracker — tasteful celebrations when the merchant hits a moment.
 * State lives in localStorage so each milestone fires exactly once. No
 * server side required.
 *
 * Tone: quiet pride, not gamification. "Quietly historic" beats "ACHIEVEMENT
 * UNLOCKED!".
 */

const STORAGE_KEY = "chidi_milestones_seen"

export type MilestoneKey =
  | "first_sale"
  | "first_10_orders"
  | "first_50_orders"
  | "first_100_orders"
  | "first_10_customers"
  | "first_50_customers"

interface SeenMap {
  [k: string]: number // timestamp when first seen
}

function load(): SeenMap {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function save(m: SeenMap) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m))
}

export const hasSeen = (key: MilestoneKey): boolean => {
  return key in load()
}

export const markSeen = (key: MilestoneKey) => {
  const m = load()
  if (key in m) return
  m[key] = Date.now()
  save(m)
}

/**
 * Given the current state (totalOrders, totalCustomers), returns the highest
 * unseen milestone, or null if there's nothing to celebrate.
 */
export interface MilestoneCheckInput {
  totalOrders?: number
  totalCustomers?: number
}

export interface MilestoneCard {
  key: MilestoneKey
  title: string
  body: string
  flavor: string
  /** When true, fire confetti */
  bigDeal: boolean
}

export const detectMilestone = (input: MilestoneCheckInput): MilestoneCard | null => {
  const seen = load()

  // Order milestones — check biggest first so the next celebration after
  // crossing 100 isn't "first sale"
  if ((input.totalOrders ?? 0) >= 100 && !("first_100_orders" in seen)) {
    return {
      key: "first_100_orders",
      title: "A hundred orders.",
      body: "That's a real business now. The kind that pays bills, employs people, fills shelves. Quietly historic.",
      flavor: "100",
      bigDeal: true,
    }
  }
  if ((input.totalOrders ?? 0) >= 50 && !("first_50_orders" in seen)) {
    return {
      key: "first_50_orders",
      title: "Fifty orders.",
      body: "You're in rhythm now. Customers know your name. I'm taking notes on what works.",
      flavor: "50",
      bigDeal: true,
    }
  }
  if ((input.totalOrders ?? 0) >= 10 && !("first_10_orders" in seen)) {
    return {
      key: "first_10_orders",
      title: "Ten orders.",
      body: "You're moving. The shop is alive. Keep showing up — the rhythm builds from here.",
      flavor: "10",
      bigDeal: false,
    }
  }
  if ((input.totalOrders ?? 0) >= 1 && !("first_sale" in seen)) {
    return {
      key: "first_sale",
      title: "Your first sale through Chidi.",
      body: "Quietly historic. Whoever this customer is — treat them well. They're the first chapter.",
      flavor: "1st",
      bigDeal: true,
    }
  }

  if ((input.totalCustomers ?? 0) >= 50 && !("first_50_customers" in seen)) {
    return {
      key: "first_50_customers",
      title: "Fifty regulars.",
      body: "You've built something real. People come back to you. That's the rarest currency.",
      flavor: "50",
      bigDeal: true,
    }
  }
  if ((input.totalCustomers ?? 0) >= 10 && !("first_10_customers" in seen)) {
    return {
      key: "first_10_customers",
      title: "Ten customers know you by name.",
      body: "Keep treating them like the only ones. They tell others.",
      flavor: "10",
      bigDeal: false,
    }
  }

  return null
}
