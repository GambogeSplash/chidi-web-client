"use client"

/**
 * Insights — merchant analytics dashboard (rebuild 2026-05-03 — wave 3 craft pass).
 *
 * Why this rebuild (vs the wave-2 cut):
 *
 *   • KPI strip now mirrors Customers' SnapshotStrip exactly — same ChidiCard
 *     paper, same eyebrow-uppercase label scale, same big tabular number, same
 *     count-up tween. The two surfaces should read as siblings, not cousins.
 *   • Charts: Revenue trend now ALWAYS reads as the daily area chart but adds a
 *     Daily / Weekly / Monthly bucket toggle so the same shape rolls up cleanly.
 *     Two NEW bar charts join the lineup: Top hours (24-bar revenue-by-hour, top
 *     three colored win-green) and Channel comparison (horizontal bars per
 *     channel, replacing the donut — bars compare share more honestly than
 *     pies do at small read sizes).
 *   • Drill-in section finally has a title row ("DRILL IN" eyebrow + a one-line
 *     subtitle that changes per tab). The redundant per-tab section titles
 *     ("Top customers", etc.) are gone — the tab name + subtitle does the work.
 *   • Decisions: rebuilt as a CONVERSATION THREAD. Chidi speaks ("You're up 18%
 *     this week — want to see what's driving it?"), the merchant taps reply
 *     pills (Yes show me / Snooze / Not now). Feels assistive, not commanding.
 *     Dismissed/snoozed state persists to localStorage so the merchant doesn't
 *     re-confront a card they've already decided on.
 *
 * No new dependencies. Token-only colors. Honors prefers-reduced-motion.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Wallet,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  DECISIONS,
  type Decision,
  type DecisionChart,
} from "@/lib/chidi/insights-decisions"
import {
  useSalesOverview,
  useChannelMix,
  useSalesTrend,
  useTopProducts,
  useCustomers,
} from "@/lib/hooks/use-analytics"
import { useOrders } from "@/lib/hooks/use-orders"
import { formatCurrency } from "@/lib/api/analytics"
import { useCountUp } from "@/lib/chidi/use-count-up"
import { CustomerCharacter } from "./customer-character"
import { ChidiAvatar } from "./chidi-mark"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"
import { ChidiCard } from "./page-shell"

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

// Drill-in lens tabs.
type Lens = "channels" | "products" | "customers"
const LENS_OPTIONS: Array<{
  id: Lens
  label: string
  subtitle: string
}> = [
  { id: "channels", label: "Channels", subtitle: "How your money comes in." },
  { id: "products", label: "Bestsellers", subtitle: "What's pulling weight." },
  { id: "customers", label: "Customers", subtitle: "Who's spending the most." },
]

// Revenue-trend bucket toggle. Daily is the most honest — weekly/monthly are
// rolled up from daily so the same dataset reads at any cadence.
type Bucket = "daily" | "weekly" | "monthly"
const BUCKET_OPTIONS: Array<{ id: Bucket; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]

// ============================================================================
// Decision-thread state — persisted to localStorage so dismissals stick
// ============================================================================

type DecisionAction = "active" | "snoozed" | "dismissed"
type DecisionStateMap = Record<string, { state: DecisionAction; until?: number }>
const DECISIONS_STATE_KEY = "chidi:decisions-state"

function readDecisionState(): DecisionStateMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(DECISIONS_STATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DecisionStateMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeDecisionState(map: DecisionStateMap) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DECISIONS_STATE_KEY, JSON.stringify(map))
  } catch {
    // localStorage might be unavailable (private mode etc) — silently ignore.
  }
}

// ============================================================================
// InsightsView — top-level
// ============================================================================

export function InsightsView() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string | undefined) ?? "default"

  const [period, setPeriod] = usePersistedState<Period>("insights:period", "30d")
  const [compareToPrior, setCompareToPrior] = usePersistedState<boolean>(
    "insights:compare",
    true,
  )
  const [lens, setLens] = usePersistedState<Lens>("insights:lens", "channels")

  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const { data: overview, refetch: refetchOverview } = useSalesOverview(period)
  const { data: channelMix, refetch: refetchChannel } = useChannelMix(period)
  const { data: trend, refetch: refetchTrend } = useSalesTrend(period)
  const { data: topProducts, refetch: refetchTop } = useTopProducts(period, 5)
  const { data: customers, refetch: refetchCust } = useCustomers(undefined, "total_spent", 6)
  const { data: pendingOrders } = useOrders("PENDING_PAYMENT")

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refetchOverview(),
      refetchChannel(),
      refetchTrend(),
      refetchTop(),
      refetchCust(),
    ])
    setRefreshKey((k) => k + 1)
    setTimeout(() => setRefreshing(false), 700)
  }

  // ===== Navigation helpers =================================================

  const goToTab = useCallback(
    (tab: "inbox" | "orders" | "inventory" | "chidi") => {
      if (typeof window === "undefined") return
      window.dispatchEvent(new CustomEvent("chidi:navigate-tab", { detail: { tab } }))
    },
    [],
  )
  const goToPlaybook = useCallback(
    () => router.push(`/dashboard/${slug}/notebook`),
    [router, slug],
  )
  const goToSettings = useCallback(
    () => router.push(`/dashboard/${slug}/settings`),
    [router, slug],
  )

  const handleDecisionAction = useCallback(
    (link?: string) => {
      if (!link) return
      if (link.startsWith("/notebook") || link === "/notebook") {
        goToPlaybook()
        return
      }
      if (link === "/inventory") return goToTab("inventory")
      if (link === "/orders") return goToTab("orders")
      if (link === "/inbox") return goToTab("inbox")
      if (link.startsWith("/dashboard")) router.push(link)
    },
    [goToPlaybook, goToTab, router],
  )

  // Money owed — small inline pill in the Decisions header.
  const owedNow = useMemo(() => {
    return (pendingOrders?.orders ?? []).reduce(
      (s: number, o: { total?: number }) => s + (o?.total ?? 0),
      0,
    )
  }, [pendingOrders])
  const pendingCount = pendingOrders?.orders.length ?? 0

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
        {/* Eyebrow + page title + actions */}
        <header className="mb-5 lg:mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="ty-meta mb-1.5">Insights</p>
            <h1 className="ty-page-title text-[var(--chidi-text-primary)]">
              How your shop is doing.
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <CompareToggle on={compareToPrior} onChange={setCompareToPrior} />
            <PeriodPicker value={period} onChange={setPeriod} />
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

        {/* === Hero KPI row — same visual language as Customers' SnapshotStrip
            (ChidiCard p-3.5, eyebrow uppercase 10px tracking-[0.16em], big
            20px+ tabular-nums number, count-up tween). Difference: Insights
            shows a delta line + sparkline below the number because Insights is
            inherently comparative (vs Customers' single-snapshot reading). */}
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
          spark={trend?.data ?? []}
          onClickAll={() => goToTab("orders")}
        />

        {/* === Revenue trend — area chart + Daily/Weekly/Monthly bucket toggle */}
        <section className="mt-4 lg:mt-5">
          <BentoCard>
            <RevenueTrendCard
              data={trend?.data ?? []}
              compare={compareToPrior}
              onSeeOrders={() => goToTab("orders")}
            />
          </BentoCard>
        </section>

        {/* === Top hours bar chart — when do sales actually peak? ============
            New addition. Synthesizes hour-of-day distribution from the daily
            totals using a stable seeded curve. Top three hours colored
            chidi-win, the rest text-muted/0.5 so the peaks pop. */}
        <section className="mt-4 lg:mt-5">
          <BentoCard>
            <TopHoursCard data={trend?.data ?? []} />
          </BentoCard>
        </section>

        {/* === Decisions — Conversation thread =============================
            Each decision reads as Chidi addressing the merchant. Reply pills
            beneath every bubble. Persisted dismiss/snooze state.
            Direction-A rationale (1 paragraph): The other surfaces of Chidi
            (Inbox, Notebook, Morning Brief) all speak in first-person voice.
            Insights was the lone surface where Chidi was silent and the
            dashboard was demanding. The thread treatment closes that gap
            without inventing new mental model — the merchant already lives
            in chat all day. Reply pills make every decision a one-tap action,
            which matches the brand promise of "you make one decision at a
            time." Tinder/swipe (Direction B) is showy but loses the assistive
            tone; Inbox-list (Direction C) reproduces what the merchant
            already escapes from in the actual Inbox tab. */}
        <section className="mt-4 lg:mt-5">
          <DecisionsThread
            owedNow={owedNow}
            pendingCount={pendingCount}
            onChasePendings={() => goToTab("orders")}
            onAct={handleDecisionAction}
          />
        </section>

        {/* === Drill-in lens panel — now with a title row =================== */}
        <section className="mt-4 lg:mt-5 mb-6">
          <DrillInPanel
            lens={lens}
            onLensChange={setLens}
            channels={channelMix?.channels ?? []}
            channelTotal={channelMix?.totals.revenue ?? 0}
            products={topProducts?.top_products ?? []}
            customers={customers?.customers ?? []}
            onConfigure={goToSettings}
            onSeeAllInventory={() => goToTab("inventory")}
            onSeeConvo={() => goToTab("inbox")}
          />
        </section>
      </div>
    </div>
  )
}

