"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CreditCard,
  Sparkles,
  Check,
  Download,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { SettingsSectionCard } from "./settings-section-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatNaira,
  getBilling,
  MOCK_INVOICES,
  MOCK_USAGE_HISTORY,
  PLAN_CATALOG,
  seedBillingIfEmpty,
  setPlan,
  subscribe,
  usagePct,
  usageTone,
  type BillingPlan,
  type BillingStore,
} from "@/lib/chidi/billing"
import { cn } from "@/lib/utils"

const TONE_BG: Record<"ok" | "warn" | "crit", string> = {
  ok: "bg-[var(--chidi-accent,#00C853)]",
  warn: "bg-[var(--chidi-warning)]",
  crit: "bg-red-500",
}

const TONE_LABEL: Record<"ok" | "warn" | "crit", string> = {
  ok: "OK",
  warn: "Approaching",
  crit: "At limit",
}

function formatBillDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function BillingSection() {
  const [store, setStore] = useState<BillingStore>(() => getBilling())
  const [showPlans, setShowPlans] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    seedBillingIfEmpty()
    const off = subscribe(setStore)
    return off
  }, [])

  const plan = PLAN_CATALOG[store.plan]
  const usageRows = useMemo(
    () => [
      { key: "messages", label: "Messages", used: store.usage.messages, cap: plan.caps.messages },
      { key: "broadcasts", label: "Broadcasts", used: store.usage.broadcasts, cap: plan.caps.broadcasts },
      { key: "ai_actions", label: "AI actions", used: store.usage.ai_actions, cap: plan.caps.ai_actions },
    ],
    [store.usage, plan.caps],
  )

  return (
    <>
      <SettingsSectionCard
        eyebrow="Billing"
        title="Plan and usage"
        description="What you're paying and what you've used this month."
      >
        {/* Top card — current plan */}
        <div className="rounded-xl border border-[var(--chidi-border-default)] bg-[var(--chidi-surface)]/40 p-4 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--chidi-win,#E8A33D)]/12 flex items-center justify-center flex-shrink-0">
                <Sparkles
                  className="w-5 h-5 text-[var(--chidi-win,#E8A33D)]"
                  strokeWidth={1.8}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[15px] font-semibold text-[var(--chidi-text-primary)] capitalize">
                    {plan.label} plan
                  </p>
                  <span className="text-[12px] text-[var(--chidi-text-muted)] font-chidi-voice">
                    {plan.blurb}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--chidi-text-secondary)] mt-1 tabular-nums">
                  {formatNaira(plan.priceNgn)}
                  {plan.priceNgn > 0 && (
                    <span className="text-[var(--chidi-text-muted)]">/month</span>
                  )}
                  <span className="mx-2 text-[var(--chidi-text-muted)]">·</span>
                  <Calendar
                    className="inline w-3 h-3 mr-1 -mt-0.5 text-[var(--chidi-text-muted)]"
                    strokeWidth={1.8}
                  />
                  Next bill {formatBillDate(store.nextBillIso)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPlans(true)}
              className="text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] underline underline-offset-2 min-h-[32px] inline-flex items-center"
            >
              Change plan
            </button>
          </div>
        </div>

        {/* Usage strip — 3 progress bars */}
        <div className="space-y-3">
          {usageRows.map((row) => {
            const pct = usagePct(row.used, row.cap)
            const tone = usageTone(pct)
            return (
              <div key={row.key}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-[12px] font-medium text-[var(--chidi-text-primary)]">
                    {row.label}
                    <span className="ml-2 text-[11px] text-[var(--chidi-text-muted)] font-normal">
                      this month
                    </span>
                  </p>
                  <p className="text-[12px] tabular-nums text-[var(--chidi-text-secondary)]">
                    <span
                      className={cn(
                        "font-medium",
                        tone === "warn" && "text-[var(--chidi-warning)]",
                        tone === "crit" && "text-red-600",
                      )}
                    >
                      {row.used.toLocaleString("en-NG")}
                    </span>
                    <span className="text-[var(--chidi-text-muted)]">
                      {" "}
                      / {row.cap.toLocaleString("en-NG")}
                    </span>
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`${row.label} usage: ${pct}% (${TONE_LABEL[tone]})`}
                  className="h-1.5 rounded-full bg-[var(--chidi-surface)] overflow-hidden"
                >
                  <div
                    className={cn(
                      "h-full motion-safe:transition-[width] duration-500",
                      TONE_BG[tone],
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* History link */}
        <div className="mt-4 pt-4 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] underline underline-offset-2"
          >
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.8} />
            Usage history
          </button>
        </div>

        {/* Invoices */}
        <div className="mt-5 pt-4 border-t border-[var(--chidi-border-subtle)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-medium mb-2.5">
            Recent invoices
          </p>
          <ul className="rounded-xl border border-[var(--chidi-border-subtle)] overflow-hidden">
            {MOCK_INVOICES.map((inv, i) => (
              <li
                key={inv.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  i > 0 && "border-t border-[var(--chidi-border-subtle)]",
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--chidi-surface)] flex items-center justify-center flex-shrink-0">
                  <CreditCard
                    className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] truncate tabular-nums">
                    {inv.id}
                  </p>
                  <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
                    {formatBillDate(inv.issuedIso)} ·{" "}
                    {PLAN_CATALOG[inv.plan].label}
                  </p>
                </div>
                <p className="text-[13px] tabular-nums text-[var(--chidi-text-primary)] font-medium">
                  {formatNaira(inv.amountNgn)}
                </p>
                <button
                  type="button"
                  aria-label={`Download invoice ${inv.id}`}
                  className="flex-shrink-0 p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
                  onClick={() => {
                    /* Stub — real downloads are a backend job. */
                  }}
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SettingsSectionCard>

      {/* Plan-change modal — 3 plan cards with comparison */}
      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--chidi-win,#E8A33D)]" />
              Change plan
            </DialogTitle>
            <DialogDescription>
              Upgrade or downgrade anytime. Changes take effect on your next
              bill.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            {(Object.keys(PLAN_CATALOG) as BillingPlan[]).map((id) => {
              const p = PLAN_CATALOG[id]
              const isCurrent = id === store.plan
              return (
                <div
                  key={id}
                  className={cn(
                    "rounded-xl border p-4 flex flex-col",
                    isCurrent
                      ? "border-[var(--chidi-accent,#00C853)] bg-[var(--chidi-accent-soft,rgba(0,200,83,0.06))]"
                      : "border-[var(--chidi-border-default)] bg-[var(--chidi-surface)]/40",
                  )}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-[14px] font-semibold text-[var(--chidi-text-primary)]">
                      {p.label}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--chidi-accent,#00C853)] text-white font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mb-3">
                    {p.blurb}
                  </p>
                  <p className="text-[20px] font-semibold text-[var(--chidi-text-primary)] tabular-nums">
                    {formatNaira(p.priceNgn)}
                    {p.priceNgn > 0 && (
                      <span className="text-[12px] text-[var(--chidi-text-muted)] font-normal">
                        /mo
                      </span>
                    )}
                  </p>
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[12px] text-[var(--chidi-text-secondary)] leading-snug"
                      >
                        <Check
                          className="w-3.5 h-3.5 text-[var(--chidi-accent,#00C853)] mt-0.5 flex-shrink-0"
                          strokeWidth={2}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-3 pt-3 border-t border-[var(--chidi-border-subtle)] space-y-1 text-[11px] text-[var(--chidi-text-muted)] tabular-nums">
                    <li>
                      {p.caps.messages.toLocaleString("en-NG")} messages/mo
                    </li>
                    <li>{p.caps.broadcasts.toLocaleString("en-NG")} broadcasts/mo</li>
                    <li>
                      {p.caps.ai_actions.toLocaleString("en-NG")} AI actions/mo
                    </li>
                  </ul>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!isCurrent) setPlan(id)
                      setShowPlans(false)
                    }}
                    disabled={isCurrent}
                    className={cn(
                      "mt-4 min-h-[40px]",
                      isCurrent ? "" : "btn-cta",
                    )}
                    variant={isCurrent ? "outline" : "default"}
                  >
                    {isCurrent ? "Current plan" : `Switch to ${p.label}`}
                  </Button>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage history modal — sparkline */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage history
            </DialogTitle>
            <DialogDescription>
              Messages handled across the last 6 months.
            </DialogDescription>
          </DialogHeader>
          <UsageSparkline />
          <div className="grid grid-cols-6 gap-1 mt-2 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] text-center font-medium">
            {MOCK_USAGE_HISTORY.map((m) => (
              <div key={m.month}>{m.month}</div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1 text-[11px] tabular-nums text-[var(--chidi-text-secondary)] text-center">
            {MOCK_USAGE_HISTORY.map((m) => (
              <div key={m.month}>{m.messages.toLocaleString("en-NG")}</div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// =====================================================================
// UsageSparkline — pure-SVG area chart, no dependencies. Honors
// prefers-reduced-motion (no animation when reduced).
// =====================================================================
function UsageSparkline() {
  const data = MOCK_USAGE_HISTORY
  const max = Math.max(...data.map((d) => d.messages))
  const min = Math.min(...data.map((d) => d.messages))
  const w = 480
  const h = 120
  const padX = 8
  const padY = 8
  const range = Math.max(1, max - min)
  const points = data.map((d, i) => {
    const x = padX + (i * (w - padX * 2)) / (data.length - 1)
    const y = h - padY - ((d.messages - min) / range) * (h - padY * 2)
    return { x, y }
  })
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const area = `${path} L${points[points.length - 1].x},${h - padY} L${points[0].x},${h - padY} Z`

  return (
    <div className="mt-3 rounded-xl border border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]/40 p-3">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label="6-month message usage trend"
      >
        <defs>
          <linearGradient id="usage-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--chidi-accent, #00C853)"
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor="var(--chidi-accent, #00C853)"
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#usage-fill)" />
        <path
          d={path}
          fill="none"
          stroke="var(--chidi-accent, #00C853)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="var(--chidi-accent, #00C853)"
          />
        ))}
      </svg>
    </div>
  )
}
