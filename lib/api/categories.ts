/**
 * Categories API service - connects to backend product categories endpoints
 * Uses JWT authentication via the apiClient
 */
import { apiClient } from './client'

// Storage key for business ID
const BUSINESS_ID_KEY = 'chidi_business_id'

/**
 * Get stored business ID from localStorage
 */
export function getStoredBusinessId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(BUSINESS_ID_KEY)
}

/**
 * Store business ID in localStorage
 */
export function setStoredBusinessId(businessId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BUSINESS_ID_KEY, businessId)
  }
}

/**
 * Clear stored business ID from localStorage
 */
export function clearStoredBusinessId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BUSINESS_ID_KEY)
  }
}

/**
 * ProductCategory type matching backend schema
 */
export interface ProductCategory {
  id: string
  business_id: string
  name: string
  slug: string
  sku_code: string
  icon: string | null
  sort_order: number
  is_default: boolean
  created_at: string
  updated_at: string
  product_count?: number
}

/**
 * Request to create a new category
 */
export interface CreateCategoryRequest {
  name: string
  slug?: string
  sku_code?: string
  icon?: string
  sort_order?: number
}

/**
 * Request to update a category
 */
export interface UpdateCategoryRequest {
  name?: string
  slug?: string
  sku_code?: string
  icon?: string
  sort_order?: number
}

export const categoriesAPI = {
  /**
   * Get all product categories for the current business
   */
  async getCategories(includeCount = false): Promise<ProductCategory[]> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      console.error('❌ [CATEGORIES] No business ID found')
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/categories/${businessId}?include_count=${includeCount}`
    console.log('📂 [CATEGORIES] Fetching categories from:', endpoint)
    
    return await apiClient.get<ProductCategory[]>(endpoint)
  },

  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: string): Promise<ProductCategory> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/categories/${businessId}/${categoryId}`
    console.log('📂 [CATEGORIES] Fetching category:', endpoint)
    
    return await apiClient.get<ProductCategory>(endpoint)
  },

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryRequest): Promise<ProductCategory> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/categories/${businessId}`
    console.log('📂 [CATEGORIES] Creating category:', endpoint, data)
    
    return await apiClient.post<ProductCategory>(endpoint, data)
  },

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: string, data: UpdateCategoryRequest): Promise<ProductCategory> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/categories/${businessId}/${categoryId}`
    console.log('📂 [CATEGORIES] Updating category:', endpoint, data)
    
    return await apiClient.put<ProductCategory>(endpoint, data)
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/categories/${businessId}/${categoryId}`
    console.log('📂 [CATEGORIES] Deleting category:', endpoint)
    
    await apiClient.delete(endpoint)
  },

  /**
   * Reorder categories
   */
  async reorderCategories(categoryIds: string[]): Promise<ProductCategory[]> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const endpoint = `/api/categories/${businessId}/reorder`
    console.log('📂 [CATEGORIES] Reordering categories:', endpoint)
    
    return await apiClient.post<ProductCategory[]>(endpoint, { category_ids: categoryIds })
  },

  /**
   * Seed default categories (typically called during onboarding)
   */
  async seedDefaults(businessType?: string): Promise<ProductCategory[]> {
    const businessId = getStoredBusinessId()
    if (!businessId) {
      throw new Error('Business ID not found. Please complete onboarding.')
    }

    const queryParams = businessType ? `?business_type=${businessType}` : ''
    const endpoint = `/api/categories/${businessId}/seed${queryParams}`
    console.log('📂 [CATEGORIES] Seeding default categories:', endpoint)
    
    return await apiClient.post<ProductCategory[]>(endpoint, {})
  },

  /**
   * Get category names as simple string array (for dropdowns)
   */
  async getCategoryNames(): Promise<string[]> {
    const categories = await this.getCategories()
    return categories.map(c => c.name)
  },

  /**
   * Get category options for select dropdowns
   */
  async getCategoryOptions(): Promise<Array<{ value: string; label: string; icon?: string }>> {
    const categories = await this.getCategories()
    return categories.map(c => ({
      value: c.id,
      label: c.name,
      icon: c.icon || undefined
    }))
  }
}
