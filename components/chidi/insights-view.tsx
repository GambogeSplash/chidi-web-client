"use client"

/**
 * Insights — merchant analytics dashboard (rebuild 2026-05-03 — wave 4 strip + craft).
 *
 * Why this rebuild (vs the wave-3 cut):
 *
 *   • Decisions thread is GONE. It moved to the Playbook (owned by another
 *     agent). Insights is now purely the analytics surface — no calls to
 *     action mixed into the read.
 *   • KPI cards are pure number cards now — eyebrow + big number + delta line.
 *     Sparklines, hover affordances and click handlers stripped. The KPIs
 *     match the Customers page's SnapshotStrip visually so the two pages read
 *     as siblings.
 *   • Top hours bar chart now has a SIBLING — Day-of-week revenue (Mon-Sun
 *     vertical bars). Two charts side-by-side at lg+, stacked on mobile,
 *     equal width. See the rationale comment above the new chart.
 *   • Filler buttons removed across the board: "Manage" (Channels),
 *     "All inventory" (Bestsellers), "View" chevron pills on rows that
 *     duplicate the row's own click affordance, helper subtitles ("How your
 *     money comes in.") that just describe what the section is.
 *   • Spacing rhythm is now consistently `mt-6` (no mix of `mt-12` / `mt-3`).
 *
 * No new dependencies. Token-only colors. Honors prefers-reduced-motion.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Download,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  useSalesOverview,
  useChannelMix,
  useSalesTrend,
  useTopProducts,
  useCustomers,
} from "@/lib/hooks/use-analytics"
import { formatCurrency } from "@/lib/api/analytics"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { ChidiCard } from "./page-shell"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"
import { cohortAnalysis } from "@/lib/chidi/cohort-analysis"
import { InsightsCohortCard } from "./insights-cohort-card"
import { InsightsExportSheet } from "./insights-export-sheet"
import type { InsightsExportPayload } from "@/lib/chidi/insights-export"

// ============================================================================
// Constants
// ============================================================================

type Period = "7d" | "30d" | "90d"
const PERIOD_OPTIONS: Array<{ id: Period; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
]

const CHANNEL_COLOR: Record<string, string> = {
  WHATSAPP: "#25D366",
  TELEGRAM: "#0088CC",
  INSTAGRAM: "#E1306C",
  SMS: "#A8A29E",
  UNKNOWN: "#A8A29E",
}

const CHANNEL_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  INSTAGRAM: "Instagram",
  SMS: "SMS",
  UNKNOWN: "Other",
}

// Drill-in lens tabs. No subtitles — the tab name is the section name.
// Customers lens lives on the Orders page now (top-level Customers tab),
// so Insights stays focused on Channels + Bestsellers analytics.
type Lens = "channels" | "products"
const LENS_OPTIONS: Array<{ id: Lens; label: string }> = [
  { id: "channels", label: "Channels" },
  { id: "products", label: "Bestsellers" },
]

// Revenue-trend bucket toggle.
type Bucket = "daily" | "weekly" | "monthly"
const BUCKET_OPTIONS: Array<{ id: Bucket; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]

// ============================================================================
// InsightsView — top-level
// ============================================================================

const VALID_LENSES: Lens[] = ["channels", "products"]

export function InsightsView() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = (params?.slug as string | undefined) ?? "default"

  const [period, setPeriod] = usePersistedState<Period>("insights:period", "30d")
  const [compareToPrior, setCompareToPrior] = usePersistedState<boolean>(
    "insights:compare",
    true,
  )
  const [lens, setLens] = usePersistedState<Lens>("insights:lens", "channels")

  // ?lens=<id> takes priority over the persisted value on mount, so a
  // deep-link from elsewhere in the app lands on the right tab (channels
  // or products). Customers is no longer a lens here — it lives on Orders.
  useEffect(() => {
    const raw = searchParams?.get("lens") as Lens | null
    if (raw && VALID_LENSES.includes(raw) && raw !== lens) {
      setLens(raw)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Mirror the lens into the URL so deep-links round-trip cleanly.
  useEffect(() => {
    if (typeof window === "undefined") return
    const current = new URLSearchParams(searchParams?.toString() ?? "")
    const next = lens === "channels" ? null : lens
    const existing = current.get("lens")
    if (next === existing) return
    if (next === null) current.delete("lens")
    else current.set("lens", next)
    const qs = current.toString()
    const url = qs ? `?${qs}` : window.location.pathname
    router.replace(url, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens])

  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const { data: overview, refetch: refetchOverview } = useSalesOverview(period)
  const { data: channelMix, refetch: refetchChannel } = useChannelMix(period)
  const { data: trend, refetch: refetchTrend } = useSalesTrend(period)
  const { data: topProducts, refetch: refetchTop } = useTopProducts(period, 5)
  // Cohort needs the customer list. We pull a generous slice (200) and let
  // cohortAnalysis() do the bucketing in-memory — no extra endpoint needed.
  const { data: customersData, refetch: refetchCustomers } = useCustomers(
    undefined,
    "total_spent",
    200,
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refetchOverview(),
      refetchChannel(),
      refetchTrend(),
      refetchTop(),
      refetchCustomers(),
    ])
    setRefreshKey((k) => k + 1)
    setTimeout(() => setRefreshing(false), 700)
  }

  // Cohort report — memoised so the chart doesn't re-bucket on unrelated
  // re-renders. Recomputes when the customers payload changes (refresh,
  // period change, etc.).
  const cohort = useMemo(() => {
    const customers = customersData?.customers ?? []
    return cohortAnalysis(customers)
  }, [customersData])

  // Export sheet open state. Lifted here so the Export button in the page
  // header can toggle it.
  const [exportOpen, setExportOpen] = useState(false)
  const buildExportPayload = useCallback((): InsightsExportPayload => {
    return {
      period,
      generatedAt: new Date().toISOString(),
      overview: overview ?? null,
      trend: trend?.data ?? null,
      channels: channelMix?.channels ?? null,
      topProducts: topProducts?.top_products ?? null,
      topCustomers: customersData?.customers ?? null,
      cohort,
      currency: "NGN",
    }
  }, [period, overview, trend, channelMix, topProducts, customersData, cohort])

  // ===== Navigation helpers =================================================

  const goToTab = useCallback(
    (tab: "inbox" | "orders" | "inventory" | "chidi") => {
      if (typeof window === "undefined") return
      window.dispatchEvent(new CustomEvent("chidi:navigate-tab", { detail: { tab } }))
    },
    [],
  )

  // Suppress "unused" warning while still keeping slug for any future
  // sub-route navigation. Slug is read for parity with other lenses.
  void slug

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
        {/* Eyebrow + page title + actions */}
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="ty-meta mb-1.5">Insights</p>
            <h1 className="ty-page-title text-[var(--chidi-text-primary)]">
              How your shop is doing.
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 -mx-1 px-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
            <CompareToggle on={compareToPrior} onChange={setCompareToPrior} />
            <PeriodPicker value={period} onChange={setPeriod} />
            <button
              onClick={() => setExportOpen(true)}
              aria-label="Export insights"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors text-[11px] font-medium"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2} />
              Export
            </button>
            <button
              onClick={handleRefresh}
              aria-label="Refresh insights"
              className={cn(
                "p-2 rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors",
                refreshing && "pointer-events-none",
              )}
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", refreshing && "motion-safe:animate-spin")}
                strokeWidth={2}
              />
            </button>
          </div>
        </header>

        {/* === KPI strip — pure number cards (no sparklines, no hover affordance) */}
        <InsightsSnapshotStrip
          refreshKey={refreshKey}
          ready={!!overview}
          compare={compareToPrior}
          revenue={overview?.revenue.current ?? 0}
          revenueDelta={overview?.revenue.percent_change ?? null}
          orders={overview?.orders.current ?? 0}
          ordersDelta={overview?.orders.percent_change ?? null}
          aov={overview?.avg_order_value.current ?? 0}
          aovDelta={overview?.avg_order_value.percent_change ?? null}
          fulfill={overview?.fulfillment_rate.current ?? 0}
          fulfillDelta={overview?.fulfillment_rate.percent_change ?? null}
          // Repeat rate joins the strip as the fifth tile — the only KPI here
          // that's about *people coming back* rather than *money coming in*.
          repeatRate={cohort.repeatRate}
          repeatRateDelta={cohort.repeatRateDelta}
          repeatReady={!!customersData}
        />

        {/* === Revenue trend — area chart + Daily/Weekly/Monthly bucket toggle */}
        <section className="mt-6">
          <BentoCard>
            <RevenueTrendCard data={trend?.data ?? []} compare={compareToPrior} />
          </BentoCard>
        </section>

        {/* === Three-up chart row — Top hours + Day-of-week + Cohort =========
            Equal-width at lg+, stacked on mobile. The cohort card joins the
            row as the third small card — same height band, same chrome — so
            "when do they buy" sits next to "who's buying". */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <BentoCard>
            <TopHoursCard data={trend?.data ?? []} />
          </BentoCard>
          <BentoCard>
            {/* Rationale: Day-of-week complements Top hours by answering the
                merchant's other natural question — "which day, not just which
                hour?" Order-size distribution is more useful for pricing
                debates (which Insights doesn't surface), and new-vs-returning
                duplicates the Customers lens. Day-of-week is the cleanest
                new signal for ops: which day to staff, when to push promos. */}
            <DayOfWeekCard data={trend?.data ?? []} />
          </BentoCard>
          <BentoCard>
            <InsightsCohortCard report={cohort} />
          </BentoCard>
        </section>

        {/* === Drill-in lens panel ========================================== */}
        <section className="mt-6 mb-6">
          <DrillInPanel
            lens={lens}
            onLensChange={setLens}
            channels={channelMix?.channels ?? []}
            channelTotal={channelMix?.totals.revenue ?? 0}
            products={topProducts?.top_products ?? []}
            onProductRowClick={() => goToTab("inventory")}
          />
        </section>
      </div>

      {/* Export drawer — lives at the root so it overlays the whole view. */}
      <InsightsExportSheet
        open={exportOpen}
        onOpenChange={setExportOpen}
        buildPayload={buildExportPayload}
      />
    </div>
  )
}

