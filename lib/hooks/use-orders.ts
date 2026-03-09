"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersAPI, type Order, type OrderStatus, type OrderListResponse } from "@/lib/api/orders"

export const ordersKeys = {
  all: ["orders"] as const,
  list: (status?: OrderStatus) => [...ordersKeys.all, "list", status] as const,
  detail: (id: string) => [...ordersKeys.all, "detail", id] as const,
  byConversation: (conversationId: string, status?: OrderStatus) =>
    [...ordersKeys.all, "conversation", conversationId, status] as const,
}

/**
 * Hook for fetching orders list with optional status filter
 */
export function useOrders(status?: OrderStatus) {
  return useQuery<OrderListResponse>({
    queryKey: ordersKeys.list(status),
    queryFn: () => ordersAPI.getOrders({ status }),
  })
}

/**
 * Hook for fetching a single order by ID
 */
export function useOrder(orderId: string | null) {
  return useQuery<Order>({
    queryKey: ordersKeys.detail(orderId || ""),
    queryFn: () => ordersAPI.getOrder(orderId!),
    enabled: !!orderId,
  })
}

/**
 * Hook for fetching order by conversation ID (for pending orders in chat)
 */
export function useOrderByConversation(
  conversationId: string | null,
  status?: OrderStatus
) {
  return useQuery<Order | null>({
    queryKey: ordersKeys.byConversation(conversationId || "", status),
    queryFn: () => ordersAPI.getOrderByConversation(conversationId!, status),
    enabled: !!conversationId,
  })
}

/**
 * Hook for confirming an order (payment verified)
 */
export function useConfirmOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => ordersAPI.confirmOrder(orderId),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
    },
  })
}

/**
 * Hook for rejecting an order (payment not verified)
 */
export function useRejectOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      ordersAPI.rejectOrder(orderId, reason),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
    },
  })
}

/**
 * Hook for fulfilling an order
 */
export function useFulfillOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes?: string }) =>
      ordersAPI.fulfillOrder(orderId, notes),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
    },
  })
}

/**
 * Hook for cancelling an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      ordersAPI.cancelOrder(orderId, reason),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
    },
  })
}
