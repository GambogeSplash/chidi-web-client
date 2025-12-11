// Products API service
import { apiClient } from './client'
import type { Product, ProductVariant } from '@/lib/types'

// Mock data for testing with beautiful stock images
const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Premium Laptop Stand',
    price: '₦25000',
    stock: 15,
    status: 'good',
    category: 'electronics',
    description: 'Adjustable aluminum laptop stand with ergonomic design',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop&crop=center',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    name: 'Wireless Bluetooth Headphones',
    price: '₦15000',
    stock: 8,
    status: 'low',
    category: 'electronics',
    description: 'High-quality wireless headphones with noise cancellation',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&crop=center',
    variants: [
      { id: 'color', name: 'Color', options: ['Black', 'White', 'Blue'], stock: { 'Black': 3, 'White': 3, 'Blue': 2 } }
    ],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 3,
    name: 'Organic Coffee Beans',
    price: '₦8000',
    stock: 0,
    status: 'out',
    category: 'food',
    description: 'Premium organic coffee beans from Ethiopian highlands',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&crop=center',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: 4,
    name: 'Cotton T-Shirt',
    price: '₦5000',
    stock: 25,
    status: 'good',
    category: 'clothing',
    description: '100% cotton comfortable t-shirt available in multiple sizes',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
    variants: [
      { id: 'size', name: 'Size', options: ['S', 'M', 'L', 'XL'], stock: { 'S': 5, 'M': 8, 'L': 7, 'XL': 5 } },
      { id: 'color', name: 'Color', options: ['White', 'Black', 'Navy', 'Gray'], stock: { 'White': 6, 'Black': 8, 'Navy': 5, 'Gray': 6 } }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 5,
    name: 'Office Desk Lamp',
    price: '₦12000',
    stock: 12,
    status: 'good',
    category: 'home',
    description: 'LED desk lamp with adjustable brightness and color temperature',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=center',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: 6,
    name: 'Minimalist Watch',
    price: '₦35000',
    stock: 6,
    status: 'low',
    category: 'accessories',
    description: 'Elegant minimalist watch with leather strap',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop&crop=center',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: 7,
    name: 'Wireless Mouse',
    price: '₦8500',
    stock: 20,
    status: 'good',
    category: 'electronics',
    description: 'Ergonomic wireless mouse with precision tracking',
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop&crop=center',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-28')
  },
  {
    id: 8,
    name: 'Ceramic Plant Pot',
    price: '₦4500',
    stock: 18,
    status: 'good',
    category: 'home',
    description: 'Beautiful ceramic plant pot with drainage holes',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=400&fit=crop&crop=center',
    variants: [
      { id: 'size', name: 'Size', options: ['Small', 'Medium', 'Large'], stock: { 'Small': 8, 'Medium': 6, 'Large': 4 } }
    ],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-30')
  },
  {
    id: 9,
    name: 'Leather Wallet',
    price: '₦12500',
    stock: 14,
    status: 'good',
    category: 'accessories',
    description: 'Genuine leather wallet with RFID protection',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop&crop=center',
    variants: [
      { id: 'color', name: 'Color', options: ['Brown', 'Black', 'Tan'], stock: { 'Brown': 5, 'Black': 6, 'Tan': 3 } }
    ],
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-02-01')
  }
]

const MOCK_BULK_IMPORT_RESULT = {
  imported: 45,
  failed: 3,
  errors: ['Row 12: Invalid price format', 'Row 25: Missing category', 'Row 38: Duplicate product name']
}

export interface CreateProductRequest {
  name: string
  price: string
  stock: number
  category: string
  description?: string
  image?: string
  variants?: ProductVariant[]
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number
}

export interface ProductFilters {
  category?: string
  status?: 'low' | 'good' | 'out'
  search?: string
  limit?: number
  offset?: number
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
}

export const productsAPI = {
  async getProducts(filters?: ProductFilters): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    const endpoint = `/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const mockResponse = {
      products: MOCK_PRODUCTS,
      total: MOCK_PRODUCTS.length,
      page: 1,
      limit: 10
    }
    return await apiClient.get<ProductsResponse>(endpoint, undefined, mockResponse)
  },

  async getProduct(id: number): Promise<Product> {
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0]
    return apiClient.get(`/products/${id}`, undefined, mockProduct)
  },

  async createProduct(productData: CreateProductRequest): Promise<Product> {
    const mockProduct: Product = {
      id: Date.now(),
      name: productData.name,
      price: productData.price,
      stock: productData.stock,
      status: productData.stock > 10 ? 'good' : productData.stock > 0 ? 'low' : 'out',
      category: productData.category,
      description: productData.description,
      image: productData.image,
      variants: productData.variants,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    return apiClient.post('/products', productData, undefined, mockProduct)
  },

  async updateProduct(id: number, updates: Partial<CreateProductRequest>): Promise<Product> {
    const existingProduct = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0]
    const mockUpdatedProduct: Product = {
      ...existingProduct,
      ...updates,
      updatedAt: new Date()
    }
    return apiClient.put(`/products/${id}`, updates, undefined, mockUpdatedProduct)
  },

  async deleteProduct(id: number): Promise<{ success: boolean }> {
    const mockResponse = { success: true }
    return apiClient.delete(`/products/${id}`, undefined, mockResponse)
  },

  async bulkImport(csvData: string): Promise<{ imported: number; failed: number; errors: string[] }> {
    return apiClient.post('/products/bulk-import', { csvData }, undefined, MOCK_BULK_IMPORT_RESULT)
  },

  async updateStock(id: number, stock: number): Promise<Product> {
    const existingProduct = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0]
    const mockUpdatedProduct: Product = {
      ...existingProduct,
      stock,
      status: stock > 10 ? 'good' : stock > 0 ? 'low' : 'out',
      updatedAt: new Date()
    }
    return apiClient.put(`/products/${id}/stock`, { stock }, undefined, mockUpdatedProduct)
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await apiClient.get<Product[]>(`/products/category/${category}`)
  },

  async searchProducts(query: string): Promise<Product[]> {
    return await apiClient.get<Product[]>(`/products/search?q=${encodeURIComponent(query)}`)
  },

  async getLowStockProducts(threshold: number = 5): Promise<Product[]> {
    return await apiClient.get<Product[]>(`/products/low-stock?threshold=${threshold}`)
  }
}
