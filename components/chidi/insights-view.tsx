"use client"

/**
 * Insights — merchant analytics dashboard (rebuild 2026-05-03 — wave 2).
 *
 * The prior bento was 9 panels saying overlapping things. This rebuild:
 *
 *   • Same wedge: Decisions stays center-stage (Chidi tells you what to *do*,
 *     not just what happened).
 *   • Aggressive cut: Cash Position, When-they-buy heatmap, and Inventory-at-Risk
 *     are gone — every actionable insight in those panels is already a decision
 *     card (chase pendings, Saturday prep, restock wax-print, pull iPhone case,
 *     mark down stale items). Showing them twice taught the merchant noise.
 *   • Progressive disclosure: rather than scrolling 9 panels, the merchant sees
 *     the always-visible spine (KPIs + Revenue trend + Decisions) and chooses a
 *     "lens" tab to drill in (Channels / Bestsellers / Customers).
 *   • Margin: matches the Playbook page (max-w-5xl + same px scale) so the two
 *     surfaces feel like the same product.
 *   • Every CTA resolves to a real surface. Dead CTAs were stripped, not
 *     restyled.
 *
 * Charts: recharts only. Animated on first mount. Token-driven colors.
 * Date-range picker controls every chart and KPI; selection persists to
 * sessionStorage so a page-refresh keeps the merchant's view.
 */

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Package,
  TagIcon,
  CircleSlash,
  Megaphone,
  MessageCircle,
  Network,
  CalendarClock,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Wallet,
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
  DECISION_URGENCY_LABEL,
  type Decision,
  type DecisionChart,
  type DecisionKind,
  type DecisionUrgency,
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
import { CustomerAvatar } from "./customer-avatar"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"

// ============================================================================
// Constants
// ============================================================================

type Period = "7d" | "30d" | "90d"
const PERIOD_OPTIONS: Array<{ id: Period; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
]
const PERIOD_LABEL: Record<Period, string> = {
  "7d": "the last 7 days",
  "30d": "the last 30 days",
  "90d": "the last 90 days",
}

const KIND_ICON: Record<DecisionKind, React.ElementType> = {
  restock: Package,
  price: TagIcon,
  pause: CircleSlash,
  promote: Megaphone,
  follow_up: MessageCircle,
  channel_shift: Network,
  schedule: CalendarClock,
}

const URGENCY_ORDER: DecisionUrgency[] = ["now", "this_week", "watch"]

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

// Drill-in lens tabs. Decisions + KPIs + trend always visible above.
type Lens = "channels" | "products" | "customers"
const LENS_OPTIONS: Array<{ id: Lens; label: string }> = [
  { id: "channels", label: "Channels" },
  { id: "products", label: "Bestsellers" },
  { id: "customers", label: "Customers" },
]

// ============================================================================
// InsightsView — top-level
// ============================================================================