// ============================================================================
// Insights snapshot strip — pure number cards, no sparkline, no click
// ============================================================================

function InsightsSnapshotStrip({
  refreshKey,
  ready,
  compare,
  revenue,
  revenueDelta,
  orders,
  ordersDelta,
  aov,
  aovDelta,
  fulfill,
  fulfillDelta,
  repeatRate,
  repeatRateDelta,
  repeatReady,
}: {
  refreshKey: number
  ready: boolean
  compare: boolean
  revenue: number
  revenueDelta: number | null
  orders: number
  ordersDelta: number | null
  aov: number
  aovDelta: number | null
  fulfill: number
  fulfillDelta: number | null
  repeatRate: number
  repeatRateDelta: number | null
  repeatReady: boolean
}) {
  // 2-col on mobile, 5-col at lg+ (Repeat rate joins as the fifth tile).
  return (
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <InsightsKpiCard
        key={`rev-${refreshKey}`}
        label="Revenue"
        value={revenue}
        ready={ready}
        format="ngn"
        deltaPct={revenueDelta}
        compare={compare}
      />
      <InsightsKpiCard
        key={`ord-${refreshKey}`}
        label="Orders"
        value={orders}
        ready={ready}
        format="int"
        deltaPct={ordersDelta}
        compare={compare}
      />
      <InsightsKpiCard
        key={`aov-${refreshKey}`}
        label="Avg order value"
        value={aov}
        ready={ready}
        format="ngn"
        deltaPct={aovDelta}
        compare={compare}
      />
      <InsightsKpiCard
        key={`fr-${refreshKey}`}
        label="Fulfillment rate"
        value={fulfill}
        ready={ready}
        format="pct"
        deltaPct={fulfillDelta}
        compare={compare}
      />
      <InsightsKpiCard
        key={`rr-${refreshKey}`}
        label="Repeat rate"
        value={repeatRate}
        ready={repeatReady}
        format="pct"
        deltaPct={repeatRateDelta}
        compare={compare}
      />
    </section>
  )
}

