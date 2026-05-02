// Orders API service for order management and payment verification
import { apiClient } from './client'

// === ORDER STATUS ===
export type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'

// === ORDER ITEM ===
export interface OrderItem {
  product_id?: string | null
  product_name: string
  quantity: number
  unit_price: number
  subtotal?: number
  image_url?: string | null
}

// === ORDER ===
export interface Order {
  id: string
  business_id: string
  conversation_id: string | null
  
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  
  items: OrderItem[]
  subtotal: number
  total: number
  currency: string
  
  status: OrderStatus
  notes: string | null
  channel: string
  
  created_at: string
  updated_at: string
  confirmed_at: string | null
  fulfilled_at: string | null
  cancelled_at: string | null
}

// === ORDER LIST RESPONSE ===
export interface OrderListResponse {
  orders: Order[]
  total: number
}

// === REQUEST TYPES ===
export interface OrderConfirmRequest {
  // Empty for now, can be extended
}

export interface OrderRejectRequest {
  reason?: string
}

export interface OrderFulfillRequest {
  notes?: string
}

// === ORDERS API ===
export const ordersAPI = {
  /**
   * Get all orders for the current business
   */
  async getOrders(filters?: { 
    status?: OrderStatus 
    limit?: number
    offset?: number
  }): Promise<OrderListResponse> {
    console.log('📦 [ORDERS] Fetching orders...', filters)
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))
      
      const queryString = params.toString()
      const url = queryString ? `/api/orders?${queryString}` : '/api/orders'
      
      const response = await apiClient.get<OrderListResponse>(url)
      console.log('✅ [ORDERS] Orders fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [ORDERS] Failed to fetch orders:', error)
      throw error
    }
  },

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    console.log('📦 [ORDERS] Fetching order:', orderId)
    try {
      const response = await apiClient.get<Order>(`/api/orders/${orderId}`)
      console.log('✅ [ORDERS] Order fetched:', response)
      return response
    } catch (error) {
      console.error('❌ [ORDERS] Failed to fetch order:', error)
      throw error
    }
  },

  /**
   * Get the most recent order for a conversation
   * Returns null if no order exists
   */
  async getOrderByConversation(
    conversationId: string, 
    status?: OrderStatus
  ): Promise<Order | null> {
    console.log('📦 [ORDERS] Fetching order for conversation:', conversationId)
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      
      const queryString = params.toString()
      const url = queryString 
        ? `/api/orders/conversation/${conversationId}?${queryString}` 
        : `/api/orders/conversation/${conversationId}`
      
      const response = await apiClient.get<Order | null>(url)
      console.log('✅ [ORDERS] Order for conversation:', response)
      return response
    } catch (error: any) {
      if (error?.status === 404) {
        return null
      }
      console.error('❌ [ORDERS] Failed to fetch order for conversation:', error)
      throw error
    }
  },

  /**
   * Confirm payment for an order
   * Sets status to CONFIRMED and triggers AI confirmation message
   */
  async confirmOrder(orderId: string, data?: OrderConfirmRequest): Promise<Order> {
    console.log('✅ [ORDERS] Confirming order:', orderId)
    try {
      const response = await apiClient.post<Order>(
        `/api/orders/${orderId}/confirm`,
        data || {}
      )
      console.log('✅ [ORDERS] Order confirmed:', response)
      return response
    } catch (error) {
      console.error('❌ [ORDERS] Failed to confirm order:', error)
      throw error
    }
  },

  /**
   * Reject payment verification for an order
   * Keeps order in PENDING_PAYMENT and triggers AI retry message
   */
  async rejectOrder(orderId: string, reason?: string): Promise<Order> {
    console.log('❌ [ORDERS] Rejecting order:', orderId, reason)
    try {
      const response = await apiClient.post<Order>(
        `/api/orders/${orderId}/reject`,
        { reason }
      )
      console.log('✅ [ORDERS] Order rejected:', response)
      return response
    } catch (error) {
      console.error('❌ [ORDERS] Failed to reject order:', error)
      throw error
    }
  },

  /**
   * Mark an order as fulfilled/completed
   */
  async fulfillOrder(orderId: string, notes?: string): Promise<Order> {
    console.log('📦 [ORDERS] Fulfilling order:', orderId)
    try {
      const response = await apiClient.post<Order>(
        `/api/orders/${orderId}/fulfill`,
        { notes }
      )
      console.log('✅ [ORDERS] Order fulfilled:', response)
      return response
    } catch (error) {
      console.error('❌ [ORDERS] Failed to fulfill order:', error)
      throw error
    }
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    console.log('🚫 [ORDERS] Cancelling order:', orderId)
    try {
      const params = new URLSearchParams()
      if (reason) params.append('reason', reason)
      
      const queryString = params.toString()
      const url = queryString 
        ? `/api/orders/${orderId}/cancel?${queryString}` 
        : `/api/orders/${orderId}/cancel`
      
      const response = await apiClient.post<Order>(url, {})
      console.log('✅ [ORDERS] Order cancelled:', response)
      return response
    } catch (error) {
      console.error('❌ [ORDERS] Failed to cancel order:', error)
      throw error
    }
  }
}

// === HELPER FUNCTIONS ===

/**
 * Get status display text and color
 */
export function getOrderStatusDisplay(status: OrderStatus): { 
  text: string
  color: string
  bgColor: string 
} {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { 
        text: 'Pending Payment', 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50' 
      }
    case 'CONFIRMED':
      return { 
        text: 'Confirmed', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50' 
      }
    case 'FULFILLED':
      return { 
        text: 'Fulfilled', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50' 
      }
    case 'CANCELLED':
      return { 
        text: 'Cancelled', 
        color: 'text-gray-500', 
        bgColor: 'bg-gray-50' 
      }
    default:
      return { 
        text: status, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-50' 
      }
  }
}

// Re-export formatCurrency as formatOrderAmount for backward compatibility
import { formatCurrency } from '@/lib/utils/currency'
export { formatCurrency as formatOrderAmount }