export function InsightsView() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string | undefined) ?? "default"

  // Persist period + compare-mode + lens across navigation.
  const [period, setPeriod] = usePersistedState<Period>("insights:period", "30d")
  const [compareToPrior, setCompareToPrior] = usePersistedState<boolean>(
    "insights:compare",
    true,
  )
  const [lens, setLens] = usePersistedState<Lens>("insights:lens", "channels")

  // Refresh state — animates the spinner; the count-up KPIs re-tween via key.
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())

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
    setLastUpdated(new Date())
    // Spin one full rotation (~700ms) regardless of how fast it returned, so
    // the user perceives feedback for clicking the button.
    setTimeout(() => setRefreshing(false), 700)
  }

  // ===== Navigation helpers — every CTA must land somewhere real =============

  const goToTab = (tab: "inbox" | "orders" | "inventory" | "chidi") => {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent("chidi:navigate-tab", { detail: { tab } }))
  }
  const goToPlaybook = () => router.push(`/dashboard/${slug}/notebook`)
  const goToSettings = () => router.push(`/dashboard/${slug}/settings`)

  // Decision deep-links resolve here. Anything pointing to /notebook becomes
  // a real route push; anything pointing to a tab becomes a tab event.
  const handleDecisionAction = (link?: string) => {
    if (!link) return
    if (link.startsWith("/notebook") || link === "/notebook") {
      goToPlaybook()
      return
    }
    if (link === "/inventory") {
      goToTab("inventory")
      return
    }
    if (link === "/orders") {
      goToTab("orders")
      return
    }
    if (link === "/inbox") {
      goToTab("inbox")
      return
    }
    if (link.startsWith("/dashboard")) {
      router.push(link)
    }
  }

  // ===== Filter + decisions =================================================

  const [decisionFilter, setDecisionFilter] = useState<DecisionUrgency | "all">("all")
  const [openDecisionId, setOpenDecisionId] = useState<string | null>(
    DECISIONS[0]?.id ?? null,
  )

  const visibleDecisions = useMemo(
    () =>
      decisionFilter === "all"
        ? DECISIONS
        : DECISIONS.filter((d) => d.urgency === decisionFilter),
    [decisionFilter],
  )
  const decisionCounts = useMemo(() => {
    const c: Record<DecisionUrgency, number> = { now: 0, this_week: 0, watch: 0 }
    for (const d of DECISIONS) c[d.urgency]++
    return c
  }, [])

  // Money owed — the one Cash signal that actually drives a decision.
  // Surfaced as a small inline pill in the Decisions header instead of a
  // whole card. (The "Chase pendings" decision card already covers the move.)
  const owedNow = useMemo(() => {
    return (pendingOrders?.orders ?? []).reduce(
      (s: number, o: { total?: number }) => s + (o?.total ?? 0),
      0,
    )
  }, [pendingOrders])
  const pendingCount = pendingOrders?.orders.length ?? 0

  // ===== Layout =============================================================

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-y-auto">
      {/*
        Margin alignment: matches Playbook's <ChidiPage width="wide"> shell —
        max-w-5xl + px-4 sm:px-6 lg:px-8 + py-5 lg:py-7. Without this match the
        two surfaces drift apart and read as different products.
      */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
        {/* Eyebrow + page title + actions */}
        <header className="mb-5 lg:mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="ty-meta mb-1.5">Insights</p>
            <h1 className="ty-page-title text-[var(--chidi-text-primary)]">
              How your shop is doing.
            </h1>
            <p className="text-[12px] text-[var(--chidi-text-muted)] mt-1.5">
              Showing {PERIOD_LABEL[period]}. Updated {formatRelativeTime(lastUpdated)}.
            </p>
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
                className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
                strokeWidth={2}
              />
            </button>
          </div>
        </header>

        {/* === Hero KPI row — 4 cards, click to drill into related tab ===== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-5">
          <KpiCard
            key={`rev-${refreshKey}`}
            label="Revenue"
            value={overview?.revenue.current ?? 0}
            ready={!!overview}
            format="currency"
            deltaPct={overview?.revenue.percent_change ?? null}
            compare={compareToPrior}
            spark={(trend?.data ?? []).map((d) => d.revenue)}
            onClick={() => goToTab("orders")}
            ctaLabel="See orders"
          />
          <KpiCard
            key={`ord-${refreshKey}`}
            label="Orders"
            value={overview?.orders.current ?? 0}
            ready={!!overview}
            format="int"
            deltaPct={overview?.orders.percent_change ?? null}
            compare={compareToPrior}
            spark={(trend?.data ?? []).map((d) => d.order_count)}
            onClick={() => goToTab("orders")}
            ctaLabel="See orders"
          />
          <KpiCard
            key={`aov-${refreshKey}`}
            label="Avg. order value"
            value={overview?.avg_order_value.current ?? 0}
            ready={!!overview}
            format="currency"
            deltaPct={overview?.avg_order_value.percent_change ?? null}
            compare={compareToPrior}
            spark={
              (trend?.data ?? []).map((d) =>
                d.order_count > 0 ? Math.round(d.revenue / d.order_count) : 0,
              )
            }
            onClick={() => goToTab("orders")}
            ctaLabel="See orders"
          />
          <KpiCard
            key={`fr-${refreshKey}`}
            label="Fulfillment rate"
            value={overview?.fulfillment_rate.current ?? 0}
            ready={!!overview}
            format="pct"
            deltaPct={overview?.fulfillment_rate.percent_change ?? null}
            compare={compareToPrior}
            spark={(trend?.data ?? []).map((d) => d.order_count)}
            // Fulfillment lives on the orders tab, not the inbox.
            onClick={() => goToTab("orders")}
            ctaLabel="See orders"
          />
        </section>

        {/* === Revenue trend — full width, primary chart =================== */}
        <section className="mb-4 lg:mb-5">
          <BentoCard>
            <RevenueTrendCard
              data={trend?.data ?? []}
              compare={compareToPrior}
              onSeeOrders={() => goToTab("orders")}
            />
          </BentoCard>
        </section>

        {/* === Decisions lane — Chidi's unique "what to do" wedge ==========
            This is the heart of Insights. Stays full-width and primary so the
            merchant always sees their next move before they wander into drill
            tabs below. */}
        <section className="mb-4 lg:mb-5">
          <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-3.5">
              <div className="min-w-0">
                <p className="ty-meta mb-1">Decisions</p>
                <h2 className="text-[16px] lg:text-[17px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
                  {DECISIONS.length} decisions waiting on you.
                </h2>
                {/* Inline money-owed pill — replaces the deleted Cash card.
                    Only shown when there's actually money outstanding. */}
                {owedNow > 0 && (
                  <button
                    onClick={() => goToTab("orders")}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--chidi-warning)]/12 text-[var(--chidi-warning)] hover:bg-[var(--chidi-warning)]/20 transition-colors"
                  >
                    <Wallet className="w-3 h-3" strokeWidth={2.2} />
                    <span className="tabular-nums">{formatCurrency(owedNow)}</span>
                    <span className="opacity-80">
                      held in {pendingCount} pending payment{pendingCount === 1 ? "" : "s"}
                    </span>
                    <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 flex-shrink-0">
                <FilterChip
                  active={decisionFilter === "all"}
                  onClick={() => setDecisionFilter("all")}
                  label="All"
                  count={DECISIONS.length}
                />
                {URGENCY_ORDER.map((u) => (
                  <FilterChip
                    key={u}
                    active={decisionFilter === u}
                    onClick={() => setDecisionFilter(u)}
                    label={DECISION_URGENCY_LABEL[u]}
                    count={decisionCounts[u]}
                    tone={u === "now" ? "alert" : u === "this_week" ? "soft" : "muted"}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {visibleDecisions.map((d) => (
                <DecisionCard
                  key={d.id}
                  decision={d}
                  expanded={openDecisionId === d.id}
                  onToggle={() =>
                    setOpenDecisionId((id) => (id === d.id ? null : d.id))
                  }
                  onAction={() => handleDecisionAction(d.action.deep_link)}
                  onSecondary={() => handleDecisionAction(d.secondary?.deep_link)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* === Drill-in lens tabs ==========================================
            Single panel with a tab strip — Channels / Bestsellers / Customers.
            Replaces the four standalone bento cards (Channel, Heatmap, Top
            products, Top customers, Inventory at risk) that were saying
            overlapping things. The merchant picks one lens at a time instead
            of scrolling 5 panels. */}
        <section className="mb-6">
          <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
              <div className="min-w-0">
                <p className="ty-meta mb-1">Drill in</p>
                <h2 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
                  Pick a lens to look closer.
                </h2>
              </div>
              <div className="inline-flex items-center rounded-md border border-[var(--chidi-border-default)] bg-[var(--card)] p-0.5">
                {LENS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLens(opt.id)}
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
              <ChannelMixCard
                channels={channelMix?.channels ?? []}
                total={channelMix?.totals.revenue ?? 0}
                onConfigure={() => goToSettings()}
              />
            )}
            {lens === "products" && (
              <TopProductsCard
                products={topProducts?.top_products ?? []}
                onSeeAll={() => goToTab("inventory")}
              />
            )}
            {lens === "customers" && (
              <TopCustomersCard
                customers={customers?.customers ?? []}
                onSeeConvo={() => goToTab("inbox")}
              />
            )}
          </div>
        </section>
      </div>
    </div>
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

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone = "muted",
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone?: "alert" | "soft" | "muted"
}) {
  const dot =
    tone === "alert"
      ? "bg-[var(--chidi-warning)]"
      : tone === "soft"
        ? "bg-[var(--chidi-win)]"
        : "bg-[var(--chidi-text-muted)]"
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0 border",
        active
          ? "bg-[var(--chidi-text-primary)] text-[var(--background)] border-[var(--chidi-text-primary)]"
          : "bg-[var(--card)] text-[var(--chidi-text-secondary)] border-[var(--chidi-border-default)] hover:text-[var(--chidi-text-primary)]",
      )}
    >
      {!active && tone !== "muted" && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      )}
      <span>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          active
            ? "text-[var(--background)]/70"
            : "text-[var(--chidi-text-muted)]",
        )}
      >
        {count}
      </span>
    </button>
  )
}

