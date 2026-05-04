/**
 * insights-export — CSV export + scheduled-email stub for the Insights view.
 *
 * Two surfaces:
 *
 *   1. CSV — multi-section file mirroring everything visible on the Insights
 *      page right now: KPIs, daily trend, channels, bestsellers, top
 *      customers, cohort. Each section is preceded by a `# Section` comment
 *      row so a human dropping it into Excel/Sheets gets clear separators.
 *
 *   2. Schedule stub — saves an email/frequency/time triple to localStorage
 *      under `chidi:insights-schedule`. Real send-side wiring is a backend
 *      task; the UI shows a "Real email delivery requires backend wiring"
 *      footer note so nobody assumes it's live.
 *
 * No new deps. Pure functions where possible — only `downloadInsightsCSV`
 * and the schedule helpers touch the DOM / localStorage.
 */

import type {
  CustomerSummary,
  ChannelData,
  TopProduct,
  TrendDataPoint,
  Period,
  SalesOverviewResponse,
} from "@/lib/types/analytics"
import type { CohortReport } from "@/lib/chidi/cohort-analysis"

// ============================================================================
// Schedule type + storage key
// ============================================================================

export type ScheduleFrequency = "daily" | "weekly" | "monthly"

export interface InsightsSchedule {
  email: string
  frequency: ScheduleFrequency
  /** 24-hour HH:MM format, e.g. "09:00". */
  time: string
  /** ISO timestamp of when the schedule was created — surfaced as "saved at". */
  createdAt: string
}

export const SCHEDULE_STORAGE_KEY = "chidi:insights-schedule"

// ============================================================================
// CSV input bundle — what the consumer must hand us
// ============================================================================

export interface InsightsExportPayload {
  period: Period
  generatedAt: string
  overview?: SalesOverviewResponse | null
  trend?: TrendDataPoint[] | null
  channels?: ChannelData[] | null
  topProducts?: TopProduct[] | null
  topCustomers?: CustomerSummary[] | null
  cohort?: CohortReport | null
  /** ISO currency code for the totals — defaults to NGN. */
  currency?: string
}

// ============================================================================
// CSV builder
// ============================================================================

/**
 * Escape a single CSV cell. Double-quote-wraps when the value contains a
 * comma, quote or newline; doubles inner quotes per RFC 4180.
 */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",")
}

/**
 * buildInsightsCSV — turn the Insights snapshot into a multi-section CSV.
 * Each section starts with a `# Section name` comment row so it reads like
 * a printable report when opened in a spreadsheet.
 */