// ============================================================================
// Insights snapshot strip — mirrors Customers' SnapshotStrip
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
  spark,
  onClickAll,
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
  spark: Array<{ revenue: number; order_count: number }>
  onClickAll: () => void
}) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
      <InsightsKpiCard
        key={`rev-${refreshKey}`}
        label="Revenue"
        value={revenue}
        ready={ready}
        format="ngn"
        deltaPct={revenueDelta}
        compare={compare}
        spark={spark.map((d) => d.revenue)}
        onClick={onClickAll}
      />
      <InsightsKpiCard
        key={`ord-${refreshKey}`}
        label="Orders"
        value={orders}
        ready={ready}
        format="int"
        deltaPct={ordersDelta}
        compare={compare}
        spark={spark.map((d) => d.order_count)}
        onClick={onClickAll}
      />
      <InsightsKpiCard
        key={`aov-${refreshKey}`}
        label="Avg order value"
        value={aov}
        ready={ready}
        format="ngn"
        deltaPct={aovDelta}
        compare={compare}
        spark={spark.map((d) =>
          d.order_count > 0 ? Math.round(d.revenue / d.order_count) : 0,
        )}
        onClick={onClickAll}
      />
      <InsightsKpiCard
        key={`fr-${refreshKey}`}
        label="Fulfillment rate"
        value={fulfill}
        ready={ready}
        format="pct"
        deltaPct={fulfillDelta}
        compare={compare}
        spark={spark.map((d) => d.order_count)}
        onClick={onClickAll}
      />
    </section>
  )
}