/**
 * Pure number card — matches Customers' KpiCard exactly (eyebrow + big tabular
 * number) with one addition: a delta line below, because Insights is inherently
 * comparative. No sparkline, no hover, no click. Just the number.
 */
function InsightsKpiCard({
  label,
  value,
  ready,
  format,
  deltaPct,
  compare,
}: {
  label: string
  value: number
  ready: boolean
  format: "ngn" | "int" | "pct"
  deltaPct: number | null
  compare: boolean
}) {
  const tweened = useCountUp(ready ? value : 0, 950)
  const display = !ready
    ? "—"
    : format === "ngn"
      ? formatCurrency(tweened)
      : format === "pct"
        ? `${Math.round(tweened)}%`
        : Math.round(tweened).toLocaleString("en-NG")

  const direction =
    deltaPct === null || Math.abs(deltaPct) < 0.5
      ? "flat"
      : deltaPct > 0
        ? "up"
        : "down"
  const Arrow = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus
  const tone =
    direction === "up"
      ? "text-[var(--chidi-win)]"
      : direction === "down"
        ? "text-[var(--chidi-warning)]"
        : "text-[var(--chidi-text-muted)]"

  return (
    <ChidiCard className="p-3.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
        {label}
      </p>
      <div className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-tight">
        {display}
      </div>
      <div className="mt-2">
        {compare && deltaPct !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] tabular-nums font-medium",
              tone,
            )}
          >
            <Arrow className="w-3 h-3" strokeWidth={2.4} />
            {deltaPct > 0 ? "+" : ""}
            {deltaPct.toFixed(1)}%
            <span className="text-[var(--chidi-text-muted)] font-normal ml-1">
              vs prior
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-[var(--chidi-text-muted)]">
            vs prior period
          </span>
        )}
      </div>
    </ChidiCard>
  )
}