export function buildInsightsCSV(payload: InsightsExportPayload): string {
  const lines: string[] = []
  const currency = payload.currency ?? "NGN"

  // ----- Header / meta -----------------------------------------------------
  lines.push(`# Chidi Insights Export`)
  lines.push(`# Period,${payload.period}`)
  lines.push(`# Currency,${currency}`)
  lines.push(`# Generated,${payload.generatedAt}`)
  lines.push("")

  // ----- KPIs --------------------------------------------------------------
  lines.push(`# KPIs`)
  lines.push(csvRow(["Metric", "Current", "Previous", "Percent change"]))
  if (payload.overview) {
    const o = payload.overview
    lines.push(
      csvRow([
        "Revenue",
        o.revenue.current,
        o.revenue.previous,
        formatPct(o.revenue.percent_change),
      ]),
    )
    lines.push(
      csvRow([
        "Orders",
        o.orders.current,
        o.orders.previous,
        formatPct(o.orders.percent_change),
      ]),
    )
    lines.push(
      csvRow([
        "Avg order value",
        o.avg_order_value.current,
        o.avg_order_value.previous,
        formatPct(o.avg_order_value.percent_change),
      ]),
    )
    lines.push(
      csvRow([
        "Fulfillment rate",
        o.fulfillment_rate.current,
        o.fulfillment_rate.previous,
        formatPct(o.fulfillment_rate.percent_change),
      ]),
    )
    if (payload.cohort) {
      lines.push(
        csvRow([
          "Repeat rate",
          payload.cohort.repeatRate,
          // No prior repeat rate stored on the report; surface delta only.
          "",
          formatPct(payload.cohort.repeatRateDelta),
        ]),
      )
    }
  } else {
    lines.push(`No KPI data available.`)
  }
  lines.push("")

  // ----- Trend -------------------------------------------------------------
  lines.push(`# Daily revenue trend`)
  lines.push(csvRow(["Date", "Revenue", "Orders"]))
  if (payload.trend && payload.trend.length) {
    for (const d of payload.trend) {
      lines.push(csvRow([d.date, d.revenue, d.order_count]))
    }
  } else {
    lines.push(`No trend data available.`)
  }
  lines.push("")

  // ----- Channel mix -------------------------------------------------------
  lines.push(`# Channel mix`)
  lines.push(
    csvRow([
      "Channel",
      "Revenue",
      "Orders",
      "Revenue share %",
      "Order share %",
    ]),
  )
  if (payload.channels && payload.channels.length) {
    for (const c of payload.channels) {
      lines.push(
        csvRow([
          c.channel,
          c.revenue,
          c.order_count,
          c.revenue_percentage,
          c.order_percentage,
        ]),
      )
    }
  } else {
    lines.push(`No channel data available.`)
  }
  lines.push("")

  // ----- Bestsellers -------------------------------------------------------
  lines.push(`# Bestsellers`)
  lines.push(
    csvRow(["Product", "Product ID", "Units sold", "Revenue"]),
  )
  if (payload.topProducts && payload.topProducts.length) {
    for (const p of payload.topProducts) {
      lines.push(
        csvRow([
          p.product_name,
          p.product_id ?? "",
          p.units_sold,
          p.revenue,
        ]),
      )
    }
  } else {
    lines.push(`No bestseller data available.`)
  }
  lines.push("")

  // ----- Customers ---------------------------------------------------------
  lines.push(`# Customers`)
  lines.push(
    csvRow([
      "Name",
      "Phone",
      "Orders",
      "Total spent",
      "First order",
      "Last order",
      "Channels",
      "VIP",
    ]),
  )
  if (payload.topCustomers && payload.topCustomers.length) {
    for (const c of payload.topCustomers) {
      lines.push(
        csvRow([
          c.name ?? "",
          c.phone,
          c.order_count,
          c.total_spent,
          c.first_order ?? "",
          c.last_order ?? "",
          c.channels.join("|"),
          c.is_vip ? "Yes" : "No",
        ]),
      )
    }
  } else {
    lines.push(`No customer data available.`)
  }
  lines.push("")

  // ----- Cohort ------------------------------------------------------------
  lines.push(`# Cohort`)
  lines.push(csvRow(["Bucket", "Customers", "Percent"]))
  if (payload.cohort) {
    for (const b of payload.cohort.buckets) {
      lines.push(csvRow([b.label, b.value, b.percent]))
    }
    lines.push(
      csvRow([
        "Total customers",
        payload.cohort.totalCustomers,
        100,
      ]),
    )
  } else {
    lines.push(`No cohort data available.`)
  }
  lines.push("")

  return lines.join("\n")
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return ""
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(1)}%`
}

// ============================================================================
// Browser download
// ============================================================================

/**
 * Trigger a CSV download in the browser. No-op on the server. Safe to call
 * from a click handler — does not throw.
 */
export function downloadInsightsCSV(payload: InsightsExportPayload): void {
  if (typeof window === "undefined" || typeof document === "undefined") return
  const csv = buildInsightsCSV(payload)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filenameFor(payload.period, payload.generatedAt)
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Free the blob URL on the next tick so the click has time to register.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function filenameFor(period: Period, generatedAt: string): string {
  // YYYY-MM-DD slug for sorting in Finder.
  const datePart = generatedAt.slice(0, 10).replace(/[^0-9-]/g, "") || "today"
  return `chidi-insights-${period}-${datePart}.csv`
}

// ============================================================================
// Schedule helpers — localStorage stubs
// ============================================================================

/**
 * Persist a schedule. Returns the stored object so callers can confirm what
 * was saved (and surface a "next email at …" line in the toast).
 */
export function scheduleInsightsEmail(input: {
  email: string
  frequency: ScheduleFrequency
  time: string
}): InsightsSchedule {
  const schedule: InsightsSchedule = {
    email: input.email.trim(),
    frequency: input.frequency,
    time: normaliseTime(input.time),
    createdAt: new Date().toISOString(),
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        SCHEDULE_STORAGE_KEY,
        JSON.stringify(schedule),
      )
      // Mirror an event so any other tab listening can react.
      window.dispatchEvent(
        new CustomEvent("chidi:insights-schedule-updated", {
          detail: schedule,
        }),
      )
    } catch {
      // Quota / private mode — fall through silently. The toast still fires.
    }
  }
  return schedule
}

/**
 * Read the persisted schedule. Returns null if absent or malformed.
 */
export function getInsightsSchedule(): InsightsSchedule | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SCHEDULE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InsightsSchedule
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.frequency !== "string" ||
      typeof parsed.time !== "string"
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Wipe the persisted schedule. Used by the "Cancel schedule" link in the
 * export sheet.
 */
export function cancelInsightsSchedule(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(SCHEDULE_STORAGE_KEY)
    window.dispatchEvent(
      new CustomEvent("chidi:insights-schedule-updated", { detail: null }),
    )
  } catch {
    // ignore
  }
}

function normaliseTime(input: string): string {
  // Accept "9:00", "09:00", "9", etc — return HH:MM.
  const trimmed = input.trim()
  if (!trimmed) return "09:00"
  const [hRaw, mRaw = "00"] = trimmed.split(":")
  const h = Math.min(23, Math.max(0, parseInt(hRaw, 10) || 0))
  const m = Math.min(59, Math.max(0, parseInt(mRaw, 10) || 0))
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * Build a human-readable "next send" string for the schedule toast. Pure —
 * accepts an injected clock for testability.
 */
export function describeNextSend(
  schedule: InsightsSchedule,
  now: number = Date.now(),
): string {
  const [h, m] = schedule.time.split(":").map((s) => parseInt(s, 10))
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  // If today's slot has already passed, push to tomorrow.
  if (next.getTime() <= now) next.setDate(next.getDate() + 1)
  const isTomorrow =
    next.getDate() !== new Date(now).getDate() ||
    next.getMonth() !== new Date(now).getMonth()
  const dayLabel = isTomorrow ? "tomorrow" : "today"
  // Friendly time format (1pm, 9am, 7:30am).
  const hour12 = ((h + 11) % 12) + 1
  const ampm = h < 12 ? "am" : "pm"
  const timeLabel = m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, "0")}${ampm}`
  return `Scheduled — first email ${dayLabel} at ${timeLabel}.`
}
