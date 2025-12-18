"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Edit3, AlertTriangle, X, Trash2, Loader2 } from "lucide-react"
import { productsAPI } from "@/lib/api"
import type { DisplayProduct } from "@/lib/types/product"

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  product: DisplayProduct | null
  onEditProduct: (product: DisplayProduct) => void
  onDeleteProduct?: (productId: string) => void
}

export function ProductDetailModal({ isOpen, onClose, product, onEditProduct, onDeleteProduct }: ProductDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!isOpen || !product) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await productsAPI.deleteProduct(product.id)
      if (onDeleteProduct) {
        onDeleteProduct(product.id)
      }
      onClose()
    } catch (err) {
      console.error('Failed to delete product:', err)
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "low":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "out":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "good":
        return "In Stock"
      case "low":
        return "Low Stock"
      case "out":
        return "Out of Stock"
      default:
        return "Unknown"
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Package className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Product Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditProduct(product)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Product Image */}
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-600" />
                </div>
              )}
            </div>

          {/* Product Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-emerald-400">{product.price}</span>
                <Badge className={`text-xs ${getStatusColor(product.stockStatus)}`}>{getStatusText(product.stockStatus)}</Badge>
              </div>
            </div>

            {/* Stock Alert */}
            {(product.stockStatus === "low" || product.stockStatus === "out") && (
              <div className={`p-3 rounded-lg border ${product.stockStatus === "out" ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${product.stockStatus === "out" ? "text-red-400" : "text-amber-400"}`} />
                  <div>
                    <p className={`text-sm font-medium ${product.stockStatus === "out" ? "text-red-400" : "text-amber-400"}`}>
                      {product.stockStatus === "out" ? "Out of Stock" : "Low Stock Alert"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {product.stockStatus === "out"
                        ? "This product is currently unavailable"
                        : `Only ${product.stock} units remaining`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="p-3 text-center bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-lg font-bold text-white">{product.stock}</div>
              <div className="text-xs text-gray-400">Units in Stock</div>
            </div>

            {/* Product Details */}
            <div className="space-y-3 pt-2">
              {product.category && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Category</label>
                  <p className="text-sm text-white capitalize">{product.category}</p>
                </div>
              )}

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Description</label>
                  <p className="text-sm text-gray-300">{product.description}</p>
                </div>
              )}

              {product.sku && (
                <div>
                  <label className="text-sm font-medium text-gray-400">SKU</label>
                  <p className="text-sm text-white font-mono">{product.sku}</p>
                </div>
              )}

              {product.brand && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Brand</label>
                  <p className="text-sm text-white">{product.brand}</p>
                </div>
              )}
            </div>
          </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          {!showDeleteConfirm ? (
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" 
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={() => onEditProduct(product)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Product
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 font-medium">Delete this product?</p>
                <p className="text-xs text-gray-400 mt-1">This action cannot be undone.</p>
                {deleteError && (
                  <p className="text-xs text-red-400 mt-2">{deleteError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800" 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirm Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