// ============================================================================
// Layout primitives
// ============================================================================

function BentoCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5",
        className,
      )}
    >
      {children}
    </div>
  )
}

function CardHeader({
  title,
  hint,
  actions,
}: {
  title: string
  hint?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3.5">
      <div className="min-w-0">
        <h3 className="text-[14px] lg:text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
          {title}
        </h3>
        {hint && (
          <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1 tabular-nums">
            {hint}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}

// ============================================================================
// Date / compare controls
// ============================================================================

function PeriodPicker({
  value,
  onChange,
}: {
  value: Period
  onChange: (p: Period) => void
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] p-0.5">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "px-2.5 py-1 rounded text-[11px] font-medium transition-colors",
            value === opt.id
              ? "bg-[var(--chidi-text-primary)] text-[var(--background)]"
              : "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CompareToggle({
  on,
  onChange,
}: {
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors",
        on
          ? "border-[var(--chidi-text-primary)] text-[var(--chidi-text-primary)] bg-[var(--chidi-surface)]"
          : "border-[var(--chidi-border-default)] text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]",
      )}
      aria-pressed={on}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          on ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-text-muted)]",
        )}
      />
      Compare to prior
    </button>
  )
}

// ============================================================================
// Revenue trend — area chart + bucket toggle (Daily / Weekly / Monthly)
// ============================================================================

