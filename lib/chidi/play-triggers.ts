/**
 * Structured triggers for Playbook plays — the audit-gap wave (2026-05-03).
 *
 * Plays used to ship with a single free-text `trigger: string` field. That
 * read fine in the sheet but couldn't be filtered, scheduled, or rendered as
 * an event the merchant could grok at-a-glance ("when stock < 5", "every
 * weekday at 7:30am"). This module replaces that with a small, opinionated
 * event vocabulary covering the nine triggers the existing plays actually
 * use — plus `manual` for plays the merchant fires by hand.
 *
 * Surfaces consume two helpers:
 *   - `triggerLabel(t)`  → long form for the sheet ("When stock drops below 5")
 *   - `triggerSummary(t)`→ short form for the row chip ("Stock < 5")
 *
 * Free-text `trigger` is kept on PlaybookPlay for back-compat: surfaces fall
 * back to it when `trigger_v2` is missing.
 */

export type TriggerKind =
  | "cart_abandoned"
  | "order_pending_payment"
  | "order_fulfilled"
  | "low_stock"
  | "stock_out"
  | "customer_silent"
  | "customer_birthday"
  | "schedule_daily"
  | "schedule_weekly"
  | "manual"

export interface PlayTrigger {
  kind: TriggerKind
  /** order_pending_payment, customer_silent — hours since the event */
  hoursThreshold?: number
  /** low_stock — units remaining cutoff */
  stockThreshold?: number
  /** schedule_daily, schedule_weekly — 0-23 local hour */
  hourOfDay?: number
  /** schedule_weekly — 0=Sun..6=Sat (matches Date#getDay) */
  dayOfWeek?: number
  /** schedule_daily, schedule_weekly — optional minutes (0-59) */
  minuteOfHour?: number
}

// ---------------------------------------------------------------------------
// Catalog metadata (single source of truth — keeps label/summary in sync)
// ---------------------------------------------------------------------------

export const TRIGGER_KIND_LABEL: Record<TriggerKind, string> = {
  cart_abandoned: "Cart abandoned",
  order_pending_payment: "Order awaiting payment",
  order_fulfilled: "Order fulfilled",
  low_stock: "Stock running low",
  stock_out: "Stock hits zero",
  customer_silent: "Customer goes quiet",
  customer_birthday: "Customer's birthday",
  schedule_daily: "Daily schedule",
  schedule_weekly: "Weekly schedule",
  manual: "Manual only",
}

/** Ordered list for the picker dropdown — operational events first, schedules
 *  next, manual last (it's the escape hatch). */
export const TRIGGER_KINDS_ORDERED: TriggerKind[] = [
  "cart_abandoned",
  "order_pending_payment",
  "order_fulfilled",
  "low_stock",
  "stock_out",
  "customer_silent",
  "customer_birthday",
  "schedule_daily",
  "schedule_weekly",
  "manual",
]

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

const formatTimeOfDay = (hour: number, minute: number = 0): string => {
  const h24 = ((hour % 24) + 24) % 24
  const m = Math.max(0, Math.min(59, Math.floor(minute)))
  const ampm = h24 < 12 ? "am" : "pm"
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  if (m === 0) return `${h12}${ampm}`
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`
}

const formatHoursWindow = (hours: number): string => {
  if (hours <= 0) return "now"
  if (hours < 24) return `${hours}h`
  const days = hours / 24
  if (Number.isInteger(days)) return `${days}d`
  if (hours % 24 === 0) return `${days}d`
  // 6 weeks = 42d → render as "6 weeks" if it lands cleanly
  if (days % 7 === 0) {
    const weeks = days / 7
    return weeks === 1 ? "1 week" : `${weeks} weeks`
  }
  return `${Math.round(days)}d`
}

/** Long, sentence-fragment label for the sheet's trigger row. */
export function triggerLabel(t: PlayTrigger | undefined | null): string {
  if (!t) return "Manual only"
  switch (t.kind) {
    case "cart_abandoned":
      return "When a customer leaves checkout"
    case "order_pending_payment": {
      const win = formatHoursWindow(t.hoursThreshold ?? 24)
      return `When an order has been awaiting payment for ${win}`
    }
    case "order_fulfilled":
      return "Right after an order is fulfilled"
    case "low_stock": {
      const n = t.stockThreshold ?? 5
      return `When stock drops below ${n}`
    }
    case "stock_out":
      return "When stock hits zero"
    case "customer_silent": {
      const win = formatHoursWindow(t.hoursThreshold ?? 24 * 14)
      return `When a customer hasn't messaged in ${win}`
    }
    case "customer_birthday":
      return "On a customer's birthday"
    case "schedule_daily": {
      const time = formatTimeOfDay(t.hourOfDay ?? 7, t.minuteOfHour ?? 30)
      return `Every day at ${time}`
    }
    case "schedule_weekly": {
      const day = DAY_LONG[((t.dayOfWeek ?? 5) % 7 + 7) % 7]
      const time = formatTimeOfDay(t.hourOfDay ?? 18, t.minuteOfHour ?? 0)
      return `Every ${day} at ${time}`
    }
    case "manual":
      return "Manual only — Chidi waits for you to fire it"
  }
}

