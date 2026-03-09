// Analytics Types for Insights Dashboard

export type Period = '7d' | '30d' | '90d'

export interface MetricWithChange {
  current: number
  previous: number
  percent_change: number | null
}

export interface SalesOverviewResponse {
  period: string
  revenue: MetricWithChange
  orders: MetricWithChange
  avg_order_value: MetricWithChange
  fulfillment_rate: MetricWithChange
  generated_at: string
}

export interface TrendDataPoint {
  date: string
  revenue: number
  order_count: number
}

export interface SalesTrendResponse {
  period: string
  data: TrendDataPoint[]
  generated_at: string
}

export interface TopProduct {
  product_name: string
  product_id: string | null
  units_sold: number
  revenue: number
}

export interface StaleProduct {
  id: string
  name: string
  sku: string
  selling_price: number
  stock_quantity: number
  last_restocked: string | null
}

export interface TopProductsResponse {
  period: string
  top_products: TopProduct[]
  stale_products: StaleProduct[]
  generated_at: string
}

export interface ChannelData {
  channel: string
  order_count: number
  revenue: number
  order_percentage: number
  revenue_percentage: number
}

export interface ChannelTotals {
  orders: number
  revenue: number
}

export interface ChannelMixResponse {
  period: string
  channels: ChannelData[]
  totals: ChannelTotals
  generated_at: string
}

export interface CustomerSummary {
  phone: string
  name: string | null
  email: string | null
  address: string | null
  order_count: number
  total_spent: number
  last_order: string | null
  first_order: string | null
  channels: string[]
  is_vip: boolean
}

export interface CustomerListResponse {
  customers: CustomerSummary[]
  total: number
  limit: number
  offset: number
  generated_at: string
}

export interface CustomerListParams {
  search?: string
  sort_by?: 'total_spent' | 'order_count' | 'last_order' | 'name'
  limit?: number
  offset?: number
}

export interface OrderSummary {
  id: string
  items: any
  subtotal: number
  total: number
  currency: string
  status: string
  channel: string
  notes: string | null
  created_at: string | null
  confirmed_at: string | null
  fulfilled_at: string | null
  cancelled_at: string | null
}

export interface InteractionSummary {
  id: string
  summary: string
  memory_type: string
  created_at: string | null
  metadata: Record<string, any> | null
}

export interface CustomerEntity {
  id: string
  name: string
  attributes: Record<string, any> | null
  mention_count: number
  first_seen_at: string | null
  last_mentioned_at: string | null
}

export interface CustomerInfo {
  phone: string
  name: string | null
  email: string | null
  address: string | null
  order_count: number
  total_spent: number
  avg_order_value: number
  last_order: string | null
  first_order: string | null
  channels: string[]
}

export interface CustomerDetailResponse {
  customer: CustomerInfo
  orders: OrderSummary[]
  interactions: InteractionSummary[]
  entity: CustomerEntity | null
  generated_at: string
}
