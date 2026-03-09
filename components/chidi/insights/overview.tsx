"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import type { Period } from "@/lib/types/analytics"
import {
  useSalesOverview,
  useSalesTrend,
  useTopProducts,
  useChannelMix,
  analyticsKeys,
} from "@/lib/hooks/use-analytics"
import { PeriodSelector } from "./period-selector"
import { KPICards } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { ProductTrends } from "./product-trends"
import { ChannelMix } from "./channel-mix"
import { AIObservations } from "./ai-observations"

export function InsightsOverview() {
  const [period, setPeriod] = useState<Period>("30d")
  const queryClient = useQueryClient()

  const salesOverviewQuery = useSalesOverview(period)
  const salesTrendQuery = useSalesTrend(period)
  const topProductsQuery = useTopProducts(period, 5)
  const channelMixQuery = useChannelMix(period)

  const isLoading =
    salesOverviewQuery.isLoading ||
    salesTrendQuery.isLoading ||
    topProductsQuery.isLoading ||
    channelMixQuery.isLoading

  const isRefetching =
    salesOverviewQuery.isRefetching ||
    salesTrendQuery.isRefetching ||
    topProductsQuery.isRefetching ||
    channelMixQuery.isRefetching

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.salesOverview(period) })
    queryClient.invalidateQueries({ queryKey: analyticsKeys.salesTrend(period) })
    queryClient.invalidateQueries({ queryKey: analyticsKeys.topProducts(period, 5) })
    queryClient.invalidateQueries({ queryKey: analyticsKeys.channelMix(period) })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header with Period Selector */}
        <div className="flex items-center justify-between">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            className="p-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-secondary)] disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* KPI Summary Cards */}
        <KPICards data={salesOverviewQuery.data ?? null} loading={isLoading} />

        {/* Revenue Trend Chart */}
        <RevenueChart data={salesTrendQuery.data ?? null} loading={isLoading} />

        {/* Product Trends */}
        <ProductTrends data={topProductsQuery.data ?? null} loading={isLoading} />

        {/* Channel Mix */}
        <ChannelMix data={channelMixQuery.data ?? null} loading={isLoading} />

        {/* AI Observations */}
        <AIObservations />

        {/* Bottom padding for safe area */}
        <div className="h-4" />
      </div>
    </div>
  )
}
