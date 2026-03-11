"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { SalesTrendResponse } from "@/lib/types/analytics"
import { formatCurrency } from "@/lib/api/analytics"

interface RevenueChartProps {
  data: SalesTrendResponse | null
  loading: boolean
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="h-4 w-24 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-4">
          Revenue Trend
        </h3>
        <div className="h-48 flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-medium text-[var(--chidi-text-primary)] mb-1">No sales data yet</p>
          <p className="text-xs text-[var(--chidi-text-muted)]">Revenue data appears as customers place orders through your channels.</p>
        </div>
      </div>
    )
  }

  const chartData = data.data.map((point) => ({
    date: formatDate(point.date),
    revenue: point.revenue,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-4">
        Revenue Trend
      </h3>
      <ChartContainer config={chartConfig} className="h-48 w-full">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            tick={{ fill: '#9ca3af' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => formatCompact(value)}
            width={45}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(value as number)}
                labelFormatter={(label) => String(label)}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-revenue)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}