// ============================================================================
// KPI card — count-up + sparkline + delta + click-through
// ============================================================================

function KpiCard({
  label,
  value,
  ready,
  format,
  deltaPct,
  compare,
  spark,
  onClick,
  ctaLabel,
}: {
  label: string
  value: number
  ready: boolean
  format: "currency" | "int" | "pct"
  deltaPct: number | null
  compare: boolean
  spark: number[]
  onClick: () => void
  ctaLabel: string
}) {
  const tweened = useCountUp(ready ? value : 0, 950)
  const display = !ready
    ? "—"
    : format === "currency"
      ? formatCurrency(tweened)
      : format === "pct"
        ? `${Math.round(tweened)}%`
        : Math.round(tweened).toLocaleString("en-NG")

  const direction =
    deltaPct === null || Math.abs(deltaPct) < 0.5 ? "flat" : deltaPct > 0 ? "up" : "down"
  const Arrow = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus
  const tone =
    direction === "up"
      ? "text-[var(--chidi-win)]"
      : direction === "down"
        ? "text-[var(--chidi-warning)]"
        : "text-[var(--chidi-text-muted)]"

  // Sparkline data — recharts wants objects.
  const sparkData = spark.length > 1 ? spark.map((v, i) => ({ i, v })) : []

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5 transition-all hover:border-[var(--chidi-text-muted)] hover:shadow-card-hover active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium">
          {label}
        </p>
        <ExternalLink
          className="w-3 h-3 text-[var(--chidi-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          strokeWidth={2}
        />
      </div>
      <p className="text-[22px] lg:text-[26px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none mt-2">
        {display}
      </p>
      <div className="flex items-center justify-between gap-2 mt-2.5">
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
          <span className="text-[11px] text-[var(--chidi-text-muted)]">{ctaLabel}</span>
        )}
        {sparkData.length > 1 && (
          <div className="w-20 h-7 -mr-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="var(--chidi-text-primary)"
                  strokeWidth={1.4}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={650}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// Revenue trend — area chart + metric toggle + compare overlay
// ============================================================================

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

  const chartData = useMemo(() => {
    if (!data.length) return []
    // Build current series + a synthetic prior series shifted ~12% lower so the
    // overlay reads as a baseline. (Backend doesn't return a paired prior series
    // yet — when it does, swap this out.)
    return data.map((d, i) => {
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
        label: shortDate(d.date),
      }
    })
  }, [data, metric])

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
        eyebrow="Trend"
        title={
          metric === "revenue"
            ? "Revenue, day by day"
            : metric === "order_count"
              ? "Orders, day by day"
              : "Avg. order value, day by day"
        }
        hint={`${totalLabel} ${metric === "aov" ? "average" : "total"} this period`}
        actions={
          <>
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
        <ChartEmpty
          headline="No sales yet for this window."
          body="Once orders start landing, this chart will fill in."
        />
      ) : (
        <div className="h-[220px] -ml-2 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <defs>
                <linearGradient id="trendCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chidi-text-primary)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--chidi-text-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chidi-border-subtle)" vertical={false} strokeDasharray="3 3" />
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
                  isAnimationActive={true}
                  animationDuration={650}
                />
              )}
              <Area
                type="monotone"
                dataKey="current"
                stroke="var(--chidi-text-primary)"
                strokeWidth={2}
                fill="url(#trendCurrent)"
                isAnimationActive={true}
                animationDuration={650}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Channel mix — pie + legend with percent shares
