/**
 * Billing / plan / usage — local-only state for the billing settings card.
 * Phase-1 capture: real Paystack/Flutterwave wiring is a backend job; this
 * gives the merchant a working surface where they can see their current
 * plan, usage against caps, and a 6-month usage history.
 *
 * Shape:
 *   chidi:billing -> {
 *     plan: "starter" | "growth" | "scale",
 *     usage: { messages, broadcasts, ai_actions },
 *     nextBillIso: string  // ISO date of next bill
 *   }
 */

const STORAGE_KEY = "chidi:billing"
const SEED_FLAG_KEY = "chidi:billing-seeded"

export type BillingPlan = "starter" | "growth" | "scale"

export interface UsageCounters {
  messages: number
  broadcasts: number
  ai_actions: number
}

export interface BillingStore {
  plan: BillingPlan
  usage: UsageCounters
  nextBillIso: string
}

export interface PlanMeta {
  id: BillingPlan
  label: string
  /** Naira/month. */
  priceNgn: number
  /** Caps used by the usage strip. */
  caps: UsageCounters
  blurb: string
  features: string[]
}

export const PLAN_CATALOG: Record<BillingPlan, PlanMeta> = {
  starter: {
    id: "starter",
    label: "Starter",
    priceNgn: 0,
    caps: { messages: 1_000, broadcasts: 2, ai_actions: 100 },
    blurb: "For testing the waters",
    features: ["1 channel", "1 seat", "Chidi answers basic questions"],
  },
  growth: {
    id: "growth",
    label: "Growth",
    priceNgn: 12_500,
    caps: { messages: 10_000, broadcasts: 20, ai_actions: 1_500 },
    blurb: "Most shops doing 50+ orders/week",
    features: [
      "All channels",
      "Up to 5 seats",
      "Chidi auto-confirms orders",
      "Customer memory",
    ],
  },
  scale: {
    id: "scale",
    label: "Scale",
    priceNgn: 45_000,
    caps: { messages: 50_000, broadcasts: 100, ai_actions: 10_000 },
    blurb: "Multi-shop operators",
    features: [
      "Everything in Growth",
      "Unlimited seats",
      "Multi-shop dashboard",
      "Priority support + dedicated CSM",
    ],
  },
}

export interface MockInvoice {
  id: string
  issuedIso: string
  amountNgn: number
  plan: BillingPlan
  status: "paid"
}

export const MOCK_INVOICES: MockInvoice[] = [
  {
    id: "INV-2026-04",
    issuedIso: "2026-04-01",
    amountNgn: 12_500,
    plan: "growth",
    status: "paid",
  },
  {
    id: "INV-2026-03",
    issuedIso: "2026-03-01",
    amountNgn: 12_500,
    plan: "growth",
    status: "paid",
  },
  {
    id: "INV-2026-02",
    issuedIso: "2026-02-01",
    amountNgn: 12_500,
    plan: "growth",
    status: "paid",
  },
]

/** 6-month usage sparkline data — messages per month. */
export const MOCK_USAGE_HISTORY: { month: string; messages: number }[] = [
  { month: "Nov", messages: 4_120 },
  { month: "Dec", messages: 5_640 },
  { month: "Jan", messages: 6_280 },
  { month: "Feb", messages: 7_010 },
  { month: "Mar", messages: 7_840 },
  { month: "Apr", messages: 8_650 },
]

type Listener = (store: BillingStore) => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function defaultStore(): BillingStore {
  // Mid-range Growth-plan usage so the strip looks alive on first load.
  const now = new Date()
  const nextBill = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    plan: "growth",
    usage: { messages: 6_240, broadcasts: 11, ai_actions: 980 },
    nextBillIso: nextBill.toISOString(),
  }
}

function read(): BillingStore {
  if (!isBrowser()) return defaultStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return defaultStore()
    const base = defaultStore()
    return {
      plan: (parsed.plan as BillingPlan) ?? base.plan,
      usage: { ...base.usage, ...(parsed.usage ?? {}) },
      nextBillIso: parsed.nextBillIso ?? base.nextBillIso,
    }
  } catch {
    return defaultStore()
  }
}

function write(store: BillingStore): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* swallow quota */
  }
  listeners.forEach((cb) => {
    try {
      cb(store)
    } catch {
      /* ignore */
    }
  })
}

export function getBilling(): BillingStore {
  return read()
}

export function seedBillingIfEmpty(): void {
  if (!isBrowser()) return
  if (window.localStorage.getItem(SEED_FLAG_KEY) === "1") return
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    write(defaultStore())
  }
  try {
    window.localStorage.setItem(SEED_FLAG_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function setPlan(plan: BillingPlan): void {
  const store = read()
  write({ ...store, plan })
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  cb(read())
  return () => listeners.delete(cb)
}

export function formatNaira(value: number): string {
  if (value === 0) return "Free"
  return `₦${value.toLocaleString("en-NG")}`
}

export function usagePct(used: number, cap: number): number {
  if (cap <= 0) return 0
  return Math.min(100, Math.round((used / cap) * 100))
}

export function usageTone(pct: number): "ok" | "warn" | "crit" {
  if (pct >= 95) return "crit"
  if (pct >= 75) return "warn"
  return "ok"
}
