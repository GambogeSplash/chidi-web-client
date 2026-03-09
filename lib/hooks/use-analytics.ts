"use client"

import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api/analytics"
import { memoriesAPI, type MemoryListResponse, type MemoryType } from "@/lib/api/memories"
import type {
  Period,
  SalesOverviewResponse,
  SalesTrendResponse,
  TopProductsResponse,
  ChannelMixResponse,
  CustomerListResponse,
  CustomerDetailResponse,
} from "@/lib/types/analytics"

// Query keys for cache management
export const analyticsKeys = {
  all: ["analytics"] as const,
  salesOverview: (period: Period) => [...analyticsKeys.all, "salesOverview", period] as const,
  salesTrend: (period: Period) => [...analyticsKeys.all, "salesTrend", period] as const,
  topProducts: (period: Period, limit: number) => [...analyticsKeys.all, "topProducts", period, limit] as const,
  channelMix: (period: Period) => [...analyticsKeys.all, "channelMix", period] as const,
  customers: (search?: string, sortBy?: string) => [...analyticsKeys.all, "customers", search, sortBy] as const,
  customerDetail: (phone: string) => [...analyticsKeys.all, "customerDetail", phone] as const,
  aiObservations: (memoryType: MemoryType, limit: number) =>
    [...analyticsKeys.all, "aiObservations", memoryType, limit] as const,
}

/**
 * Hook for fetching sales overview KPIs
 */
export function useSalesOverview(period: Period = "30d") {
  return useQuery<SalesOverviewResponse>({
    queryKey: analyticsKeys.salesOverview(period),
    queryFn: () => analyticsAPI.getSalesOverview(period),
  })
}

/**
 * Hook for fetching sales trend data
 */
export function useSalesTrend(period: Period = "30d") {
  return useQuery<SalesTrendResponse>({
    queryKey: analyticsKeys.salesTrend(period),
    queryFn: () => analyticsAPI.getSalesTrend(period),
  })
}

/**
 * Hook for fetching top products
 */
export function useTopProducts(period: Period = "30d", limit: number = 5) {
  return useQuery<TopProductsResponse>({
    queryKey: analyticsKeys.topProducts(period, limit),
    queryFn: () => analyticsAPI.getTopProducts(period, limit),
  })
}

/**
 * Hook for fetching channel mix data
 */
export function useChannelMix(period: Period = "30d") {
  return useQuery<ChannelMixResponse>({
    queryKey: analyticsKeys.channelMix(period),
    queryFn: () => analyticsAPI.getChannelMix(period),
  })
}

/**
 * Hook for fetching customer list
 */
export function useCustomers(search?: string, sortBy: string = "total_spent", limit: number = 50) {
  return useQuery<CustomerListResponse>({
    queryKey: analyticsKeys.customers(search, sortBy),
    queryFn: () =>
      analyticsAPI.getCustomers({
        search: search || undefined,
        sort_by: sortBy as "total_spent" | "order_count" | "last_order" | "name",
        limit,
      }),
  })
}

/**
 * Hook for fetching customer detail
 */
export function useCustomerDetail(phone: string | null) {
  return useQuery<CustomerDetailResponse>({
    queryKey: analyticsKeys.customerDetail(phone || ""),
    queryFn: () => analyticsAPI.getCustomerDetail(phone!),
    enabled: !!phone,
  })
}

/**
 * Hook for fetching AI observations (semantic memories)
 */
export function useAIObservations(memoryType: MemoryType = "semantic", limit: number = 5) {
  return useQuery<MemoryListResponse>({
    queryKey: analyticsKeys.aiObservations(memoryType, limit),
    queryFn: () =>
      memoriesAPI.list({
        memory_type: memoryType,
        limit,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes - observations don't change frequently
  })
}
