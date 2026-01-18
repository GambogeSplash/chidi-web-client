/**
 * Product types aligned with backend API models.
 * These types match the backend inventory_models.py definitions.
 */

// Backend ProductStatus enum
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'DRAFT'

// Frontend display status (derived from stock quantity)
export type StockStatus = 'good' | 'low' | 'out'

/**
 * Backend Product Response - matches ProductResponse from inventory_models.py
 */
export interface BackendProduct {
  id: string
  inventory_id: string
  sku: string
  name: string
  description?: string
  category: string
  subcategory?: string
  brand?: string
  tags: string[]
  cost_price: number
  selling_price: number
  discount_price?: number
  stock_quantity: number
  reserved_quantity: number
  low_stock_threshold: number
  max_stock_level?: number
  status: ProductStatus
  is_featured: boolean
  is_digital: boolean
  weight?: number
  length?: number
  width?: number
  height?: number
  image_urls: string[]
  barcode?: string
  supplier_info?: Record<string, any>
  attributes?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  last_restocked?: string
}

/**
 * Request to create a new product - matches AddProductRequest from inventory_models.py
 */
export interface CreateProductRequest {
  name: string
  category: string
  cost_price: number
  selling_price: number
  stock_quantity?: number
  description?: string
  brand?: string
  subcategory?: string
  tags?: string[]
  discount_price?: number
  low_stock_threshold?: number
  custom_sku?: string
  sku_format?: 'smart' | 'simple' | 'date'
  is_featured?: boolean
  is_digital?: boolean
  weight?: number
  length?: number
  width?: number
  height?: number
  image_urls?: string[]
  supplier_info?: Record<string, any>
  attributes?: Record<string, any>
  metadata?: Record<string, any>
}

/**
 * Request to update a product - matches ProductUpdate from inventory_models.py
 */
export interface UpdateProductRequest {
  name?: string
  description?: string
  category?: string
  subcategory?: string
  brand?: string
  tags?: string[]
  cost_price?: number
  selling_price?: number
  discount_price?: number
  stock_quantity?: number
  reserved_quantity?: number
  low_stock_threshold?: number
  max_stock_level?: number
  status?: ProductStatus
  is_featured?: boolean
  is_digital?: boolean
  weight?: number
  length?: number
  width?: number
  height?: number
  image_urls?: string[]
  supplier_info?: Record<string, any>
  attributes?: Record<string, any>
  metadata?: Record<string, any>
}

/**
 * Request to update stock - matches UpdateStockRequest from inventory_models.py
 */
export interface UpdateStockRequest {
  quantity_change: number
  operation: 'add' | 'subtract' | 'set'
  reason?: string
}

/**
 * Product search/filter parameters
 */
export interface ProductFilters {
  category?: string
  status?: ProductStatus
  low_stock?: boolean
  search?: string
  limit?: number
  offset?: number
}

/**
 * Frontend display product - transformed from BackendProduct for UI consumption
 */
export interface DisplayProduct {
  id: string
  name: string
  displayPrice: string
  costPrice: number
  sellingPrice: number
  discountPrice?: number
  stock: number
  stockStatus: StockStatus
  category: string
  subcategory?: string
  brand?: string
  image?: string
  imageUrls: string[]
  description?: string
  sku: string
  status: ProductStatus
  isFeatured: boolean
  isDigital: boolean
  tags: string[]
  reorderLevel: number
  inventoryId: string
  attributes?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Product variant (stored in attributes field)
 */
export interface ProductVariant {
  id: string
  name: string
  options: string[]
  stock?: Record<string, number>
}

/**
 * Paginated products response
 */
export interface ProductsResponse {
  products: DisplayProduct[]
  total: number
  limit: number
  offset: number
}
