"use client"

import { TrendingUp, AlertTriangle } from "lucide-react"
import type { TopProductsResponse } from "@/lib/types/analytics"
import { formatCurrency } from "@/lib/api/analytics"

interface ProductTrendsProps {
  data: TopProductsResponse | null
  loading: boolean
}

export function ProductTrends({ data, loading }: ProductTrendsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="h-4 w-24 bg-gray-200 rounded mb-4 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="py-3 animate-pulse">
            <div className="h-4 w-full bg-gray-100 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const hasTopProducts = data?.top_products && data.top_products.length > 0
  const hasStaleProducts = data?.stale_products && data.stale_products.length > 0

  if (!hasTopProducts && !hasStaleProducts) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-[var(--chidi-text-primary)] mb-4">
          Product Trends
        </h3>
        <div className="py-8 text-center text-sm text-[var(--chidi-text-muted)]">
          Start selling to see product trends
        </div>
      </div>
    )
  }

  const maxRevenue = hasTopProducts
    ? Math.max(...data.top_products.map((p) => p.revenue))
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* Top Sellers */}
      {hasTopProducts && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
              Top Sellers
            </h3>
          </div>
          <div className="space-y-3">
            {data.top_products.map((product, index) => (
              <div key={product.product_id || index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--chidi-text-primary)] truncate flex-1 mr-2">
                    {product.product_name}
                  </span>
                  <span className="text-sm font-medium text-[var(--chidi-text-primary)]">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--chidi-text-muted)] w-16 text-right">
                    {product.units_sold} sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stale Products */}
      {hasStaleProducts && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-[var(--chidi-text-primary)]">
              Needs Attention
            </h3>
          </div>
          <div className="space-y-2">
            {data.stale_products.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--chidi-text-primary)] truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-[var(--chidi-text-muted)]">
                    {product.stock_quantity} in stock · No sales in 30 days
                  </div>
                </div>
                <span className="text-xs text-amber-600 font-medium ml-2 whitespace-nowrap">
                  Consider promoting
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
