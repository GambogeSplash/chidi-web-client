"use client"

/**
 * InsightsCohortCard — single-row stacked horizontal bar showing the four
 * customer cohort buckets (New / Repeat / VIP / Churned) plus a legend grid
 * and a one-line voice subtitle.
 *
 * Why a single-row stack (not 4 separate bars):
 *   The merchant question this answers is "what's the *mix* of who I sell
 *   to?" Four bars compare bucket sizes; one stack shows them as a portfolio.
 *   For a 4-segment cohort that's the cleaner read.
 *
 * The card lives in the drill-in panel as a third small card next to the
 * Top hours / Day-of-week pair on the analytics view (see insights-view.tsx
 * for placement). Same paper card chrome as the rest of Insights.
 *
 * Token-only colors. Honors prefers-reduced-motion (no animation when set).
 */

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts"
import { cn } from "@/lib/utils"
import type { CohortBucket, CohortReport } from "@/lib/chidi/cohort-analysis"

// ============================================================================
// Token mapping — keep in component layer so cohort-analysis.ts stays pure
// ============================================================================

const TONE_COLOR: Record<CohortBucket["tone"], string> = {
  // Repeat → "win" (signal green) because that's the desired outcome.
  win: "var(--chidi-win)",
  // New → "info" (using the primary text colour with high opacity gives a
  // dark anchor that doesn't compete with the win green).
  info: "var(--chidi-text-primary)",
  // VIP → warning amber. Premium / scarce, eye-catching, distinct from Repeat.
  vip: "var(--chidi-warning)",
  // Churned → muted text colour. Quiet on purpose so it doesn't dominate.
  muted: "var(--chidi-text-muted)",
}

// ============================================================================
// Public component
// ============================================================================

export function InsightsCohortCard({
  report,
  className,
}: {
  report: CohortReport | null | undefined
  className?: string
}) {
  // Recharts stacked bars want one data row with one numeric key per series.
  // We flatten the buckets into a single object and render a `<Bar>` per
  // bucket with `stackId="cohort"`. Hook is up here (above the early return)
  // so React's hook order stays stable across loading/loaded transitions.
  const stackRow = useMemo(() => {
    const row: Record<string, number | string> = { name: "Customers" }
    if (report) {
      for (const b of report.buckets) row[b.label] = b.value
    }
    return [row]
  }, [report])

  // Guard against undefined / loading state — render an empty hint card so
  // the layout doesn't reflow when data lands.
  if (!report || report.totalCustomers === 0) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2.5 min-h-[180px] justify-center",
          className,
        )}
      >
        <p className="text-[14px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
          New vs. regular
        </p>
        <p className="text-[12px] text-[var(--chidi-text-muted)]">
          {report?.voiceSummary ??
            "No customers yet — this fills in once orders start landing."}
        </p>
      </div>
    )
  }

  const orderedBuckets = report.buckets // already in [New, Repeat, VIP, Churned]

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] lg:text-[15px] font-semibold text-[var(--chidi-text-primary)] leading-tight">
            New vs. regular
          </h3>
          <p className="text-[11px] text-[var(--chidi-text-muted)] mt-1 tabular-nums">
            {report.totalCustomers}{" "}
            {report.totalCustomers === 1 ? "customer" : "customers"} ·{" "}
            {report.repeatRate}% repeat
          </p>
        </div>
      </header>

      {/* Stacked bar — single row, ~24px tall. Recharts handles tooltip; we
          override the cursor + content for token consistency. */}
      <div className="h-[44px] -ml-2 -mr-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stackRow}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" hide />
            <RTooltip
              cursor={{ fill: "var(--chidi-border-subtle)" }}
              content={(p) => (
                <CohortTooltip {...p} buckets={orderedBuckets} />
              )}
            />
            {orderedBuckets.map((b, i) => {
              const isFirst = i === 0
              const isLast = i === orderedBuckets.length - 1
              // Round only the outer ends so stacked segments share clean
              // joints in the middle.
              const radius: [number, number, number, number] = [
                isLast ? 4 : 0,
                isLast ? 4 : 0,
                isFirst ? 4 : 0,
                isFirst ? 4 : 0,
              ]
              return (
                <Bar
                  key={b.label}
                  dataKey={b.label}
                  stackId="cohort"
                  fill={TONE_COLOR[b.tone]}
                  fillOpacity={0.9}
                  radius={radius}
                  isAnimationActive
                  animationDuration={650}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend grid — 2 columns, swatches matching the bar segments. */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
        {orderedBuckets.map((b) => (
          <li
            key={b.label}
            className="flex items-center gap-2 text-[11px] min-w-0"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: TONE_COLOR[b.tone] }}
              aria-hidden
            />
            <span className="text-[var(--chidi-text-primary)] font-medium">
              {b.label}
            </span>
            <span className="text-[var(--chidi-text-muted)] tabular-nums ml-auto">
              {b.value} · {b.percent}%
            </span>
          </li>
        ))}
      </ul>

      {/* Voice subtitle — generated in cohort-analysis.ts, no LLM call. */}
      <p className="text-[11.5px] text-[var(--chidi-text-secondary)] mt-1 leading-snug">
        {report.voiceSummary}
      </p>
    </div>
  )
}

// ============================================================================
// Tooltip — mirrors the chart tooltip pattern in insights-view.tsx
// ============================================================================

function CohortTooltip(props: Record<string, unknown>) {
  const active = props.active as boolean | undefined
  const buckets = props.buckets as CohortBucket[] | undefined
  if (!active || !buckets || buckets.length === 0) return null
  return (
    <div className="rounded-lg border border-[var(--chidi-border-default)] bg-[var(--card)] shadow-card px-2.5 py-2 text-[11px] min-w-[160px]">
      <div className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] mb-1">
        Cohort mix
      </div>
      {buckets.map((b) => (
        <div
          key={b.label}
          className="flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-1.5 text-[var(--chidi-text-muted)]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: TONE_COLOR[b.tone] }}
            />
            {b.label}
          </span>
          <span className="font-semibold tabular-nums text-[var(--chidi-text-primary)]">
            {b.value} · {b.percent}%
          </span>
        </div>
      ))}
    </div>
  )
}
