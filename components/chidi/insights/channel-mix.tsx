"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ChannelMixResponse } from "@/lib/types/analytics"
import { formatCurrency, getChannelDisplay } from "@/lib/api/analytics"

interface ChannelMixProps {
  data: ChannelMixResponse | null
  loading: boolean
}

const chartConfig = {
  revenue: {
    label: "Revenue",
  },
} satisfies ChartConfig

const channelColors: Record<string, string> = {
  WHATSAPP: "#25D366",
  TELEGRAM: "#0088cc",
  INSTAGRAM: "#E4405F",
  SMS: "#6B7280",
  UNKNOWN: "#9CA3AF",
}

function getChannelColor(channel: string): string {
  const normalized = channel?.toUpperCase() || 'UNKNOWN'
  return channelColors[normalized] || channelColors.UNKNOWN
}

export function ChannelMix({ data, loading }: ChannelMixProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="h-4 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (!data || data.channels.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-4">
          Sales by Channel
        </h3>
        <div className="h-40 flex items-center justify-center text-sm text-[var(--chidi-text-muted)]">
          No channel data yet
        </div>
      </div>
    )
  }

  const chartData = data.channels.map((channel) => ({
    channel: getChannelDisplay(channel.channel).name,
    rawChannel: channel.channel,
    revenue: channel.revenue,
    orders: channel.order_count,
    percentage: channel.revenue_percentage,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-4">
        Sales by Channel
      </h3>
      
      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-40 w-full mb-4">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => formatCompact(value)}
          />
          <YAxis
            type="category"
            dataKey="channel"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: '#4b5563' }}
            width={70}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex flex-col gap-1">
                    <span>{formatCurrency(value as number)}</span>
                    <span className="text-muted-foreground">
                      {item.payload.orders} orders · {item.payload.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getChannelColor(entry.rawChannel)}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {data.channels.map((channel) => {
          const display = getChannelDisplay(channel.channel)
          return (
            <div key={channel.channel} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: getChannelColor(channel.channel) }}
              />
              <span className="text-xs text-[var(--chidi-text-secondary)]">
                {display.name}
              </span>
              <span className="text-xs text-[var(--chidi-text-muted)]">
                {channel.revenue_percentage.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
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
