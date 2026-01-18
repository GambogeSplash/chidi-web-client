/**
 * Product data transformation utilities.
 * Converts between backend API format and frontend display format.
 */

import type { 
  BackendProduct, 
  DisplayProduct, 
  CreateProductRequest,
  StockStatus,
  ProductVariant
} from '@/lib/types/product'

/**
 * Format a number as Nigerian Naira currency
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

/**
 * Parse a currency string to number (removes ₦ and commas)
 */
export function parseCurrency(priceString: string): number {
  const cleaned = priceString.replace(/[₦,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Determine stock status based on quantity and reorder level
 */
export function getStockStatus(quantity: number, reorderLevel: number = 10): StockStatus {
  if (quantity === 0) return 'out'
  if (quantity <= reorderLevel) return 'low'
  return 'good'
}

/**
 * Transform backend product to frontend display format
 */
export function backendToDisplay(product: BackendProduct): DisplayProduct {
  return {
    id: product.id,
    name: product.name,
    displayPrice: formatCurrency(product.selling_price),
    costPrice: product.cost_price,
    sellingPrice: product.selling_price,
    discountPrice: product.discount_price,
    stock: product.stock_quantity,
    stockStatus: getStockStatus(product.stock_quantity, product.low_stock_threshold),
    category: product.category,
    subcategory: product.subcategory,
    brand: product.brand,
    image: product.image_urls?.[0],
    imageUrls: product.image_urls || [],
    description: product.description,
    sku: product.sku,
    status: product.status,
    isFeatured: product.is_featured,
    isDigital: product.is_digital,
    tags: product.tags || [],
    reorderLevel: product.low_stock_threshold,
    inventoryId: product.inventory_id,
    attributes: product.attributes,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at),
  }
}

/**
 * Transform array of backend products to display format
 */
export function backendToDisplayList(products: BackendProduct[]): DisplayProduct[] {
  return products.map(backendToDisplay)
}

/**
 * Extract variants from product attributes
 */
export function getProductVariants(product: DisplayProduct): ProductVariant[] {
  if (!product.attributes?.variants) return []
  return product.attributes.variants as ProductVariant[]
}

/**
 * Create product request from form data
 */
export function formDataToCreateRequest(formData: {
  name: string
  price: string
  costPrice?: string
  stock: string
  category: string
  description?: string
  brand?: string
  imageUrls?: string[]
  variants?: ProductVariant[]
}): CreateProductRequest {
  const sellingPrice = parseCurrency(formData.price)
  const costPrice = formData.costPrice ? parseCurrency(formData.costPrice) : sellingPrice * 0.7 // Default 30% margin
  
  const request: CreateProductRequest = {
    name: formData.name,
    category: formData.category,
    cost_price: costPrice,
    selling_price: sellingPrice,
    stock_quantity: parseInt(formData.stock) || 0,
  }

  if (formData.description) {
    request.description = formData.description
  }

  if (formData.brand) {
    request.brand = formData.brand
  }

  if (formData.imageUrls && formData.imageUrls.length > 0) {
    request.image_urls = formData.imageUrls
  }

  if (formData.variants && formData.variants.length > 0) {
    request.attributes = { variants: formData.variants }
  }

  return request
}

/**
 * Get stock status label for display
 */
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'good': return 'In Stock'
    case 'low': return 'Low Stock'
    case 'out': return 'Out of Stock'
    default: return 'Unknown'
  }
}

/**
 * Get stock status color class for styling
 */
export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'good': return 'bg-green-100 text-green-800'
    case 'low': return 'bg-yellow-100 text-yellow-800'
    case 'out': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get product status label for display
 */
export function getProductStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Active'
    case 'INACTIVE': return 'Inactive'
    case 'OUT_OF_STOCK': return 'Out of Stock'
    case 'DISCONTINUED': return 'Discontinued'
    case 'DRAFT': return 'Draft'
    default: return status
  }
}