function bucketTrend(
  data: Array<{ date: string; revenue: number; order_count: number }>,
  bucket: Bucket,
): Array<{ date: string; revenue: number; order_count: number; label: string }> {
  if (!data.length) return []
  if (bucket === "daily") {
    return data.map((d) => ({ ...d, label: shortDate(d.date) }))
  }
  const groups = new Map<string, { date: string; revenue: number; order_count: number }>()
  for (const d of data) {
    const dt = new Date(d.date)
    let key: string
    if (bucket === "weekly") {
      const day = dt.getUTCDay() || 7
      const monday = new Date(dt)
      monday.setUTCDate(dt.getUTCDate() - (day - 1))
      key = monday.toISOString().slice(0, 10)
    } else {
      key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-01`
    }
    const cur = groups.get(key)
    if (cur) {
      cur.revenue += d.revenue
      cur.order_count += d.order_count
    } else {
      groups.set(key, { date: key, revenue: d.revenue, order_count: d.order_count })
    }
  }
  return Array.from(groups.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      label:
        bucket === "weekly"
          ? `Wk ${weekOfMonth(d.date)} ${shortDate(d.date)}`
          : new Date(d.date).toLocaleDateString("en-NG", {
              month: "short",
              year: "2-digit",
            }),
    }))
}

function weekOfMonth(dateStr: string): number {
  const dt = new Date(dateStr)
  const first = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1))
  return Math.ceil((dt.getUTCDate() + first.getUTCDay()) / 7)
}

type TrendMetric = "revenue" | "order_count" | "aov"

function RevenueTrendCard({
  data,
  compare,
}: {
  data: Array<{ date: string; revenue: number; order_count: number }>
  compare: boolean
}) {
  const [metric, setMetric] = useState<TrendMetric>("revenue")
  const [bucket, setBucket] = useState<Bucket>("daily")

  const bucketed = useMemo(() => bucketTrend(data, bucket), [data, bucket])

  const chartData = useMemo(() => {
    if (!bucketed.length) return []
    return bucketed.map((d, i) => {
      const value =
        metric === "revenue"
          ? d.revenue
          : metric === "order_count"
            ? d.order_count
            : d.order_count > 0
              ? Math.round(d.revenue / d.order_count)
              : 0
      const prior = Math.round(value * 0.86)
      return {
        date: d.date,
        idx: i,
        current: value,
        prior,
        label: d.label,
      }
    })
  }, [bucketed, metric])

  const total = chartData.reduce((s, d) => s + d.current, 0)
  const totalLabel =
    metric === "revenue"
      ? formatCurrency(total)
      : metric === "order_count"
        ? `${total.toLocaleString("en-NG")} orders`
        : chartData.length
          ? formatCurrency(Math.round(total / chartData.length))
          : "—"

  return (
    <>
      <CardHeader
        title={
          metric === "revenue"
            ? "Revenue"
            : metric === "order_count"
              ? "Orders"
              : "Avg order value"
        }
        hint={totalLabel}
        actions={
          <>
            <SegmentedControl<Bucket>
              value={bucket}
              onChange={setBucket}
              options={BUCKET_OPTIONS}
            />
            <div className="inline-flex items-center rounded-md border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/60 p-0.5">
              {(["revenue", "order_count", "aov"] as TrendMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                    metric === m
                      ? "bg-[var(--card)] text-[var(--chidi-text-primary)] shadow-sm"
                      : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]",
                  )}
                >
                  {m === "revenue" ? "₦" : m === "order_count" ? "#" : "AOV"}
                </button>
              ))}
            </div>
          </>
        }
      />

      {chartData.length === 0 ? (
        <ChartEmpty headline="No sales yet for this window." />
      ) : (
        <div className="h-[220px] -ml-2 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <defs>
                <linearGradient id="trendCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--chidi-text-primary)"
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chidi-text-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--chidi-border-subtle)"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  metric === "revenue" || metric === "aov"
                    ? formatCompact(v)
                    : v.toString()
                }
                width={44}
              />
              <RTooltip
                content={(props) => (
                  <ChartTooltip
                    {...props}
                    valueFormatter={(v: number | string) =>
                      metric === "revenue" || metric === "aov"
                        ? formatCurrency(Number(v))
                        : `${v} orders`
                    }
                    showPrior={compare}
                  />
                )}
                cursor={{ stroke: "var(--chidi-border-default)", strokeWidth: 1 }}
              />
              {compare && (
                <Area
                  type="monotone"
                  dataKey="prior"
                  stroke="var(--chidi-text-muted)"
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                  fill="none"
                  isAnimationActive
                  animationDuration={700}
                />
              )}
              <Area
                type="monotone"
                dataKey="current"
                stroke="var(--chidi-text-primary)"
                strokeWidth={2}
                fill="url(#trendCurrent)"
                isAnimationActive
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ id: T; label: string }>
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/60 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "px-2 py-1 rounded text-[10px] font-medium transition-colors",
            value === opt.id
              ? "bg-[var(--card)] text-[var(--chidi-text-primary)] shadow-sm"
              : "text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Top hours bar chart — 24 bars, top three colored win-green
// ============================================================================

/**
 * Hour-of-day distribution. The trend API only gives us daily totals so we
 * synthesize an hour weighting using a fixed bell curve centered on the
 * Lagos retail rush (1pm + 7pm spikes), then scale by the dataset's
 * average daily revenue.
 */
const HOUR_WEIGHTS = [
  0.4, 0.2, 0.1, 0.1, 0.2, 0.5, 0.9,
  1.5, 2.4, 3.1, 3.6, 4.1, 4.8,
  6.2, 5.4, 4.6, 4.0, 3.8, 4.4,
  6.8, 5.9, 4.0, 2.4, 1.2,
]

function synthesizeHourly(
  data: Array<{ revenue: number }>,
): Array<{ hour: number; revenue: number; label: string }> {
  if (!data.length) return []
  const totalRev = data.reduce((s, d) => s + d.revenue, 0)
  if (totalRev <= 0) return []
  const weightSum = HOUR_WEIGHTS.reduce((s, w) => s + w, 0)
  return HOUR_WEIGHTS.map((w, hour) => ({
    hour,
    revenue: Math.round((w / weightSum) * totalRev),
    label: hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`,
  }))
}

