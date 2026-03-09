"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SalesOverviewResponse } from "@/lib/types/analytics"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/api/analytics"

interface KPICardsProps {
  data: SalesOverviewResponse | null
  loading: boolean
}

export function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <KPICard
        label="Revenue"
        value={formatCurrency(data.revenue.current)}
        change={data.revenue.percent_change}
      />
      <KPICard
        label="Orders"
        value={formatNumber(data.orders.current)}
        change={data.orders.percent_change}
      />
      <KPICard
        label="Avg Order"
        value={formatCurrency(data.avg_order_value.current)}
        change={data.avg_order_value.percent_change}
      />
      <KPICard
        label="Fulfilled"
        value={`${data.fulfillment_rate.current.toFixed(0)}%`}
        change={data.fulfillment_rate.percent_change}
      />
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string
  change: number | null
}

function KPICard({ label, value, change }: KPICardProps) {
  const isPositive = change !== null && change > 0
  const isNegative = change !== null && change < 0
  const isNeutral = change === null || change === 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="text-xs text-[var(--chidi-text-muted)] font-medium mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold text-[var(--chidi-text-primary)] mb-1">
        {value}
      </div>
      <div className="flex items-center gap-1">
        {isPositive && (
          <TrendingUp className="w-3 h-3 text-green-500" />
        )}
        {isNegative && (
          <TrendingDown className="w-3 h-3 text-red-500" />
        )}
        {isNeutral && (
          <Minus className="w-3 h-3 text-gray-400" />
        )}
        <span
          className={cn(
            "text-xs font-medium",
            isPositive && "text-green-600",
            isNegative && "text-red-600",
            isNeutral && "text-gray-400"
          )}
        >
          {formatPercent(change)}
        </span>
        <span className="text-xs text-[var(--chidi-text-muted)]">
          vs prev
        </span>
      </div>
    </div>
  )
}

function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-6 w-24 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
  )
}
