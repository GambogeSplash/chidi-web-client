// Analytics API service for Insights dashboard
import { apiClient } from './client'
import type {
  Period,
  SalesOverviewResponse,
  SalesTrendResponse,
  TopProductsResponse,
  ChannelMixResponse,
  CustomerListResponse,
  CustomerListParams,
  CustomerDetailResponse,
} from '../types/analytics'

export const analyticsAPI = {
  /**
   * Get sales overview KPIs with period comparison
   */
  async getSalesOverview(period: Period = '30d'): Promise<SalesOverviewResponse> {
    try {
      const response = await apiClient.get<SalesOverviewResponse>(
        `/analytics/sales-overview?period=${period}`
      )
      return response
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch sales overview:', error)
      throw error
    }
  },

  /**
   * Get daily sales trend data for charting
   */
  async getSalesTrend(period: Period = '30d'): Promise<SalesTrendResponse> {
    try {
      const response = await apiClient.get<SalesTrendResponse>(
        `/analytics/sales-trend?period=${period}`
      )
      return response
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch sales trend:', error)
      throw error
    }
  },

  /**
   * Get top selling products and stale products
   */
  async getTopProducts(period: Period = '30d', limit: number = 5): Promise<TopProductsResponse> {
    try {
      const response = await apiClient.get<TopProductsResponse>(
        `/analytics/top-products?period=${period}&limit=${limit}`
      )
      return response
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch top products:', error)
      throw error
    }
  },

  /**
   * Get order and revenue breakdown by sales channel
   */
  async getChannelMix(period: Period = '30d'): Promise<ChannelMixResponse> {
    try {
      const response = await apiClient.get<ChannelMixResponse>(
        `/analytics/channel-mix?period=${period}`
      )
      return response
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch channel mix:', error)
      throw error
    }
  },

  /**
   * Get aggregated customer list from orders
   */
  async getCustomers(params?: CustomerListParams): Promise<CustomerListResponse> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.search) searchParams.append('search', params.search)
      if (params?.sort_by) searchParams.append('sort_by', params.sort_by)
      if (params?.limit) searchParams.append('limit', String(params.limit))
      if (params?.offset) searchParams.append('offset', String(params.offset))
      
      const queryString = searchParams.toString()
      const url = queryString ? `/analytics/customers?${queryString}` : '/analytics/customers'
      
      const response = await apiClient.get<CustomerListResponse>(url)
      return response
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch customers:', error)
      throw error
    }
  },

  /**
   * Get detailed customer information including orders and interaction history
   */
  async getCustomerDetail(phone: string): Promise<CustomerDetailResponse> {
    try {
      const response = await apiClient.get<CustomerDetailResponse>(
        `/analytics/customers/${encodeURIComponent(phone)}`
      )
      return response
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch customer detail:', error)
      throw error
    }
  },
}

// Re-export currency formatting from centralized utility
export { formatCurrency, formatCurrencyCompact } from '@/lib/utils/currency'

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-NG').format(value)
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number | null): string {
  if (value === null) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Get channel display name and color
 */
export function getChannelDisplay(channel: string): { name: string; color: string; bgColor: string } {
  const channelMap: Record<string, { name: string; color: string; bgColor: string }> = {
    'WHATSAPP': { name: 'WhatsApp', color: 'text-green-600', bgColor: 'bg-green-500' },
    'TELEGRAM': { name: 'Telegram', color: 'text-blue-500', bgColor: 'bg-blue-500' },
    'INSTAGRAM': { name: 'Instagram', color: 'text-pink-500', bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    'SMS': { name: 'SMS', color: 'text-gray-600', bgColor: 'bg-gray-500' },
    'UNKNOWN': { name: 'Other', color: 'text-gray-500', bgColor: 'bg-gray-400' },
  }
  // Normalize to uppercase for consistent matching
  const normalizedChannel = channel?.toUpperCase() || 'UNKNOWN'
  return channelMap[normalizedChannel] || channelMap['UNKNOWN']
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}
