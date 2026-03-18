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
  has_variants: boolean
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
 * SKU is auto-generated in BUS-CAT-0001 format unless custom_sku is provided.
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
  custom_sku?: string  // Override auto-generation
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
  hasVariants: boolean
  tags: string[]
  reorderLevel: number
  inventoryId: string
  attributes?: Record<string, any>
  createdAt: Date
  updatedAt: Date
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


// =============================================================================
// Product Variations (new system)
// =============================================================================

/**
 * Input for a single variation option when creating a product
 */
export interface VariationOptionInput {
  value: string
  sort_order?: number
}

/**
 * Input for a variation type with its options
 */
export interface VariationTypeInput {
  name: string  // e.g., "Color", "Size"
  options: VariationOptionInput[]
  sort_order?: number
}

/**
 * Input for a single product variant
 */
export interface ProductVariantInput {
  options: Record<string, string>  // {"Color": "Red", "Size": "M"}
  sku_suffix?: string
  price_adjustment?: number  // +/- from base price
  stock_quantity?: number
  image_url?: string
}

/**
 * Request to create a product with variations
 */
export interface CreateProductWithVariationsRequest extends CreateProductRequest {
  variation_types?: VariationTypeInput[]
  variants?: ProductVariantInput[]
}

/**
 * Response for a variation option
 */
export interface VariationOptionResponse {
  id: string
  value: string
  sort_order: number
}

/**
 * Response for a variation type
 */
export interface VariationTypeResponse {
  id: string
  name: string
  sort_order: number
  options: VariationOptionResponse[]
}

/**
 * Response for a product variant
 */
export interface ProductVariantResponse {
  id: string
  sku: string
  price_adjustment: number
  stock_quantity: number
  status: ProductStatus
  image_url?: string
  options: Record<string, string>  // {"Color": "Red", "Size": "M"}
  created_at: string
  updated_at: string
}

/**
 * Backend product with variations - extended response
 */
export interface BackendProductWithVariations extends BackendProduct {
  has_variants: boolean
  variation_types: VariationTypeResponse[]
  variants: ProductVariantResponse[]
  total_variant_stock?: number
}

/**
 * Frontend display product with variations
 */
export interface DisplayProductWithVariations extends DisplayProduct {
  hasVariants: boolean
  variationTypes: VariationTypeResponse[]
  variants: ProductVariantResponse[]
  totalVariantStock?: number
}

/**
 * Request to add a new variation type to existing product
 */
export interface AddVariationTypeRequest {
  name: string
  options: string[]  // Just the values
  sort_order?: number
}

/**
 * Request to add a new variant to existing product
 */
export interface AddVariantRequest {
  options: Record<string, string>
  sku_suffix?: string
  price_adjustment?: number
  stock_quantity?: number
  image_url?: string
}

/**
 * Request to update a variant
 */
export interface UpdateVariantRequest {
  price_adjustment?: number
  stock_quantity?: number
  status?: ProductStatus
  image_url?: string
}


// =============================================================================
// Bulk Import Types (Meta Catalog alignment)
// =============================================================================

/**
 * Supported file types for bulk import
 */
export type BulkImportFileType = 'csv' | 'tsv' | 'xlsx'

/**
 * Column mapping: header -> Chidi field name (or null to skip)
 */
export type ColumnMapping = Record<string, string | null>

/**
 * Error details for a failed row in bulk import
 */
export interface BulkImportError {
  row: number
  field?: string
  message: string
}

/**
 * Response from analyzing a file for bulk import
 */
export interface BulkImportAnalysis {
  detected_format: 'meta' | 'chidi' | 'shopify' | 'unknown'
  total_rows: number
  column_mapping: ColumnMapping
  unmapped_columns: string[]
  preview_rows: Record<string, any>[]
}

/**
 * Response from executing a bulk import
 */
export interface BulkImportResult {
  imported: number
  failed: number
  errors: BulkImportError[]
}
