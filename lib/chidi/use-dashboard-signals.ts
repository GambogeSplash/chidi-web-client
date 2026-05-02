"use client"

import { useMemo } from "react"
import { useOrders } from "@/lib/hooks/use-orders"
import { useConversations } from "@/lib/hooks/use-messaging"
import { useProducts } from "@/lib/hooks/use-products"

/**
 * Single source for actionable counts across the dashboard. Consumed by
 * NavRail badges, BottomNav badges, Morning Brief headline, and any future
 * surface (insights, command palette, etc).
 *
 * Add a new signal here when a tab needs a badge or a brief needs a number.
 * Don't refetch the same data in multiple components.
 */
export function useDashboardSignals() {
  const pendingOrders = useOrders("PENDING_PAYMENT")
  const needsHuman = useConversations("NEEDS_HUMAN", undefined)
  const products = useProducts()

  return useMemo(() => {
    const productList = products.data?.products ?? []
    const lowStockCount = productList.filter(
      (p) => p.stock > 0 && p.stock <= p.reorderLevel,
    ).length
    const outOfStockCount = productList.filter((p) => p.stock === 0).length

    return {
      // Counts ready for a tab badge
      needsHumanCount: needsHuman.data?.needs_human_count ?? 0,
      pendingPaymentCount: pendingOrders.data?.orders.length ?? 0,
      lowStockCount,
      outOfStockCount,

      // Loading state — useful when a surface wants to show loaders rather than empty
      isLoading:
        pendingOrders.isLoading ||
        needsHuman.isLoading ||
        products.isLoading,
    }
  }, [pendingOrders.data, needsHuman.data, products.data, pendingOrders.isLoading, needsHuman.isLoading, products.isLoading])
}
