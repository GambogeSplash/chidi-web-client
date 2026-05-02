"use client"

import { useMemo, useState } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DECISIONS,
  DECISION_URGENCY_LABEL,
  type Decision,
  type DecisionChart,
  type DecisionKind,
  type DecisionUrgency,
} from "@/lib/chidi/insights-decisions"
import { useSalesOverview, useChannelMix } from "@/lib/hooks/use-analytics"
import { formatCurrency } from "@/lib/api/analytics"

/**
 * Insights — decision-first. Each card poses ONE decision the merchant should
 * make today, with the supporting numbers paired with last-period baselines,
 * Chidi's recommendation, and a primary action.
 *
 * No traditional dashboard. Every card earns its place by ending with a verb.
 */

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

export function InsightsView() {
  const { data: overview } = useSalesOverview("30d")
  const { data: channelMix } = useChannelMix("30d")

  const [filter, setFilter] = useState<DecisionUrgency | "all">("all")
  const [openId, setOpenId] = useState<string | null>(DECISIONS[0]?.id ?? null)

  const visible = useMemo(
    () => (filter === "all" ? DECISIONS : DECISIONS.filter((d) => d.urgency === filter)),
    [filter],
  )

  const grouped = useMemo(() => {
    return URGENCY_ORDER
      .map((u) => ({ urgency: u, items: visible.filter((d) => d.urgency === u) }))
      .filter((g) => g.items.length > 0)
  }, [visible])

  const counts = useMemo(() => {
    const c: Record<DecisionUrgency, number> = { now: 0, this_week: 0, watch: 0 }
    for (const d of DECISIONS) c[d.urgency]++
    return c
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Hero — frames the surface */}
        <header className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1.5">
            Insights
          </p>
          <h1 className="text-[20px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
            Decisions waiting for you.
          </h1>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1.5 leading-snug max-w-md">
            Every card is one move I think you should make today. The numbers
            are right underneath. Pick what you want to do.
          </p>
        </header>

        {/* Snapshot — one row of business pulse */}
        <div className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] p-4 lg:p-5 mb-5">
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              const revPct = overview?.revenue.percent_change ?? 0
              const ordPct = overview?.orders.percent_change ?? 0
              return (
                <>
                  <SnapshotMetric
                    label="Revenue (30d)"
                    value={overview ? formatCurrency(overview.revenue.current) : "—"}
                    direction={revPct > 0 ? "up" : revPct < 0 ? "down" : "flat"}
                    delta={overview ? `${revPct > 0 ? "+" : ""}${revPct.toFixed(0)}% vs prior` : undefined}
                  />
                  <SnapshotMetric
                    label="Orders (30d)"
                    value={overview ? `${overview.orders.current}` : "—"}
                    direction={ordPct > 0 ? "up" : ordPct < 0 ? "down" : "flat"}
                    delta={overview ? `${ordPct > 0 ? "+" : ""}${ordPct.toFixed(0)}% vs prior` : undefined}
                  />
                </>
              )
            })()}
            <SnapshotMetric
              label="Top channel"
              value={channelMix ? channelMix.channels[0]?.channel.toString().toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) ?? "—" : "—"}
              direction="flat"
              delta={channelMix?.channels[0] ? `${Math.round(channelMix.channels[0].revenue_percentage)}% of revenue` : undefined}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto -mx-1 px-1">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={DECISIONS.length}
          />
          {URGENCY_ORDER.map((u) => (
            <FilterChip
              key={u}
              active={filter === u}
              onClick={() => setFilter(u)}
              label={DECISION_URGENCY_LABEL[u]}
              count={counts[u]}
              tone={u === "now" ? "alert" : u === "this_week" ? "soft" : "muted"}
            />
          ))}
        </div>

        {/* Decision groups */}
        <div className="space-y-7">
          {grouped.map((group) => (
            <section key={group.urgency}>
              <div className="flex items-baseline justify-between mb-2.5 px-1">
                <h2 className="text-[12px] uppercase tracking-wider font-semibold text-[var(--chidi-text-secondary)]">
                  {DECISION_URGENCY_LABEL[group.urgency]}
                </h2>
                <span className="text-[11px] text-[var(--chidi-text-muted)] tabular-nums">
                  {group.items.length} {group.items.length === 1 ? "decision" : "decisions"}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    expanded={openId === d.id}
                    onToggle={() => setOpenId((id) => (id === d.id ? null : d.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-[11px] text-[var(--chidi-text-muted)] text-center pt-8">
          I refresh decisions every morning. Pin one if you want to come back to it.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Pieces
// ============================================================================

function SnapshotMetric({
  label,
  value,
  delta,
  direction,
}: {
  label: string
  value: string
  delta?: string
  direction: "up" | "down" | "flat"
}) {
  const Arrow = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus
  const tone =
    direction === "up"
      ? "text-[var(--chidi-win)]"
      : direction === "down"
        ? "text-[var(--chidi-warning)]"
        : "text-[var(--chidi-text-muted)]"
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
        {label}
      </p>
      <p className="text-[16px] lg:text-[18px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none truncate">
        {value}
      </p>
      {delta && (
        <p className={cn("text-[11px] tabular-nums mt-1 inline-flex items-center gap-1", tone)}>
          <Arrow className="w-3 h-3" strokeWidth={2.4} />
          <span className="text-[var(--chidi-text-muted)]">{delta}</span>
        </p>
      )}
    </div>
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
      {!active && tone !== "muted" && <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />}
      <span>{label}</span>
      <span className={cn("tabular-nums", active ? "text-[var(--background)]/70" : "text-[var(--chidi-text-muted)]")}>
        {count}
      </span>
    </button>
  )
}

function DecisionCard({
  decision,
  expanded,
  onToggle,
}: {
  decision: Decision
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = KIND_ICON[decision.kind]
  return (
    <article className="rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-default)] overflow-hidden">
      <button onClick={onToggle} className="w-full p-5 lg:p-6 flex items-start gap-4 text-left">
        <div className="w-9 h-9 rounded-xl bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-[var(--chidi-text-secondary)]" strokeWidth={1.8} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-snug">
            {decision.question}
          </h3>
          <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1.5 leading-snug">
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
        <div className="px-5 lg:px-6 pb-5 lg:pb-6 space-y-4">
          {/* Metrics — 2-column grid, paired with baseline */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--chidi-surface)]/40 border border-[var(--chidi-border-subtle)] p-4">
            {decision.metrics.map((m, i) => (
              <MetricCell key={i} metric={m} />
            ))}
          </div>

          {/* Inline chart — supporting visual, never the headline */}
          {decision.chart && <DecisionChartView chart={decision.chart} />}

          {/* Recommendation */}
          <div className="border-l-2 border-[var(--chidi-win)] pl-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-1">
              Chidi recommends
            </p>
            <p className="text-[13px] text-[var(--chidi-text-primary)] leading-snug">
              {decision.recommendation}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold bg-[var(--chidi-text-primary)] text-[var(--background)] hover:bg-[var(--chidi-text-primary)]/90 transition-colors">
              {decision.action.label}
            </button>
            {decision.secondary && (
              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)] transition-colors">
                {decision.secondary.label}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function MetricCell({ metric }: { metric: { label: string; value: string; baseline?: string; direction?: "up" | "down" | "flat" } }) {
  const Arrow = metric.direction === "up" ? ArrowUp : metric.direction === "down" ? ArrowDown : Minus
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
      <p className="text-[15px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
        {metric.value}
      </p>
      {metric.baseline && (
        <p className={cn("text-[11px] tabular-nums mt-1 inline-flex items-center gap-1", tone)}>
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
// Inline charts — supporting evidence under each decision
// ============================================================================

function DecisionChartView({ chart }: { chart: DecisionChart }) {
  switch (chart.type) {
    case "depletion":
      return <DepletionChart sold_per_day={chart.sold_per_day} stock_now={chart.stock_now} stock_unit={chart.stock_unit} />
    case "weekday_bars":
      return <WeekdayBars values={chart.values} label={chart.label} />
    case "channel_donut":
      return <ChannelDonut slices={chart.slices} />
    case "trend_compare":
      return <TrendCompare current={chart.current} prior={chart.prior} label={chart.label} />
    case "price_volume":
      return <PriceVolume points={chart.points} />
  }
}

function ChartFrame({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--chidi-surface)]/40 border border-[var(--chidi-border-subtle)] p-4">
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-3">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

/** Depletion: bars of daily units sold + horizontal "stock-out at this date" projection line */
function DepletionChart({ sold_per_day, stock_now, stock_unit }: { sold_per_day: number[]; stock_now: number; stock_unit: string }) {
  const w = 320
  const h = 110
  const padX = 4
  const padBottom = 18
  const max = Math.max(...sold_per_day, 1)
  const stepX = (w - padX * 2) / sold_per_day.length
  const barW = Math.max(4, stepX - 4)

  // Project days-until-empty using mean daily pace
  const meanPace = sold_per_day.reduce((s, v) => s + v, 0) / sold_per_day.length
  const daysLeft = meanPace > 0 ? Math.round(stock_now / meanPace) : 999

  return (
    <ChartFrame label={`Daily units sold (last ${sold_per_day.length} days) · ${stock_now} ${stock_unit} in stock`}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block" aria-hidden="true">
        {/* Bars */}
        {sold_per_day.map((v, i) => {
          const bh = ((v / max) * (h - padBottom - 6)) | 0
          const x = padX + i * stepX + (stepX - barW) / 2
          const y = h - padBottom - bh
          const isPeak = v === max
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx={1.5}
              fill={isPeak ? "var(--chidi-win)" : "var(--chidi-text-secondary)"}
              opacity={isPeak ? 0.95 : 0.55}
            />
          )
        })}
        {/* Baseline */}
        <line x1={0} x2={w} y1={h - padBottom} y2={h - padBottom} stroke="var(--chidi-border-subtle)" strokeWidth={1} />
        {/* Mean pace marker */}
        <line
          x1={0}
          x2={w}
          y1={h - padBottom - (meanPace / max) * (h - padBottom - 6)}
          y2={h - padBottom - (meanPace / max) * (h - padBottom - 6)}
          stroke="var(--chidi-warning)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.7}
        />
      </svg>
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

/** Weekday bars: 7 bars Sun..Sat with the peak day highlighted */
function WeekdayBars({ values, label }: { values: number[]; label: string }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"]
  const max = Math.max(...values, 1)
  return (
    <ChartFrame label={label}>
      <div className="flex items-end gap-2 h-24 px-1">
        {values.map((v, i) => {
          const pct = (v / max) * 100
          const isPeak = v === max
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-700 ease-out",
                    isPeak ? "bg-[var(--chidi-win)]" : "bg-[var(--chidi-text-secondary)]/40",
                  )}
                  style={{ height: `${pct}%` }}
                  title={`${days[i]}: ${v.toLocaleString("en-NG")}`}
                />
              </div>
              <span className={cn(
                "text-[10px] tabular-nums",
                isPeak ? "text-[var(--chidi-text-primary)] font-semibold" : "text-[var(--chidi-text-muted)]",
              )}>
                {days[i]}
              </span>
            </div>
          )
        })}
      </div>
    </ChartFrame>
  )
}

/** Channel donut: revenue split with a centered total */
function ChannelDonut({ slices }: { slices: Array<{ label: string; value: number; color?: string }> }) {
  const total = slices.reduce((s, c) => s + c.value, 0) || 1
  const size = 120
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <ChartFrame label="Revenue by channel (last 30 days)">
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--chidi-border-subtle)" strokeWidth={stroke} fill="none" />
            {slices.map((s, i) => {
              const dash = (s.value / total) * c
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color ?? "var(--chidi-text-primary)"}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
              )
              offset += dash
              return el
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[14px] font-semibold tabular-nums text-[var(--chidi-text-primary)] leading-none">
              {(total / 1000).toFixed(0)}k
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[var(--chidi-text-muted)] mt-1">total</span>
          </div>
        </div>
        <ul className="flex-1 min-w-0 space-y-2">
          {slices.map((s) => {
            const pct = Math.round((s.value / total) * 100)
            return (
              <li key={s.label} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color ?? "var(--chidi-text-primary)" }} />
                  <span className="text-[var(--chidi-text-primary)] truncate">{s.label}</span>
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

/** Trend-compare: two area lines (current vs prior) overlaid */
function TrendCompare({ current, prior, label }: { current: number[]; prior: number[]; label?: string }) {
  const w = 320
  const h = 100
  const padX = 4
  const padY = 6
  const max = Math.max(...current, ...prior, 1)
  const len = Math.max(current.length, prior.length)
  const stepX = (w - padX * 2) / Math.max(1, len - 1)
  const toPath = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = padX + i * stepX
        const y = h - padY - (v / max) * (h - padY * 2)
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")
  return (
    <ChartFrame label={label ?? "Current vs prior period"}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block" aria-hidden="true">
        <line x1={0} x2={w} y1={h - padY} y2={h - padY} stroke="var(--chidi-border-subtle)" strokeWidth={1} />
        <path d={toPath(prior)} fill="none" stroke="var(--chidi-text-muted)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
        <path d={toPath(current)} fill="none" stroke="var(--chidi-warning)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--chidi-warning)]" />
          Current
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--chidi-text-muted)]/60" />
          Prior period
        </span>
      </div>
    </ChartFrame>
  )
}

/** Price-volume: scatter of price tests with current + suggested highlighted */
function PriceVolume({ points }: { points: Array<{ price: number; units: number; current?: boolean; suggested?: boolean }> }) {
  const w = 320
  const h = 110
  const padX = 30
  const padY = 14
  const minP = Math.min(...points.map((p) => p.price))
  const maxP = Math.max(...points.map((p) => p.price))
  const minU = 0
  const maxU = Math.max(...points.map((p) => p.units), 1)
  const xFor = (p: number) => padX + ((p - minP) / Math.max(1, maxP - minP)) * (w - padX - 8)
  const yFor = (u: number) => h - padY - ((u - minU) / Math.max(1, maxU - minU)) * (h - padY * 2)
  // Sort by price for a connecting line
  const sorted = [...points].sort((a, b) => a.price - b.price)
  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.price).toFixed(1)},${yFor(p.units).toFixed(1)}`)
    .join(" ")
  return (
    <ChartFrame label="Price vs units sold (each dot = a 7-day test)">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block" aria-hidden="true">
        {/* Axis hints */}
        <line x1={padX} x2={padX} y1={padY} y2={h - padY} stroke="var(--chidi-border-subtle)" strokeWidth={1} />
        <line x1={padX} x2={w - 4} y1={h - padY} y2={h - padY} stroke="var(--chidi-border-subtle)" strokeWidth={1} />
        {/* Trend line */}
        <path d={path} fill="none" stroke="var(--chidi-text-muted)" strokeWidth={1.2} opacity={0.5} />
        {/* Dots */}
        {points.map((p, i) => {
          const isHighlight = p.current || p.suggested
          const fill = p.suggested ? "var(--chidi-win)" : p.current ? "var(--chidi-text-primary)" : "var(--chidi-text-muted)"
          const r = isHighlight ? 5 : 3
          return (
            <g key={i}>
              <circle cx={xFor(p.price)} cy={yFor(p.units)} r={r} fill={fill} opacity={isHighlight ? 1 : 0.55} />
              {p.suggested && (
                <text x={xFor(p.price)} y={yFor(p.units) - 9} textAnchor="middle" className="text-[9px]" fill="var(--chidi-win)" fontWeight={600}>
                  ₦{(p.price / 1000).toFixed(0)}k ←
                </text>
              )}
              {p.current && (
                <text x={xFor(p.price)} y={yFor(p.units) + 14} textAnchor="middle" className="text-[9px]" fill="var(--chidi-text-primary)" fontWeight={600}>
                  now
                </text>
              )}
            </g>
          )
        })}
        {/* Y-axis label */}
        <text x={4} y={padY + 4} className="text-[9px]" fill="var(--chidi-text-muted)">units</text>
        <text x={w - 4} y={h - 3} textAnchor="end" className="text-[9px]" fill="var(--chidi-text-muted)">price →</text>
      </svg>
    </ChartFrame>
  )
}
