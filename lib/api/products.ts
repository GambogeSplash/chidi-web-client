/**
 * Products API service - connects to backend inventory endpoints
 * Uses JWT authentication via the apiClient
 */
import { apiClient } from './client'
import type { 
  BackendProduct, 
  DisplayProduct, 
  CreateProductRequest, 
  UpdateProductRequest,
  UpdateStockRequest,
  ProductFilters,
  ProductsResponse,
  CreateProductWithVariationsRequest,
  BackendProductWithVariations,
  DisplayProductWithVariations,
  VariationTypeResponse,
  ProductVariantResponse,
  AddVariationTypeRequest,
  AddVariantRequest,
  UpdateVariantRequest,
  BulkImportAnalysis,
  BulkImportResult,
  ColumnMapping,
  BulkImportFileType,
} from '@/lib/types/product'
import { backendToDisplay, backendToDisplayList } from '@/lib/utils/product-transformer'

// Storage key for inventory ID
const INVENTORY_ID_KEY = 'chidi_inventory_id'

/**
 * Get stored inventory ID from localStorage
 */
export function getStoredInventoryId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(INVENTORY_ID_KEY)
}

/**
 * Store inventory ID in localStorage
 */
export function setStoredInventoryId(inventoryId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(INVENTORY_ID_KEY, inventoryId)
  }
}

/**
 * Clear stored inventory ID
 */
export function clearStoredInventoryId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(INVENTORY_ID_KEY)
  }
}

