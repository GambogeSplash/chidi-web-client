"use client"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Edit3, AlertTriangle, X, Trash2, Loader2, Sparkles, TrendingUp, Calendar, Percent, ShoppingCart, MessageCircle, ArrowUpToLine, Plus } from "lucide-react"
import { productsAPI } from "@/lib/api"
import type { DisplayProduct } from "@/lib/types/product"
import { formatCurrency } from "@/lib/utils/currency"
import { deriveProductActivity, formatRelativeTime, type ProductActivityKind } from "@/lib/chidi/product-activity"
import { CustomerCharacter } from "./customer-character"

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  product: DisplayProduct | null
  onEditProduct: (product: DisplayProduct) => void
  onDeleteProduct?: (productId: string) => void
  onAskChidi?: (prompt: string) => void
}

// Mock sales velocity until backend serves real numbers — deterministic by ID
function deriveSalesMetrics(product: DisplayProduct) {
  let h = 0
  for (let i = 0; i < product.id.length; i++) h = (h << 5) - h + product.id.charCodeAt(i)
  const seed = Math.abs(h)
  const unitsPerWeek = 1 + (seed % 12)
  const lastSoldDays = seed % 14
  return { unitsPerWeek, lastSoldDays }
}

export function ProductDetailModal({ isOpen, onClose, product, onEditProduct, onDeleteProduct, onAskChidi }: ProductDetailModalProps) {
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

            {/* Decision Surface — sales velocity, days remaining, margin */}
            {(() => {
              const { unitsPerWeek, lastSoldDays } = deriveSalesMetrics(product)
              const daysRemaining = unitsPerWeek > 0 ? Math.floor((product.stock / unitsPerWeek) * 7) : 999
              const margin = product.sellingPrice > 0
                ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100)
                : 0
              const marginAbs = product.sellingPrice - product.costPrice
              const restockUrgent = daysRemaining < 14 && product.stock > 0
              return (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice">
                    What I'm seeing
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <DecisionCell
                      icon={TrendingUp}
                      label="Sells per week"
                      value={String(unitsPerWeek)}
                      sub={`Last sold ${lastSoldDays === 0 ? "today" : `${lastSoldDays}d ago`}`}
                    />
                    <DecisionCell
                      icon={Calendar}
                      label="Days at this pace"
                      value={product.stock === 0 ? "0" : daysRemaining > 90 ? "90+" : String(daysRemaining)}
                      sub={restockUrgent ? "Worth reordering" : product.stock === 0 ? "Restock now" : "Comfortable"}
                      tone={product.stock === 0 ? "danger" : restockUrgent ? "warn" : "neutral"}
                    />
                    <DecisionCell
                      icon={Percent}
                      label="Margin"
                      value={`${margin}%`}
                      sub={`${formatCurrency(marginAbs, "NGN")} per unit`}
                      tone={margin > 30 ? "win" : margin > 15 ? "neutral" : "warn"}
                    />
                    <DecisionCell
                      icon={Package}
                      label="In stock"
                      value={String(product.stock)}
                      sub={`Reorder at ${product.reorderLevel}`}
                    />
                  </div>

                  {onAskChidi && (
                    <button
                      onClick={() => onAskChidi(`How is "${product.name}" doing? Should I restock?`)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--chidi-win-soft)] hover:bg-[var(--chidi-win)]/20 text-[var(--chidi-win-foreground)] text-sm font-chidi-voice transition-colors group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--chidi-win)]" />
                      Ask Chidi about this product
                    </button>
                  )}
                </div>
              )
            })()}

            {/* Activity log — chronological events for this product */}
            {(() => {
              const events = deriveProductActivity(product.id).slice(0, 6)
              return (
                <div className="space-y-3 pt-3 border-t border-[var(--chidi-border-subtle)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice">
                    Recent activity
                  </p>
                  <ul className="space-y-2.5">
                    {events.map((e, idx) => (
                      <ActivityRow key={idx} kind={e.kind} ts={e.ts} qty={e.qty} customerName={e.customerName} />
                    ))}
                  </ul>
                </div>
              )
            })()}

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

interface DecisionCellProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  tone?: "win" | "warn" | "danger" | "neutral"
}

interface ActivityRowProps {
  kind: ProductActivityKind
  ts: number
  qty?: number
  customerName?: string
}

function ActivityRow({ kind, ts, qty, customerName }: ActivityRowProps) {
  const config = {
    created: {
      icon: Plus,
      tone: "text-[var(--chidi-text-muted)] bg-[var(--chidi-surface)]",
      label: "Added to inventory",
    },
    restocked: {
      icon: ArrowUpToLine,
      tone: "text-[var(--chidi-success)] bg-[var(--chidi-success)]/10",
      label: `Restocked ${qty} unit${qty === 1 ? "" : "s"}`,
    },
    sold: {
      icon: ShoppingCart,
      tone: "text-[var(--chidi-win)] bg-[var(--chidi-win-soft)]",
      label: customerName
        ? `Sold ${qty} to ${customerName}`
        : `Sold ${qty} unit${qty === 1 ? "" : "s"}`,
    },
    asked: {
      icon: MessageCircle,
      tone: "text-[var(--chidi-accent)] bg-[var(--chidi-accent)]/8",
      label: customerName ? `${customerName} asked about it` : "Customer asked about it",
    },
  }[kind]

  const Icon = config.icon

  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${config.tone}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-2">
        {kind === "sold" && customerName && (
          <CustomerCharacter name={customerName} size="xs" />
        )}
        {kind === "asked" && customerName && (
          <CustomerCharacter name={customerName} size="xs" />
        )}
        <span className="text-[var(--chidi-text-primary)] font-chidi-voice text-[13px] truncate">
          {config.label}
        </span>
      </span>
      <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums flex-shrink-0">
        {formatRelativeTime(ts)}
      </span>
    </li>
  )
}

function DecisionCell({ icon: Icon, label, value, sub, tone = "neutral" }: DecisionCellProps) {
  const valueColor =
    tone === "win" ? "text-[var(--chidi-win)]" :
    tone === "warn" ? "text-[var(--chidi-warning)]" :
    tone === "danger" ? "text-[var(--chidi-danger)]" :
    "text-[var(--chidi-text-primary)]"
  return (
    <div className="p-3 rounded-lg bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)] font-chidi-voice mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-lg font-semibold font-chidi-voice tabular-nums ${valueColor}`}>{value}</div>
      {sub && (
        <div className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice mt-0.5">
          {sub}
        </div>
      )}
    </div>
  )
}