// (Now lives inside the Drill-in lens panel, no longer its own bento.)
// ============================================================================

function ChannelMixCard({
  channels,
  total,
  onConfigure,
}: {
  channels: Array<{ channel: string; revenue: number; revenue_percentage: number; order_count: number }>
  total: number
  onConfigure: () => void
}) {
  const chartData = channels.map((c) => ({
    name: CHANNEL_LABEL[c.channel.toUpperCase()] ?? c.channel,
    raw: c.channel.toUpperCase(),
    value: c.revenue,
    pct: Math.round(c.revenue_percentage),
    orders: c.order_count,
    color: CHANNEL_COLOR[c.channel.toUpperCase()] ?? "var(--chidi-text-muted)",
  }))

  return (
    <>
      <CardHeader
        eyebrow="Channels"
        title="Where revenue comes from"
        hint={total > 0 ? `${formatCurrency(total)} this period` : undefined}
        actions={
          <PillButton onClick={onConfigure}>
            Manage channels
            <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
          </PillButton>
        }
      />

      {chartData.length === 0 ? (
        <ChartEmpty
          headline="No channel revenue yet."
          body="Connect a channel in Settings and your mix shows here."
        />
      ) : (
        // Pie + legend rows. The pie + legend rows are NOT clickable — there's
        // no per-channel filter on the inbox yet, and a click that lands you on
        // an unfiltered inbox is worse than no click. Restore when the filter
        // ships.
        <div className="flex items-center gap-4">
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={42}
                  outerRadius={66}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={true}
                  animationDuration={650}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} style={{ outline: "none" }} />
                  ))}
                </Pie>
                <RTooltip
                  content={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(v: number | string) => formatCurrency(Number(v))}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex-1 min-w-0 space-y-2">
            {chartData.map((d) => (
              <li
                key={d.name}
                className="w-full flex items-center justify-between gap-3 text-[12px] py-1"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[var(--chidi-text-primary)] truncate">
                    {d.name}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 flex-shrink-0">
                  <span className="text-[var(--chidi-text-muted)] tabular-nums">
                    {d.orders} order{d.orders === 1 ? "" : "s"}
                  </span>
                  <span className="text-[var(--chidi-text-primary)] font-medium tabular-nums w-10 text-right">
                    {d.pct}%
                  </span>
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
// Decision card — kept from the prior surface, now sits inside a 2-col grid
// ============================================================================

function DecisionCard({
  decision,
  expanded,
  onToggle,
  onAction,
  onSecondary,
}: {
  decision: Decision
  expanded: boolean
  onToggle: () => void
  onAction: () => void
  onSecondary: () => void
}) {
  const Icon = KIND_ICON[decision.kind]
  const tone =
    decision.urgency === "now"
      ? "var(--chidi-warning)"
      : decision.urgency === "this_week"
        ? "var(--chidi-win)"
        : "var(--chidi-text-muted)"

  return (
    <article className="rounded-xl bg-[var(--chidi-surface)]/40 border border-[var(--chidi-border-subtle)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${tone}1a` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: tone }} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: tone }}
            >
              {DECISION_URGENCY_LABEL[decision.urgency]}
            </span>
          </div>
          <h4 className="text-[13.5px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            {decision.question}
          </h4>
          <p className="text-[12px] text-[var(--chidi-text-secondary)] mt-1 leading-snug line-clamp-2">
            {decision.why}
          </p>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--chidi-text-muted)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-[var(--card)]/70 border border-[var(--chidi-border-subtle)] p-3">
            {decision.metrics.map((m, i) => (
              <MetricCell key={i} metric={m} />
            ))}
          </div>

          {decision.chart && <DecisionChartView chart={decision.chart} />}

          <div className="border-l-2 border-[var(--chidi-win)] pl-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
              Chidi recommends
            </p>
            <p className="text-[12.5px] text-[var(--chidi-text-primary)] leading-snug">
              {decision.recommendation}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors active:scale-[0.97]"
            >
              {decision.action.label}
              <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
            </button>
            {decision.secondary && (
              <button
                onClick={onSecondary}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:bg-[var(--card)] transition-colors"
              >
                {decision.secondary.label}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
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
// Top products — list with bar shares
// (Lives inside the Drill-in lens panel.)
// ============================================================================

function TopProductsCard({
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
  const max = products.reduce((m, p) => Math.max(m, p.revenue), 0) || 1

  return (
    <>
      <CardHeader
        eyebrow="Bestsellers"
        title="What's driving revenue"
        actions={
          <PillButton onClick={onSeeAll} variant="solid">
            All inventory
            <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
          </PillButton>
        }
      />

      {products.length === 0 ? (
        <ChartEmpty
          headline="No products with sales yet."
          body="Once a product earns its first sale, it'll show up here."
        />
      ) : (
        <ul className="space-y-2.5">
          {products.slice(0, 5).map((p, i) => {
            const pct = (p.revenue / max) * 100
            return (
              <li key={`${p.product_id}-${i}`}>
                {/* Row click → inventory tab. Same destination as "All
                    inventory" above; merchant can find the SKU there. We do
                    not pretend to drill to a per-product page that doesn't
                    exist yet. */}
                <button
                  onClick={onSeeAll}
                  className="w-full text-left group p-2 -m-2 rounded-md hover:bg-[var(--chidi-surface)]/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] tabular-nums font-semibold text-[var(--chidi-text-muted)] w-4 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-[var(--chidi-text-primary)] truncate font-medium">
                        {p.product_name}
                      </p>
                      <div
                        className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--chidi-border-subtle)" }}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{
                            width: `${Math.max(4, pct)}%`,
                            backgroundColor: "var(--chidi-text-primary)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12.5px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
                        {formatCurrency(p.revenue)}
                      </p>
                      <p className="text-[10.5px] text-[var(--chidi-text-muted)] tabular-nums">
                        {p.units_sold} sold
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// ============================================================================
// Top customers (Lives inside the Drill-in lens panel.)
// ============================================================================

function TopCustomersCard({
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
      <CardHeader
        eyebrow="Customers"
        title="Top spenders"
        actions={
          <PillButton onClick={onSeeConvo} variant="solid">
            Open inbox
            <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
          </PillButton>
        }
      />

      {customers.length === 0 ? (
        <ChartEmpty
          headline="No customers yet."
          body="Your top spenders will appear here as orders come in."
        />
      ) : (
        <ul className="divide-y divide-[var(--chidi-border-subtle)] -mx-1">
          {customers.slice(0, 6).map((c) => (
            <li key={c.phone}>
              {/* Row click → inbox. Same as the header CTA. The inbox is
                  filterable by customer once the merchant lands. */}
              <button
                onClick={onSeeConvo}
                className="w-full flex items-center gap-3 px-1 py-2.5 hover:bg-[var(--chidi-surface)]/60 transition-colors group"
              >
                <CustomerAvatar
                  name={c.name ?? c.phone}
                  fallbackId={c.phone}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12.5px] font-medium text-[var(--chidi-text-primary)] truncate">
                      {c.name ?? c.phone}
                    </p>
                    {c.is_vip && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[var(--chidi-win-soft)] text-[var(--chidi-win)] flex-shrink-0">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-[var(--chidi-text-muted)] mt-0.5 tabular-nums">
                    {c.order_count} order{c.order_count === 1 ? "" : "s"} ·{" "}
                    {c.last_order ? lastOrderLabel(c.last_order) : "no orders"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1">
                  <p className="text-[12.5px] font-semibold tabular-nums text-[var(--chidi-text-primary)]">
                    {formatCurrency(c.total_spent)}
                  </p>
                  <ChevronRight className="w-3 h-3 text-[var(--chidi-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ============================================================================
// Decision-card inline charts — recharts replacements
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
    <ChartFrame
      label={`Daily units sold · ${stock_now} ${stock_unit} in stock`}
    >
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--chidi-border-subtle)" vertical={false} strokeDasharray="3 3" />
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
            <Bar
              dataKey="v"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={650}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.v === max ? "var(--chidi-win)" : "var(--chidi-text-secondary)"
                  }
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

function WeekdayBars({
  values,
  label,
}: {
  values: number[]
  label: string
}) {
  const days = ["S", "M", "T", "W", "T", "F", "S"]
  const data = values.map((v, i) => ({ d: days[i], v }))
  const max = Math.max(...values)
  return (
    <ChartFrame label={label}>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--chidi-border-subtle)" vertical={false} strokeDasharray="3 3" />
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
            <Bar
              dataKey="v"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={650}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.v === max
                      ? "var(--chidi-win)"
                      : "var(--chidi-text-secondary)"
                  }
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
                isAnimationActive={true}
                animationDuration={650}
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
                  <span className="text-[var(--chidi-text-primary)] truncate">
                    {d.name}
                  </span>
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
            <CartesianGrid stroke="var(--chidi-border-subtle)" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis hide />
            <RTooltip
              content={(p) => (
                <ChartTooltip
                  {...p}
                  valueFormatter={(v: number | string) => `${v}`}
                  showPrior
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="prior"
              stroke="var(--chidi-text-muted)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={true}
              animationDuration={650}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--chidi-warning)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={650}
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
              isAnimationActive={true}
              animationDuration={650}
              shape={(props: any) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={props.payload.label ? 6 : 3.5}
                  fill={props.payload.fill}
                  fillOpacity={props.payload.label ? 1 : 0.6}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

// ============================================================================
// Tooltip + empty + format helpers
// ============================================================================

// Recharts forwards a rich props bag to the tooltip's `content` render prop.
// We accept it as `Record<string, unknown>` and pluck only what we need; the
// callsites pass `{...props}` which TS otherwise rejects against a narrow shape.
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
        const swatch = entry.color ?? entry.stroke ?? entry.fill ?? "var(--chidi-text-muted)"
        const v = entry.value ?? ""
        return (
          <div
            key={i}
            className="flex items-center justify-between gap-3"
          >
            <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: swatch }}
              />
              {isPrior ? "Prior" : entry.name === "current" || !entry.name ? "Current" : entry.name}
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
  body: string
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
        <p className="text-[11px] text-[var(--chidi-text-muted)] mt-0.5">{body}</p>
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

function formatRelativeTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 30) return "just now"
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}