export const productsAPI = {
  /**
   * Get all products for the user's inventory
   */
  async getProducts(filters?: ProductFilters): Promise<ProductsResponse> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      console.error('❌ [PRODUCTS] No inventory ID found')
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const queryParams = new URLSearchParams()
    if (filters?.category) queryParams.append('category', filters.category)
    if (filters?.status) queryParams.append('status_filter', filters.status)
    if (filters?.low_stock) queryParams.append('low_stock', 'true')
    if (filters?.search) queryParams.append('search', filters.search)
    if (filters?.limit) queryParams.append('limit', filters.limit.toString())
    if (filters?.offset) queryParams.append('offset', filters.offset.toString())

    const queryString = queryParams.toString()
    const endpoint = `/api/inventory/${inventoryId}/products${queryString ? `?${queryString}` : ''}`
    
    console.log('📦 [PRODUCTS] Fetching products from:', endpoint)
    
    const backendProducts = await apiClient.get<BackendProduct[]>(endpoint)
    const displayProducts = backendToDisplayList(backendProducts)
    
    return {
      products: displayProducts,
      total: displayProducts.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    }
  },

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<DisplayProduct> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}`
    console.log('📦 [PRODUCTS] Fetching product:', endpoint)
    
    const backendProduct = await apiClient.get<BackendProduct>(endpoint)
    return backendToDisplay(backendProduct)
  },

  /**
   * Create a new product
   */
  async createProduct(productData: CreateProductRequest): Promise<DisplayProduct> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products`
    console.log('📦 [PRODUCTS] Creating product:', endpoint, productData)
    
    const backendProduct = await apiClient.post<BackendProduct>(endpoint, productData)
    return backendToDisplay(backendProduct)
  },

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, updates: UpdateProductRequest): Promise<DisplayProduct> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}`
    console.log('📦 [PRODUCTS] Updating product:', endpoint, updates)
    
    const backendProduct = await apiClient.put<BackendProduct>(endpoint, updates)
    return backendToDisplay(backendProduct)
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}`
    console.log('📦 [PRODUCTS] Deleting product:', endpoint)
    
    const response = await apiClient.delete<{ message: string }>(endpoint)
    return { success: true, message: response.message }
  },

  /**
   * Update product stock
   */
  async updateStock(
    productId: string, 
    quantityChange: number, 
    operation: 'add' | 'subtract' | 'set' = 'set',
    reason?: string
  ): Promise<DisplayProduct> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/stock`
    const requestBody: UpdateStockRequest = {
      quantity_change: quantityChange,
      operation,
      reason
    }
    
    console.log('📦 [PRODUCTS] Updating stock:', endpoint, requestBody)
    
    const backendProduct = await apiClient.put<BackendProduct>(endpoint, requestBody)
    return backendToDisplay(backendProduct)
  },

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<{
    total_products: number
    total_inventory_value: number
    total_potential_revenue: number
    potential_profit: number
    low_stock_items: number
    out_of_stock_items: number
    active_products: number
    categories: Record<string, { count: number; inventory_value: number; potential_revenue: number }>
  }> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/stats`
    console.log('📦 [PRODUCTS] Fetching inventory stats:', endpoint)
    
    return await apiClient.get(endpoint)
  },

  /**
   * Bulk delete products
   */
  async deleteProducts(productIds: string[]): Promise<{ success: boolean; deleted: number }> {
    let deleted = 0
    for (const productId of productIds) {
      try {
        await this.deleteProduct(productId)
        deleted++
      } catch (error) {
        console.error(`Failed to delete product ${productId}:`, error)
      }
    }
    return { success: deleted === productIds.length, deleted }
  },

  /**
   * Search products by query
   */
  async searchProducts(query: string): Promise<DisplayProduct[]> {
    const response = await this.getProducts({ search: query })
    return response.products
  },

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<DisplayProduct[]> {
    const response = await this.getProducts({ category })
    return response.products
  },

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<DisplayProduct[]> {
    const response = await this.getProducts({ low_stock: true })
    return response.products
  },

  // ===========================================================================
  // Product Variations
  // ===========================================================================

  /**
   * Create a product with variations
   */
  async createProductWithVariations(
    productData: CreateProductWithVariationsRequest
  ): Promise<DisplayProductWithVariations> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/with-variations`
    console.log('📦 [PRODUCTS] Creating product with variations:', endpoint)
    
    const backendProduct = await apiClient.post<BackendProductWithVariations>(endpoint, productData)
    return backendWithVariationsToDisplay(backendProduct)
  },

  /**
   * Get product with all variation data
   */
  async getProductWithVariations(productId: string): Promise<DisplayProductWithVariations> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/full`
    console.log('📦 [PRODUCTS] Fetching product with variations:', endpoint)
    
    const backendProduct = await apiClient.get<BackendProductWithVariations>(endpoint)
    return backendWithVariationsToDisplay(backendProduct)
  },

  /**
   * Add a variation type to existing product
   */
  async addVariationType(
    productId: string,
    data: AddVariationTypeRequest
  ): Promise<VariationTypeResponse> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/variation-types`
    console.log('📦 [PRODUCTS] Adding variation type:', endpoint)
    
    return await apiClient.post<VariationTypeResponse>(endpoint, data)
  },

  /**
   * Delete a variation type
   */
  async deleteVariationType(
    productId: string,
    variationTypeId: string
  ): Promise<{ message: string }> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/variation-types/${variationTypeId}`
    console.log('📦 [PRODUCTS] Deleting variation type:', endpoint)
    
    return await apiClient.delete<{ message: string }>(endpoint)
  },

  /**
   * Add a variant to existing product
   */
  async addVariant(
    productId: string,
    data: AddVariantRequest
  ): Promise<ProductVariantResponse> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/variants`
    console.log('📦 [PRODUCTS] Adding variant:', endpoint)
    
    return await apiClient.post<ProductVariantResponse>(endpoint, data)
  },

  /**
   * Update a variant
   */
  async updateVariant(
    productId: string,
    variantId: string,
    data: UpdateVariantRequest
  ): Promise<ProductVariantResponse> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/variants/${variantId}`
    console.log('📦 [PRODUCTS] Updating variant:', endpoint)
    
    return await apiClient.put<ProductVariantResponse>(endpoint, data)
  },

  /**
   * Delete a variant
   */
  async deleteVariant(
    productId: string,
    variantId: string
  ): Promise<{ message: string }> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/${productId}/variants/${variantId}`
    console.log('📦 [PRODUCTS] Deleting variant:', endpoint)
    
    return await apiClient.delete<{ message: string }>(endpoint)
  },

  /**
   * Analyze file for bulk import (supports CSV, TSV, XLSX)
   * Returns detected format, column mappings, and preview
   * 
   * @param content - File content (text for CSV/TSV, base64 for XLSX)
   * @param fileType - File type: 'csv', 'tsv', or 'xlsx'
   */
  async analyzeImport(content: string, fileType: BulkImportFileType = 'csv'): Promise<BulkImportAnalysis> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/bulk-import/analyze`
    console.log(`📦 [PRODUCTS] Analyzing ${fileType.toUpperCase()} for import:`, endpoint)
    
    return await apiClient.post<BulkImportAnalysis>(endpoint, { 
      content,
      file_type: fileType
    })
  },

  /**
   * Bulk import products from file with confirmed column mapping
   * 
   * @param content - File content (text for CSV/TSV, base64 for XLSX)
   * @param columnMapping - Confirmed column mapping from user
   * @param fileType - File type: 'csv', 'tsv', or 'xlsx'
   */
  async bulkImport(
    content: string, 
    columnMapping: ColumnMapping, 
    fileType: BulkImportFileType = 'csv'
  ): Promise<BulkImportResult> {
    const inventoryId = getStoredInventoryId()
    if (!inventoryId) {
      throw new Error('Inventory ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/inventory/${inventoryId}/products/bulk-import`
    console.log(`📦 [PRODUCTS] Bulk importing products (${fileType.toUpperCase()}):`, endpoint)
    
    return await apiClient.post<BulkImportResult>(endpoint, { 
      content,
      file_type: fileType,
      column_mapping: columnMapping
    })
  }
}

/**
 * Transform backend product with variations to display format
 */
function backendWithVariationsToDisplay(product: BackendProductWithVariations): DisplayProductWithVariations {
  const base = backendToDisplay(product)
  return {
    ...base,
    hasVariants: product.has_variants,
    variationTypes: product.variation_types,
    variants: product.variants,
    totalVariantStock: product.total_variant_stock
  }
}