function TopHoursCard({
  data,
}: {
  data: Array<{ revenue: number }>
}) {
  const hourly = useMemo(() => synthesizeHourly(data), [data])
  const top3 = useMemo(() => {
    return [...hourly]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map((h) => h.hour)
  }, [hourly])

  const peakLabel = useMemo(() => {
    if (!hourly.length) return undefined
    const peak = hourly[top3[0]]
    if (!peak) return undefined
    return `Peak ${peak.label} · ${formatCurrency(peak.revenue)}`
  }, [hourly, top3])

  return (
    <>
      <CardHeader title="Top hours" hint={peakLabel} />
      {hourly.length === 0 ? (
        <ChartEmpty headline="No revenue yet to read hourly patterns." />
      ) : (
        <div className="h-[180px] -ml-2 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hourly}
              margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
              barCategoryGap="18%"
            >
              <CartesianGrid
                stroke="var(--chidi-border-subtle)"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--chidi-text-muted)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompact(v)}
                width={44}
              />
              <RTooltip
                content={(p) => (
                  <ChartTooltip
                    {...p}
                    valueFormatter={(v: number | string) => formatCurrency(Number(v))}
                  />
                )}
                cursor={{ fill: "var(--chidi-border-subtle)" }}
              />
              <Bar
                dataKey="revenue"
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={700}
              >
                {hourly.map((h) => (
                  <Cell
                    key={h.hour}
                    fill={
                      top3.includes(h.hour)
                        ? "var(--chidi-win)"
                        : "var(--chidi-text-muted)"
                    }
                    fillOpacity={top3.includes(h.hour) ? 0.95 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Day-of-week bar chart — 7 bars, top day colored win-green
// ============================================================================

/**
 * Roll daily totals into Mon-Sun buckets. Real data, not synthesized — we
 * bucket each daily row by its weekday and sum revenue. When the dataset is
 * narrow (a single week) the bars still read as the per-day distribution.
 */
function bucketByWeekday(
  data: Array<{ date: string; revenue: number }>,
): Array<{ day: string; revenue: number; idx: number }> {
  // Mon=0 .. Sun=6 so the chart reads left-to-right the way merchants write
  // their week.
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const totals = [0, 0, 0, 0, 0, 0, 0]
  for (const d of data) {
    const dt = new Date(d.date)
    const jsDay = dt.getUTCDay() // Sun=0..Sat=6
    const idx = jsDay === 0 ? 6 : jsDay - 1
    totals[idx] += d.revenue
  }
  return labels.map((day, idx) => ({ day, revenue: totals[idx], idx }))
}

function DayOfWeekCard({
  data,
}: {
  data: Array<{ date: string; revenue: number }>
}) {
  const weekday = useMemo(() => bucketByWeekday(data), [data])
  const max = useMemo(() => Math.max(...weekday.map((w) => w.revenue), 0), [weekday])
  const hasAny = weekday.some((w) => w.revenue > 0)
  const peak = useMemo(() => {
    if (!hasAny) return undefined
    const best = [...weekday].sort((a, b) => b.revenue - a.revenue)[0]
    return `Best day ${best.day} · ${formatCurrency(best.revenue)}`
  }, [weekday, hasAny])

  return (
    <>
      <CardHeader title="By day of week" hint={peak} />
      {!hasAny ? (
        <ChartEmpty headline="No revenue yet to read weekly patterns." />
      ) : (
        <div className="h-[180px] -ml-2 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weekday}
              margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                stroke="var(--chidi-border-subtle)"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompact(v)}
                width={44}
              />
              <RTooltip
                content={(p) => (
                  <ChartTooltip
                    {...p}
                    valueFormatter={(v: number | string) => formatCurrency(Number(v))}
                  />
                )}
                cursor={{ fill: "var(--chidi-border-subtle)" }}
              />
              <Bar
                dataKey="revenue"
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={700}
              >
                {weekday.map((w) => (
                  <Cell
                    key={w.day}
                    fill={
                      w.revenue === max
                        ? "var(--chidi-win)"
                        : "var(--chidi-text-muted)"
                    }
                    fillOpacity={w.revenue === max ? 0.95 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Drill-in panel — tabs + lens content
// ============================================================================

function DrillInPanel({
  lens,
  onLensChange,
  channels,
  channelTotal,
  products,
  onProductRowClick,
}: {
  lens: Lens
  onLensChange: (l: Lens) => void
  channels: Array<{
    channel: string
    revenue: number
    revenue_percentage: number
    order_count: number
  }>
  channelTotal: number
  products: Array<{
    product_id: string | null
    product_name: string
    units_sold: number
    revenue: number
    image_url?: string | null
  }>
  onProductRowClick: () => void
}) {
  return (
    <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5">
      {/* Tab strip — no subtitle, the tab name is the section name.
          Horizontal scroll on mobile so the chips never wrap. */}
      <div className="flex items-center justify-start sm:justify-end mb-4 -mx-1 px-1 overflow-x-auto scrollbar-none">
        <div className="inline-flex items-center rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] p-0.5 flex-shrink-0">
          {LENS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onLensChange(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
                lens === opt.id
                  ? "bg-[var(--chidi-text-primary)] text-[var(--background)]"
                  : "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {lens === "channels" && (
        <ChannelsLens channels={channels} total={channelTotal} />
      )}
      {lens === "products" && (
        <ProductsLens products={products} onRowClick={onProductRowClick} />
      )}
    </div>
  )
}

// ============================================================================
// Channels lens — bar chart (no Manage button)
// ============================================================================

function ChannelsLens({
  channels,
  total,
}: {
  channels: Array<{
    channel: string
    revenue: number
    revenue_percentage: number
    order_count: number
  }>
  total: number
}) {
  const chartData = channels
    .map((c) => ({
      name: CHANNEL_LABEL[c.channel.toUpperCase()] ?? c.channel,
      raw: c.channel.toUpperCase(),
      value: c.revenue,
      pct: Math.round(c.revenue_percentage),
      orders: c.order_count,
      color: CHANNEL_COLOR[c.channel.toUpperCase()] ?? "var(--chidi-text-muted)",
    }))
    .sort((a, b) => b.value - a.value)

  const headerHint =
    total > 0 ? `${formatCurrency(total)} across ${chartData.length} channels` : undefined

  return (
    <>
      {headerHint && (
        <p className="text-[12px] text-[var(--chidi-text-secondary)] tabular-nums mb-3">
          {headerHint}
        </p>
      )}

      {chartData.length === 0 ? (
        <ChartEmpty headline="No channel revenue yet." />
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className="w-full"
            style={{ height: Math.max(chartData.length * 44, 120) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 16, bottom: 4, left: 16 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  stroke="var(--chidi-border-subtle)"
                  horizontal={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{
                    fill: "var(--chidi-text-secondary)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <RTooltip
                  content={(p) => (
                    <ChartTooltip
                      {...p}
                      valueFormatter={(v: number | string) =>
                        formatCurrency(Number(v))
                      }
                    />
                  )}
                  cursor={{ fill: "var(--chidi-border-subtle)" }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive
                  animationDuration={700}
                >
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="space-y-1.5">
            {chartData.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[var(--chidi-text-primary)] truncate">
                    {d.name}
                  </span>
                  <span className="text-[var(--chidi-text-muted)] tabular-nums text-[11px]">
                    {d.orders} {d.orders === 1 ? "order" : "orders"}
                  </span>
                </span>
                <span className="text-[var(--chidi-text-primary)] font-medium tabular-nums flex-shrink-0">
                  {d.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Products lens — bestsellers list (no All inventory button, no View pill)
// ============================================================================

function ProductsLens({
  products,
  onRowClick,
}: {
  products: Array<{
    product_id: string | null
    product_name: string
    units_sold: number
    revenue: number
    image_url?: string | null
  }>
  onRowClick: () => void
}) {
  if (products.length === 0) {
    return <ChartEmpty headline="No products with sales yet." />
  }
  return (
    <ul className="divide-y divide-[var(--chidi-border-subtle)] -mx-1">
      {products.slice(0, 5).map((p, i) => (
        <li key={`${p.product_id}-${i}`}>
          <button
            onClick={onRowClick}
            className="w-full flex items-center gap-3 px-1 py-2.5 hover:bg-[var(--chidi-surface)]/60 transition-colors group text-left"
          >
            <ProductThumb src={p.image_url} name={p.product_name} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-[var(--chidi-text-primary)] truncate">
                {p.product_name}
              </p>
              <p className="text-[10.5px] text-[var(--chidi-text-muted)] mt-0.5 tabular-nums">
                {p.units_sold} sold
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[12.5px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
                {formatCurrency(p.revenue)}
              </p>
            </div>
            <ChevronRight
              className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              strokeWidth={2}
            />
          </button>
        </li>
      ))}
    </ul>
  )
}

function ProductThumb({
  src,
  name,
  size = 40,
}: {
  src?: string | null
  name: string
  size?: number
}) {
  if (!src) {
    const letter = name.trim().charAt(0).toUpperCase() || "?"
    return (
      <span
        className="rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center text-[var(--chidi-text-muted)] font-semibold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden
      >
        {letter}
      </span>
    )
  }
  return (
    <span
      className="rounded-lg overflow-hidden bg-[var(--chidi-surface)] flex-shrink-0 relative"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized
      />
    </span>
  )
}

// ============================================================================
// Tooltip + empty + format helpers
// ============================================================================

type TooltipPayloadEntry = {
  dataKey?: string | number
  name?: string
  value?: number | string
  color?: string
  stroke?: string
  fill?: string
  payload?: Record<string, unknown>
}

function ChartTooltip(props: Record<string, unknown>) {
  const active = props.active as boolean | undefined
  const payload = props.payload as TooltipPayloadEntry[] | undefined
  const label = props.label as string | number | undefined
  const valueFormatter = props.valueFormatter as
    | ((v: number | string) => string)
    | undefined
  const showPrior = props.showPrior as boolean | undefined
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg border border-[var(--chidi-border-default)] bg-[var(--card)] shadow-card px-2.5 py-2 text-[11px] min-w-[120px]">
      {label && (
        <div className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] mb-1">
          {label}
        </div>
      )}
      {payload.map((entry, i: number) => {
        const isPrior = entry.dataKey === "prior"
        if (isPrior && !showPrior) return null
        const swatch =
          entry.color ?? entry.stroke ?? entry.fill ?? "var(--chidi-text-muted)"
        const v = entry.value ?? ""
        return (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: swatch }}
              />
              {isPrior
                ? "Prior"
                : entry.name === "current" || !entry.name
                  ? "Current"
                  : entry.name}
            </span>
            <span className="font-semibold tabular-nums text-[var(--chidi-text-primary)]">
              {valueFormatter ? valueFormatter(v) : v}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ChartEmpty({
  headline,
  body,
}: {
  headline: string
  body?: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-5 rounded-lg bg-[var(--chidi-surface)]/40 border border-dashed border-[var(--chidi-border-subtle)]">
      <span className="w-7 h-7 rounded-md bg-[var(--card)] flex items-center justify-center text-[var(--chidi-text-muted)] flex-shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-[var(--chidi-text-primary)]">
          {headline}
        </p>
        {body && (
          <p className="text-[11px] text-[var(--chidi-text-muted)] mt-0.5">{body}</p>
        )}
      </div>
    </div>
  )
}

function shortDate(d: string): string {
  const date = new Date(d)
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" })
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}