/** Short row-chip label. Designed to share a line with the audience badge. */
export function triggerSummary(t: PlayTrigger | undefined | null): string {
  if (!t) return "Manual"
  switch (t.kind) {
    case "cart_abandoned":
      return "Cart abandoned"
    case "order_pending_payment":
      return `Pending > ${formatHoursWindow(t.hoursThreshold ?? 24)}`
    case "order_fulfilled":
      return "Order fulfilled"
    case "low_stock":
      return `Stock < ${t.stockThreshold ?? 5}`
    case "stock_out":
      return "Stock = 0"
    case "customer_silent":
      return `Silent ${formatHoursWindow(t.hoursThreshold ?? 24 * 14)}+`
    case "customer_birthday":
      return "Birthday"
    case "schedule_daily":
      return `Daily ${formatTimeOfDay(t.hourOfDay ?? 7, t.minuteOfHour ?? 30)}`
    case "schedule_weekly": {
      const day = DAY_SHORT[((t.dayOfWeek ?? 5) % 7 + 7) % 7]
      return `${day} ${formatTimeOfDay(t.hourOfDay ?? 18, t.minuteOfHour ?? 0)}`
    }
    case "manual":
      return "Manual"
  }
}

/**
 * Returns sensible default params for a kind so the picker can hand the merchant
 * a populated trigger when they switch kinds. Used by the sheet picker.
 */
export function defaultsForKind(kind: TriggerKind): PlayTrigger {
  switch (kind) {
    case "order_pending_payment":
      return { kind, hoursThreshold: 24 }
    case "low_stock":
      return { kind, stockThreshold: 5 }
    case "customer_silent":
      return { kind, hoursThreshold: 24 * 14 }
    case "schedule_daily":
      return { kind, hourOfDay: 7, minuteOfHour: 30 }
    case "schedule_weekly":
      return { kind, dayOfWeek: 5, hourOfDay: 18, minuteOfHour: 0 }
    default:
      return { kind }
  }
}

/** True when the kind takes a numeric param the picker should render. */
export function paramShape(
  kind: TriggerKind,
):
  | { type: "hours"; label: string; min: number; max: number; step: number }
  | { type: "stock"; label: string; min: number; max: number; step: number }
  | { type: "time-of-day"; label: string }
  | { type: "day-and-time"; label: string }
  | null {
  switch (kind) {
    case "order_pending_payment":
      return { type: "hours", label: "After hours", min: 1, max: 168, step: 1 }
    case "customer_silent":
      return { type: "hours", label: "Silent for hours", min: 24, max: 24 * 90, step: 24 }
    case "low_stock":
      return { type: "stock", label: "Below units", min: 1, max: 50, step: 1 }
    case "schedule_daily":
      return { type: "time-of-day", label: "At time" }
    case "schedule_weekly":
      return { type: "day-and-time", label: "On" }
    default:
      return null
  }
}

export const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]
