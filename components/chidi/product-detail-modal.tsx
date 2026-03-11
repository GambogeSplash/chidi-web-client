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
        return "bg-[var(--chidi-success)]/10 text-[var(--chidi-success)] border-[var(--chidi-success)]/20"
      case "low":
        return "bg-[var(--chidi-warning)]/10 text-[var(--chidi-warning)] border-[var(--chidi-warning)]/20"
      case "out":
        return "bg-[var(--chidi-danger)]/10 text-[var(--chidi-danger)] border-[var(--chidi-danger)]/20"
      default:
        return "bg-[var(--chidi-surface)] text-[var(--chidi-text-muted)] border-[var(--chidi-border-subtle)]"
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] bg-white border border-[var(--chidi-border-default)] rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--chidi-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--chidi-surface)] rounded-lg">
              <Package className="w-5 h-5 text-[var(--chidi-text-primary)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--chidi-text-primary)]">Product Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditProduct(product)}
              className="p-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg transition-colors"
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Product Image */}
            <div className="aspect-video bg-[var(--chidi-surface)] rounded-lg overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-[var(--chidi-text-muted)]" />
                </div>
              )}
            </div>

          {/* Product Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--chidi-text-primary)]">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-[var(--chidi-text-primary)]">{product.displayPrice}</span>
                <Badge className={`text-xs ${getStatusColor(product.stockStatus)}`}>{getStatusText(product.stockStatus)}</Badge>
              </div>
            </div>

            {/* Stock Alert */}
            {(product.stockStatus === "low" || product.stockStatus === "out") && (
              <div className={`p-3 rounded-lg border ${product.stockStatus === "out" ? "bg-[var(--chidi-danger)]/5 border-[var(--chidi-danger)]/20" : "bg-[var(--chidi-warning)]/5 border-[var(--chidi-warning)]/20"}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${product.stockStatus === "out" ? "text-[var(--chidi-danger)]" : "text-[var(--chidi-warning)]"}`} />
                  <div>
                    <p className={`text-sm font-medium ${product.stockStatus === "out" ? "text-[var(--chidi-danger)]" : "text-[var(--chidi-warning)]"}`}>
                      {product.stockStatus === "out" ? "Out of Stock" : "Low Stock Alert"}
                    </p>
                    <p className="text-xs text-[var(--chidi-text-muted)]">
                      {product.stockStatus === "out"
                        ? "This product is currently unavailable"
                        : `Only ${product.stock} units remaining`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="p-3 text-center bg-[var(--chidi-surface)] rounded-lg border border-[var(--chidi-border-subtle)]">
              <div className="text-lg font-bold text-[var(--chidi-text-primary)]">{product.stock}</div>
              <div className="text-xs text-[var(--chidi-text-muted)]">Units in Stock</div>
            </div>

            {/* Product Details */}
            <div className="space-y-3 pt-2">
              {product.category && (
                <div>
                  <label className="text-sm font-medium text-[var(--chidi-text-muted)]">Category</label>
                  <p className="text-sm text-[var(--chidi-text-primary)] capitalize">{product.category}</p>
                </div>
              )}

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-[var(--chidi-text-muted)]">Description</label>
                  <p className="text-sm text-[var(--chidi-text-secondary)]">{product.description}</p>
                </div>
              )}

              {product.sku && (
                <div>
                  <label className="text-sm font-medium text-[var(--chidi-text-muted)]">SKU</label>
                  <p className="text-sm text-[var(--chidi-text-primary)] font-mono">{product.sku}</p>
                </div>
              )}

              {product.brand && (
                <div>
                  <label className="text-sm font-medium text-[var(--chidi-text-muted)]">Brand</label>
                  <p className="text-sm text-[var(--chidi-text-primary)]">{product.brand}</p>
                </div>
              )}
            </div>
          </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--chidi-border-subtle)] bg-[var(--chidi-surface)]">
          {!showDeleteConfirm ? (
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1 bg-white border-[var(--chidi-danger)]/30 text-[var(--chidi-danger)] hover:bg-[var(--chidi-danger)]/5 hover:text-[var(--chidi-danger)]" 
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button 
                className="flex-1 bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)]" 
                onClick={() => onEditProduct(product)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Product
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-[var(--chidi-danger)]/5 border border-[var(--chidi-danger)]/20 rounded-lg">
                <p className="text-sm text-[var(--chidi-danger)] font-medium">Delete this product?</p>
                <p className="text-xs text-[var(--chidi-text-muted)] mt-1">This action cannot be undone.</p>
                {deleteError && (
                  <p className="text-xs text-[var(--chidi-danger)] mt-2">{deleteError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]" 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-[var(--chidi-danger)] hover:bg-[var(--chidi-danger)]/90 text-white" 
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
