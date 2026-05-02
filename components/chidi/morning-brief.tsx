"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight, MessageCircle, Package, ShoppingBag, TrendingUp } from "lucide-react"
import { useSalesOverview } from "@/lib/hooks/use-analytics"
import { useOrders } from "@/lib/hooks/use-orders"
import { useConversations } from "@/lib/hooks/use-messaging"
import { formatCurrency } from "@/lib/utils/currency"
import { ChidiAvatar } from "./chidi-mark"
import {
  buildVoiceContext,
  greeting as buildGreeting,
  proactivePromptNeedsHuman,
  proactivePromptPending,
} from "@/lib/chidi/voice"
import type { TabId } from "./bottom-navigation"

interface MorningBriefProps {
  ownerName?: string
  businessSlug?: string
  currency?: string
  setActiveTab: (tab: TabId) => void
}

export function MorningBrief({ ownerName, businessSlug, currency = "NGN", setActiveTab }: MorningBriefProps) {
  const sales = useSalesOverview("7d")
  const pendingOrders = useOrders("PENDING_PAYMENT")
  const needsHuman = useConversations("NEEDS_HUMAN", undefined)

  const ctx = useMemo(() => buildVoiceContext(ownerName?.split(" ")[0]), [ownerName])
  const greeting = useMemo(() => buildGreeting(ctx), [ctx])

  const revenueWeek = sales.data?.revenue.current
  const orderCount = sales.data?.orders.current
  const pendingCount = pendingOrders.data?.orders.length ?? 0
  const needsHumanCount = needsHuman.data?.needs_human_count ?? 0

  const hasNumbers = sales.isSuccess && (revenueWeek !== undefined || orderCount !== undefined)

  // Build the line Chidi says — varies by what's actually happening today
  // and the time of day.
  const headline = useMemo(() => {
    if (needsHumanCount > 0 && pendingCount > 0) {
      return `${proactivePromptNeedsHuman(needsHumanCount)} ${proactivePromptPending(pendingCount).toLowerCase()}`
    }
    if (needsHumanCount > 0) return proactivePromptNeedsHuman(needsHumanCount)
    if (pendingCount > 0) return proactivePromptPending(pendingCount)
    if (hasNumbers && revenueWeek && revenueWeek > 0) {
      const intro = ctx.day === "saturday" ? "Saturday going strong." : ctx.time === "late" ? "Late and quiet." : "Quiet so far."
      return `${intro} You're at ${formatCurrency(revenueWeek, currency, { compact: true })} this week — keep it going.`
    }
    if (ctx.day === "sunday") return "Sunday quiet. Take the day — I'll watch the inbox."
    if (ctx.time === "late") return "All quiet overnight. I'll flag anything urgent."
    return "Quiet for now. I'll let you know when something needs you."
  }, [needsHumanCount, pendingCount, hasNumbers, revenueWeek, currency, ctx])

  return (
    <section
      aria-label="Morning brief from Chidi"
      className="mx-4 mt-3 mb-2 rounded-2xl chidi-paper bg-[var(--card)] border border-[var(--chidi-border-subtle)] shadow-card overflow-hidden"
    >
      <div className="relative z-[2] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ChidiAvatar size="md" tone="default" />

          <div className="flex-1 min-w-0">
            <p
              className="text-base sm:text-lg font-serif text-[var(--chidi-text-primary)] leading-snug chidi-brief-card"
              style={{ animationDelay: "0ms" }}
            >
              {greeting}
            </p>
            <p
              className="text-sm sm:text-[15px] text-[var(--chidi-text-secondary)] font-chidi-voice mt-1 leading-relaxed chidi-brief-card"
              style={{ animationDelay: "120ms" }}
            >
              {headline}
            </p>
          </div>
        </div>

        {hasNumbers && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <BriefStat
              label="This week"
              value={revenueWeek !== undefined ? formatCurrency(revenueWeek, currency, { compact: true }) : "—"}
              subtitle={
                sales.data?.revenue.percent_change != null
                  ? `${sales.data.revenue.percent_change >= 0 ? "+" : ""}${Math.round(sales.data.revenue.percent_change)}%`
                  : undefined
              }
              positive={sales.data?.revenue.percent_change != null && sales.data.revenue.percent_change >= 0}
              icon={TrendingUp}
              delay={240}
              accent
            />
            <BriefStat
              label="Orders"
              value={orderCount !== undefined ? String(orderCount) : "—"}
              icon={ShoppingBag}
              delay={320}
            />
            <BriefStat
              label="Pending"
              value={String(pendingCount)}
              icon={Package}
              delay={400}
              onClick={() => setActiveTab("orders")}
              warning={pendingCount > 0}
            />
            <BriefStat
              label="Need you"
              value={String(needsHumanCount)}
              icon={MessageCircle}
              delay={480}
              onClick={() => setActiveTab("inbox")}
              warning={needsHumanCount > 0}
            />
          </div>
        )}

        {businessSlug && (
          <div className="mt-4 pt-3 border-t border-[var(--chidi-border-subtle)] flex items-center justify-between">
            <p className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice">
              Updated just now
            </p>
            <Link
              href={`/dashboard/${businessSlug}/notebook`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] font-chidi-voice"
            >
              See what Chidi noticed
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

interface BriefStatProps {
  label: string
  value: string
  subtitle?: string
  positive?: boolean
  warning?: boolean
  accent?: boolean
  icon: React.ElementType
  delay: number
  onClick?: () => void
}

function BriefStat({ label, value, subtitle, positive, warning, accent, icon: Icon, delay, onClick }: BriefStatProps) {
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      onClick={onClick}
      className={`text-left p-3 rounded-xl bg-[var(--chidi-surface)] chidi-brief-card ${
        onClick ? "chidi-card-lift hover:bg-white cursor-pointer" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--chidi-text-muted)] font-chidi-voice mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div
        className={`text-lg font-semibold font-chidi-voice tabular-nums ${
          accent
            ? "text-[var(--chidi-win)]"
            : warning
            ? "text-[var(--chidi-warning)]"
            : "text-[var(--chidi-text-primary)]"
        }`}
      >
        {value}
      </div>
      {subtitle && (
        <div
          className={`text-[11px] font-chidi-voice mt-0.5 ${
            positive ? "text-[var(--chidi-success)]" : "text-[var(--chidi-danger)]"
          }`}
        >
          {subtitle}
        </div>
      )}
    </Wrapper>
  )
}