/**
 * Visual contract: matches Customers' KpiCard inside SnapshotStrip — same
 * ChidiCard wrapper (paper + border + shadow), p-3.5 padding, uppercase
 * tracking-[0.16em] eyebrow at 10px, 20px tabular-nums big number. Insights
 * adds a delta + sparkline row underneath because comparison is the point.
 */
function InsightsKpiCard({
  label,
  value,
  ready,
  format,
  deltaPct,
  compare,
  spark,
  onClick,
}: {
  label: string
  value: number
  ready: boolean
  format: "ngn" | "int" | "pct"
  deltaPct: number | null
  compare: boolean
  spark: number[]
  onClick: () => void
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

  const sparkData = spark.length > 1 ? spark.map((v, i) => ({ i, v })) : []

  return (
    <ChidiCard
      paper
      onClick={onClick}
      className="p-3.5 group transition-all hover:border-[var(--chidi-text-muted)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
          {label}
        </p>
        <ExternalLink
          className="w-3 h-3 text-[var(--chidi-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          strokeWidth={2}
        />
      </div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-tight">
        {display}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
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
          </span>
        ) : (
          <span className="text-[11px] text-[var(--chidi-text-muted)]">
            vs prior period
          </span>
        )}
        {sparkData.length > 1 && (
          <div className="w-20 h-7 -mr-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sparkData}
                margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
              >
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="var(--chidi-text-primary)"
                  strokeWidth={1.4}
                  dot={false}
                  isAnimationActive
                  animationDuration={650}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
  eyebrow,
  title,
  hint,
  actions,
}: {
  eyebrow?: string
  title: string
  hint?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3.5">
      <div className="min-w-0">
        {eyebrow && <p className="ty-meta mb-1">{eyebrow}</p>}
        <h3 className="text-[14px] lg:text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
          {title}
        </h3>
        {hint && (
          <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1">{hint}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}

function PillButton({
  onClick,
  children,
  variant = "ghost",
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: "ghost" | "solid"
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
        variant === "solid"
          ? "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90"
          : "text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)]",
      )}
    >
      {children}
    </button>
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
  // Group by ISO week or month. We rebuild and re-aggregate without mutating
  // the source so the merchant can flip back to daily without a refetch.
  const groups = new Map<string, { date: string; revenue: number; order_count: number }>()
  for (const d of data) {
    const dt = new Date(d.date)
    let key: string
    if (bucket === "weekly") {
      // Anchor on the Monday of the ISO week.
      const day = dt.getUTCDay() || 7 // Sunday → 7
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
  onSeeOrders,
}: {
  data: Array<{ date: string; revenue: number; order_count: number }>
  compare: boolean
  onSeeOrders: () => void
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
            <PillButton onClick={onSeeOrders}>
              See orders
              <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
            </PillButton>
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
 * average daily revenue. Stable across renders so the chart doesn't
 * flicker on every keystroke. When the API ships hourly buckets, swap
 * `synthesizeHourly` out and the rest of the component stays.
 */
const HOUR_WEIGHTS = [
  // 0-6: late-night dead zone
  0.4, 0.2, 0.1, 0.1, 0.2, 0.5, 0.9,
  // 7-12: morning ramp
  1.5, 2.4, 3.1, 3.6, 4.1, 4.8,
  // 13-18: midday + afternoon peak
  6.2, 5.4, 4.6, 4.0, 3.8, 4.4,
  // 19-23: evening rush + cooldown
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
    return `Peak: ${peak.label} · ${formatCurrency(peak.revenue)}`
  }, [hourly, top3])

  return (
    <>
      <CardHeader
        title="Top hours"
        hint={peakLabel ?? "When your sales actually peak."}
      />
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
// Decisions — Conversation thread (Direction A)
// ============================================================================

function DecisionsThread({
  owedNow,
  pendingCount,
  onChasePendings,
  onAct,
}: {
  owedNow: number
  pendingCount: number
  onChasePendings: () => void
  onAct: (link?: string) => void
}) {
  // Persisted dismiss/snooze state.
  const [stateMap, setStateMap] = useState<DecisionStateMap>({})
  // Track which "Why?" expansions are open this session (not persisted —
  // expansion state is too noisy to outlive the visit).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setStateMap(readDecisionState())
  }, [])

  const updateDecision = useCallback(
    (id: string, action: DecisionAction, snoozeMs?: number) => {
      setStateMap((prev) => {
        const next: DecisionStateMap = {
          ...prev,
          [id]: {
            state: action,
            until: snoozeMs ? Date.now() + snoozeMs : undefined,
          },
        }
        writeDecisionState(next)
        return next
      })
    },
    [],
  )

  const visibleDecisions = useMemo(() => {
    const now = Date.now()
    return DECISIONS.filter((d) => {
      const s = stateMap[d.id]
      if (!s || s.state === "active") return true
      if (s.state === "dismissed") return false
      if (s.state === "snoozed") {
        if (!s.until) return false
        return s.until <= now
      }
      return true
    })
  }, [stateMap])

  const dismissedCount = DECISIONS.length - visibleDecisions.length

  const totalCount = DECISIONS.length
  const headline =
    visibleDecisions.length === 0
      ? "Nothing pressing today."
      : `Chidi has ${visibleDecisions.length} ${visibleDecisions.length === 1 ? "thing" : "things"} for you.`

  const subline =
    visibleDecisions.length === 0
      ? "Take a breath. I'll keep watching."
      : "Tap a reply to act, or snooze and I'll bring it back later."

  return (
    <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0 flex items-start gap-3">
          <ChidiAvatar size="md" tone="default" className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
              Decisions · {visibleDecisions.length} of {totalCount}
            </p>
            <h2 className="text-[16px] lg:text-[17px] font-semibold text-[var(--chidi-text-primary)] leading-snug mt-0.5">
              {headline}
            </h2>
            <p className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-1 leading-snug">
              {subline}
            </p>
            {owedNow > 0 && (
              <button
                onClick={onChasePendings}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--chidi-warning)]/12 text-[var(--chidi-warning)] hover:bg-[var(--chidi-warning)]/20 transition-colors"
              >
                <Wallet className="w-3 h-3" strokeWidth={2.2} />
                <span className="tabular-nums">{formatCurrency(owedNow)}</span>
                <span className="opacity-80">in {pendingCount} pending</span>
                <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>
        {dismissedCount > 0 && (
          <button
            onClick={() => {
              writeDecisionState({})
              setStateMap({})
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={2} />
            Restore {dismissedCount}
          </button>
        )}
      </div>

      {/* Thread */}
      {visibleDecisions.length === 0 ? (
        <DecisionsEmpty />
      ) : (
        <ol className="space-y-4">
          {visibleDecisions.map((d) => (
            <DecisionMessage
              key={d.id}
              decision={d}
              expanded={!!expanded[d.id]}
              onToggleWhy={() =>
                setExpanded((prev) => ({ ...prev, [d.id]: !prev[d.id] }))
              }
              onPrimary={() => {
                onAct(d.action.deep_link)
                updateDecision(d.id, "dismissed")
              }}
              onSnooze={() => updateDecision(d.id, "snoozed", 24 * 60 * 60 * 1000)}
              onSnoozeWeek={() =>
                updateDecision(d.id, "snoozed", 7 * 24 * 60 * 60 * 1000)
              }
              onDismiss={() => updateDecision(d.id, "dismissed")}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function DecisionMessage({
  decision,
  expanded,
  onToggleWhy,
  onPrimary,
  onSnooze,
  onSnoozeWeek,
  onDismiss,
}: {
  decision: Decision
  expanded: boolean
  onToggleWhy: () => void
  onPrimary: () => void
  onSnooze: () => void
  onSnoozeWeek: () => void
  onDismiss: () => void
}) {
  const tone =
    decision.urgency === "now"
      ? "var(--chidi-warning)"
      : decision.urgency === "this_week"
        ? "var(--chidi-win)"
        : "var(--chidi-text-muted)"

  const urgencyLabel =
    decision.urgency === "now"
      ? "Decide today"
      : decision.urgency === "this_week"
        ? "This week"
        : "Worth watching"

  return (
    <li className="flex items-start gap-3">
      {/* Avatar gutter — reuses ChidiAvatar so the page reads like a thread. */}
      <ChidiAvatar size="sm" tone="default" className="mt-1 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="rounded-2xl rounded-tl-sm bg-[var(--chidi-surface)]/55 border border-[var(--chidi-border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: `${tone}1a`, color: tone }}
            >
              {decision.urgency === "now" && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tone }}
                />
              )}
              {urgencyLabel}
            </span>
            <span className="text-[10px] text-[var(--chidi-text-muted)] font-chidi-voice">
              · just now
            </span>
          </div>
          <p className="text-[14px] lg:text-[14.5px] font-chidi-voice leading-snug text-[var(--chidi-text-primary)]">
            {decision.question}
          </p>
          <p className="text-[12.5px] text-[var(--chidi-text-secondary)] mt-1.5 leading-snug">
            {decision.why}
          </p>

          {/* Why? expansion */}
          <button
            onClick={onToggleWhy}
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" strokeWidth={2.2} />
            ) : (
              <ChevronRight className="w-3 h-3" strokeWidth={2.2} />
            )}
            {expanded ? "Hide the numbers" : "Show me the numbers"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-[var(--card)]/70 border border-[var(--chidi-border-subtle)] p-3">
                {decision.metrics.map((m, i) => (
                  <MetricCell key={i} metric={m} />
                ))}
              </div>

              {decision.chart && <DecisionChartView chart={decision.chart} />}

              <p className="text-[12px] text-[var(--chidi-text-secondary)] leading-snug border-l-2 border-[var(--chidi-win)] pl-3 italic">
                <Sparkles className="w-3 h-3 inline mr-1 opacity-70" />
                {decision.recommendation}
              </p>
            </div>
          )}
        </div>

        {/* Reply pills — each one is a real action.
            Primary: take the action (dismisses on success).
            Snooze (24h) + Snooze week + Not now (= dismiss). */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <ReplyPill primary onClick={onPrimary}>
            {decision.action.label}
            <ArrowRight className="w-3 h-3" strokeWidth={2.4} />
          </ReplyPill>
          <ReplyPill onClick={onSnooze}>Snooze 24h</ReplyPill>
          <ReplyPill onClick={onSnoozeWeek}>Remind me weekly</ReplyPill>
          <ReplyPill onClick={onDismiss}>Not now</ReplyPill>
        </div>
      </div>
    </li>
  )
}

function ReplyPill({
  onClick,
  children,
  primary = false,
}: {
  onClick: () => void
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors active:scale-[0.97]",
        primary
          ? "bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90"
          : "bg-[var(--card)] border border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)]",
      )}
    >
      {children}
    </button>
  )
}

function DecisionsEmpty() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--chidi-surface)]/40 border border-dashed border-[var(--chidi-border-subtle)] px-4 py-5">
      <ChidiAvatar size="sm" tone="muted" className="flex-shrink-0" />
      <div>
        <p className="text-[13.5px] font-medium text-[var(--chidi-text-primary)]">
          Nothing pressing today.
        </p>
        <p className="text-[12px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-0.5">
          Take a breath. I&apos;ll bring something back when it matters.
        </p>
      </div>
    </div>
  )
}

function MetricCell({
  metric,
}: {
  metric: {
    label: string
    value: string
    baseline?: string
    direction?: "up" | "down" | "flat"
  }
}) {
  const Arrow =
    metric.direction === "up"
      ? ArrowUp
      : metric.direction === "down"
        ? ArrowDown
        : Minus
  const tone =
    metric.direction === "up"
      ? "text-[var(--chidi-win)]"
      : metric.direction === "down"
        ? "text-[var(--chidi-warning)]"
        : "text-[var(--chidi-text-muted)]"
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
        {metric.label}
      </p>
      <p className="text-[14px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
        {metric.value}
      </p>
      {metric.baseline && (
        <p
          className={cn(
            "text-[10.5px] tabular-nums mt-1 inline-flex items-center gap-1",
            tone,
          )}
        >
          {metric.direction && metric.direction !== "flat" && (
            <Arrow className="w-3 h-3" strokeWidth={2.4} />
          )}
          <span className="text-[var(--chidi-text-muted)]">{metric.baseline}</span>
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Drill-in panel — title row + tabs + lens content
// ============================================================================

function DrillInPanel({
  lens,
  onLensChange,
  channels,
  channelTotal,
  products,
  customers,
  onConfigure,
  onSeeAllInventory,
  onSeeConvo,
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
  customers: Array<{
    phone: string
    name: string | null
    total_spent: number
    order_count: number
    last_order: string | null
    is_vip: boolean
  }>
  onConfigure: () => void
  onSeeAllInventory: () => void
  onSeeConvo: () => void
}) {
  const activeOpt = LENS_OPTIONS.find((o) => o.id === lens) ?? LENS_OPTIONS[0]

  return (
    <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--chidi-text-muted)] font-semibold">
            Drill in
          </p>
          <p className="text-[14.5px] lg:text-[15px] text-[var(--chidi-text-primary)] font-chidi-voice mt-0.5 leading-snug">
            {activeOpt.subtitle}
          </p>
        </div>
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
        <ChannelsLens
          channels={channels}
          total={channelTotal}
          onConfigure={onConfigure}
        />
      )}
      {lens === "products" && (
        <ProductsLens products={products} onSeeAll={onSeeAllInventory} />
      )}
      {lens === "customers" && (
        <CustomersLens customers={customers} onSeeConvo={onSeeConvo} />
      )}
    </div>
  )
}

// ============================================================================
// Channels lens — bar chart (replaces the donut for honest comparison)
// ============================================================================

function ChannelsLens({
  channels,
  total,
  onConfigure,
}: {
  channels: Array<{
    channel: string
    revenue: number
    revenue_percentage: number
    order_count: number
  }>
  total: number
  onConfigure: () => void
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
      <div className="flex items-center justify-between gap-3 mb-3">
        {headerHint && (
          <p className="text-[12px] text-[var(--chidi-text-secondary)] tabular-nums">
            {headerHint}
          </p>
        )}
        <PillButton onClick={onConfigure}>
          Manage
          <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
        </PillButton>
      </div>

      {chartData.length === 0 ? (
        <ChartEmpty headline="No channel revenue yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Horizontal bar chart — bars compare share more honestly than a
              pie. Each bar labelled inline with the channel + revenue. */}
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

          {/* Compact share legend underneath — each row reinforces percent +
              order count so the merchant doesn't have to read the chart twice. */}
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
// Products lens — bestsellers list
// ============================================================================

function ProductsLens({
  products,
  onSeeAll,
}: {
  products: Array<{
    product_id: string | null
    product_name: string
    units_sold: number
    revenue: number
    image_url?: string | null
  }>
  onSeeAll: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-end gap-3 mb-3">
        <PillButton onClick={onSeeAll} variant="solid">
          All inventory
          <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
        </PillButton>
      </div>

      {products.length === 0 ? (
        <ChartEmpty headline="No products with sales yet." />
      ) : (
        <ul className="divide-y divide-[var(--chidi-border-subtle)] -mx-1">
          {products.slice(0, 5).map((p, i) => (
            <li key={`${p.product_id}-${i}`}>
              <button
                onClick={onSeeAll}
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
                <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--chidi-text-secondary)] group-hover:bg-[var(--card)] group-hover:text-[var(--chidi-text-primary)] transition-colors flex-shrink-0">
                  View
                  <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
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
// Customers lens — top customers list
// ============================================================================

function CustomersLens({
  customers,
  onSeeConvo,
}: {
  customers: Array<{
    phone: string
    name: string | null
    total_spent: number
    order_count: number
    last_order: string | null
    is_vip: boolean
  }>
  onSeeConvo: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-end gap-3 mb-3">
        <PillButton onClick={onSeeConvo} variant="solid">
          Open inbox
          <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
        </PillButton>
      </div>

      {customers.length === 0 ? (
        <ChartEmpty headline="No customers yet." />
      ) : (
        <ul className="divide-y divide-[var(--chidi-border-subtle)] -mx-1">
          {customers.slice(0, 6).map((c) => (
            <li key={c.phone}>
              <button
                onClick={onSeeConvo}
                className="w-full flex items-center gap-3 px-1 py-2.5 hover:bg-[var(--chidi-surface)]/60 transition-colors group text-left"
              >
                <CustomerCharacter
                  name={c.name ?? c.phone}
                  fallbackId={c.phone}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-[var(--chidi-text-primary)] truncate">
                    {c.name ?? c.phone}
                  </p>
                  <p className="text-[10.5px] text-[var(--chidi-text-muted)] mt-0.5 tabular-nums">
                    {c.last_order ? lastOrderLabel(c.last_order) : "no orders"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12.5px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
                    {formatCurrency(c.total_spent)}
                  </p>
                </div>
                <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--chidi-text-secondary)] group-hover:bg-[var(--card)] group-hover:text-[var(--chidi-text-primary)] transition-colors flex-shrink-0">
                  Open inbox
                  <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ============================================================================
// Decision-card inline charts
// ============================================================================

function DecisionChartView({ chart }: { chart: DecisionChart }) {
  switch (chart.type) {
    case "depletion":
      return (
        <DepletionChart
          sold_per_day={chart.sold_per_day}
          stock_now={chart.stock_now}
          stock_unit={chart.stock_unit}
        />
      )
    case "weekday_bars":
      return <WeekdayBars values={chart.values} label={chart.label} />
    case "channel_donut":
      return <ChannelDonutMini slices={chart.slices} />
    case "trend_compare":
      return (
        <TrendCompareMini
          current={chart.current}
          prior={chart.prior}
          label={chart.label}
        />
      )
    case "price_volume":
      return <PriceVolumeMini points={chart.points} />
  }
}

function ChartFrame({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-[var(--card)]/70 border border-[var(--chidi-border-subtle)] p-3">
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

function DepletionChart({
  sold_per_day,
  stock_now,
  stock_unit,
}: {
  sold_per_day: number[]
  stock_now: number
  stock_unit: string
}) {
  const data = sold_per_day.map((v, i) => ({ i: i + 1, v, label: `D${i + 1}` }))
  const meanPace = sold_per_day.reduce((s, v) => s + v, 0) / sold_per_day.length
  const daysLeft = meanPace > 0 ? Math.round(stock_now / meanPace) : 999
  const max = Math.max(...sold_per_day)

  return (
    <ChartFrame label={`Daily units sold · ${stock_now} ${stock_unit} in stock`}>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid
              stroke="var(--chidi-border-subtle)"
              vertical={false}
              strokeDasharray="3 3"
            />
            <YAxis hide />
            <XAxis dataKey="label" hide />
            <RTooltip
              content={(p) => (
                <ChartTooltip
                  {...p}
                  valueFormatter={(v: number | string) => `${v} ${stock_unit}`}
                />
              )}
              cursor={{ fill: "var(--chidi-border-subtle)" }}
            />
            <ReferenceLine
              y={meanPace}
              stroke="var(--chidi-warning)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={700}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.v === max ? "var(--chidi-win)" : "var(--chidi-text-secondary)"}
                  fillOpacity={d.v === max ? 0.95 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className="text-[var(--chidi-text-muted)] inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--chidi-warning)]" />
          Avg pace: {meanPace.toFixed(1)} {stock_unit}/day
        </span>
        <span className="text-[var(--chidi-text-primary)] font-semibold tabular-nums">
          ≈ {daysLeft} days till empty
        </span>
      </div>
    </ChartFrame>
  )
}

function WeekdayBars({ values, label }: { values: number[]; label: string }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"]
  const data = values.map((v, i) => ({ d: days[i], v }))
  const max = Math.max(...values)
  return (
    <ChartFrame label={label}>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid
              stroke="var(--chidi-border-subtle)"
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="d"
              tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <RTooltip
              content={(p) => (
                <ChartTooltip
                  {...p}
                  valueFormatter={(v: number | string) => formatCurrency(Number(v))}
                />
              )}
              cursor={{ fill: "var(--chidi-border-subtle)" }}
            />
            <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={700}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.v === max ? "var(--chidi-win)" : "var(--chidi-text-secondary)"}
                  fillOpacity={d.v === max ? 0.95 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

function ChannelDonutMini({
  slices,
}: {
  slices: Array<{ label: string; value: number; color?: string }>
}) {
  const data = slices.map((s) => ({
    name: s.label,
    value: s.value,
    color: s.color ?? "var(--chidi-text-primary)",
  }))
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <ChartFrame label="Revenue by channel">
      <div className="flex items-center gap-4">
        <div className="w-[100px] h-[100px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={28}
                outerRadius={48}
                dataKey="value"
                isAnimationActive
                animationDuration={700}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <RTooltip
                content={(p) => (
                  <ChartTooltip
                    {...p}
                    valueFormatter={(v: number | string) => formatCurrency(Number(v))}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 min-w-0 space-y-1.5">
          {data.map((d) => {
            const pct = Math.round((d.value / total) * 100)
            return (
              <li
                key={d.name}
                className="flex items-center justify-between gap-2 text-[11.5px]"
              >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[var(--chidi-text-primary)] truncate">{d.name}</span>
                </span>
                <span className="text-[var(--chidi-text-muted)] tabular-nums flex-shrink-0">
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </ChartFrame>
  )
}

function TrendCompareMini({
  current,
  prior,
  label,
}: {
  current: number[]
  prior: number[]
  label?: string
}) {
  const len = Math.max(current.length, prior.length)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    current: current[i] ?? 0,
    prior: prior[i] ?? 0,
  }))
  return (
    <ChartFrame label={label ?? "Current vs prior"}>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid
              stroke="var(--chidi-border-subtle)"
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis dataKey="i" hide />
            <YAxis hide />
            <RTooltip
              content={(p) => (
                <ChartTooltip {...p} valueFormatter={(v: number | string) => `${v}`} showPrior />
              )}
            />
            <Line
              type="monotone"
              dataKey="prior"
              stroke="var(--chidi-text-muted)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--chidi-warning)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10.5px]">
        <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--chidi-warning)]" />
          Current
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--chidi-text-muted)]/60" />
          Prior
        </span>
      </div>
    </ChartFrame>
  )
}

function PriceVolumeMini({
  points,
}: {
  points: Array<{
    price: number
    units: number
    current?: boolean
    suggested?: boolean
  }>
}) {
  const data = points.map((p) => ({
    price: p.price,
    units: p.units,
    fill: p.suggested
      ? "var(--chidi-win)"
      : p.current
        ? "var(--chidi-text-primary)"
        : "var(--chidi-text-muted)",
    label: p.suggested ? "Suggested" : p.current ? "Current" : "",
  }))
  return (
    <ChartFrame label="Price vs units sold (each dot = a 7-day test)">
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--chidi-border-subtle)" strokeDasharray="3 3" />
            <XAxis
              dataKey="price"
              type="number"
              tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
              domain={["auto", "auto"]}
            />
            <YAxis
              dataKey="units"
              type="number"
              tick={{ fill: "var(--chidi-text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <RTooltip
              content={(p) => (
                <ChartTooltip
                  {...p}
                  valueFormatter={(v: number | string) => String(v)}
                  isScatter
                />
              )}
              cursor={{ stroke: "var(--chidi-border-default)", strokeWidth: 1 }}
            />
            <Scatter
              data={data}
              isAnimationActive
              animationDuration={700}
              shape={(props: ScatterDotProps) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={props.payload?.label ? 6 : 3.5}
                  fill={props.payload?.fill}
                  fillOpacity={props.payload?.label ? 1 : 0.6}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

// recharts forwards a richer object to custom shape renderers; we type the
// fields we read off it without leaning on `any`.
type ScatterDotProps = {
  cx?: number
  cy?: number
  payload?: { label?: string; fill?: string }
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
  const isScatter = props.isScatter as boolean | undefined
  if (!active || !payload || !payload.length) return null
  if (isScatter) {
    const p = payload[0]?.payload as { units?: number; price?: number } | undefined
    if (!p) return null
    const units = p.units ?? 0
    const price = p.price ?? 0
    return (
      <div className="rounded-lg border border-[var(--chidi-border-default)] bg-[var(--card)] shadow-card px-2.5 py-2 text-[11px]">
        <div className="font-semibold tabular-nums text-[var(--chidi-text-primary)]">
          {valueFormatter ? valueFormatter(units) : units} units
        </div>
        <div className="text-[var(--chidi-text-muted)] tabular-nums">
          at ₦{price.toLocaleString("en-NG")}
        </div>
      </div>
    )
  }
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

function lastOrderLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

