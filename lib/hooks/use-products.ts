"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsAPI } from "@/lib/api/products"
import type {
  ProductsResponse,
  DisplayProduct,
  CreateProductRequest,
  UpdateProductRequest,
  ProductFilters,
} from "@/lib/types/product"

export const productsKeys = {
  all: ["products"] as const,
  list: (filters?: ProductFilters) => [...productsKeys.all, "list", filters] as const,
  detail: (id: string) => [...productsKeys.all, "detail", id] as const,
  stats: () => [...productsKeys.all, "stats"] as const,
}

/**
 * Hook for fetching products list with optional filters
 */
export function useProducts(filters?: ProductFilters) {
  return useQuery<ProductsResponse>({
    queryKey: productsKeys.list(filters),
    queryFn: () => productsAPI.getProducts(filters),
  })
}

/**
 * Hook for fetching a single product by ID
 */
export function useProduct(productId: string | null) {
  return useQuery<DisplayProduct>({
    queryKey: productsKeys.detail(productId || ""),
    queryFn: () => productsAPI.getProduct(productId!),
    enabled: !!productId,
  })
}

/**
 * Hook for fetching inventory stats
 */
export function useInventoryStats() {
  return useQuery({
    queryKey: productsKeys.stats(),
    queryFn: () => productsAPI.getInventoryStats(),
  })
}

/**
 * Hook for creating a product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productData: CreateProductRequest) =>
      productsAPI.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all })
    },
  })
}

/**
 * Hook for updating a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      updates,
    }: {
      productId: string
      updates: UpdateProductRequest
    }) => productsAPI.updateProduct(productId, updates),
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(
        productsKeys.detail(updatedProduct.id),
        updatedProduct
      )
      queryClient.invalidateQueries({ queryKey: productsKeys.list() })
    },
  })
}

/**
 * Hook for deleting a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => productsAPI.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all })
    },
  })
}

/**
 * Hook for updating product stock
 */
export function useUpdateStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      quantityChange,
      operation = "set",
      reason,
    }: {
      productId: string
      quantityChange: number
      operation?: "add" | "subtract" | "set"
      reason?: string
    }) => productsAPI.updateStock(productId, quantityChange, operation, reason),
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(
        productsKeys.detail(updatedProduct.id),
        updatedProduct
      )
      queryClient.invalidateQueries({ queryKey: productsKeys.list() })
      queryClient.invalidateQueries({ queryKey: productsKeys.stats() })
    },
  })
}

/**
 * Hook for bulk deleting products
 */
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productIds: string[]) => productsAPI.deleteProducts(productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all })
    },
  })
}
